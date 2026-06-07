

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import AsyncSessionLocal
from src.core.security import verify_firebase_token
from src.models.user import User
from src.services.user import get_or_create_user

security_scheme = HTTPBearer()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    token_data = await verify_firebase_token(credentials.credentials)

    uid = token_data.get("uid")
    email = token_data.get("email", "")

    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required 'uid' claim.",
        )

    full_name = token_data.get("name", "")
    first_name = ""
    last_name = ""
    if full_name:
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    avatar_url = token_data.get("picture")

    firebase_claims = token_data.get("firebase", {})
    auth_provider = firebase_claims.get("sign_in_provider")

    user, _ = await get_or_create_user(
        db,
        firebase_uid=uid,
        email=email,
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
        auth_provider=auth_provider,
    )
    return user
