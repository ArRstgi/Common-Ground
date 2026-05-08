from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, get_user_id
from db import supabase
from models.schemas import ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me")
async def get_my_profile(user_id: str = Depends(get_user_id)):
    """Return the current user's profile row."""
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data


@router.patch("/me")
async def update_my_profile(body: ProfileUpdate, user_id: str = Depends(get_user_id)):
    """Update the current user's profile fields."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    result = (
        supabase.table("profiles")
        .update(updates)
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    return result.data[0]


@router.get("/me/surveys")
async def get_my_surveys(user_id: str = Depends(get_user_id)):
    """
    Return all surveys the current user is a member of,
    along with their responses for each survey.
    """
    # Get all survey memberships for this user
    members_res = (
        supabase.table("survey_members")
        .select("survey_id, joined_at, surveys(id, title)")
        .eq("user_id", user_id)
        .execute()
    )

    if not members_res.data:
        return []

    results = []
    for membership in members_res.data:
        survey = membership.get("surveys", {})
        survey_id = membership["survey_id"]

        # Get questions for this survey
        questions_res = (
            supabase.table("questions")
            .select("id, prompt, question_type, order_index")
            .eq("survey_id", survey_id)
            .order("order_index")
            .execute()
        )

        # Get this user's responses for this survey
        responses_res = (
            supabase.table("survey_responses")
            .select("question_id, answer_option_id, answer_text")
            .eq("survey_id", survey_id)
            .eq("user_id", user_id)
            .execute()
        )

        # Build answer map: question_id -> answer text/option
        answer_map = {}
        if responses_res.data:
            # For multiple_choice we need to resolve the option text
            option_ids = [
                r["answer_option_id"]
                for r in responses_res.data
                if r.get("answer_option_id")
            ]
            option_text_map = {}
            if option_ids:
                opts_res = (
                    supabase.table("answer_options")
                    .select("id, option_text")
                    .in_("id", option_ids)
                    .execute()
                )
                if opts_res.data:
                    option_text_map = {o["id"]: o["option_text"] for o in opts_res.data}

            for r in responses_res.data:
                if r.get("answer_option_id"):
                    answer_map[r["question_id"]] = option_text_map.get(r["answer_option_id"], "")
                else:
                    answer_map[r["question_id"]] = r.get("answer_text", "")

        # Build response list paired with question prompts
        response_list = []
        for q in (questions_res.data or []):
            ans = answer_map.get(q["id"])
            if ans is not None:
                response_list.append({"q": q["prompt"], "a": ans})

        results.append({
            "survey_id": survey_id,
            "title": survey.get("title", ""),
            "joined_at": membership["joined_at"],
            "submitted": len(response_list) > 0,
            "responses": response_list,
        })

    return results
