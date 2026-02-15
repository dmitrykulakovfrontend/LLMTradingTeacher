"use client";

import { ReactNode, useState } from "react";
import { Message } from "../ui/Message";

interface WidgetProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
  className?: string;
  variant?: "default" | "minimal" | "elevated";
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function Widget({
  title,
  subtitle,
  actions,
  loading = false,
  error = null,
  children,
  className = "",
  variant = "default",
  collapsible = false,
  defaultCollapsed = false,
}: WidgetProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const variantClasses = {
    default: "bg-[#141414] border border-white/[0.08]",
    minimal: "bg-transparent border-0",
    elevated: "bg-[#1a1a1a] border border-white/[0.12] shadow-lg",
  };

  return (
    <div className={`widget-grid-bg ${variantClasses[variant]} ${className}`}>
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <div className="flex-1">
            {title && (
              <div
                className={`font-chakra font-bold text-white tracking-wider uppercase flex items-center gap-2 ${collapsible ? 'cursor-pointer' : ''}`}
                onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
              >
                {collapsible && (
                  <svg
                    className={`h-4 w-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {title}
              </div>
            )}
            {subtitle && (
              <div className="font-manrope text-xs text-[#666666] mt-1">
                {subtitle}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <div className="p-4">
          {loading && (
            <div className="space-y-3">
              <div className="h-4 bg-white/[0.05] animate-pulse rounded"></div>
              <div className="h-4 bg-white/[0.05] animate-pulse rounded w-3/4"></div>
              <div className="h-4 bg-white/[0.05] animate-pulse rounded w-1/2"></div>
            </div>
          )}

          {error && !loading && (
            <Message variant="error">{error}</Message>
          )}

          {!loading && !error && children}
        </div>
      )}
    </div>
  );
}
