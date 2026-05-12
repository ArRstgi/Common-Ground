from fastapi import APIRouter, Depends, HTTPException, Query
from auth import get_user_id
from db import supabase
from models.schemas import (
    TeamSearchResponse, TeamSearchResult, SearchMemberProfile,
)

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/teams", response_model=TeamSearchResponse)
async def search_teams(
    survey_id: str = Query(...),
    name: str | None = Query(None),
    has_space: bool | None = Query(None),
    sort_by: str | None = Query(None, pattern="^(name|spots)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    filter_question_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user_id: str = Depends(get_user_id),
):
    # Resolve which user IDs share the current user's answer to the filtered question
    matching_user_ids: set[str] | None = None
    if filter_question_id:
        my_ans = (
            supabase.table("survey_responses")
            .select("answer_option_id, answer_text")
            .eq("user_id", current_user_id)
            .eq("question_id", filter_question_id)
            .maybe_single()
            .execute()
        )
        if my_ans and my_ans.data:
            ans = my_ans.data
            same_q = (
                supabase.table("survey_responses")
                .select("user_id")
                .eq("question_id", filter_question_id)
                .neq("user_id", current_user_id)
            )
            if ans.get("answer_option_id"):
                same_q = same_q.eq("answer_option_id", ans["answer_option_id"])
            elif ans.get("answer_text"):
                same_q = same_q.eq("answer_text", ans["answer_text"])
            else:
                same_q = None

            if same_q is not None:
                same_res = same_q.execute()
                matching_user_ids = {r["user_id"] for r in (same_res.data or [])}
            else:
                matching_user_ids = set()

    query = (
        supabase.table("teams")
        .select("id, name, description, max_size, created_by, team_members(user_id, status, profiles(full_name))")
        .eq("survey_id", survey_id)
        .is_("merged_into", None)
    )
    if name:
        query = query.ilike("name", f"%{name}%")

    result = query.execute()
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch teams")

    teams = []
    for t in result.data:
        approved = [
            m for m in (t.get("team_members") or [])
            if m.get("status") == "approved"
        ]
        if has_space is True and len(approved) >= t["max_size"]:
            continue
        if matching_user_ids is not None:
            member_ids = {m["user_id"] for m in approved}
            if not member_ids & matching_user_ids:
                continue
        teams.append(
            TeamSearchResult(
                id=t["id"],
                name=t["name"],
                description=t.get("description"),
                max_size=t["max_size"],
                created_by=t["created_by"],
                team_members=[
                    SearchMemberProfile(
                        user_id=m["user_id"],
                        full_name=(m.get("profiles") or {}).get("full_name"),
                    )
                    for m in approved
                ],
            )
        )

    desc = sort_order == "desc"
    if sort_by == "name":
        teams.sort(key=lambda t: t.name.lower(), reverse=desc)
    elif sort_by == "spots":
        teams.sort(key=lambda t: t.max_size - len(t.team_members), reverse=desc)

    total = len(teams)
    offset = (page - 1) * page_size
    page_slice = teams[offset : offset + page_size]

    return TeamSearchResponse(results=page_slice, total=total, page=page)
