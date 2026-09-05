from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.workout import Exercise, ExerciseCreate, ExerciseEstimateRequest
from app.services import exercise_service

router = APIRouter()


@router.get("", response_model=list[Exercise])
def search_exercises(
    query: str | None = None,
    _user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    client = get_service_client()
    return exercise_service.search_exercises(client, query)


@router.post("", response_model=Exercise, status_code=201)
def create_exercise(
    data: ExerciseCreate,
    _user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    return exercise_service.create_exercise(client, data)


@router.post("/estimate", response_model=Exercise, status_code=201)
def estimate_exercise(
    data: ExerciseEstimateRequest,
    _user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    return exercise_service.classify_and_create_exercise(client, data.name)
