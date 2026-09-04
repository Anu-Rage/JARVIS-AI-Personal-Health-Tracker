from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.nutrition import DailyNutrition
from app.services import nutrition_service

router = APIRouter()


@router.get("/daily", response_model=DailyNutrition)
def get_daily_nutrition(
    for_date: date | None = None,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    # Default "today" to the current UTC date, matching the UTC day-bounds
    # meals are filtered by -- date.today() would use the server's local
    # date, which drifts from the UTC filter window for any user ahead of
    # UTC (e.g. IST) during evening/night hours, silently hiding same-day
    # meals from the totals. True per-user-timezone "today" is a later
    # refinement once user_profiles.timezone is wired through.
    today_utc = datetime.now(timezone.utc).date()
    return nutrition_service.get_daily_nutrition(client, user_id, for_date or today_utc)
