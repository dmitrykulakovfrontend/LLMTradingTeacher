import type { CandleData, StockQuery } from './types';

export async function fetchStockData(query: StockQuery): Promise<CandleData[]> {
  const params = new URLSearchParams({
    symbol: query.symbol,
    range: query.range,
    interval: query.interval,
  });

  const response = await fetch(`/api/stock?${params}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch stock data' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
