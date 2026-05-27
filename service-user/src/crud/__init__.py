"""
Re-export CRUD functions.
"""

from src.crud.user import (
    get_user_by_firebase_uid,
    get_user_by_id,
    get_user_by_email,
    create_user,
    update_user,
    update_settings,
    delete_user,
)

__all__ = [
    "get_user_by_firebase_uid",
    "get_user_by_id",
    "get_user_by_email",
    "create_user",
    "update_user",
    "update_settings",
    "delete_user",
]
