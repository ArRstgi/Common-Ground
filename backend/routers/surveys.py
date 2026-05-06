import random
import string
import uuid
from datetime import datetime, timezone
 
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client, Client

from auth import get_user_id
from db import supabase_admin
from models.schemas import AnswerOptionIn, QuestionIn, SurveyCreateRequest, SurveyCreateResponse

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

# ── Route ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=SurveyCreateResponse, status_code=201)
async def create_survey(body: SurveyCreateRequest, user_id: str = Depends(get_user_id)):
    """
    Create a survey with its questions and (for multiple-choice questions)
    answer options.  All inserts are performed in a logical sequence; if any
    step fails the survey row is deleted to avoid orphaned records.
    """
    profile = supabase_admin.table("profiles").select("role").eq("id", user_id).maybe_single().execute()
    if not profile.data or profile.data.get("role") != "survey_creator":
        raise HTTPException(status_code=403, detail="Only survey creators can create surveys.")

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
        id=uuid.UUID(created_survey["id"]),
        join_code=created_survey["join_code"],
        created_at=datetime.fromisoformat(created_survey["created_at"]),
    )