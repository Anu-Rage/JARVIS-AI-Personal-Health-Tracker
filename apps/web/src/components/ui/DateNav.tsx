"use client";

interface DateNavProps {
  /** YYYY-MM-DD in the browser's local calendar. */
  date: string;
  onChange: (date: string) => void;
}

// Parsing/formatting via local Date component getters (not toISOString,
// which is UTC) so day math lines up with what the user's own clock and
// the native date-picker both consider "today" -- using UTC here previously
// meant the app could think it was still yesterday for hours after local
// midnight, depending on the user's timezone.
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(date: string, deltaDays: number): string {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalDate(d);
}

export function todayLocal(): string {
  return formatLocalDate(new Date());
}

export function dayLabel(date: string): string {
  const today = todayLocal();
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  return parseLocalDate(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DateNav({ date, onChange }: DateNavProps) {
  const atToday = date >= todayLocal();

  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftDate(date, -1))}
        aria-label="Previous day"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted hover:text-text"
      >
        ‹
      </button>

      <div className="flex flex-1 items-center justify-center gap-2">
        <span className="text-sm font-medium">{dayLabel(date)}</span>
        <input
          type="date"
          value={date}
          max={todayLocal()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-muted"
        />
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={atToday}
        aria-label="Next day"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted hover:text-text disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}
