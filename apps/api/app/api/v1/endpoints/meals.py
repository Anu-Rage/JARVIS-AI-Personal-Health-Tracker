from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.meal import Meal, MealCreate
from app.schemas.photo import PhotoAnalysisResponse
from app.services import meal_service, photo_service, user_service

router = APIRouter()

_ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_PHOTO_BYTES = 8 * 1024 * 1024


@router.get("", response_model=list[Meal])
def list_meals(
    for_date: date | None = None,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    client = get_service_client()
    tz_name = user_service.get_timezone(client, user_id) if for_date else None
    return meal_service.list_meals(client, user_id, for_date, tz_name)


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


@router.post("/analyze-photo", response_model=PhotoAnalysisResponse)
async def analyze_meal_photo(
    photo: UploadFile = File(...),
    _user_id: str = Depends(get_current_user_id),
) -> dict:
    if photo.content_type not in _ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Photo must be JPEG, PNG, or WebP.",
        )

    image_bytes = await photo.read()
    if len(image_bytes) > _MAX_PHOTO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Photo too large (max 8MB) -- compress it before uploading.",
        )

    client = get_service_client()
    items = photo_service.analyze_meal_photo(client, image_bytes, photo.content_type)
    return {"items": items}


@router.delete("/{meal_id}", status_code=204)
def delete_meal(
    meal_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    client = get_service_client()
    deleted = meal_service.soft_delete_meal(client, user_id, meal_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
