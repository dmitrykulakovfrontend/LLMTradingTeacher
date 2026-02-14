import type { EtfHoldingsResponse } from "./types";

export interface EtfHoldingsFetchResult {
  data: EtfHoldingsResponse[];
  errors: Array<{ symbol: string; error: string }>;
}

export async function fetchEtfHoldings(
  symbols: string[],
): Promise<EtfHoldingsFetchResult> {
  const params = new URLSearchParams({
    symbols: symbols.join(","),
  });

  const response = await fetch(`/api/etf-holdings?${params}`);

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: "Failed to fetch ETF holdings" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
