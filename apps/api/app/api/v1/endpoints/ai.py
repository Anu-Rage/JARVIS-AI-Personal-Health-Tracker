from fastapi import APIRouter, Depends

from app.agent.orchestrator import run_chat
from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(data: ChatRequest, user_id: str = Depends(get_current_user_id)) -> dict:
    client = get_service_client()
    messages = [m.model_dump() for m in data.messages]
    return run_chat(client, user_id, messages)
