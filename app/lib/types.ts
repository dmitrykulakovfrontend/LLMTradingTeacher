export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        currency: string;
        exchangeName: string;
        regularMarketPrice: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

export type Timeframe = '1d' | '5d' | '1mo' | '3mo';
export type Interval = '5m' | '15m' | '1h' | '1d';

export interface StockQuery {
  symbol: string;
  range: Timeframe;
  interval: Interval;
}

export interface AnalysisState {
  loading: boolean;
  result: string | null;
  error: string | null;
}
