"use client";

import { useState, useCallback } from "react";
import type { FundamentalsData } from "../lib/types";

interface FundamentalsPanelProps {
  data: FundamentalsData | null;
  loading: boolean;
  error: string | null;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-1.5">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
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
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!data?.rawResponse) return;
    const text = JSON.stringify(data.rawResponse);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  // Don't render anything before first analysis
  if (!data && !loading && !error) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {data?.rawResponse && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {copied ? (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Data
                </>
              )}
            </button>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Spinner />
              Loading...
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && !data && <SkeletonRows />}

      {data && (
        <div className="space-y-4">
          {/* Company name & description */}
          {(data.companyName || data.description) && (
            <div className="space-y-1">
              {data.companyName && (
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.companyName}
                </h3>
              )}
              {data.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-4">
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
                  className={`rounded-md border p-3 ${
                    isNA
                      ? "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 opacity-60"
                      : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {m.name}
                    </span>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        isNA
                          ? "text-gray-400 dark:text-gray-600"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {m.result}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {m.formula}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ={" "}
                    {Object.entries(m.values)
                      .map(([k, v]) => `${v}`)
                      .join(" / ")}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {m.date}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Analyst targets */}
          {data.analystTargets && (
            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-3">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                Analyst Price Targets
                {data.analystTargets.numAnalysts != null && (
                  <span className="font-normal text-xs text-gray-500 dark:text-gray-400 ml-2">
                    ({data.analystTargets.numAnalysts} analysts)
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["low", "mean", "median", "high"] as const).map((key) => (
                  <div key={key}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {key}
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {data.analystTargets![key] != null
                        ? `$${data.analystTargets![key]!.toFixed(2)}`
                        : "N/A"}
                    </p>
                  </div>
                ))}
              </div>
              {data.analystTargets.recommendation && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Consensus:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
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
