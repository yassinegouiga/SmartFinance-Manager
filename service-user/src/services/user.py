"""
Business logic layer for User operations.
Orchestrates CRUD calls and implements domain rules
(e.g., auto-onboarding on first Firebase login — architecture §9 step 6).
"""

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
    """
    Retrieve an existing user or auto-create on first login.

    This implements the "User Extraction" step from the authentication flow:
    the uid from the Firebase token is used to identify the user, creating
    a local user record if it's their first login.

    For Google OAuth sign-ins, first_name, last_name, and avatar_url are
    extracted from the Firebase token claims and stored on first creation.

    Args:
        db: Async database session.
        firebase_uid: The `uid` claim from the verified Firebase JWT.
        email: The `email` claim from the verified Firebase JWT.
        first_name: Display name (first part) from Google profile, if available.
        last_name: Display name (last part) from Google profile, if available.
        avatar_url: Profile photo URL from Google profile, if available.
        auth_provider: Sign-in method (e.g., "google.com", "password").

    Returns:
        A tuple of (User, is_new) where is_new indicates first-time creation.
    """
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
