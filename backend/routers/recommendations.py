from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from db import supabase
import copy

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

# get all responses from all users for a given survey
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

# retrieve all the teams and its members (id and fullname) for a given survey
@router.get("/survey/{survey_id}/teams")
async def get_survey_teams(survey_id: str, current_user=Depends(get_current_user)):
    teams_res = (
        supabase.table("teams")
        .select("id, name, description, max_size")
        .eq("survey_id", survey_id)
        .execute()
    )

    if not teams_res.data:
        return {}

    team_ids = [t["id"] for t in teams_res.data]

    members_res = (
        supabase.table("team_members")
        .select("team_id, user_id, profiles(full_name, school, major, grad_year)")
        .in_("team_id", team_ids)
        .execute()
    )

    result = {}
    for t in teams_res.data:
        tid = t["id"]
        result[tid] = {
            "name": t["name"],
            "description": t["description"],
            "max_size": t["max_size"],
            "members": [],
        }

    for row in members_res.data:
        tid = row["team_id"]
        if tid in result:
            profile = row.get("profiles") or {}
            result[tid]["members"].append({
                "user_id": row["user_id"],
                "full_name": profile.get("full_name"),
                "school": profile.get("school"),
                "major": profile.get("major"),
                "grad_year": profile.get("grad_year"),
            })

    return result

def calculate_user_compatibility_score(user_id1, user_id2, all_survey_responses):
    users = all_survey_responses.get("users", {})
    if user_id1 not in users or user_id2 not in users:
        return 0
    
    user_1_answers = all_survey_responses["users"][user_id1]
    user_2_answers = all_survey_responses["users"][user_id2]

    total_questions = len(user_1_answers)

    match_questions = 0

    for question_id, question_details in user_1_answers.items():
        if question_id in user_2_answers:
            ans1 = question_details.get("answer", {})
            user_1_answer = ans1.get("answer_option_id") or ans1.get("answer_text")

            ans2 = user_2_answers.get(question_id, {}).get("answer", {})
            user_2_answer = ans2.get("answer_option_id") or ans2.get("answer_text")
            if user_1_answer == user_2_answer:
                match_questions += 1

    return match_questions / total_questions if total_questions > 0 else 0

def calculate_team_compatibility_score(team_id1, team_id2, all_survey_responses, all_teams):
    team1_members = [user_object["user_id"] for user_object in all_teams[team_id1]["members"]]
    team2_members = [user_object["user_id"] for user_object in all_teams[team_id2]["members"]]

    total_score = 0
    comparisons = 0
    for user1 in team1_members:
        for user2 in team2_members:
            total_score += calculate_user_compatibility_score(user1, user2, all_survey_responses)
            comparisons += 1

    return total_score / comparisons if comparisons > 0 else 0

def parse_recommendation_result(recommendation_result: dict) -> list:
    parsed = []

    for team_id, team in recommendation_result.items():
        score = team.get("score", -1)

        if score == -1:
            continue

        members = team.get("members", [])
        max_size = team.get("max_size", 4)
        spots_left = max_size - len(members)
        is_solo = len(members) == 1

        parsed.append({
            "id": team_id,
            "type": "person" if is_solo else "team",
            "name": team.get("name"),
            "members": [
                {
                    "id": m.get("user_id"),
                    "name": m.get("full_name"),
                    "school": m.get("school"),
                    "major": m.get("major"),
                    "gradYear": m.get("grad_year"),
                }
                for m in members
            ],
            "maxSize": max_size,
            "description": team.get("description"),
            "matchPct": round(score * 100),
            "spotsLeft": spots_left,
        })

    parsed.sort(key=lambda x: x["matchPct"], reverse=True)

    return parsed

# TODO fix this
@router.get("/survey/{survey_id}/matches")
async def get_user_matches(survey_id: str, current_user=Depends(get_current_user)):
    all_teams = await get_survey_teams(survey_id, current_user)
    all_teams_with_scores = copy.deepcopy(all_teams)
    all_survey_responses = await get_all_survey_responses(survey_id, current_user)

    current_user_id = current_user["sub"]  # fix: was current_user["user_id"]
    current_user_team_id = next(
        (team_id for team_id, team in all_teams.items()
         if any(m["user_id"] == current_user_id for m in team["members"])),
        None
    )

    if current_user_team_id is None:
        raise HTTPException(status_code=404, detail="Current user is not in any team for this survey")

    for team_id in all_teams:
        if team_id != current_user_team_id:
            all_teams_with_scores[team_id]["score"] = calculate_team_compatibility_score(
                team_id, current_user_team_id, all_survey_responses, all_teams
            )
        else:
            all_teams_with_scores[team_id]["score"] = -1

    return parse_recommendation_result(all_teams_with_scores)