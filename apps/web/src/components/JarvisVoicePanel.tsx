"use client";

import { BAR_COUNT } from "@/lib/audio/recorder";

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
      className="relative overflow-hidden rounded-xl border font-mono"
      style={{
        background: "var(--color-hud-bg)",
        borderColor: "var(--color-hud-border)",
        color: "var(--color-hud-text)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-hud-grid) 1px, transparent 1px), linear-gradient(90deg, var(--color-hud-grid) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.6,
        }}
      />

      <div className="relative flex flex-col gap-6 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-widest">
          <span className="font-bold tracking-[0.2em]">JARVIS</span>
          <span style={{ color: "var(--color-hud-text-muted)" }}>{timestamp}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0"
            style={{
              background: "var(--color-hud-accent)",
              animation:
                state === "listening" ? "jarvis-hud-blink 1s ease-in-out infinite" : undefined,
            }}
          />
          <span className="text-lg font-bold uppercase tracking-widest">
            {STATE_LABEL[state]}
          </span>
        </div>

        <div className="flex h-14 items-end justify-center gap-[3px]">
          {Array.from({ length: BAR_COUNT }, (_, i) => {
            const level = levels[i] ?? 0;
            const idle = state === "standby";
            return (
              <span
                key={i}
                className="w-1 rounded-[1px]"
                style={{
                  height: idle ? "10%" : `${Math.max(6, level * 100)}%`,
                  background: idle ? "var(--color-hud-border)" : "var(--color-hud-accent)",
                  opacity: idle ? undefined : 0.9,
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
          <div
            className="relative border p-4"
            style={{ borderColor: "var(--color-hud-border)" }}
          >
            <CornerTicks />
            <p
              className="mb-2 text-[10px] uppercase tracking-widest"
              style={{ color: "var(--color-hud-text-muted)" }}
            >
              {transcript.label}
            </p>
            <p className="text-sm leading-relaxed">{transcript.text}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--color-hud-text-muted)" }}
          >
            {footerLabel}
          </span>
          <button
            type="button"
            onClick={onMicClick}
            disabled={micDisabled}
            aria-label={state === "listening" ? "Stop and send" : "Tap to talk"}
            className="flex h-9 w-9 items-center justify-center border text-base disabled:opacity-30"
            style={{
              borderColor: "var(--color-hud-accent)",
              color: "var(--color-hud-accent)",
              background:
                state === "listening" ? "var(--color-hud-accent)" : "transparent",
            }}
          >
            <span style={{ color: state === "listening" ? "var(--color-hud-accent-foreground)" : undefined }}>
              🎙
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CornerTicks() {
  const base = "absolute h-2 w-2";
  const style = { borderColor: "var(--color-hud-text-muted)" };
  return (
    <>
      <span className={`${base} left-0 top-0 border-l border-t`} style={style} />
      <span className={`${base} right-0 top-0 border-r border-t`} style={style} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} style={style} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} style={style} />
    </>
  );
}
