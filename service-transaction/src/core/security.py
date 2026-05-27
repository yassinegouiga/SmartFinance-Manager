"""
Firebase JWT verification module.
Initializes the Firebase Admin SDK and exposes a token verification function
used by the API dependency layer to authenticate every protected request.
"""

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status

from src.core.config import settings


def _initialize_firebase() -> None:
    """Initialize Firebase Admin SDK (idempotent — safe to call multiple times)."""
    if firebase_admin._apps:
        return

    if settings.FIREBASE_CREDENTIALS_PATH:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
    else:
        # Falls back to GOOGLE_APPLICATION_CREDENTIALS env var or default credentials
        firebase_admin.initialize_app()


async def verify_firebase_token(token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded claims.

    Args:
        token: The raw JWT string from the Authorization header.

    Returns:
        A dict containing at minimum: uid, email, email_verified.

    Raises:
        HTTPException 401 if the token is invalid, expired, or revoked.
    """
    _initialize_firebase()

    try:
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=30)
        return decoded_token
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please re-authenticate.",
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please re-authenticate.",
        )
    except Exception as e:
        import logging
        logging.error(f"Firebase verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
