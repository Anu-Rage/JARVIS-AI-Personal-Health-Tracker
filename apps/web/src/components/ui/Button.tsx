import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary),0_0_16px_-4px_var(--color-primary)] hover:bg-primary-hover disabled:opacity-50 disabled:shadow-none",
  secondary:
    "bg-surface text-text border border-border hover:border-primary/50 disabled:opacity-50",
  danger: "text-danger hover:bg-danger/10 disabled:opacity-50",
  ghost: "text-text-muted hover:text-text disabled:opacity-50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
