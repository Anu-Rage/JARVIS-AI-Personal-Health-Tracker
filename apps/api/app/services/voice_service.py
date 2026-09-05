import base64
import logging

from openai import OpenAI
from supabase import Client

from app.agent.orchestrator import run_chat
from app.core.config import get_settings

logger = logging.getLogger("jarvis.agent")

_TRANSCRIBE_MODEL = "whisper-1"
_TTS_MODEL = "gpt-4o-mini-tts"
_TTS_VOICE = "alloy"

# Responses go through TTS, not a text bubble -- ask for spoken-friendly
# phrasing without changing behavior for regular text chat.
_VOICE_INSTRUCTIONS = (
    "This response will be read aloud by a text-to-speech voice, not displayed as text. "
    "Keep it conversational and concise (1-3 sentences unless the user asked for detail). "
    "Never use markdown, bullet points, or headers -- speak in plain natural sentences."
)


def _get_openai_client() -> OpenAI:
    return OpenAI(api_key=get_settings().openai_api_key)


def transcribe(audio_bytes: bytes, filename: str) -> str:
    openai_client = _get_openai_client()
    result = openai_client.audio.transcriptions.create(
        model=_TRANSCRIBE_MODEL,
        file=(filename, audio_bytes),
    )
    return result.text


def synthesize_speech(text: str) -> bytes:
    openai_client = _get_openai_client()
    response = openai_client.audio.speech.create(
        model=_TTS_MODEL,
        voice=_TTS_VOICE,
        input=text,
    )
    return response.read()


def voice_chat(
    client: Client, user_id: str, audio_bytes: bytes, filename: str, history: list[dict]
) -> dict:
    transcript = transcribe(audio_bytes, filename)

    messages = [*history, {"role": "user", "content": transcript}]
    chat_result = run_chat(client, user_id, messages, extra_instructions=_VOICE_INSTRUCTIONS)

    audio_reply = synthesize_speech(chat_result["message"])

    return {
        "transcript": transcript,
        "message": chat_result["message"],
        "tools_called": chat_result["tools_called"],
        "audio_base64": base64.b64encode(audio_reply).decode(),
    }
