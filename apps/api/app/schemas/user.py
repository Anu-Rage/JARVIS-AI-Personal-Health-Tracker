from datetime import datetime

from pydantic import BaseModel


class UserProfile(BaseModel):
    id: str
    display_name: str | None
    timezone: str
    created_at: datetime
    updated_at: datetime
