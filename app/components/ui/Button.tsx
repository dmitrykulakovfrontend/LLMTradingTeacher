"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, disabled, className = "", children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 font-chakra font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      primary: "bg-[var(--color-accent-cyan)] text-black hover:bg-[var(--color-accent-cyan)]/80 hover:shadow-[0_0_20px_var(--color-accent-cyan)]/40",
      secondary: "border border-white/[0.08] bg-[#141414] text-white hover:border-[var(--color-accent-cyan)]/30 hover:bg-[#1a1a1a]",
      ghost: "text-[#a0a0a0] hover:text-white hover:bg-white/[0.05]",
      danger: "bg-[var(--color-loss)] text-white hover:bg-[var(--color-loss)]/80 hover:shadow-[0_0_20px_var(--color-loss-glow)]",
    };

    const sizeClasses = {
      xs: "px-2 py-1 text-xs",
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
