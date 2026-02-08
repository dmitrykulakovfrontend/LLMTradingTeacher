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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalysisState {
  loading: boolean;
  result: string | null;
  error: string | null;
}

// --- Financial Modeling Prep (FMP) API types ---

export interface FmpIncomeStatement {
  date: string;
  fiscalYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  epsDiluted: number;
}

export interface FmpBalanceSheet {
  date: string;
  fiscalYear: string;
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  totalDebt: number;
  cashAndCashEquivalents: number;
}

export interface FmpCashFlow {
  date: string;
  fiscalYear: string;
  period: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
}

export interface FmpQuote {
  symbol: string;
  price: number;
  marketCap: number;
}

export interface FmpFundamentalsResponse {
  income: FmpIncomeStatement[];
  balance: FmpBalanceSheet[];
  cashflow: FmpCashFlow[];
  quote: FmpQuote[];
}

// --- Calculated fundamentals ---

export interface FundamentalMetric {
  name: string;
  formula: string;
  values: Record<string, string>;
  result: string;
  date: string;
}

export interface AnalystTargets {
  low: number | null;
  mean: number | null;
  median: number | null;
  high: number | null;
  numAnalysts: number | null;
  recommendation: string | null;
}

export interface FundamentalsData {
  symbol: string;
  currency: string;
  fetchedAt: string;
  metrics: FundamentalMetric[];
  analystTargets: AnalystTargets | null;
}

export interface FundamentalsState {
  loading: boolean;
  data: FundamentalsData | null;
  error: string | null;
}
