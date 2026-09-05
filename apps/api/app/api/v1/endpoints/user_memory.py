from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.user_memory import UserMemoryCreate, UserMemoryEntry
from app.services import user_memory_service

router = APIRouter()


@router.get("", response_model=list[UserMemoryEntry])
def list_user_memory(
    category: str | None = None,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    client = get_service_client()
    return user_memory_service.list_memory(client, user_id, category)


@router.post("", response_model=UserMemoryEntry, status_code=201)
def set_user_memory(
    data: UserMemoryCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    return user_memory_service.set_memory(client, user_id, data)


@router.delete("/{memory_id}", status_code=204)
def delete_user_memory(
    memory_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    client = get_service_client()
    deleted = user_memory_service.delete_memory(client, user_id, memory_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory entry not found")
