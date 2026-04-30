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
