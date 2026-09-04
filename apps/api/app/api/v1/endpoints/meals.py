from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.meal import Meal, MealCreate
from app.services import meal_service

router = APIRouter()


@router.get("", response_model=list[Meal])
def list_meals(
    for_date: date | None = None,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    client = get_service_client()
    return meal_service.list_meals(client, user_id, for_date)


@router.post("", response_model=Meal, status_code=201)
def create_meal(
    data: MealCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    try:
        return meal_service.create_meal(client, user_id, data)
    except meal_service.FoodNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Food not found, please create it or clarify the item.",
        ) from exc


@router.delete("/{meal_id}", status_code=204)
def delete_meal(
    meal_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    client = get_service_client()
    deleted = meal_service.soft_delete_meal(client, user_id, meal_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
