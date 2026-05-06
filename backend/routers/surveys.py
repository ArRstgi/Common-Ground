import random
import string
import uuid
from datetime import datetime, timezone
 
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client, Client

from models.schemas import AnswerOptionIn, QuestionIn, SurveyCreateRequest, SurveyCreateResponse
from models.schemas import SurveyJoinRequest, SurveyJoinResponse
from models.schemas import SurveyGetResponse, SurveyGetQuestion, SurveyGetAnswerChoice
from models.schemas import SurveyPreview
 
from config import settings

router = APIRouter(prefix="/surveys", tags=["surveys"])

# ── Supabase client ────────────────────────────────────────────────────────────
 
def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_secret_key)

# ── Helpers ────────────────────────────────────────────────────────────────────
 
def _generate_join_code(length: int = 8) -> str:
    """Return a random alphanumeric join code (upper-cased)."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=length))
 
 
async def _unique_join_code(supabase: Client) -> str:
    """
    Generate a join code that does not already exist in the surveys table.
    Retries up to 10 times before raising.
    """
    for _ in range(10):
        code = _generate_join_code()
        result = (
            supabase.table("surveys")
            .select("id")
            .eq("join_code", code)
            .execute()
        )
        if not result.data:
            return code
    raise HTTPException(
        status_code=500,
        detail="Could not generate a unique join code. Please try again.",
    )

# ── Validation helpers ─────────────────────────────────────────────────────────

def _validate_questions(questions: list[QuestionIn]) -> None:
    for i, q in enumerate(questions):
        if q.question_type == "multiple_choice":
            if not (2 <= len(q.answer_options) <= 6):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Question {i + 1} is multiple choice and must have "
                        f"between 2 and 6 answer options "
                        f"(got {len(q.answer_options)})."
                    ),
                )
        elif q.answer_options:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Question {i + 1} is short answer and must not have "
                    f"answer options."
                ),
            )
 
 
def _parse_deadline(deadline_str: str | None) -> str | None:
    """Convert a date string ('YYYY-MM-DD') to a UTC ISO 8601 timestamp."""
    if deadline_str is None:
        return None
    try:
        dt = datetime.strptime(deadline_str, "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        )
        return dt.isoformat()
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid deadline format '{deadline_str}'. Use YYYY-MM-DD.",
        )

# ── Routes ──────────────────────────────────────────────────────────────────────

@router.post("/create", response_model=SurveyCreateResponse, status_code=201)
async def create_survey(body: SurveyCreateRequest):
    """
    Create a survey with its questions and (for multiple-choice questions)
    answer options.  All inserts are performed in a logical sequence; if any
    step fails the survey row is deleted to avoid orphaned records.
    """
    _validate_questions(body.questions)
 
    supabase = get_supabase()
    join_code = await _unique_join_code(supabase)
    survey_id = str(uuid.uuid4())
 
    # ── 1. Insert survey ───────────────────────────────────────────────────────
    survey_row = {
        "id": survey_id,
        "title": body.title,
        "description": body.description,
        "created_by": str(body.created_by),
        "join_code": join_code,
        "deadline": _parse_deadline(body.deadline),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
 
    survey_result = supabase.table("surveys").insert(survey_row).execute()
 
    if not survey_result.data:
        raise HTTPException(status_code=500, detail="Failed to create survey.")
 
    created_survey = survey_result.data[0]
 
    # ── 2. Insert questions + answer options ───────────────────────────────────
    try:
        for question in body.questions:
            question_id = str(uuid.uuid4())
 
            question_row = {
                "id": question_id,
                "survey_id": survey_id,
                "prompt": question.prompt,
                "question_type": question.question_type,
                "order_index": question.order_index,
            }
 
            q_result = supabase.table("questions").insert(question_row).execute()
 
            if not q_result.data:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to insert question at index {question.order_index}.",
                )
 
            if question.answer_options:
                option_rows = [
                    {
                        "id": str(uuid.uuid4()),
                        "question_id": question_id,
                        "option_text": opt.option_text,
                        "order_index": opt.order_index,
                    }
                    for opt in question.answer_options
                ]
 
                opt_result = supabase.table("answer_options").insert(option_rows).execute()
 
                if not opt_result.data:
                    raise HTTPException(
                        status_code=500,
                        detail=(
                            f"Failed to insert answer options for question "
                            f"at index {question.order_index}."
                        ),
                    )
 
    except HTTPException:
        # Roll back: delete the survey (cascade should clean questions/options
        # if FK constraints with ON DELETE CASCADE are set; otherwise clean manually).
        supabase.table("surveys").delete().eq("id", survey_id).execute()
        raise
 
    return SurveyCreateResponse(
        id=uuid.UUID(created_survey["id"]), # type: ignore
        join_code=created_survey["join_code"], # type: ignore
        created_at=datetime.fromisoformat(created_survey["created_at"]), # type: ignore
    )

@router.post("/join", response_model=SurveyJoinResponse, status_code=201)
async def join_survey(body: SurveyJoinRequest):
    """
    A user joins a survey.
    """

    supabase = get_supabase()
    survey_info_cols = ["id", "join_code", "deadline"]
    survey_res = (
        supabase.table("surveys")
        .select(*survey_info_cols)
        .eq("join_code", body.join_code)
        .execute()
    )

    # Check if the join code is correct
    if not survey_res.data:
        raise HTTPException(
            status_code=404,
            detail="No survey has that join code. " \
            "Please reach out to the Survey Administrator and ensure you have the correct Join Code."
        )
    
    survey = survey_res.data[0]

    # Check if the survey is expired
    if survey["deadline"]: # type: ignore
        deadline = datetime.fromisoformat(survey["deadline"]) # type: ignore
        if datetime.now(timezone.utc) > deadline: 
            raise HTTPException(
                status_code=404,
                detail=f"That survey expired on {deadline.isoformat(timespec='minutes')}."
            )

    # Check if the user had already joined the survey
    user_already_in_survey = (
        supabase.table("survey_members")
        .select("user_id", "survey_id")
        .eq("user_id", body.user_id)
        .eq("survey_id", survey["id"]) # type: ignore
        .execute()
    )

    print("USER ALREADY IN SURVEY:", user_already_in_survey.data)
    if user_already_in_survey.data != []:
        raise HTTPException(
            status_code=403,
            detail="You are already in this survey."
        )

    # Finally, we can actually add the user to the survey
    survey_member_insert = {
        "survey_id": survey["id"], # type: ignore
        "user_id": str(body.user_id),
        "joined_at": datetime.now(timezone.utc).isoformat(),
    }

    output = (
        supabase.table("survey_members")
        .insert(survey_member_insert)
        .execute()
    ).data[0]

    
    return SurveyJoinResponse(
        user_id=uuid.UUID(output["user_id"]), # type: ignore
        survey_id=uuid.UUID(output["survey_id"]), # type: ignore
        joined_at=datetime.fromisoformat(output["joined_at"]), # type: ignore
    )


@router.get("/full_survey_by_id/{survey_id}", response_model=SurveyGetResponse, status_code=200)
async def get_full_survey_by_id(survey_id: str):

    supabase = get_supabase()

    survey_res = (
        supabase.table("surveys")
        .select("id", "title", "description", "deadline")
        .eq("id", uuid.UUID(survey_id))
        .execute()
    )

    if not survey_res.data:
        raise HTTPException(
            status_code=404,
            detail="That survey was not found. Please try again."
        )
    
    survey = survey_res.data[0]

    return SurveyGetResponse(
        survey_id=survey["id"], # type: ignore
        title=survey["title"], # type: ignore
        description=survey["description"] or "<No Description>", # type: ignore
        deadline = datetime.fromisoformat(survey["deadline"]) if survey["deadline"] else None, # type: ignore
        questions=await get_questions_by_survey_id(survey["id"], supabase) # type: ignore
    )

async def get_questions_by_survey_id(survey_id: str, supabase: Client) -> list[SurveyGetQuestion]:
    questions_out: list[SurveyGetQuestion] = []

    questions_res = (
        supabase.table("questions")
        .select("id", "survey_id", "prompt", "question_type", "order_index")
        .eq("survey_id", survey_id) # type: ignore
        .order("order_index", desc=False)
        .execute()
    )

    questions = questions_res.data
    if not questions:
        raise HTTPException(
            status_code=404,
            detail="Somehow the survey was found but not its questions. This shouldn't happen."
        )

    for question in questions:
        if question["question_type"] == "short_answer": # type: ignore
            questions_out.append(SurveyGetQuestion(
                question_id=uuid.UUID(question["id"]), # type: ignore
                prompt=question["prompt"], # type: ignore
                question_type=question["question_type"], # type: ignore
                answers=None
            ))      
        else:
            questions_out.append(SurveyGetQuestion( 
                question_id=uuid.UUID(question["id"]), # type: ignore
                prompt=question["prompt"], # type: ignore
                question_type=question["question_type"], # type: ignore
                answers=await get_answers_by_question_id(question["id"], supabase) # type: ignore
            ))            

    return questions_out

async def get_answers_by_question_id(question_id: str, supabase: Client) -> list[SurveyGetAnswerChoice]:
    answers_out: list[SurveyGetAnswerChoice] = []

    answers_res = (
        supabase.table("answer_options")
        .select("id", "question_id", "option_text", "order_index")
        .eq("question_id", question_id) # type: ignore
        .order("order_index", desc=False)
        .execute()
    )

    answers = answers_res.data
    if not answers:
        raise HTTPException(
            status_code=404,
            detail="Somehow the multiple choice question was found but not its answer choices. This shouldn't happen."
        )
    
    for answer in answers:
        answers_out.append(SurveyGetAnswerChoice(
            answer_option_id=uuid.UUID(answer["id"]), # type: ignore
            option_text=answer["option_text"] # type: ignore
        ))

    return answers_out

@router.get("/surveys_by_user/{user_id}", response_model=list[SurveyPreview], status_code=200)
async def get_surveys_by_user(user_id: str):
    supabase = get_supabase()
    output: list[SurveyPreview] = []

    joined_surveys_res = (
        supabase.table("survey_members")
        .select("survey_id", "user_id", "joined_at")
        .eq("user_id", user_id)
        .execute()
    )

    

    for entry in joined_surveys_res.data:
        
        survey_res = (
            supabase.table("surveys")
            .select("id", "title", "description", "deadline")
            .eq("id", entry["survey_id"]) # type: ignore
            .execute()
        )

        if not survey_res.data:
            continue

        survey = survey_res.data[0]
        output.append(SurveyPreview(
            survey_id=survey["id"], # type: ignore
            title=survey["title"], # type: ignore
            description=survey["description"] or "<No Description>", # type: ignore
            deadline=datetime.fromisoformat(survey["deadline"]) if survey["deadline"] else None # type: ignore
        ))

    return output

