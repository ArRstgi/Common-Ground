from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from db import supabase

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/users/{user_id}")
async def get_user_by_id(user_id: str, current_user=Depends(get_current_user)):
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return result.data

@router.get("/survey/{survey_id}/users/{user_id}")
async def get_user_survey_answers(survey_id: str, user_id: str, current_user=Depends(get_current_user)):

    questions_res = (
        supabase.table("questions")
        .select("id, prompt, question_type, order_index")
        .eq("survey_id", survey_id)
        .order("order_index")
        .execute()
    )

    if not questions_res.data:
        raise HTTPException(status_code=404, detail="No questions found for this survey")

    question_ids = [q["id"] for q in questions_res.data]

    responses_res = (
        supabase.table("survey_responses")
        .select("question_id, answer_option_id, answer_text")
        .eq("survey_id", survey_id)
        .eq("user_id", user_id)
        .in_("question_id", question_ids)
        .execute()
    )

    answer_map = {
        r["question_id"]: {
            "answer_option_id": r["answer_option_id"],
            "answer_text": r["answer_text"],
        }
        for r in responses_res.data
    }

    result = [
        {
            "question_id": q["id"],
            "prompt": q["prompt"],
            "question_type": q["question_type"],
            "order_index": q["order_index"],
            "answer": answer_map.get(q["id"], None),
        }
        for q in questions_res.data
    ]

    return {
        "user_id": user_id,
        "survey_id": survey_id,
        "responses": result
    }

@router.get("/survey/{survey_id}/responses")
async def get_all_survey_responses(survey_id: str, current_user=Depends(get_current_user)):

    questions_res = (
        supabase.table("questions")
        .select("id, prompt, question_type, order_index")
        .eq("survey_id", survey_id)
        .order("order_index")
        .execute()
    )

    if not questions_res.data:
        raise HTTPException(status_code=404, detail="No questions found for this survey")

    question_ids = [q["id"] for q in questions_res.data]

    responses_res = (
        supabase.table("survey_responses")
        .select("user_id, question_id, answer_option_id, answer_text")
        .eq("survey_id", survey_id)
        .in_("question_id", question_ids)
        .execute()
    )

    user_answers = {}
    for r in responses_res.data:
        uid = r["user_id"]
        if uid not in user_answers:
            user_answers[uid] = {}
        user_answers[uid][r["question_id"]] = {
            "answer_option_id": r["answer_option_id"],
            "answer_text": r["answer_text"],
        }

    result = {
        uid: {
            q["id"]: {
                "prompt": q["prompt"],
                "question_type": q["question_type"],
                "order_index": q["order_index"],
                "answer": answers.get(q["id"], None),
            }
            for q in questions_res.data
        }
        for uid, answers in user_answers.items()
    }

    return {
        "survey_id": survey_id,
        "users": result
    }

@router.get("/survey/{survey_id}/teams")
async def get_survey_teams(survey_id: str, current_user=Depends(get_current_user)):
    teams_res = (
        supabase.table("teams")
        .select("id")
        .eq("survey_id", survey_id)
        .execute()
    )

    if not teams_res.data:
        return {}

    team_ids = [t["id"] for t in teams_res.data]

    members_res = (
        supabase.table("team_members")
        .select("team_id, user_id")
        .in_("team_id", team_ids)
        .execute()
    )

    result = {}
    for row in members_res.data:
        tid = row["team_id"]
        if tid not in result:
            result[tid] = []
        result[tid].append(row["user_id"])

    return result
    

def compare_response(user_1_responses, user_2_responses):
    pass

@router.get("/users/{user_id}/matches")
async def get_user_matches(user_id: str, survey_id: str, current_user=Depends(get_current_user)):
    pass