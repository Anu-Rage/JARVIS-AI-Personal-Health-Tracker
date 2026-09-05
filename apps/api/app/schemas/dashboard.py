from pydantic import BaseModel

from app.schemas.analytics import WeeklySummary
from app.schemas.body_metric import BodyMetric
from app.schemas.nutrition import DailyNutrition
from app.schemas.user import UserProfile


class DashboardResponse(BaseModel):
    profile: UserProfile
    nutrition: DailyNutrition
    workout_completed_today: bool
    recent_weight: BodyMetric | None
    weekly_summary: WeeklySummary
