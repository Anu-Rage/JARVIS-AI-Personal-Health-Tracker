from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service

router = APIRouter()


@router.get("", response_model=DashboardResponse)
def get_dashboard(user_id: str = Depends(get_current_user_id)) -> dict:
    client = get_service_client()
    return dashboard_service.get_dashboard(client, user_id)
