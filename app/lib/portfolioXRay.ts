import type {
  PortfolioHolding,
  ExposureBreakdown,
  PortfolioXRayResult,
  EtfHoldingsResponse,
  ConcentrationWarning,
} from "./types";

/**
 * Calculates real exposure to underlying companies by flattening ETF holdings
 */
export function calculatePortfolioExposure(
  portfolio: PortfolioHolding[],
  etfHoldingsData: EtfHoldingsResponse[],
): PortfolioXRayResult {
  // 1. Build exposure map
  const exposureMap = new Map<
    string,
    {
      companyName: string;
      directAllocation: number;
      fromEtfs: Array<{ etfSymbol: string; contribution: number }>;
    }
  >();

  // 2. Process direct stock holdings
  for (const holding of portfolio.filter((h) => !h.isEtf)) {
    if (!exposureMap.has(holding.symbol)) {
      exposureMap.set(holding.symbol, {
        companyName: holding.symbol, // Will be enriched if available
        directAllocation: 0,
        fromEtfs: [],
      });
    }
    const entry = exposureMap.get(holding.symbol)!;
    entry.directAllocation += holding.allocation;
  }

  // 3. Process ETF holdings
  for (const holding of portfolio.filter((h) => h.isEtf)) {
    const etfData = etfHoldingsData.find((e) => e.symbol === holding.symbol);
    if (!etfData || !etfData.holdings) continue;

    for (const etfHolding of etfData.holdings) {
      const contribution =
        holding.allocation * etfHolding.holdingPercent;

      if (!exposureMap.has(etfHolding.symbol)) {
        exposureMap.set(etfHolding.symbol, {
          companyName: etfHolding.holdingName || etfHolding.symbol,
          directAllocation: 0,
          fromEtfs: [],
        });
      }

      const entry = exposureMap.get(etfHolding.symbol)!;
      entry.fromEtfs.push({
        etfSymbol: holding.symbol,
        contribution,
      });
    }
  }

  // 4. Build exposure breakdown array
  const exposures: ExposureBreakdown[] = [];
  for (const [symbol, data] of exposureMap) {
    const totalEtfContribution = data.fromEtfs.reduce(
      (sum, e) => sum + e.contribution,
      0,
    );
    exposures.push({
      symbol,
      companyName: data.companyName,
      directAllocation: data.directAllocation,
      fromEtfs: data.fromEtfs,
      totalExposure: data.directAllocation + totalEtfContribution,
    });
  }

  // 5. Sort by total exposure descending
  exposures.sort((a, b) => b.totalExposure - a.totalExposure);

  // 6. Generate warnings
  const warnings = generateWarnings(exposures, portfolio);

  // 7. Calculate total allocated
  const totalAllocated = portfolio.reduce((sum, h) => sum + h.allocation, 0);

  return {
    holdings: portfolio,
    exposures,
    warnings,
    totalAllocated,
  };
}

/**
 * Generates concentration warnings based on exposure breakdown
 */
function generateWarnings(
  exposures: ExposureBreakdown[],
  portfolio: PortfolioHolding[],
): ConcentrationWarning[] {
  const warnings: ConcentrationWarning[] = [];
  const totalAllocated = portfolio.reduce((sum, h) => sum + h.allocation, 0);

  // Warning 1: Single stock > 15% total exposure
  for (const exp of exposures) {
    if (exp.totalExposure > 15) {
      warnings.push({
        type: "single_stock_concentration",
        severity: "high",
        message: `${exp.companyName} (${exp.symbol}) represents ${exp.totalExposure.toFixed(1)}% of your portfolio. Consider diversifying.`,
        symbols: [exp.symbol],
        value: exp.totalExposure,
      });
    }
  }

  // Warning 2: Top 5 holdings > 40% total exposure
  const top5Exposure = exposures
    .slice(0, 5)
    .reduce((sum, e) => sum + e.totalExposure, 0);
  if (top5Exposure > 40 && exposures.length > 5) {
    warnings.push({
      type: "top_n_concentration",
      severity: "medium",
      message: `Your top 5 holdings account for ${top5Exposure.toFixed(1)}% of your portfolio. This may indicate concentration risk.`,
      symbols: exposures.slice(0, 5).map((e) => e.symbol),
      value: top5Exposure,
    });
  }

  // Warning 3: Portfolio allocation doesn't sum to 100%
  if (Math.abs(totalAllocated - 100) > 0.1) {
    warnings.push({
      type: "allocation_mismatch",
      severity: "low",
      message: `Portfolio allocations sum to ${totalAllocated.toFixed(1)}% instead of 100%. This may be intentional (cash position) or an error.`,
      symbols: [],
      value: totalAllocated,
    });
  }

  return warnings;
}
