"use client";

import type { FundamentalsData } from "../lib/types";
import { Spinner } from "./ui/Spinner";
import { Message } from "./ui/Message";
import { CopyButton } from "./ui/CopyButton";

interface FundamentalsPanelProps {
  data: FundamentalsData | null;
  loading: boolean;
  error: string | null;
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-1.5">
          <div className="h-4 bg-white/[0.05] rounded w-1/3" />
          <div className="h-3 bg-white/[0.05] rounded w-2/3" />
          <div className="h-3 bg-white/[0.05] rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function FundamentalsPanel({
  data,
  loading,
  error,
}: FundamentalsPanelProps) {
  // Don't render anything before first analysis
  if (!data && !loading && !error) return null;

  return (
    <div className="widget-grid-bg border border-white/[0.08] bg-[#141414] p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {data?.rawResponse && (
            <CopyButton
              data={data.rawResponse}
              label="Copy Data"
              variant="secondary"
              size="xs"
            />
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#666666] font-manrope">
              <Spinner />
              Loading...
            </div>
          )}
        </div>
      </div>

      {error && (
        <Message variant="error">{error}</Message>
      )}

      {loading && !data && <SkeletonRows />}

      {data && (
        <div className="space-y-4">
          {/* Company name & description */}
          {(data.companyName || data.description) && (
            <div className="space-y-1 pb-3 border-b border-white/[0.08]">
              {data.companyName && (
                <h3 className="font-chakra text-sm font-bold text-white tracking-wider uppercase">
                  {data.companyName}
                </h3>
              )}
              {data.description && (
                <p className="font-manrope text-xs text-[#a0a0a0] leading-relaxed line-clamp-4">
                  {data.description}
                </p>
              )}
            </div>
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.metrics.map((m) => {
              const isNA = m.result === "N/A";
              return (
                <div
                  key={m.name}
                  className={`border border-white/[0.08] bg-[#1a1a1a] p-3 ${
                    isNA ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-manrope text-xs text-[#a0a0a0] uppercase tracking-wider">
                      {m.name}
                    </span>
                    <span className={`font-ibm text-sm font-semibold shrink-0 ${
                        isNA ? "text-[#666666]" : "text-white"
                      }`}
                    >
                      {m.result}
                    </span>
                  </div>
                  <p className="font-manrope text-xs text-[#666666] mt-1">
                    {m.formula}
                  </p>
                  <p className="font-ibm text-xs text-[#666666]">
                    ={" "}
                    {Object.entries(m.values)
                      .map(([_k, v]) => `${v}`)
                      .join(" / ")}
                  </p>
                  <p className="font-manrope text-xs text-[#666666] mt-0.5">
                    {m.date}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Analyst targets */}
          {data.analystTargets && (
            <div className="border border-white/[0.08] bg-[#1a1a1a] p-3">
              <h3 className="font-chakra text-sm font-bold text-white mb-2">
                Analyst Price Targets
                {data.analystTargets.numAnalysts != null && (
                  <span className="font-manrope font-normal text-xs text-[#666666] ml-2">
                    ({data.analystTargets.numAnalysts} analysts)
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["low", "mean", "median", "high"] as const).map((key) => (
                  <div key={key}>
                    <p className="font-manrope text-xs text-[#666666] capitalize mb-1">
                      {key}
                    </p>
                    <p className="font-ibm text-sm font-semibold text-white">
                      {data.analystTargets![key] != null
                        ? `$${data.analystTargets![key]!.toFixed(2)}`
                        : "N/A"}
                    </p>
                  </div>
                ))}
              </div>
              {data.analystTargets.recommendation && (
                <p className="font-manrope text-xs text-[#666666] mt-3 pt-2 border-t border-white/[0.08] text-center">
                  Consensus:{" "}
                  <span className="font-medium text-[var(--color-accent-cyan)]">
                    {data.analystTargets.recommendation}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
