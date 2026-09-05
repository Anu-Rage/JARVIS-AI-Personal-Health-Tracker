from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.analytics import WeeklySummary
from app.services import analytics_service

router = APIRouter()


@router.get("/weekly", response_model=WeeklySummary)
def get_weekly_summary(user_id: str = Depends(get_current_user_id)) -> dict:
    client = get_service_client()
    return analytics_service.get_weekly_summary(client, user_id)
