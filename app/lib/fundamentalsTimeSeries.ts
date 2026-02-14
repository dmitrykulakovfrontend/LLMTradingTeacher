import {
  FundamentalsTimeSeriesModule,
  FundamentalsTimeSeriesType,
} from "./types";
import { FundamentalsTimeSeriesResult } from "yahoo-finance2/modules/fundamentalsTimeSeries";

export async function fetchFundamentalsTimeSeries(
  symbol: string,
  module: FundamentalsTimeSeriesModule,
  range: string,
  type: FundamentalsTimeSeriesType,
) {
  const body: Record<string, string> = { symbol, module, range, type };

  const response = await fetch("/api/FundamentalsTimeSeries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: "Failed to fetch fundamentals" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data: FundamentalsTimeSeriesResult[] = await response.json();
  return data;
}
