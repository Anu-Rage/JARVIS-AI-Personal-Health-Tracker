from datetime import datetime

from pydantic import BaseModel, Field


class BodyMetric(BaseModel):
    id: str
    recorded_at: datetime
    metric_type: str
    value: float
    unit: str


class BodyMetricCreate(BaseModel):
    recorded_at: datetime
    metric_type: str = Field(min_length=1)
    value: float
    unit: str = Field(min_length=1)
