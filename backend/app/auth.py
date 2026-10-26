# Re-export for backward compatibility
from app.core import (
    create_access_token,
    decode_access_token,
    get_current_user,
    hash_password,
    oauth2_scheme,
    require_admin,
    require_role,
    require_user,
    verify_password,
)

__all__ = [
    "create_access_token",
    "decode_access_token",
    "hash_password",
    "verify_password",
    "get_current_user",
    "oauth2_scheme",
    "require_admin",
    "require_role",
    "require_user",
]
