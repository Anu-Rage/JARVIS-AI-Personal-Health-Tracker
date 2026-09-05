from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.food import Food, FoodCreate, FoodEstimateRequest
from app.services import food_service

router = APIRouter()


@router.get("", response_model=list[Food])
def search_foods(
    query: str | None = None,
    _user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    client = get_service_client()
    return food_service.search_foods(client, query)


@router.post("", response_model=Food, status_code=201)
def create_food(
    data: FoodCreate,
    _user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    return food_service.create_food(client, data)


@router.post("/estimate", response_model=Food, status_code=201)
def estimate_food(
    data: FoodEstimateRequest,
    _user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    return food_service.estimate_and_create_food(client, data.name)
