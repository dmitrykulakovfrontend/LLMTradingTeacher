"use client";

import { useState } from "react";
export default function Collapseable({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="widget-grid-bg border border-white/[0.08] bg-[#141414]">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 font-chakra text-sm font-bold text-white tracking-wider uppercase hover:bg-white/[0.03] transition-all duration-200 border-b border-white/[0.08]"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          {title}
        </span>
      </button>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}
