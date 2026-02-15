import { ReactNode } from "react";

interface MessageProps {
  variant: "error" | "warning" | "success" | "info";
  children: ReactNode;
  className?: string;
}

export function Message({ variant, children, className = "" }: MessageProps) {
  const variantClasses = {
    error: "border-[var(--color-loss)]/30 bg-[var(--color-loss)]/10 text-[var(--color-loss)]",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    success: "border-[var(--color-gain)]/30 bg-[var(--color-gain)]/10 text-[var(--color-gain)]",
    info: "border-[var(--color-accent-cyan)]/30 bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]",
  };

  return (
    <div className={`border p-3 text-sm font-manrope ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
