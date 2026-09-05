"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { JarvisVoicePanel, type JarvisVoiceState } from "@/components/JarvisVoicePanel";
import { VoiceRecorder, isVoiceRecordingSupported, BAR_COUNT } from "@/lib/audio/recorder";
import { VoicePlayer } from "@/lib/audio/playback";
import type { ChatResponse, VoiceChatResponse } from "@jarvis/types";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolsCalled?: string[];
}

const GREETING =
  "Hi, I'm JARVIS. Ask me about your nutrition or workouts, or tell me what you ate or did -- e.g. \"2 eggs and 4 idlis for breakfast\" or \"3 sets of squats, 10 reps at 40kg\".";

const ZERO_LEVELS = new Array(BAR_COUNT).fill(0);

// iOS Safari's MediaRecorder produces audio/mp4, not audio/webm like
// Chrome/Firefox -- upload the extension Whisper actually expects for
// whatever format the browser recorded, instead of a hardcoded ".webm"
// that silently mismatched the real content on iPhone.
function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ChatPage() {
  const supabase = createClient();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"text" | "voice">("text");
  // Voice support differs between server (always false) and client, so it's
  // read via useSyncExternalStore -- the value settles after hydration
  // without a synchronous setState-in-effect or a hydration mismatch.
  const voiceSupported = useSyncExternalStore(
    () => () => {},
    isVoiceRecordingSupported,
    () => false,
  );
  const [voiceState, setVoiceState] = useState<JarvisVoiceState>("standby");
  const [levels, setLevels] = useState<number[]>(ZERO_LEVELS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const playerRef = useRef<VoicePlayer | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  async function sendMessage() {
    if (!accessToken || !input.trim() || sending) return;

    const userMessage: DisplayMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const response = await apiFetch<ChatResponse>("/api/v1/ai/chat", accessToken, {
        method: "POST",
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.message, toolsCalled: response.tools_called },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach JARVIS");
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    setError(null);
    if (!recorderRef.current) recorderRef.current = new VoiceRecorder();
    try {
      await recorderRef.current.start((next) => setLevels(next));
      const startedAt = Date.now();
      setElapsedSeconds(0);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 500);
      setVoiceState("listening");
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  }

  async function stopRecordingAndSend() {
    if (!recorderRef.current || !accessToken) return;
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    setElapsedSeconds(0);
    setVoiceState("working");
    setLevels(ZERO_LEVELS);

    const blob = await recorderRef.current.stop();

    try {
      const formData = new FormData();
      formData.append("audio", blob, `recording.${extensionForMimeType(blob.type)}`);
      formData.append(
        "history",
        JSON.stringify(messages.map((m) => ({ role: m.role, content: m.content }))),
      );

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/ai/voice-chat`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Voice chat failed");
      }
      const result: VoiceChatResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "user", content: result.transcript },
        { role: "assistant", content: result.message, toolsCalled: result.tools_called },
      ]);

      setVoiceState("speaking");
      await playerRef.current?.playBase64(result.audio_base64, (next) => setLevels(next));
      setVoiceState("standby");
      setLevels(ZERO_LEVELS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice chat failed");
      setVoiceState("standby");
      setLevels(ZERO_LEVELS);
    }
  }

  function interruptSpeaking() {
    playerRef.current?.interrupt();
    setVoiceState("standby");
    setLevels(ZERO_LEVELS);
  }

  function handleMicClick() {
    // Must run synchronously inside this click handler, before any await --
    // iOS Safari only allows programmatic audio playback if the element was
    // played (even silently) as a direct result of a user gesture. This
    // "unlocks" it for the later playBase64() call that happens after the
    // network round-trip, once the gesture would otherwise have expired.
    if (!playerRef.current) playerRef.current = new VoicePlayer();
    playerRef.current.unlock();

    if (voiceState === "standby") {
      startRecording();
    } else if (voiceState === "listening") {
      stopRecordingAndSend();
    } else if (voiceState === "speaking") {
      interruptSpeaking();
    }
  }

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const transcript =
    voiceState === "speaking" && lastAssistantMessage
      ? { label: "REPLYING · JARVIS", text: lastAssistantMessage.content }
      : voiceState === "standby" && lastAssistantMessage
        ? { label: "LAST REPLY · JARVIS", text: lastAssistantMessage.content }
        : null;

  const footerLabel =
    voiceState === "standby"
      ? "TAP TO TALK"
      : voiceState === "listening"
        ? `TAP TO STOP · ${formatElapsed(elapsedSeconds)}`
        : voiceState === "working"
          ? "PROCESSING..."
          : "TAP TO INTERRUPT";

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">JARVIS</h1>
        {voiceSupported && (
          <button
            type="button"
            onClick={() => setMode(mode === "text" ? "voice" : "text")}
            disabled={voiceState !== "standby"}
            className="text-xs text-primary disabled:opacity-40"
          >
            {mode === "text" ? "Voice mode" : "Text mode"}
          </button>
        )}
      </div>

      {mode === "voice" ? (
        <div className="py-2">
          <JarvisVoicePanel
            state={voiceState}
            levels={levels}
            transcript={transcript}
            footerLabel={footerLabel}
            onMicClick={handleMicClick}
            micDisabled={voiceState === "working"}
            timestamp={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          />
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                    <p className="mt-1 text-xs opacity-60">used: {msg.toolsCalled.join(", ")}</p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-muted">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <Card className="mt-3 border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="mt-4 flex gap-2"
          >
            <Input
              type="text"
              autoComplete="off"
              placeholder="Ask JARVIS..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !input.trim()}>
              Send
            </Button>
          </form>
        </>
      )}
    </AppShell>
  );
}
