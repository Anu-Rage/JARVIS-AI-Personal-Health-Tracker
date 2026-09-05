from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.goal import Goal, GoalCreate
from app.services import goal_service

router = APIRouter()


@router.get("", response_model=Goal | None)
def get_goal(user_id: str = Depends(get_current_user_id)) -> dict | None:
    client = get_service_client()
    return goal_service.get_active_goal(client, user_id)


@router.post("", response_model=Goal, status_code=201)
def set_goal(data: GoalCreate, user_id: str = Depends(get_current_user_id)) -> dict:
    client = get_service_client()
    return goal_service.set_goal(client, user_id, data)
