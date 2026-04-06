from db import supabase
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

    # Update the auto-created profile with the display name
    if body.full_name:
        supabase.table("profiles").update({"full_name": body.full_name}).eq(
            "id", response.user.id
        ).execute()

    return AuthResponse(
        access_token=response.session.access_token,
        user_id=str(response.user.id),
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

    return AuthResponse(
        access_token=response.session.access_token,
        user_id=str(response.user.id),
    )
