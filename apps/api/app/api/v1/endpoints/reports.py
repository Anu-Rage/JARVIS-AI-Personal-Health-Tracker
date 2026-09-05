from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.report import WeeklyReport
from app.services import report_service

router = APIRouter()


@router.get("/weekly", response_model=WeeklyReport)
def get_weekly_report(user_id: str = Depends(get_current_user_id)) -> dict:
    client = get_service_client()
    return report_service.generate_weekly_report(client, user_id)
