import { CandleData, YahooChartResponse, StockQuery } from './types';

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

  const data: YahooChartResponse = await response.json();

  if (!data.chart?.result?.[0]) {
    throw new Error('No data returned for this symbol');
  }

  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  if (!timestamps || !quote) {
    throw new Error('Invalid data structure from Yahoo Finance');
  }

  const isDaily = query.interval === '1d';

  const candles: CandleData[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];

    if (open === null || high === null || low === null || close === null) {
      continue;
    }

    candles.push({
      time: isDaily
        ? new Date(timestamps[i] * 1000).toISOString().split('T')[0]
        : timestamps[i],
      open,
      high,
      low,
      close,
      volume: quote.volume[i] ?? undefined,
    });
  }

  return candles;
}
