"""
Shared security utilities for all SmartFinance microservices.

This module provides Firebase JWT verification that can be imported
by any service, keeping authentication logic DRY (architecture §8).

During Docker builds, the common/ directory is copied into each
service's image so imports work seamlessly.
"""

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status


def initialize_firebase(credentials_path: str = "") -> None:
    """
    Initialize Firebase Admin SDK (idempotent).

    Args:
        credentials_path: Path to the service account JSON file.
                          If empty, falls back to GOOGLE_APPLICATION_CREDENTIALS.
    """
    if firebase_admin._apps:
        return

    if credentials_path:
        cred = credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()


async def verify_firebase_token(token: str) -> dict:
    """
    Verify a Firebase ID token and return decoded claims.

    Returns:
        dict with at least: uid, email, email_verified

    Raises:
        HTTPException 401 on invalid, expired, or revoked tokens.
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked.",
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
