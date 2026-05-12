from db import supabase, supabase_admin
from fastapi import APIRouter, HTTPException, status
from models.schemas import AuthResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
async def register(body: RegisterRequest):
    """Create a new account. Supabase Auth handles password hashing."""
    response = supabase.auth.sign_up(
        {
            "email": body.email,
            "password": body.password,
            "options": {"data": {"full_name": body.full_name}},
        }
    )
    if response.user is None:
        raise HTTPException(
            status_code=400, detail="Registration failed. Email may already be in use."
        )

    # Update the auto-created profile with name and role
    profile_update = {"role": body.role}
    if body.full_name:
        profile_update["full_name"] = body.full_name
    supabase_admin.table("profiles").update(profile_update).eq(
        "id", response.user.id
    ).execute()

    return AuthResponse(
        access_token=response.session.access_token,
        user_id=str(response.user.id),
        role=body.role,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Sign in with email and password, returns a JWT."""
    response = supabase.auth.sign_in_with_password(
        {
            "email": body.email,
            "password": body.password,
        }
    )
    if response.user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    profile = supabase_admin.table("profiles").select("role").eq(
        "id", response.user.id
    ).maybe_single().execute()
    role = profile.data["role"] if profile.data else "member"

    return AuthResponse(
        access_token=response.session.access_token,
        user_id=str(response.user.id),
        role=role,
    )
