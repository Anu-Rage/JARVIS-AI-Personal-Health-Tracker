from pydantic import BaseModel


class VoiceChatResponse(BaseModel):
    transcript: str
    message: str
    tools_called: list[str]
    audio_base64: str
