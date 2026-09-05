from pydantic import BaseModel


class WeeklySummary(BaseModel):
    period_days: int
    days_logged: int
    avg_calories: float | None
    avg_protein_g: float | None
    avg_carbs_g: float | None
    avg_fat_g: float | None
    calorie_adherence_rate: float | None
    workout_count: int
    workout_total_volume_kg: float
    meal_logging_streak: int
    workout_logging_streak: int
    weight_start: float | None
    weight_end: float | None
    weight_change: float | None
