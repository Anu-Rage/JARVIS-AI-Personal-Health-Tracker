export function CornerTicks({ className = "" }: { className?: string }) {
  const base = "pointer-events-none absolute h-2 w-2 border-text-muted/40";
  return (
    <div className={`absolute inset-0 ${className}`}>
      <span className={`${base} left-0 top-0 border-l border-t`} />
      <span className={`${base} right-0 top-0 border-r border-t`} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}
