from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.workout import WorkoutSession, WorkoutSessionCreate
from app.services import workout_service

router = APIRouter()


@router.get("", response_model=list[WorkoutSession])
def list_workouts(
    for_date: date | None = None,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    client = get_service_client()
    return workout_service.list_sessions(client, user_id, for_date)


@router.post("", response_model=WorkoutSession, status_code=201)
def create_workout(
    data: WorkoutSessionCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    try:
        return workout_service.create_session(client, user_id, data)
    except workout_service.ExerciseNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Exercise not found, please create it or clarify.",
        ) from exc


@router.delete("/{session_id}", status_code=204)
def delete_workout(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    client = get_service_client()
    deleted = workout_service.soft_delete_session(client, user_id, session_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
