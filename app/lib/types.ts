import { FundamentalsTimeSeries_Types } from "yahoo-finance2/modules/fundamentalsTimeSeries";

export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type Timeframe =
  | "1d"
  | "5d"
  | "1mo"
  | "3mo"
  | "6mo"
  | "1y"
  | "2y"
  | "5y"
  | "10y"
  | "ytd"
  | "max";
export type Interval = "5m" | "15m" | "1h" | "1d" | "1wk" | "1mo";

export type FundamentalsTimeSeriesModule =
  | "financials"
  | "balance-sheet"
  | "cash-flow"
  | "all";
export type FundamentalsTimeSeriesType = "quarterly" | "annual" | "trailing";

export interface StockQuery {
  symbol: string;
  range: Timeframe;
  interval: Interval;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  companyName?: string;
  description?: string;
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
  companyName?: string;
  description?: string;
  currency: string;
  fetchedAt: string;
  metrics: FundamentalMetric[];
  analystTargets: AnalystTargets | null;
  rawResponse?: FmpFundamentalsResponse;
}

// --- ETF Overlap Comparator types ---

export interface EtfHolding {
  symbol: string;
  holdingName: string;
  holdingPercent: number;
}

export interface EtfHoldingsResponse {
  symbol: string;
  holdings: EtfHolding[];
}

export interface PairwiseOverlap {
  etfA: string;
  etfB: string;
  overlapPercent: number;
}

export interface OverlapHoldingRow {
  symbol: string;
  holdingName: string;
  weights: Record<string, number>;
  etfCount: number;
  averageExposure: number;
}

export interface DiversificationWarning {
  type: "single_stock_concentration" | "top_n_concentration";
  message: string;
  symbols: string[];
  value: number;
}

export interface EtfOverlapResult {
  etfs: string[];
  pairwiseOverlaps: PairwiseOverlap[];
  overlappingHoldings: OverlapHoldingRow[];
  allHoldings: OverlapHoldingRow[];
  warnings: DiversificationWarning[];
}
