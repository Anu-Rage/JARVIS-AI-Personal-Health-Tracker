from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.user import UserProfile, UserProfileUpdate
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=UserProfile)
def get_my_profile(user_id: str = Depends(get_current_user_id)) -> UserProfile:
    client = get_service_client()
    result = (
        client.table("user_profiles")
        .select("id, display_name, timezone, created_at, updated_at")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    return UserProfile(**result.data)


@router.patch("/me", response_model=UserProfile)
def update_my_profile(
    data: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
) -> UserProfile:
    try:
        ZoneInfo(data.timezone)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown timezone: {data.timezone}",
        ) from exc

    client = get_service_client()
    user_service.update_timezone(client, user_id, data.timezone)
    return get_my_profile(user_id)
