from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.database import AsyncSessionLocal
from src.core.security import verify_firebase_token

security_scheme = HTTPBearer()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)]
) -> str:
    """Validate Firebase JWT and return the Firebase UID string."""
    token_data = await verify_firebase_token(credentials.credentials)

    uid = token_data.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required 'uid' claim.",
        )

    return uid
