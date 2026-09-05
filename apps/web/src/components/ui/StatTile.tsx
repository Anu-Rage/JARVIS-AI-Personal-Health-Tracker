export function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="font-mono text-xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-xs font-normal text-text-muted">{unit}</span>
      </div>
    </div>
  );
}
