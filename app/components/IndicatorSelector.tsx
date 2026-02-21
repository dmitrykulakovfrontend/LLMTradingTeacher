"use client";

import { useState } from "react";
import type { IndicatorConfig, IndicatorPreset } from "../lib/types";
import { Button } from "./ui/Button";

interface IndicatorSelectorProps {
  config: IndicatorConfig;
  onChange: (config: IndicatorConfig) => void;
  disabled?: boolean;
}

const EMPTY_CONFIG: IndicatorConfig = {
  sma20: false,
  sma50: false,
  sma200: false,
  ema12: false,
  ema26: false,
  bollingerBands: false,
  rsi: false,
  macd: false,
};

const PRESET_CONFIGS: Record<IndicatorPreset, IndicatorConfig> = {
  trend: { ...EMPTY_CONFIG, sma20: true, sma50: true, sma200: true },
  momentum: { ...EMPTY_CONFIG, rsi: true, macd: true },
  volatility: { ...EMPTY_CONFIG, bollingerBands: true },
  all: {
    sma20: true,
    sma50: true,
    sma200: true,
    ema12: true,
    ema26: true,
    bollingerBands: true,
    rsi: true,
    macd: true,
  },
  none: EMPTY_CONFIG,
};

interface IndicatorDef {
  key: keyof IndicatorConfig;
  label: string;
  description: string;
  color: string;
}

const OVERLAY_INDICATORS: IndicatorDef[] = [
  { key: "sma20", label: "SMA 20", description: "Short-term trend", color: "#f59e0b" },
  { key: "sma50", label: "SMA 50", description: "Medium-term trend", color: "#3b82f6" },
  { key: "sma200", label: "SMA 200", description: "Long-term trend", color: "#a855f7" },
  { key: "ema12", label: "EMA 12", description: "Fast exponential", color: "#06b6d4" },
  { key: "ema26", label: "EMA 26", description: "Slow exponential", color: "#ec4899" },
  { key: "bollingerBands", label: "Bollinger", description: "Volatility bands", color: "rgb(100,149,237)" },
];

const PANEL_INDICATORS: IndicatorDef[] = [
  { key: "rsi", label: "RSI", description: "Overbought/oversold", color: "#f59e0b" },
  { key: "macd", label: "MACD", description: "Momentum signal", color: "#3b82f6" },
];

const ALL_INDICATORS = [...OVERLAY_INDICATORS, ...PANEL_INDICATORS];

const PRESETS: { id: IndicatorPreset; label: string }[] = [
  { id: "trend", label: "Trend" },
  { id: "momentum", label: "Momentum" },
  { id: "volatility", label: "Volatility" },
  { id: "all", label: "All" },
  { id: "none", label: "None" },
];

function configMatchesPreset(config: IndicatorConfig, preset: IndicatorPreset): boolean {
  const target = PRESET_CONFIGS[preset];
  return (Object.keys(target) as (keyof IndicatorConfig)[]).every(
    (key) => config[key] === target[key],
  );
}

export default function IndicatorSelector({
  config,
  onChange,
  disabled = false,
}: IndicatorSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (key: keyof IndicatorConfig) => {
    onChange({ ...config, [key]: !config[key] });
  };

  const handlePreset = (preset: IndicatorPreset) => {
    onChange(PRESET_CONFIGS[preset]);
  };

  const activeCount = Object.values(config).filter(Boolean).length;

  return (
    <div className="space-y-2">
      {/* Preset buttons + expand toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-chakra text-xs font-bold text-[#a0a0a0] tracking-wider uppercase shrink-0">
          Indicators
        </span>
        {PRESETS.map((preset) => {
          const isActive = configMatchesPreset(config, preset.id);
          return (
            <Button
              key={preset.id}
              variant={isActive ? "primary" : "ghost"}
              size="xs"
              onClick={() => handlePreset(preset.id)}
              disabled={disabled}
              className={isActive ? "" : "border border-white/[0.08]"}
            >
              {preset.label}
            </Button>
          );
        })}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs text-[#666666] hover:text-white transition-colors font-manrope flex items-center gap-1"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {activeCount > 0 ? `${activeCount} active` : "Customize"}
        </button>
      </div>

      {/* Active indicator legend (compact colored dots) */}
      {activeCount > 0 && !expanded && (
        <div className="flex items-center gap-3 flex-wrap">
          {ALL_INDICATORS.filter((ind) => config[ind.key]).map((ind) => (
            <span key={ind.key} className="flex items-center gap-1.5 text-xs text-[#a0a0a0] font-ibm">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: ind.color }}
              />
              {ind.label}
            </span>
          ))}
        </div>
      )}

      {/* Expanded individual checkboxes */}
      {expanded && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ALL_INDICATORS.map((ind) => {
              const isChecked = config[ind.key];
              return (
                <label
                  key={ind.key}
                  className={`
                    flex items-center gap-2 px-2.5 py-2 border cursor-pointer transition-all duration-200
                    ${isChecked
                      ? "border-[var(--color-accent-cyan)]/50 bg-[var(--color-accent-cyan)]/5"
                      : "border-white/[0.06] bg-[#111] hover:border-white/[0.12]"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(ind.key)}
                    disabled={disabled}
                    className="w-3.5 h-3.5 accent-[var(--color-accent-cyan)] cursor-pointer"
                  />
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ind.color }}
                  />
                  <div className="min-w-0">
                    <span className="font-chakra text-xs text-white font-medium">
                      {ind.label}
                    </span>
                    <span className="font-manrope text-[10px] text-[#666666] ml-1.5 hidden sm:inline">
                      {ind.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
