"use client";

interface DateNavProps {
  /** YYYY-MM-DD, in UTC terms (matches the backend's UTC "today" convention). */
  date: string;
  onChange: (date: string) => void;
}

function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dayLabel(date: string): string {
  const today = todayUtc();
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DateNav({ date, onChange }: DateNavProps) {
  const atToday = date >= todayUtc();

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
          max={todayUtc()}
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
