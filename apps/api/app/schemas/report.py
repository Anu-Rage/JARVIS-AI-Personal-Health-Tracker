from pydantic import BaseModel

from app.schemas.analytics import WeeklySummary


class WeeklyReport(BaseModel):
    summary: WeeklySummary
    narrative: str
