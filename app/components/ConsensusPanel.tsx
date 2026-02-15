"use client";

import type { ConsensusResult } from "../lib/types";
import { Spinner } from "./ui/Spinner";
import { Message } from "./ui/Message";

interface ConsensusPanelProps {
  consensus: ConsensusResult | null;
  loading: boolean;
}

export default function ConsensusPanel({ consensus, loading }: ConsensusPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Spinner size="lg" />
        <p className="text-[#666666] font-manrope text-sm">
          Calculating consensus across analysts...
        </p>
      </div>
    );
  }

  if (!consensus) {
    return (
      <div className="py-8 text-center">
        <p className="text-[#666666] font-manrope">
          Consensus will appear after analysts complete their analysis
        </p>
      </div>
    );
  }

  const {
    overallSentiment,
    agreementPercentage,
    bullishCount,
    bearishCount,
    neutralCount,
    commonPatterns,
    keyAgreements,
    keyDisagreements,
    confidenceScore,
  } = consensus;

  const totalAnalysts = bullishCount + bearishCount + neutralCount;

  // Determine sentiment color and glow
  const sentimentColor =
    overallSentiment === "bullish"
      ? "text-[var(--color-gain)]"
      : overallSentiment === "bearish"
        ? "text-[var(--color-loss)]"
        : "text-[var(--color-text-secondary)]";

  const sentimentGlow =
    overallSentiment === "bullish" && agreementPercentage > 70
      ? "glow-gain"
      : overallSentiment === "bearish" && agreementPercentage > 70
        ? "glow-loss"
        : "";

  return (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <div className="border border-white/[0.08] bg-[#141414] p-4">
        <h3 className="font-chakra text-xs font-bold text-[#666666] tracking-wider uppercase mb-3">
          Overall Consensus
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <div
              className={`font-ibm text-3xl font-bold uppercase tracking-wider ${sentimentColor} ${sentimentGlow}`}
            >
              {overallSentiment}
            </div>
            <div className="font-manrope text-sm text-[#666666] mt-1">
              {agreementPercentage}% agreement
            </div>
          </div>
          <div className="text-right">
            <div className="font-ibm text-2xl font-bold text-white">
              {confidenceScore}
              <span className="text-sm text-[#666666]">%</span>
            </div>
            <div className="font-manrope text-xs text-[#666666]">Confidence</div>
          </div>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      <div className="border border-white/[0.08] bg-[#141414] p-4">
        <h3 className="font-chakra text-xs font-bold text-[#666666] tracking-wider uppercase mb-3">
          Sentiment Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="font-ibm text-2xl font-bold text-[var(--color-gain)]">
              {bullishCount}
            </div>
            <div className="font-manrope text-xs text-[#666666] uppercase mt-1">
              Bullish
            </div>
            <div className="font-manrope text-xs text-[#666666]">
              {totalAnalysts > 0 ? Math.round((bullishCount / totalAnalysts) * 100) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="font-ibm text-2xl font-bold text-[var(--color-text-secondary)]">
              {neutralCount}
            </div>
            <div className="font-manrope text-xs text-[#666666] uppercase mt-1">
              Neutral
            </div>
            <div className="font-manrope text-xs text-[#666666]">
              {totalAnalysts > 0 ? Math.round((neutralCount / totalAnalysts) * 100) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="font-ibm text-2xl font-bold text-[var(--color-loss)]">
              {bearishCount}
            </div>
            <div className="font-manrope text-xs text-[#666666] uppercase mt-1">
              Bearish
            </div>
            <div className="font-manrope text-xs text-[#666666]">
              {totalAnalysts > 0 ? Math.round((bearishCount / totalAnalysts) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Common Patterns */}
      {commonPatterns.length > 0 && (
        <div className="border border-white/[0.08] bg-[#141414] p-4">
          <h3 className="font-chakra text-xs font-bold text-[#666666] tracking-wider uppercase mb-3">
            Common Patterns
          </h3>
          <div className="space-y-2">
            {commonPatterns.map((cp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border border-white/[0.05] bg-[#0a0a0a] p-2"
              >
                <span className="font-manrope text-sm text-white capitalize">
                  {cp.pattern}
                </span>
                <span className="font-ibm text-xs text-[var(--color-accent-cyan)]">
                  {cp.mentionedBy.length}/{totalAnalysts} analysts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Agreements */}
      {keyAgreements.length > 0 && (
        <div className="border border-white/[0.08] bg-[#141414] p-4">
          <h3 className="font-chakra text-xs font-bold text-[#666666] tracking-wider uppercase mb-3">
            Key Agreements
          </h3>
          <ul className="space-y-2">
            {keyAgreements.map((agreement, idx) => (
              <li key={idx} className="flex items-start gap-2 font-manrope text-sm text-white">
                <span className="text-[var(--color-gain)] mt-1 shrink-0">•</span>
                <span>{agreement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Disagreements */}
      {keyDisagreements.length > 0 && (
        <div className="border border-white/[0.08] bg-[#141414] p-4">
          <h3 className="font-chakra text-xs font-bold text-[#666666] tracking-wider uppercase mb-3">
            Key Disagreements
          </h3>
          <ul className="space-y-2">
            {keyDisagreements.map((disagreement, idx) => (
              <li key={idx} className="flex items-start gap-2 font-manrope text-sm text-white">
                <span className="text-[var(--color-loss)] mt-1 shrink-0">•</span>
                <span>{disagreement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Message */}
      <Message variant="info">
        <div className="font-manrope text-xs">
          <strong>How Consensus Works:</strong> This summary is generated by analyzing
          keywords, patterns, and sentiment from each analyst's response. Agreement
          percentage reflects how many analysts share the dominant view. Confidence score
          considers agreement level, common patterns, and signal alignment.
        </div>
      </Message>
    </div>
  );
}
