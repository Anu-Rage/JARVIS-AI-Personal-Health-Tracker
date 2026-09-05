"use client";

export type JarvisOrbState = "idle" | "listening" | "thinking" | "speaking";

const STATE_COLOR: Record<JarvisOrbState, string> = {
  idle: "#2dd4ff",
  listening: "#22e8ff",
  thinking: "#ffb545",
  speaking: "#4ce5ff",
};

interface JarvisOrbProps {
  state: JarvisOrbState;
  /** 0-1, live mic or playback amplitude -- drives the glow/scale reactively. */
  amplitude?: number;
}

export function JarvisOrb({ state, amplitude = 0 }: JarvisOrbProps) {
  const color = STATE_COLOR[state];
  const level = Math.min(Math.max(amplitude, 0), 1);
  const reactive = state === "listening" || state === "speaking";
  const scale = reactive ? 1 + level * 0.35 : 1;

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      {reactive && (
        <>
          <span
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: color, animation: "jarvis-ring-expand 1.6s ease-out infinite" }}
          />
          <span
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: color,
              animation: "jarvis-ring-expand 1.6s ease-out infinite",
              animationDelay: "0.8s",
            }}
          />
        </>
      )}

      {state === "thinking" && (
        <span
          className="absolute inset-4 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${color})`,
            animation: "jarvis-thinking-spin 1s linear infinite",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
          }}
        />
      )}

      <div
        className="relative flex h-32 w-32 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${color}55, #05080a 70%)`,
          boxShadow: `0 0 ${30 + level * 40}px ${color}aa, inset 0 0 20px ${color}66`,
          border: `1px solid ${color}88`,
          transform: `scale(${scale})`,
          transition: "transform 90ms ease-out, box-shadow 120ms ease-out",
          animation: state === "idle" ? "jarvis-idle-pulse 3.2s ease-in-out infinite" : undefined,
        }}
      >
        <div
          className="h-3 w-3 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
        />
      </div>
    </div>
  );
}
