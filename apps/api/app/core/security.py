from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

_bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache
def _get_jwk_client() -> jwt.PyJWKClient:
    # Supabase projects created since the JWT-signing-keys rollout sign
    # session tokens with a per-project asymmetric key (ES256) published at
    # this JWKS endpoint, rather than a shared HS256 secret. PyJWKClient
    # fetches and caches the public key by `kid`.
    return jwt.PyJWKClient(get_settings().supabase_jwks_url, cache_keys=True)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Validate the Supabase Auth JWT and return the authenticated user's id.

    This is the only place a user id is allowed to enter the system: every
    endpoint depends on this instead of accepting a user_id from the request
    body/query/model, so the AI or a client can never impersonate another
    user (see §26/§27 of the architecture doc).
    """
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(credentials.credentials)
        payload = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject claim")

    return user_id
