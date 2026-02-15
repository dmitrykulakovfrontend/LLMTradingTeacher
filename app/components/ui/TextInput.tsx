"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: "sm" | "md" | "lg";
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, helperText, inputSize = "md", className = "", ...props }, ref) => {
    const sizeClasses = {
      sm: "px-2.5 py-1.5 text-xs",
      md: "px-3 py-2 text-sm",
      lg: "px-4 py-2.5 text-base",
    };

    return (
      <div className="space-y-1">
        {label && (
          <label className="block font-chakra text-xs font-medium text-[#a0a0a0] uppercase tracking-wider">
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={`
            w-full border bg-[#141414] font-ibm text-white
            placeholder-[#666666]
            focus:outline-none focus:ring-1
            transition-all duration-200
            ${error
              ? 'border-[var(--color-loss)] focus:border-[var(--color-loss)] focus:ring-[var(--color-loss)]'
              : 'border-white/[0.08] focus:border-[var(--color-accent-cyan)] focus:ring-[var(--color-accent-cyan)]'
            }
            ${sizeClasses[inputSize]}
            ${className}
          `}
          {...props}
        />

        {error && (
          <div className="font-manrope text-xs text-[var(--color-loss)]">
            {error}
          </div>
        )}

        {helperText && !error && (
          <div className="font-manrope text-xs text-[#666666]">
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";
