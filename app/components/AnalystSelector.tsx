"use client";

import { useState, useEffect } from "react";
import type { AnalystId } from "../lib/types";
import { getAllAnalysts } from "../lib/analystPrompts";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";

interface AnalystSelectorProps {
  selectedAnalysts: Set<AnalystId>;
  onChange: (analysts: Set<AnalystId>) => void;
  disabled: boolean;
  loadingAnalysts?: Set<AnalystId>;
}

export default function AnalystSelector({
  selectedAnalysts,
  onChange,
  disabled,
  loadingAnalysts,
}: AnalystSelectorProps) {
  const analysts = getAllAnalysts();

  const handleToggle = (analystId: AnalystId) => {
    const newSelection = new Set(selectedAnalysts);
    if (newSelection.has(analystId)) {
      newSelection.delete(analystId);
    } else {
      newSelection.add(analystId);
    }
    onChange(newSelection);
  };

  const handleSelectAll = () => {
    const allIds = new Set(analysts.map((a) => a.id));
    onChange(allIds);
  };

  const handleDeselectAll = () => {
    onChange(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-chakra text-sm font-bold text-white tracking-wider uppercase">
          Select Analysts
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled || selectedAnalysts.size === analysts.length}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            disabled={disabled || selectedAnalysts.size === 0}
          >
            Deselect All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {analysts.map((analyst) => {
          const isSelected = selectedAnalysts.has(analyst.id);
          const isLoading = loadingAnalysts?.has(analyst.id);

          return (
            <label
              key={analyst.id}
              className={`
                flex items-center gap-3 p-3 border cursor-pointer transition-all duration-200
                ${isSelected
                  ? "border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10"
                  : "border-white/[0.08] bg-[#141414] hover:border-white/[0.15]"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(analyst.id)}
                disabled={disabled}
                className="w-4 h-4 accent-[var(--color-accent-cyan)] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-chakra text-sm text-white font-medium">
                    {analyst.name}
                  </span>
                  {isLoading && <Spinner size="xs" />}
                </div>
                <span className="font-manrope text-xs text-[#666666]">
                  {analyst.description}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-[#666666] font-manrope">
        <span>
          {selectedAnalysts.size} of {analysts.length} analysts selected
        </span>
      </div>
    </div>
  );
}
