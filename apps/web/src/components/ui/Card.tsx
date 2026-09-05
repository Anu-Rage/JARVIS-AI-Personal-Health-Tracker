import type { HTMLAttributes } from "react";
import { CornerTicks } from "./CornerTicks";

interface Props extends HTMLAttributes<HTMLDivElement> {
  ticked?: boolean;
}

export function Card({ className = "", ticked = false, children, ...props }: Props) {
  return (
    <div
      className={`relative rounded-xl border border-border bg-surface p-4 ${className}`}
      {...props}
    >
      {ticked && <CornerTicks />}
      {children}
    </div>
  );
}
