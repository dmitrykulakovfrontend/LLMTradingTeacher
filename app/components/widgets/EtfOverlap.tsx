"use client";

import { useState, useMemo, useCallback } from "react";
import { useEtfHoldings } from "../../hooks/useEtfHoldings";
import { computeEtfOverlap, computeWeightedOverlap } from "../../lib/etfOverlap";
import { TickerSearch } from "../ui/TickerSearch";
import type {
  EtfOverlapResult,
  PairwiseOverlap,
  OverlapHoldingRow,
  DiversificationWarning,
  WeightedPairwiseOverlap,
  WeightedEtfOverlapResult,
  PortfolioHolding,
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
  return (value * 100).toFixed(3) + "%";
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
  weightedOverlaps,
  hasWeights,
}: {
  etfs: string[];
  overlaps: PairwiseOverlap[];
  weightedOverlaps?: WeightedPairwiseOverlap[];
  hasWeights?: boolean;
}) {
  const getWeightForEtf = useCallback((etf: string): number | undefined => {
    if (!weightedOverlaps) return undefined;
    const found = weightedOverlaps.find(w => w.etfA === etf || w.etfB === etf);
    if (!found) return undefined;
    return found.etfA === etf ? found.weightA : found.weightB;
  }, [weightedOverlaps]);

  const getEffectiveOverlap = useCallback((a: string, b: string): number | undefined => {
    if (!weightedOverlaps) return undefined;
    const found = weightedOverlaps.find(
      (w) => (w.etfA === a && w.etfB === b) || (w.etfA === b && w.etfB === a)
    );
    return found?.effectiveOverlap;
  }, [weightedOverlaps]);

  const getOverlapColor = useCallback((rawPct: number, effectivePct?: number): string => {
    // Use effective overlap for coloring if available
    if (hasWeights && effectivePct !== undefined) {
      const pct = effectivePct / 100; // Convert to 0-1 scale
      if (pct > 0.05) return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      if (pct > 0.02) return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
      if (pct > 0.01) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
    }
    // Use raw overlap for coloring
    return overlapColor(rawPct);
  }, [hasWeights]);

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
              {etfs.map((etf) => {
                const weight = getWeightForEtf(etf);
                return (
                  <th
                    key={etf}
                    className="p-2 text-center text-gray-700 dark:text-gray-300 font-medium"
                  >
                    <div>{etf}</div>
                    {hasWeights && weight !== undefined && (
                      <div className="text-xs font-normal text-gray-500 dark:text-gray-400 font-mono">
                        {weight.toFixed(1)}%
                      </div>
                    )}
                  </th>
                );
              })}
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
                  const rawPct = getOverlapForPair(overlaps, rowEtf, colEtf);
                  if (rawPct === null) return <td key={colEtf} className="p-2 text-center">--</td>;

                  const effectivePct = getEffectiveOverlap(rowEtf, colEtf);
                  const colorClass = getOverlapColor(rawPct, effectivePct);

                  return (
                    <td key={colEtf} className="p-1 text-center relative group">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colorClass}`}
                        title={
                          hasWeights && effectivePct !== undefined
                            ? `Raw overlap: ${formatPct(rawPct)}\nEffective impact: ${(effectivePct).toFixed(3)}%`
                            : `Overlap: ${formatPct(rawPct)}`
                        }
                      >
                        {hasWeights && effectivePct !== undefined ? (
                          <div className="flex flex-col items-center leading-tight">
                            <span>{formatPct(rawPct)}</span>
                            <span className="text-[10px] opacity-70">
                              ({(effectivePct).toFixed(3)}%)
                            </span>
                          </div>
                        ) : (
                          formatPct(rawPct)
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasWeights && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Showing raw overlap with effective portfolio impact in parentheses.
        </p>
      )}
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
                    {h.effectiveExposure !== undefined ? (
                      <div className="flex flex-col items-end leading-tight">
                        <span>{formatPct(h.averageExposure)}</span>
                        <span
                          className="text-[10px] opacity-70 cursor-help"
                          title="Total exposure of this stock in your whole portfolio"
                        >
                          ({formatPct(h.effectiveExposure)})
                        </span>
                      </div>
                    ) : (
                      formatPct(h.averageExposure)
                    )}
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

function EtfTag({
  ticker,
  weight,
  onRemove,
  onWeightChange,
  showWeightInput,
}: {
  ticker: string;
  weight?: number;
  onRemove: () => void;
  onWeightChange: (weight: number | undefined) => void;
  showWeightInput: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(weight?.toString() ?? "");

  const handleSave = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onWeightChange(parsed);
    } else if (inputValue === "") {
      onWeightChange(undefined);
    }
    setEditing(false);
  }, [inputValue, onWeightChange]);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
      <span className="font-mono">{ticker}</span>

      {showWeightInput && (
        <>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono"
            >
              {weight !== undefined ? `${weight.toFixed(1)}%` : "add %"}
            </button>
          ) : (
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              className="w-12 px-1 text-xs border border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
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
  );
}

export default function EtfOverlap() {
  const [inputValue, setInputValue] = useState("");
  const [etfList, setEtfList] = useState<string[]>([]);
  const [activeSymbols, setActiveSymbols] = useState<string[]>([]);
  const [etfWeights, setEtfWeights] = useState<Record<string, number>>({});
  const [weightInputMode, setWeightInputMode] = useState(false);

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
    // Also remove weight if exists
    setEtfWeights((prev) => {
      const updated = { ...prev };
      delete updated[ticker];
      return updated;
    });
  }, []);

  const handleCompare = useCallback(() => {
    if (etfList.length >= 2) {
      setActiveSymbols([...etfList]);
    }
  }, [etfList]);

  const loadFromXRay = useCallback(() => {
    try {
      const saved = localStorage.getItem("portfolio-xray-holdings");
      if (!saved) {
        alert("No Portfolio X-Ray data found. Add holdings in Portfolio X-Ray first.");
        return;
      }

      const portfolio: PortfolioHolding[] = JSON.parse(saved);
      const etfHoldings = portfolio.filter((h) => h.isEtf);

      if (etfHoldings.length === 0) {
        alert("Portfolio X-Ray has no ETF holdings.");
        return;
      }

      // Add ETF symbols to the list (avoid duplicates)
      const newEtfSymbols = etfHoldings.map((h) => h.symbol);
      const uniqueSymbols = [...new Set([...etfList, ...newEtfSymbols])].slice(0, 10); // Max 10 ETFs

      setEtfList(uniqueSymbols);

      // Load weights for all ETFs from Portfolio X-Ray
      const newWeights: Record<string, number> = {};
      etfHoldings.forEach((h) => {
        if (uniqueSymbols.includes(h.symbol)) {
          newWeights[h.symbol] = h.allocation;
        }
      });

      setEtfWeights(newWeights);
      setWeightInputMode(true); // Auto-enable weight mode

      alert(`Loaded ${etfHoldings.length} ETFs with weights from Portfolio X-Ray.`);
    } catch (err) {
      console.error("Failed to load from X-Ray", err);
      alert("Failed to load from Portfolio X-Ray. Invalid data format.");
    }
  }, [etfList]);

  const holdingsQuery = useEtfHoldings(activeSymbols);

  const overlapResult: EtfOverlapResult | WeightedEtfOverlapResult | null = useMemo(() => {
    if (!holdingsQuery.data?.data || holdingsQuery.data.data.length < 2)
      return null;

    const hasWeights = Object.keys(etfWeights).length > 0;
    if (hasWeights) {
      return computeWeightedOverlap(holdingsQuery.data.data, etfWeights);
    } else {
      return computeEtfOverlap(holdingsQuery.data.data);
    }
  }, [holdingsQuery.data, etfWeights]);

  const fetchErrors = holdingsQuery.data?.errors ?? [];

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* ETF Ticker Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Compare ETF Holdings
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <TickerSearch
            value={inputValue}
            onChange={setInputValue}
            onSelect={(sym) => setInputValue(sym)}
            placeholder="e.g. VOO"
            className="w-32"
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
          <button
            type="button"
            onClick={loadFromXRay}
            className="rounded-md border border-cyan-500 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1.5 text-sm font-medium text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
            title="Load ETFs and weights from Portfolio X-Ray"
          >
            Load from Portfolio X-Ray
          </button>
        </div>

        {/* Tags */}
        {etfList.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {etfList.map((ticker) => (
                <EtfTag
                  key={ticker}
                  ticker={ticker}
                  weight={etfWeights[ticker]}
                  onRemove={() => handleRemove(ticker)}
                  onWeightChange={(weight) => {
                    setEtfWeights((prev) => {
                      const updated = { ...prev };
                      if (weight === undefined) {
                        delete updated[ticker];
                      } else {
                        updated[ticker] = weight;
                      }
                      return updated;
                    });
                  }}
                  showWeightInput={weightInputMode}
                />
              ))}
              {etfList.length >= 10 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                  Max 10 ETFs
                </span>
              )}
            </div>

            {/* Weight controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setWeightInputMode(!weightInputMode)}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
              >
                {weightInputMode ? "Hide weights" : "Add portfolio weights"}
              </button>

              {weightInputMode && (
                <>
                  <button
                    type="button"
                    onClick={loadFromXRay}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Load from Portfolio X-Ray
                  </button>

                  {Object.keys(etfWeights).length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEtfWeights({})}
                        className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Clear weights
                      </button>

                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        Total:{" "}
                        {Object.values(etfWeights)
                          .reduce((s, w) => s + w, 0)
                          .toFixed(1)}
                        %
                        {Math.abs(
                          Object.values(etfWeights).reduce((s, w) => s + w, 0) -
                            100,
                        ) > 0.1 && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">
                            ⚠
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
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
            weightedOverlaps={
              "weightedOverlaps" in overlapResult
                ? (overlapResult as WeightedEtfOverlapResult).weightedOverlaps
                : undefined
            }
            hasWeights={
              "hasWeights" in overlapResult
                ? (overlapResult as WeightedEtfOverlapResult).hasWeights
                : false
            }
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
