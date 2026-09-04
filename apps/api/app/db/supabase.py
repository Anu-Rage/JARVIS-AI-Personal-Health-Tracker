from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_service_client() -> Client:
    """Server-side Supabase client using the service-role key.

    This bypasses RLS, so every call site must scope queries by a user id
    that came from `get_current_user_id` (the validated JWT) -- never from
    client input -- to preserve ownership isolation.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
