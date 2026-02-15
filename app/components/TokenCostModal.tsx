"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/Button";

interface TokenCostModalProps {
  analystCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const STORAGE_KEY = "llm-token-warning-dismissed";

export default function TokenCostModal({
  analystCount,
  onConfirm,
  onCancel,
}: TokenCostModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Estimate tokens (rough approximation)
  const estimateTokens = () => {
    // Rough estimates:
    // - System prompt: ~800 tokens per analyst
    // - OHLC data (60 candles): ~1200 tokens
    // - Output: ~2000 tokens per analyst (conservative estimate)
    const inputTokensPerAnalyst = 800 + 1200; // 2000
    const outputTokensPerAnalyst = 2000;

    return {
      inputTokens: inputTokensPerAnalyst * analystCount,
      outputTokens: outputTokensPerAnalyst * analystCount,
      total: (inputTokensPerAnalyst + outputTokensPerAnalyst) * analystCount,
    };
  };

  const tokens = estimateTokens();

  // Calculate rough cost estimate (using GPT-4o pricing as example)
  // Actual cost depends on the model selected
  const estimateCost = () => {
    // Example pricing (GPT-4o): $2.50 per 1M input tokens, $10 per 1M output tokens
    // This is just an estimate - actual pricing varies by model
    const inputCost = (tokens.inputTokens / 1_000_000) * 2.5;
    const outputCost = (tokens.outputTokens / 1_000_000) * 10;
    return (inputCost + outputCost).toFixed(4);
  };

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#141414] border border-white/[0.08] max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="font-chakra text-xl font-bold text-white tracking-wider uppercase">
            Multi-Analyst Analysis
          </h2>
          <p className="font-manrope text-sm text-[#666666] mt-2">
            You are about to analyze the chart with {analystCount} analysts simultaneously.
          </p>
        </div>

        {/* Token Estimates */}
        <div className="border border-white/[0.08] bg-[#0a0a0a] p-4 space-y-3">
          <h3 className="font-chakra text-xs font-bold text-[#666666] tracking-wider uppercase">
            Estimated Token Usage
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-ibm text-sm text-[#666666]">Input Tokens</div>
              <div className="font-ibm text-lg font-bold text-white">
                {tokens.inputTokens.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-ibm text-sm text-[#666666]">Output Tokens</div>
              <div className="font-ibm text-lg font-bold text-white">
                {tokens.outputTokens.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.08] pt-3">
            <div className="font-ibm text-sm text-[#666666]">Total Estimated</div>
            <div className="font-ibm text-xl font-bold text-[var(--color-accent-cyan)]">
              {tokens.total.toLocaleString()}
            </div>
            <div className="font-manrope text-xs text-[#666666] mt-1">
              ~${estimateCost()} USD (varies by model)
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="font-manrope text-xs text-[#666666]">
          <strong>Note:</strong> This is approximately {analystCount}x the token usage of a
          single analyst analysis. The actual cost depends on your selected model and
          provider pricing.
        </div>

        {/* Don't show again checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-accent-cyan)]"
          />
          <span className="font-manrope text-sm text-white">
            Don't show this warning again
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} className="flex-1">
            Proceed
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Check if the token warning should be shown
 */
export function shouldShowTokenWarning(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "true";
}
