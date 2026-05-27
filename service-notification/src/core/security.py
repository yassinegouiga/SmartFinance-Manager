import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status
from src.core.config import settings


def _initialize_firebase() -> None:
    if firebase_admin._apps:
        return
    if settings.FIREBASE_CREDENTIALS_PATH:
        import os
        if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            return
    firebase_admin.initialize_app()


async def verify_firebase_token(token: str) -> dict:
    _initialize_firebase()
    try:
        return auth.verify_id_token(token, clock_skew_seconds=30)
    except auth.RevokedIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked.")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
    except Exception as e:
        import logging
        logging.error(f"Firebase verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
