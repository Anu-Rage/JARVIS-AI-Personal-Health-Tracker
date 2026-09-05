"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { JarvisOrb, type JarvisOrbState } from "@/components/JarvisOrb";
import { VoiceRecorder, isVoiceRecordingSupported } from "@/lib/audio/recorder";
import { playAudioWithAmplitude } from "@/lib/audio/playback";
import type { ChatResponse, VoiceChatResponse } from "@jarvis/types";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolsCalled?: string[];
}

const GREETING =
  "Hi, I'm JARVIS. Ask me about your nutrition or workouts, or tell me what you ate or did -- e.g. \"2 eggs and 4 idlis for breakfast\" or \"3 sets of squats, 10 reps at 40kg\".";

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
  const [orbState, setOrbState] = useState<JarvisOrbState>("idle");
  const [amplitude, setAmplitude] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<VoiceRecorder | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      await recorderRef.current.start((level) => setAmplitude(level));
      setIsRecording(true);
      setOrbState("listening");
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  }

  async function stopRecordingAndSend() {
    if (!recorderRef.current || !accessToken) return;
    setIsRecording(false);
    setOrbState("thinking");
    setAmplitude(0);

    const blob = await recorderRef.current.stop();

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
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

      setOrbState("speaking");
      await playAudioWithAmplitude(result.audio_base64, (level) => setAmplitude(level));
      setOrbState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice chat failed");
      setOrbState("idle");
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  }

  const busy = orbState === "thinking" || orbState === "speaking";
  const subtitle = isRecording
    ? "Listening..."
    : orbState === "thinking"
      ? "Thinking..."
      : messages[messages.length - 1]?.content;

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">JARVIS</h1>
        {voiceSupported && (
          <button
            type="button"
            onClick={() => setMode(mode === "text" ? "voice" : "text")}
            disabled={isRecording || busy}
            className="text-xs text-primary disabled:opacity-40"
          >
            {mode === "text" ? "Voice mode" : "Text mode"}
          </button>
        )}
      </div>

      {mode === "voice" ? (
        <div className="flex flex-col items-center gap-6 py-6">
          <JarvisOrb state={orbState} amplitude={amplitude} />

          <p className="min-h-12 max-w-xs text-center text-sm text-text-muted">{subtitle}</p>

          <button
            type="button"
            onClick={toggleRecording}
            disabled={busy}
            className={`rounded-full px-6 py-3 text-sm font-medium transition-colors disabled:opacity-40 ${
              isRecording
                ? "bg-danger text-danger-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {isRecording ? "Stop & send" : "Tap to talk"}
          </button>

          {error && <p className="text-xs text-danger">{error}</p>}
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
