"use client";

import { useState, useMemo, useCallback } from "react";
import { useEtfHoldings } from "../../hooks/useEtfHoldings";
import { computeEtfOverlap } from "../../lib/etfOverlap";
import type {
  EtfOverlapResult,
  PairwiseOverlap,
  OverlapHoldingRow,
  DiversificationWarning,
} from "../../lib/types";

function overlapColor(pct: number): string {
  if (pct > 0.6)
    return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
  if (pct > 0.4)
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
  if (pct > 0.2)
    return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
  return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
}

function formatPct(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

function getOverlapForPair(
  overlaps: PairwiseOverlap[],
  a: string,
  b: string,
): number | null {
  const found = overlaps.find(
    (o) =>
      (o.etfA === a && o.etfB === b) || (o.etfA === b && o.etfB === a),
  );
  return found?.overlapPercent ?? null;
}

function WarningsBanner({ warnings }: { warnings: DiversificationWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300"
        >
          <span className="font-medium mr-1">Warning:</span>
          {w.message}
        </div>
      ))}
    </div>
  );
}

function OverlapMatrix({
  etfs,
  overlaps,
}: {
  etfs: string[];
  overlaps: PairwiseOverlap[];
}) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Overlap Matrix
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-gray-500 dark:text-gray-400 font-medium" />
              {etfs.map((etf) => (
                <th
                  key={etf}
                  className="p-2 text-center text-gray-700 dark:text-gray-300 font-medium"
                >
                  {etf}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {etfs.map((rowEtf) => (
              <tr key={rowEtf}>
                <td className="p-2 font-medium text-gray-700 dark:text-gray-300">
                  {rowEtf}
                </td>
                {etfs.map((colEtf) => {
                  if (rowEtf === colEtf) {
                    return (
                      <td
                        key={colEtf}
                        className="p-2 text-center text-gray-400 dark:text-gray-600"
                      >
                        --
                      </td>
                    );
                  }
                  const pct = getOverlapForPair(overlaps, rowEtf, colEtf);
                  if (pct === null) return <td key={colEtf} className="p-2 text-center">--</td>;
                  return (
                    <td key={colEtf} className="p-1 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${overlapColor(pct)}`}
                      >
                        {formatPct(pct)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HoldingsTable({
  etfs,
  holdings,
}: {
  etfs: string[];
  holdings: OverlapHoldingRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const displayHoldings = expanded ? holdings : holdings.slice(0, 10);

  if (holdings.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No overlapping holdings found between these ETFs.
      </p>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Overlapping Holdings ({holdings.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-2 text-gray-500 dark:text-gray-400 font-medium">
                Company
              </th>
              {etfs.map((etf) => (
                <th
                  key={etf}
                  className="p-2 text-right text-gray-500 dark:text-gray-400 font-medium"
                >
                  {etf}
                </th>
              ))}
              <th className="p-2 text-right text-gray-500 dark:text-gray-400 font-medium">
                Avg Exposure
              </th>
              <th className="p-2 text-center text-gray-500 dark:text-gray-400 font-medium">
                # ETFs
              </th>
            </tr>
          </thead>
          <tbody>
            {displayHoldings.map((h) => {
              const isHighlighted = h.averageExposure > 0.05;
              return (
                <tr
                  key={h.symbol}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    isHighlighted
                      ? "bg-red-50/50 dark:bg-red-900/10"
                      : ""
                  }`}
                >
                  <td className="p-2">
                    <div className="text-gray-800 dark:text-gray-200 font-medium">
                      {h.symbol}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                      {h.holdingName}
                    </div>
                  </td>
                  {etfs.map((etf) => (
                    <td
                      key={etf}
                      className="p-2 text-right text-gray-700 dark:text-gray-300"
                    >
                      {h.weights[etf] != null ? formatPct(h.weights[etf]) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          --
                        </span>
                      )}
                    </td>
                  ))}
                  <td
                    className={`p-2 text-right font-medium ${
                      isHighlighted
                        ? "text-red-700 dark:text-red-400"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {formatPct(h.averageExposure)}
                  </td>
                  <td className="p-2 text-center text-gray-600 dark:text-gray-400">
                    {h.etfCount}/{etfs.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {holdings.length > 10 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded
            ? "Show less"
            : `Show all ${holdings.length} overlapping holdings`}
        </button>
      )}
    </div>
  );
}

export default function EtfOverlap() {
  const [inputValue, setInputValue] = useState("");
  const [etfList, setEtfList] = useState<string[]>([]);
  const [activeSymbols, setActiveSymbols] = useState<string[]>([]);

  const handleAdd = useCallback(() => {
    const ticker = inputValue
      .trim()
      .toUpperCase()
      .replace(/[^a-zA-Z0-9.\-^]/g, "");
    if (!ticker || etfList.includes(ticker) || etfList.length >= 10) return;
    setEtfList((prev) => [...prev, ticker]);
    setInputValue("");
  }, [inputValue, etfList]);

  const handleRemove = useCallback((ticker: string) => {
    setEtfList((prev) => prev.filter((t) => t !== ticker));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleCompare = useCallback(() => {
    if (etfList.length >= 2) {
      setActiveSymbols([...etfList]);
    }
  }, [etfList]);

  const holdingsQuery = useEtfHoldings(activeSymbols);

  const overlapResult: EtfOverlapResult | null = useMemo(() => {
    if (!holdingsQuery.data?.data || holdingsQuery.data.data.length < 2)
      return null;
    return computeEtfOverlap(holdingsQuery.data.data);
  }, [holdingsQuery.data]);

  const fetchErrors = holdingsQuery.data?.errors ?? [];

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* ETF Ticker Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Compare ETF Holdings
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="e.g. VOO"
            className="w-24 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!inputValue.trim() || etfList.length >= 10}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleCompare}
            disabled={etfList.length < 2 || holdingsQuery.isFetching}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {holdingsQuery.isFetching ? "Loading..." : "Compare"}
          </button>
        </div>

        {/* Tags */}
        {etfList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {etfList.map((ticker) => (
              <span
                key={ticker}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300"
              >
                {ticker}
                <button
                  type="button"
                  onClick={() => handleRemove(ticker)}
                  className="ml-0.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
            {etfList.length >= 10 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                Max 10 ETFs
              </span>
            )}
          </div>
        )}
      </div>

      {/* Fetch errors for individual ETFs */}
      {fetchErrors.length > 0 && (
        <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
          {fetchErrors.map((e) => (
            <p key={e.symbol}>
              <span className="font-medium">{e.symbol}:</span> {e.error}
            </p>
          ))}
        </div>
      )}

      {/* Query-level error */}
      {holdingsQuery.error && (
        <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {holdingsQuery.error.message}
        </div>
      )}

      {/* Loading skeleton */}
      {holdingsQuery.isFetching && !overlapResult && (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      )}

      {/* Results */}
      {overlapResult && (
        <div className="space-y-4">
          <WarningsBanner warnings={overlapResult.warnings} />
          <OverlapMatrix
            etfs={overlapResult.etfs}
            overlaps={overlapResult.pairwiseOverlaps}
          />
          <HoldingsTable
            etfs={overlapResult.etfs}
            holdings={overlapResult.overlappingHoldings}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Based on top holdings reported by Yahoo Finance. Smaller positions
            may not be included.
          </p>
        </div>
      )}
    </div>
  );
}
