

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status

from src.core.config import settings


def _initialize_firebase() -> None:
    if firebase_admin._apps:
        return

    if settings.FIREBASE_CREDENTIALS_PATH:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()


async def verify_firebase_token(token: str) -> dict:
    _initialize_firebase()

    try:
        from src.services.firebase_proxy import firebase_auth_proxy
        decoded_token = firebase_auth_proxy.verify_id_token(token, clock_skew_seconds=30)
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
        logging.getLogger("user-service.security").error(f"Firebase token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
