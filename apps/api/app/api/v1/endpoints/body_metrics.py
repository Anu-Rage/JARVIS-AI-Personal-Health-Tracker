from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.body_metric import BodyMetric, BodyMetricCreate
from app.services import body_metric_service

router = APIRouter()


@router.get("", response_model=list[BodyMetric])
def list_body_metrics(
    metric_type: str | None = None,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    client = get_service_client()
    return body_metric_service.list_metrics(client, user_id, metric_type)


@router.post("", response_model=BodyMetric, status_code=201)
def create_body_metric(
    data: BodyMetricCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    client = get_service_client()
    return body_metric_service.create_metric(client, user_id, data)


@router.delete("/{metric_id}", status_code=204)
def delete_body_metric(
    metric_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    client = get_service_client()
    deleted = body_metric_service.soft_delete_metric(client, user_id, metric_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Body metric not found")
