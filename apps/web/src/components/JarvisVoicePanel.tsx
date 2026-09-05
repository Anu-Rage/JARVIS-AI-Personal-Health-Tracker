"use client";

import { BAR_COUNT } from "@/lib/audio/recorder";
import { CornerTicks } from "@/components/ui/CornerTicks";

export type JarvisVoiceState = "standby" | "listening" | "working" | "speaking";

const STATE_LABEL: Record<JarvisVoiceState, string> = {
  standby: "STANDBY",
  listening: "LISTENING",
  working: "WORKING",
  speaking: "SPEAKING",
};

interface JarvisVoicePanelProps {
  state: JarvisVoiceState;
  levels: number[];
  transcript: { label: string; text: string } | null;
  footerLabel: string;
  onMicClick: () => void;
  micDisabled?: boolean;
  timestamp: string;
}

export function JarvisVoicePanel({
  state,
  levels,
  transcript,
  footerLabel,
  onMicClick,
  micDisabled,
  timestamp,
}: JarvisVoicePanelProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-surface font-mono text-text"
    >
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative flex flex-col gap-6 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-widest">
          <span className="font-bold tracking-[0.2em]">JARVIS</span>
          <span className="text-text-muted">{timestamp}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 bg-primary"
            style={{
              animation:
                state === "listening" ? "jarvis-hud-blink 1s ease-in-out infinite" : undefined,
            }}
          />
          <span className="text-lg font-bold uppercase tracking-widest">
            {STATE_LABEL[state]}
          </span>
        </div>

        <div className="flex h-14 items-end justify-center gap-1">
          {Array.from({ length: BAR_COUNT }, (_, i) => {
            const level = levels[i] ?? 0;
            const idle = state === "standby";
            return (
              <span
                key={i}
                className={`w-1 rounded-[1px] ${idle ? "bg-border" : "bg-primary opacity-90"}`}
                style={{
                  height: idle ? "10%" : `${Math.max(6, level * 100)}%`,
                  animation: idle
                    ? `jarvis-hud-standby-pulse 2.4s ease-in-out infinite`
                    : undefined,
                  animationDelay: idle ? `${i * 60}ms` : undefined,
                  transition: "height 60ms linear",
                }}
              />
            );
          })}
        </div>

        {transcript && (
          <div className="relative border border-border p-4">
            <CornerTicks />
            <p className="mb-2 text-[10px] uppercase tracking-widest text-text-muted">
              {transcript.label}
            </p>
            <p className="text-sm leading-relaxed">{transcript.text}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            {footerLabel}
          </span>
          <button
            type="button"
            onClick={onMicClick}
            disabled={micDisabled}
            aria-label={state === "listening" ? "Stop and send" : "Tap to talk"}
            className={`flex h-9 w-9 items-center justify-center border border-primary text-base text-primary disabled:opacity-30 ${
              state === "listening" ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            🎙
          </button>
        </div>
      </div>
    </div>
  );
}
