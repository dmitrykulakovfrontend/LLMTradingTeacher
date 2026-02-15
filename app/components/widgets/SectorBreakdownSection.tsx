"use client";

import { useMemo } from "react";
import { useSectorData } from "../../hooks/useSectorData";
import { calculateSectorBreakdown } from "../../lib/sectorBreakdown";
import { Message } from "../ui/Message";
import SectorPieChart from "./SectorPieChart";
import type {
  ExposureBreakdown,
  ConcentrationWarning,
} from "../../lib/types";
import { formatPercent } from "../../lib/formatters";

interface SectorBreakdownSectionProps {
  exposures: ExposureBreakdown[];
}

function SectorWarningsBanner({
  warnings,
}: {
  warnings: ConcentrationWarning[];
}) {
  const sectorWarnings = warnings.filter(
    (w) => w.type === "sector_concentration",
  );
  if (sectorWarnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {sectorWarnings.map((w, i) => {
        const bgColor =
          w.severity === "high"
            ? "bg-[var(--color-loss)]/10 border-[var(--color-loss)]/30"
            : "bg-amber-500/10 border-amber-500/30";

        const textColor =
          w.severity === "high"
            ? "text-[var(--color-loss)]"
            : "text-amber-400";

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
                  {w.severity === "high" ? "High Risk:" : "Medium Risk:"}
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

export default function SectorBreakdownSection({
  exposures,
}: SectorBreakdownSectionProps) {
  // Extract all unique symbols from exposures
  const symbols = useMemo(() => exposures.map((e) => e.symbol), [exposures]);

  const sectorQuery = useSectorData(symbols);

  const result = useMemo(() => {
    if (!sectorQuery.data?.data) return null;
    return calculateSectorBreakdown(exposures, sectorQuery.data.data);
  }, [exposures, sectorQuery.data]);

  if (sectorQuery.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-white/[0.05] animate-pulse rounded"></div>
        <div className="h-4 bg-white/[0.05] animate-pulse rounded w-3/4"></div>
        <div className="h-4 bg-white/[0.05] animate-pulse rounded w-1/2"></div>
      </div>
    );
  }

  if (sectorQuery.error) {
    return (
      <Message variant="error">
        Failed to load sector data: {(sectorQuery.error as Error).message}
      </Message>
    );
  }

  if (!result || result.sectors.length === 0) {
    return (
      <Message variant="info">
        No sector data available for your holdings.
      </Message>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-chakra text-xs uppercase tracking-wider text-[#666666]">
        Sector Breakdown
      </h3>

      {/* Warnings */}
      <SectorWarningsBanner warnings={result.warnings} />

      {/* Pie Chart */}
      <SectorPieChart sectors={result.sectors} />

      {/* Sector Details Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Sector
              </th>
              <th className="text-right p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Exposure
              </th>
              <th className="text-right p-2 font-chakra text-xs uppercase tracking-wider text-[#666666]">
                Companies
              </th>
            </tr>
          </thead>
          <tbody>
            {result.sectors.map((sector) => (
              <tr
                key={sector.sector}
                className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors"
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: sector.color }}
                    />
                    <span className="font-manrope text-white">
                      {sector.sector}
                    </span>
                  </div>
                </td>
                <td className="p-2 font-ibm text-right text-white">
                  {formatPercent(sector.totalExposure)}
                </td>
                <td className="p-2 font-manrope text-right text-[#a0a0a0]">
                  {sector.companies.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="text-xs text-[#666666] font-manrope">
        Sector classifications based on Yahoo Finance data.{" "}
        {result.totalCategorized < 95 && (
          <span className="text-amber-400">
            {(100 - result.totalCategorized).toFixed(3)}% of portfolio lacks
            sector data.
          </span>
        )}
      </p>

      {/* Fetch errors if any */}
      {sectorQuery.data?.errors && sectorQuery.data.errors.length > 0 && (
        <Message variant="warning">
          Failed to fetch sector data for some symbols:
          <ul className="mt-2 list-disc list-inside">
            {sectorQuery.data.errors.map((e) => (
              <li key={e.symbol}>
                {e.symbol}: {e.error}
              </li>
            ))}
          </ul>
        </Message>
      )}
    </div>
  );
}
