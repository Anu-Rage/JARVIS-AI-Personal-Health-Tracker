import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError

from app.core.security import get_current_user_id
from app.db.supabase import get_service_client
from app.schemas.chat import ChatMessage
from app.schemas.voice import VoiceChatResponse
from app.services import voice_service

router = APIRouter()

_MAX_AUDIO_BYTES = 15 * 1024 * 1024


@router.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat(
    audio: UploadFile = File(...),
    history: str = Form("[]"),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio file.")
    if len(audio_bytes) > _MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio clip too large (max 15MB).",
        )

    try:
        history_messages = [ChatMessage(**m) for m in json.loads(history)]
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid history."
        ) from exc

    client = get_service_client()
    return voice_service.voice_chat(
        client,
        user_id,
        audio_bytes,
        audio.filename or "recording.webm",
        [m.model_dump() for m in history_messages],
    )
