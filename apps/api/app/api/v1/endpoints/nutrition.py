from datetime import date

from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.domain.dates import today_in_timezone
from app.schemas.nutrition import DailyNutrition
from app.services import nutrition_service, user_service

router = APIRouter()


@router.get("/daily", response_model=DailyNutrition)
def get_daily_nutrition(
    for_date: date | None = None,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    tz_name = user_service.get_timezone(client, user_id)
    today = for_date or today_in_timezone(tz_name)
    return nutrition_service.get_daily_nutrition(client, user_id, today, tz_name)
