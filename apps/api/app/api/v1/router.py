from fastapi import APIRouter

from app.api.v1.endpoints import (
    ai,
    body_metrics,
    dashboard,
    exercises,
    foods,
    meals,
    nutrition,
    user_memory,
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
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(user_memory.router, prefix="/user-memory", tags=["user-memory"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
