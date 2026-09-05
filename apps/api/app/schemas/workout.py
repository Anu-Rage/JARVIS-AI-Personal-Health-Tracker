from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ExerciseCategory = Literal["strength", "cardio", "mobility", "other"]


class Exercise(BaseModel):
    id: str
    name: str
    category: ExerciseCategory


class ExerciseCreate(BaseModel):
    name: str
    category: ExerciseCategory


class ExerciseEstimateRequest(BaseModel):
    name: str


class WorkoutSet(BaseModel):
    id: str
    set_number: int
    reps: int | None
    weight_kg: float | None
    duration_seconds: int | None


class WorkoutSetCreate(BaseModel):
    reps: int | None = Field(default=None, ge=0)
    weight_kg: float | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)


class WorkoutExercise(BaseModel):
    id: str
    exercise_id: str
    order_index: int
    exercise_name: str | None = None
    workout_sets: list[WorkoutSet] = Field(default_factory=list)
    volume_kg: float = 0


class WorkoutExerciseCreate(BaseModel):
    exercise_id: str
    sets: list[WorkoutSetCreate] = Field(min_length=1)


class WorkoutSession(BaseModel):
    id: str
    user_id: str
    started_at: datetime
    ended_at: datetime | None
    notes: str | None
    workout_exercises: list[WorkoutExercise] = Field(default_factory=list)
    total_volume_kg: float = 0


class WorkoutSessionCreate(BaseModel):
    started_at: datetime
    ended_at: datetime | None = None
    notes: str | None = None
    exercises: list[WorkoutExerciseCreate] = Field(min_length=1)
