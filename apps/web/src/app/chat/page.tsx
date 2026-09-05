"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ChatResponse } from "@jarvis/types";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolsCalled?: string[];
}

export default function ChatPage() {
  const supabase = createClient();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm JARVIS. Ask me about your nutrition or workouts, or tell me what you ate or did -- e.g. \"2 eggs and 4 idlis for breakfast\" or \"3 sets of squats, 10 reps at 40kg\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-semibold">JARVIS</h1>

      <div className="flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
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
    </AppShell>
  );
}
