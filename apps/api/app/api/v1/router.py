from fastapi import APIRouter

from app.api.v1.endpoints import (
    body_metrics,
    exercises,
    foods,
    meals,
    nutrition,
    users,
    workouts,
)

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(foods.router, prefix="/foods", tags=["foods"])
api_router.include_router(meals.router, prefix="/meals", tags=["meals"])
api_router.include_router(nutrition.router, prefix="/nutrition", tags=["nutrition"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
api_router.include_router(workouts.router, prefix="/workouts", tags=["workouts"])
api_router.include_router(body_metrics.router, prefix="/body-metrics", tags=["body-metrics"])
