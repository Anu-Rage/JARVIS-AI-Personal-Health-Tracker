from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_role_key: str

    cors_origins: str = "http://localhost:3000"
    # Vercel mints a new URL for every deployment (previews and, historically,
    # even production aliases). Matching by pattern instead of one hardcoded
    # URL means CORS doesn't silently break on every redeploy.
    cors_origin_regex: str = r"^https://jarvis-ai-personal-health-tracker(-[a-zA-Z0-9]+)*\.vercel\.app$"

    openai_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
