from fastapi import APIRouter, Depends, HTTPException, status
from auth import get_user_id
from db import supabase_admin
from models.schemas import MergeRequestCreate, MergeRequestResponse

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post(
    "/{team_id}/merge-requests",
    response_model=MergeRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_merge_request(
    team_id: str,
    body: MergeRequestCreate,
    user_id: str = Depends(get_user_id),
):
    requesting_team_id = body.requesting_team_id

    if requesting_team_id == team_id:
        raise HTTPException(status_code=400, detail="Cannot merge a team with itself.")

    # Caller must be the creator of the requesting team
    req_team = (
        supabase_admin.table("teams")
        .select("id, created_by")
        .eq("id", requesting_team_id)
        .limit(1)
        .execute()
    )
    if not req_team.data:
        raise HTTPException(status_code=404, detail="Requesting team not found.")
    if req_team.data[0]["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="You are not the creator of the requesting team.")

    # Target team must exist
    target_team = (
        supabase_admin.table("teams")
        .select("id")
        .eq("id", team_id)
        .limit(1)
        .execute()
    )
    if not target_team.data:
        raise HTTPException(status_code=404, detail="Target team not found.")

    # No duplicate pending request between these two teams
    existing = (
        supabase_admin.table("merge_requests")
        .select("id")
        .eq("requesting_team_id", requesting_team_id)
        .eq("target_team_id", team_id)
        .eq("status", "pending")
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="A pending merge request already exists for these teams.")

    result = (
        supabase_admin.table("merge_requests")
        .insert({
            "requesting_team_id": requesting_team_id,
            "target_team_id": team_id,
            "status": "pending",
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create merge request.")

    return result.data[0]


def _get_pending_request(rid: str, team_id: str):
    """Fetch a pending merge request and verify it targets team_id."""
    res = (
        supabase_admin.table("merge_requests")
        .select("*")
        .eq("id", rid)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Merge request not found.")
    mr = res.data[0]
    if mr["target_team_id"] != team_id:
        raise HTTPException(status_code=404, detail="Merge request not found.")
    if mr["status"] != "pending":
        raise HTTPException(status_code=409, detail="Merge request is no longer pending.")
    return mr


def _assert_target_owner(team_id: str, user_id: str):
    """Raise 403 unless user_id is the creator of team_id."""
    res = (
        supabase_admin.table("teams")
        .select("created_by")
        .eq("id", team_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Target team not found.")
    if res.data[0]["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="You are not the creator of the target team.")


@router.post(
    "/{team_id}/merge-requests/{rid}/approve",
    response_model=MergeRequestResponse,
)
async def approve_merge_request(
    team_id: str,
    rid: str,
    user_id: str = Depends(get_user_id),
):
    _assert_target_owner(team_id, user_id)
    mr = _get_pending_request(rid, team_id)
    requesting_team_id = mr["requesting_team_id"]

    # Guard: combined size must not exceed max_size
    target = (
        supabase_admin.table("teams")
        .select("max_size")
        .eq("id", team_id)
        .limit(1)
        .execute()
    )
    max_size = target.data[0]["max_size"]

    target_members = (
        supabase_admin.table("team_members")
        .select("user_id")
        .eq("team_id", team_id)
        .eq("status", "approved")
        .execute()
    )
    requesting_members = (
        supabase_admin.table("team_members")
        .select("user_id")
        .eq("team_id", requesting_team_id)
        .eq("status", "approved")
        .execute()
    )
    new_total = len(target_members.data) + len(requesting_members.data)
    if new_total > max_size:
        raise HTTPException(
            status_code=409,
            detail=f"Merge would exceed max size of {max_size} ({new_total} members).",
        )

    # Move all members of requesting team into target team
    supabase_admin.table("team_members").update({"team_id": team_id}).eq(
        "team_id", requesting_team_id
    ).execute()

    # Mark requesting team as merged
    supabase_admin.table("teams").update({"merged_into": team_id}).eq(
        "id", requesting_team_id
    ).execute()

    # Update merge request status
    updated = (
        supabase_admin.table("merge_requests")
        .update({"status": "approved"})
        .eq("id", rid)
        .execute()
    )

    return updated.data[0]


@router.post(
    "/{team_id}/merge-requests/{rid}/reject",
    response_model=MergeRequestResponse,
)
async def reject_merge_request(
    team_id: str,
    rid: str,
    user_id: str = Depends(get_user_id),
):
    _assert_target_owner(team_id, user_id)
    _get_pending_request(rid, team_id)

    updated = (
        supabase_admin.table("merge_requests")
        .update({"status": "rejected"})
        .eq("id", rid)
        .execute()
    )

    return updated.data[0]
