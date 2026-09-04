from typing import Literal

from pydantic import BaseModel, Field

FoodSource = Literal["verified", "user_created", "ai_estimated"]


class FoodServing(BaseModel):
    id: str
    food_id: str
    serving_description: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float


class Food(BaseModel):
    id: str
    name: str
    source: FoodSource
    default_serving_id: str | None
    food_servings: list[FoodServing] = Field(default_factory=list)


class FoodServingCreate(BaseModel):
    serving_description: str
    calories: float = Field(ge=0)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    fiber_g: float = Field(default=0, ge=0)


class FoodCreate(BaseModel):
    name: str
    servings: list[FoodServingCreate] = Field(min_length=1)
