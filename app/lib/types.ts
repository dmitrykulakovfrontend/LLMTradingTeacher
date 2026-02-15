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
  effectiveExposure?: number;  // Portfolio-weighted exposure
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

// --- Weighted Overlap types ---

export interface WeightedPairwiseOverlap extends PairwiseOverlap {
  weightA?: number;           // Portfolio weight for etfA (0-100)
  weightB?: number;           // Portfolio weight for etfB (0-100)
  effectiveOverlap?: number;  // Raw overlap × weightA × weightB (0-100 scale)
}

export interface EtfWeight {
  symbol: string;
  weight: number;  // Portfolio weight as percentage (0-100)
}

export interface WeightedEtfOverlapResult extends EtfOverlapResult {
  weights: Record<string, number>;  // ETF symbol → portfolio weight
  weightedOverlaps: WeightedPairwiseOverlap[];
  hasWeights: boolean;
}

// --- Portfolio X-Ray types ---

export interface PortfolioHolding {
  symbol: string;
  allocation: number;  // 0-100 percentage
  isEtf: boolean;
}

export interface ExposureBreakdown {
  symbol: string;
  companyName: string;
  directAllocation: number;  // Direct stock holding %
  fromEtfs: Array<{ etfSymbol: string; contribution: number }>;  // ETF-derived %
  totalExposure: number;  // Sum of direct + all ETF contributions
}

export interface PortfolioXRayResult {
  holdings: PortfolioHolding[];
  exposures: ExposureBreakdown[];
  warnings: ConcentrationWarning[];
  totalAllocated: number;
}

export interface ConcentrationWarning {
  type: "single_stock_concentration" | "top_n_concentration" | "allocation_mismatch" | "sector_concentration";
  severity: "high" | "medium" | "low";
  message: string;
  symbols: string[];
  value: number;
}

// --- Sector Breakdown types ---

export interface SectorData {
  symbol: string;
  sector: string | null;  // null if not available from Yahoo Finance
}

export interface SectorExposure {
  sector: string;
  totalExposure: number;  // Sum of all company exposures in this sector (0-100 scale)
  companies: Array<{
    symbol: string;
    companyName: string;
    exposure: number;
  }>;
  color: string;  // Hex color for pie chart slice
}

export interface SectorBreakdownResult {
  sectors: SectorExposure[];
  warnings: ConcentrationWarning[];
  totalCategorized: number;  // % of portfolio with sector data
}

// --- Multi-Analyst Technical Analysis types ---

export type AnalystId = "bulkowski" | "murphy" | "nison" | "pring" | "edwards-magee";

export interface AnalystConfig {
  id: AnalystId;
  name: string;
  description: string;
  systemPrompt: string;
}

export interface AnalystAnalysis {
  analystId: AnalystId;
  messages: ChatMessage[];
  streamingText: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ExtractedSignals {
  analystId: AnalystId;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  patterns: string[];
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  priceTargets: {
    upside?: number;
    downside?: number;
  };
}

export interface ConsensusResult {
  overallSentiment: "bullish" | "bearish" | "neutral" | "mixed";
  agreementPercentage: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  commonPatterns: Array<{ pattern: string; mentionedBy: AnalystId[] }>;
  keyAgreements: string[];
  keyDisagreements: string[];
  confidenceScore: number;
}

// --- Ticker Search types ---

export interface TickerSearchResult {
  symbol: string;
  shortname: string;
  longname: string;
  exchange: string;
  quoteType: string;
}
