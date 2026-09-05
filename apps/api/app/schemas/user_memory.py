from typing import Literal

from pydantic import BaseModel, Field

MemoryCategory = Literal["goal", "equipment", "preference", "constraint", "observation"]


class UserMemoryEntry(BaseModel):
    id: str
    category: MemoryCategory
    key: str
    value: str


class UserMemoryCreate(BaseModel):
    category: MemoryCategory
    key: str = Field(min_length=1)
    value: str = Field(min_length=1)
