from pydantic import BaseModel


class ResolvedFood(BaseModel):
    food_id: str
    serving_id: str
    food_name: str
    serving_description: str


class PhotoAnalysisItem(BaseModel):
    food_name: str
    quantity: float
    resolved: ResolvedFood | None


class PhotoAnalysisResponse(BaseModel):
    items: list[PhotoAnalysisItem]
