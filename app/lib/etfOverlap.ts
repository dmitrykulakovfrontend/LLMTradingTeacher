import type {
  EtfHoldingsResponse,
  EtfOverlapResult,
  PairwiseOverlap,
  OverlapHoldingRow,
  DiversificationWarning,
} from "./types";

function computePairwiseOverlap(
  a: EtfHoldingsResponse,
  b: EtfHoldingsResponse,
): number {
  const bWeights = new Map<string, number>();
  for (const h of b.holdings) {
    bWeights.set(h.symbol, h.holdingPercent);
  }

  let overlap = 0;
  for (const h of a.holdings) {
    const bWeight = bWeights.get(h.symbol);
    if (bWeight !== undefined) {
      overlap += Math.min(h.holdingPercent, bWeight);
    }
  }

  return overlap;
}

export function computeEtfOverlap(
  etfData: EtfHoldingsResponse[],
): EtfOverlapResult {
  const etfs = etfData.map((e) => e.symbol);

  // Pairwise overlap matrix
  const pairwiseOverlaps: PairwiseOverlap[] = [];
  for (let i = 0; i < etfData.length; i++) {
    for (let j = i + 1; j < etfData.length; j++) {
      pairwiseOverlaps.push({
        etfA: etfData[i].symbol,
        etfB: etfData[j].symbol,
        overlapPercent: computePairwiseOverlap(etfData[i], etfData[j]),
      });
    }
  }

  // Aggregate all holdings across all ETFs
  const holdingMap = new Map<
    string,
    { holdingName: string; weights: Record<string, number> }
  >();

  for (const etf of etfData) {
    for (const h of etf.holdings) {
      if (!holdingMap.has(h.symbol)) {
        holdingMap.set(h.symbol, { holdingName: h.holdingName, weights: {} });
      }
      holdingMap.get(h.symbol)!.weights[etf.symbol] = h.holdingPercent;
    }
  }

  // Build rows
  const allHoldings: OverlapHoldingRow[] = [];
  for (const [symbol, info] of holdingMap) {
    const etfCount = Object.keys(info.weights).length;
    const weightValues = Object.values(info.weights);
    const averageExposure =
      weightValues.reduce((sum, w) => sum + w, 0) / etfCount;

    allHoldings.push({
      symbol,
      holdingName: info.holdingName,
      weights: info.weights,
      etfCount,
      averageExposure,
    });
  }

  allHoldings.sort((a, b) => b.averageExposure - a.averageExposure);

  const overlappingHoldings = allHoldings.filter((h) => h.etfCount >= 2);

  // Diversification warnings
  const warnings: DiversificationWarning[] = [];
  const totalEtfCount = etfData.length;

  for (const h of overlappingHoldings) {
    if (h.etfCount === totalEtfCount && h.averageExposure > 0.05) {
      warnings.push({
        type: "single_stock_concentration",
        message: `${h.holdingName} (${h.symbol}) appears in all ${totalEtfCount} ETFs with an average weight of ${(h.averageExposure * 100).toFixed(1)}%.`,
        symbols: [h.symbol],
        value: h.averageExposure,
      });
    }
  }

  // Top N concentration warning
  const universalHoldings = overlappingHoldings
    .filter((h) => h.etfCount === totalEtfCount)
    .sort((a, b) => b.averageExposure - a.averageExposure);

  let cumulativeExposure = 0;
  const topConcentrated: string[] = [];
  for (const h of universalHoldings) {
    cumulativeExposure += h.averageExposure;
    topConcentrated.push(h.symbol);
    if (cumulativeExposure > 0.25) {
      warnings.push({
        type: "top_n_concentration",
        message: `Top ${topConcentrated.length} overlapping companies account for ${(cumulativeExposure * 100).toFixed(1)}% combined average exposure. You may not be as diversified as you think.`,
        symbols: [...topConcentrated],
        value: cumulativeExposure,
      });
      break;
    }
  }

  return {
    etfs,
    pairwiseOverlaps,
    overlappingHoldings,
    allHoldings,
    warnings,
  };
}
