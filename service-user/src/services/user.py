

from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.user import get_user_by_firebase_uid, create_user
from src.models.user import User
from src.schemas.user import UserCreate


async def get_or_create_user(
    db: AsyncSession,
    firebase_uid: str,
    email: str,
    first_name: str = "",
    last_name: str = "",
    avatar_url: str | None = None,
    auth_provider: str | None = None,
) -> tuple[User, bool]:
    user = await get_user_by_firebase_uid(db, firebase_uid)
    if user:
        return user, False

    user_in = UserCreate(
        firebase_uid=firebase_uid,
        email=email,
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
        auth_provider=auth_provider,
    )
    user = await create_user(db, user_in)
    return user, True
