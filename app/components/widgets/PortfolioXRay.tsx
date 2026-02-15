"use client";

import { useState, useMemo, useCallback, useEffect, Fragment } from "react";
import { Widget } from "./Widget";
import { TextInput } from "../ui/TextInput";
import { TickerSearch } from "../ui/TickerSearch";
import { Button } from "../ui/Button";
import { Message } from "../ui/Message";
import { useEtfHoldings } from "../../hooks/useEtfHoldings";
import { calculatePortfolioExposure } from "../../lib/portfolioXRay";
import { formatPercent } from "../../lib/formatters";
import SectorBreakdownSection from "./SectorBreakdownSection";
import type {
  PortfolioHolding,
  ExposureBreakdown,
  ConcentrationWarning,
} from "../../lib/types";

const STORAGE_KEY = "portfolio-xray-holdings";

function PortfolioTable({
  holdings,
  onRemove,
}: {
  holdings: PortfolioHolding[];
  onRemove: (symbol: string) => void;
}) {
  const total = holdings.reduce((sum, h) => sum + h.allocation, 0);

  return (
    <div className="space-y-2">
      <h3 className="font-chakra text-xs uppercase tracking-wider text-[#666666]">
        Portfolio Holdings
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Symbol
              </th>
              <th className="text-right p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Allocation
              </th>
              <th className="text-center p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Type
              </th>
              <th className="text-center p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr
                key={h.symbol}
                className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors"
              >
                <td className="p-2 font-manrope text-white">{h.symbol}</td>
                <td className="p-2 font-ibm text-right text-white">
                  {formatPercent(h.allocation)}
                </td>
                <td className="p-2 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-manrope ${
                      h.isEtf
                        ? "bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]"
                        : "bg-white/[0.1] text-[#a0a0a0]"
                    }`}
                  >
                    {h.isEtf ? "ETF" : "Stock"}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => onRemove(h.symbol)}
                    className="text-[var(--color-loss)] hover:text-[var(--color-loss)]/80 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
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
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/[0.12] font-medium">
              <td className="p-2 font-chakra text-white">TOTAL</td>
              <td
                className={`p-2 font-ibm text-right ${
                  Math.abs(total - 100) < 0.1
                    ? "text-[var(--color-gain)]"
                    : "text-[var(--color-loss)]"
                }`}
              >
                {formatPercent(total)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarningsBanner({ warnings }: { warnings: ConcentrationWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => {
        const bgColor =
          w.severity === "high"
            ? "bg-[var(--color-loss)]/10 border-[var(--color-loss)]/30"
            : w.severity === "medium"
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-[var(--color-accent-cyan)]/10 border-[var(--color-accent-cyan)]/30";

        const textColor =
          w.severity === "high"
            ? "text-[var(--color-loss)]"
            : w.severity === "medium"
              ? "text-amber-400"
              : "text-[var(--color-accent-cyan)]";

        return (
          <div
            key={i}
            className={`rounded border ${bgColor} p-3 text-sm font-manrope ${textColor}`}
          >
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <span className="font-medium">
                  {w.severity === "high"
                    ? "High Risk:"
                    : w.severity === "medium"
                      ? "Medium Risk:"
                      : "Note:"}
                </span>{" "}
                {w.message}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExposureTable({ exposures }: { exposures: ExposureBreakdown[] }) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  if (exposures.length === 0) {
    return (
      <Message variant="info">
        No exposures calculated. Add holdings to analyze your portfolio.
      </Message>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-chakra text-xs uppercase tracking-wider text-[#666666]">
        Actual Company Exposure
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Company
              </th>
              <th className="text-right p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Direct
              </th>
              <th className="text-right p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                From ETFs
              </th>
              <th className="text-right p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Total
              </th>
              <th className="w-1/3 p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Visualization
              </th>
            </tr>
          </thead>
          <tbody>
            {exposures.map((exp) => {
              const totalFromEtfs = exp.fromEtfs.reduce(
                (sum, e) => sum + e.contribution,
                0,
              );
              const isExpanded = expandedSymbol === exp.symbol;
              const hasEtfExposure = exp.fromEtfs.length > 0;

              // Color coding based on total exposure
              let valueColor = "text-[#a0a0a0]";
              let glowClass = "";
              if (exp.totalExposure > 25) {
                valueColor = "text-[var(--color-loss)]";
                glowClass = "glow-loss";
              } else if (exp.totalExposure > 15) {
                valueColor = "text-amber-400";
              } else if (exp.totalExposure > 5) {
                valueColor = "text-[var(--color-accent-cyan)]";
              }

              return (
                <Fragment key={exp.symbol}>
                  <tr
                    className={`border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors ${hasEtfExposure ? "cursor-pointer" : ""}`}
                    onClick={
                      hasEtfExposure
                        ? () =>
                            setExpandedSymbol(
                              isExpanded ? null : exp.symbol,
                            )
                        : undefined
                    }
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {hasEtfExposure && (
                          <svg
                            className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
                        )}
                        <div>
                          <div className="font-manrope text-white font-medium">
                            {exp.symbol}
                          </div>
                          <div className="text-xs text-[#666666] truncate max-w-[200px]">
                            {exp.companyName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 font-ibm text-right text-white">
                      {exp.directAllocation > 0
                        ? formatPercent(exp.directAllocation)
                        : "-"}
                    </td>
                    <td className="p-2 font-ibm text-right text-white">
                      {totalFromEtfs > 0
                        ? formatPercent(totalFromEtfs)
                        : "-"}
                    </td>
                    <td
                      className={`p-2 font-ibm text-right font-medium ${valueColor} ${glowClass}`}
                    >
                      {formatPercent(exp.totalExposure)}
                    </td>
                    <td className="p-2">
                      <div className="relative h-6 bg-[#141414] border border-white/[0.08] rounded">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-accent-cyan)]/30 to-[var(--color-accent-cyan)]/10 rounded-l"
                          style={{
                            width: `${Math.min(exp.totalExposure, 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                  {isExpanded && hasEtfExposure && (
                    <tr className="bg-white/[0.02]">
                      <td colSpan={5} className="p-3">
                        <div className="text-xs font-manrope text-[#a0a0a0] space-y-1 ml-8">
                          <div className="font-medium text-white mb-1">
                            ETF Breakdown:
                          </div>
                          {exp.fromEtfs.map((etf, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center"
                            >
                              <span>{etf.etfSymbol}</span>
                              <span className="font-ibm">
                                {formatPercent(etf.contribution)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PortfolioXRay() {
  // State
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [inputSymbol, setInputSymbol] = useState("");
  const [inputAllocation, setInputAllocation] = useState("");
  const [inputIsEtf, setInputIsEtf] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPortfolio(parsed);
      }
    } catch (err) {
      console.error("Failed to load portfolio from localStorage", err);
    }
  }, []);

  // Save to localStorage on portfolio change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    } catch (err) {
      console.error("Failed to save portfolio to localStorage", err);
    }
  }, [portfolio]);

  // Fetch ETF holdings for all ETFs in portfolio
  const etfSymbols = useMemo(
    () => portfolio.filter((h) => h.isEtf).map((h) => h.symbol),
    [portfolio],
  );
  const holdingsQuery = useEtfHoldings(etfSymbols);

  // Calculate exposure
  const result = useMemo(() => {
    if (!hasAnalyzed || !holdingsQuery.data?.data) return null;
    return calculatePortfolioExposure(portfolio, holdingsQuery.data.data);
  }, [hasAnalyzed, portfolio, holdingsQuery.data]);

  // Handlers
  const handleAddHolding = useCallback(() => {
    setValidationError(null);

    const symbol = inputSymbol
      .trim()
      .toUpperCase()
      .replace(/[^a-zA-Z0-9.\-^]/g, "");
    const allocation = parseFloat(inputAllocation);

    if (!symbol) {
      setValidationError("Please enter a symbol");
      return;
    }
    if (isNaN(allocation)) {
      setValidationError("Please enter a valid allocation percentage");
      return;
    }
    if (allocation <= 0) {
      setValidationError("Allocation must be greater than 0%");
      return;
    }
    if (allocation > 100) {
      setValidationError("Allocation cannot exceed 100%");
      return;
    }
    if (portfolio.some((h) => h.symbol === symbol)) {
      setValidationError(`${symbol} is already in your portfolio`);
      return;
    }
    if (portfolio.length >= 30) {
      setValidationError("Maximum 30 holdings reached");
      return;
    }

    setPortfolio((prev) => [...prev, { symbol, allocation, isEtf: inputIsEtf }]);
    setInputSymbol("");
    setInputAllocation("");
    setInputIsEtf(false);
    setHasAnalyzed(false);
  }, [inputSymbol, inputAllocation, inputIsEtf, portfolio]);

  const handleRemoveHolding = useCallback((symbol: string) => {
    setPortfolio((prev) => prev.filter((h) => h.symbol !== symbol));
    setHasAnalyzed(false);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (portfolio.length === 0) return;
    setHasAnalyzed(true);
  }, [portfolio]);

  const handleReset = useCallback(() => {
    setHasAnalyzed(false);
    setPortfolio([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddHolding();
      }
    },
    [handleAddHolding],
  );

  const handleAllocationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputAllocation(e.target.value);
    setValidationError(null);
  }, []);

  return (
    <Widget
      title="Portfolio X-Ray"
      subtitle="Calculate real exposure to underlying companies"
      collapsible={true}
      defaultCollapsed={false}
    >
      <div className="space-y-4">
        {/* Input form */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="block font-chakra text-xs font-medium text-[#a0a0a0] uppercase tracking-wider">
                Symbol
              </label>
              <TickerSearch
                value={inputSymbol}
                onChange={(val) => { setInputSymbol(val); setValidationError(null); }}
                onSelect={(sym) => { setInputSymbol(sym); setValidationError(null); }}
                placeholder="AAPL"
                className="w-full"
              />
            </div>
            <TextInput
              label="Allocation %"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={inputAllocation}
              onChange={handleAllocationChange}
              onKeyDown={handleKeyDown}
              placeholder="10"
            />
            <div className="flex flex-col gap-1">
              <label className="font-manrope text-xs text-[#666666]">
                Type
              </label>
              <div className="flex items-center gap-2 h-9">
                <label className="flex items-center gap-2 font-manrope text-sm text-[#a0a0a0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputIsEtf}
                    onChange={(e) => setInputIsEtf(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent-cyan)]"
                  />
                  Is ETF
                </label>
                <Button
                  onClick={handleAddHolding}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  disabled={portfolio.length >= 30}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
          {validationError && (
            <Message variant="error">{validationError}</Message>
          )}
          {portfolio.length >= 30 && !validationError && (
            <Message variant="warning">
              Maximum 30 holdings reached. Remove some to add more.
            </Message>
          )}
        </div>

        {/* Portfolio holdings table */}
        {portfolio.length > 0 && (
          <PortfolioTable holdings={portfolio} onRemove={handleRemoveHolding} />
        )}

        {/* Analyze button */}
        {portfolio.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              variant="primary"
              loading={holdingsQuery.isFetching}
              disabled={holdingsQuery.isFetching || hasAnalyzed}
            >
              {hasAnalyzed ? "Analyzed" : "Analyze Portfolio"}
            </Button>
            <Button onClick={handleReset} variant="ghost" size="sm">
              Reset
            </Button>
          </div>
        )}

        {/* Empty state */}
        {portfolio.length === 0 && (
          <Message variant="info">
            Add your holdings above to analyze your portfolio. Example: QQQ 40%
            (ETF), XDWT 30% (ETF), NVDA 10% (Stock), AAPL 15% (Stock), Cash 5%
          </Message>
        )}

        {/* Fetch errors */}
        {holdingsQuery.data?.errors && holdingsQuery.data.errors.length > 0 && (
          <Message variant="warning">
            Failed to fetch holdings for some ETFs:
            <ul className="mt-2 list-disc list-inside">
              {holdingsQuery.data.errors.map((e) => (
                <li key={e.symbol}>
                  {e.symbol}: {e.error}
                </li>
              ))}
            </ul>
          </Message>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <WarningsBanner warnings={result.warnings} />
            <ExposureTable exposures={result.exposures} />

            {/* Sector Breakdown */}
            <div className="border-t border-white/[0.08] pt-4 mt-4">
              <SectorBreakdownSection exposures={result.exposures} />
            </div>

            <p className="text-xs text-[#666666] font-manrope">
              Based on top holdings reported by Yahoo Finance. Smaller positions
              may not be included in the calculation.
            </p>
          </div>
        )}
      </div>
    </Widget>
  );
}
