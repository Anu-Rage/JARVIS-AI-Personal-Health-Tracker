from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

MealType = Literal["breakfast", "lunch", "dinner", "snack"]
NutritionConfidence = Literal["verified", "estimated"]


class MealItem(BaseModel):
    id: str
    food_id: str
    serving_id: str
    quantity: float
    nutrition_confidence: NutritionConfidence
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    food_name: str | None = None
    serving_description: str | None = None


class Meal(BaseModel):
    id: str
    user_id: str
    logged_at: datetime
    meal_type: MealType
    input_source: Literal["text", "photo", "manual"]
    raw_input: str | None
    meal_items: list[MealItem] = Field(default_factory=list)


class MealItemCreate(BaseModel):
    food_id: str
    serving_id: str
    quantity: float = Field(gt=0)


class MealCreate(BaseModel):
    logged_at: datetime
    meal_type: MealType
    items: list[MealItemCreate] = Field(min_length=1)
