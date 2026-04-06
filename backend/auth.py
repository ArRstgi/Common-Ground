from db import supabase
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency — verifies the Supabase JWT using the SDK's get_claims()
    method, which fetches and caches the project's JWKS endpoint automatically.

    This is the recommended approach per Supabase docs:
      https://supabase.com/docs/guides/auth/signing-keys
      https://supabase.com/docs/reference/python/auth-getclaims

    Usage in a route:
        @router.get("/me")
        async def me(user = Depends(get_current_user)):
            return {"user_id": user["sub"]}
    """
    token = credentials.credentials

    claims = supabase.auth.get_claims(jwt=token)

    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return claims["claims"]


async def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """Shorthand dependency that returns just the user UUID string."""
    return user["sub"]
