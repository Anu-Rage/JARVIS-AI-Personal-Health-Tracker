from pydantic import BaseModel


class NutritionTotals(BaseModel):
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float


class MacroRemaining(BaseModel):
    calorie_target: float | None
    protein_target_g: float | None
    carb_target_g: float | None
    fat_target_g: float | None
    calories_remaining: float | None
    protein_remaining_g: float | None
    carbs_remaining_g: float | None
    fat_remaining_g: float | None


class DailyNutrition(BaseModel):
    date: str
    totals: NutritionTotals
    meal_count: int
    remaining: MacroRemaining
