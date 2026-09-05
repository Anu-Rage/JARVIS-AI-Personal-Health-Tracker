from datetime import datetime

from pydantic import BaseModel


class Goal(BaseModel):
    id: str
    calorie_target: float | None
    protein_target_g: float | None
    carb_target_g: float | None
    fat_target_g: float | None
    weight_goal_kg: float | None
    active: bool
    created_at: datetime


class GoalCreate(BaseModel):
    calorie_target: float | None = None
    protein_target_g: float | None = None
    carb_target_g: float | None = None
    fat_target_g: float | None = None
    weight_goal_kg: float | None = None
