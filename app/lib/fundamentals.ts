import type {
  FmpFundamentalsResponse,
  FmpIncomeStatement,
  FmpBalanceSheet,
  FmpCashFlow,
  FmpQuote,
  FundamentalsData,
  FundamentalMetric,
} from './types';

export async function fetchFundamentals(symbol: string, fmpApiKey?: string | null): Promise<FundamentalsData> {
  const body: Record<string, string> = { symbol };
  if (fmpApiKey) body.apiKey = fmpApiKey;

  const response = await fetch('/api/fundamentals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch fundamentals' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data: FmpFundamentalsResponse = await response.json();
  const parsed = parseFundamentals(symbol, data);
  parsed.rawResponse = data;
  return parsed;
}

// --- Formatting helpers ---

function fmtDollar(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtPct(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtRatio(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  return n.toFixed(2);
}

function fmtPrice(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  return `$${n.toFixed(2)}`;
}

function periodLabel(item: { fiscalYear?: string; period?: string; date?: string }): string {
  if (item.fiscalYear && item.period) {
    return `${item.period} ${item.fiscalYear}`;
  }
  return item.date ?? 'N/A';
}

// --- Parser ---

function parseFundamentals(symbol: string, data: FmpFundamentalsResponse): FundamentalsData {
  const income: FmpIncomeStatement | null = Array.isArray(data.income) && data.income.length > 0 ? data.income[0] : null;
  const prevIncome: FmpIncomeStatement | null = Array.isArray(data.income) && data.income.length > 1 ? data.income[1] : null;
  const balance: FmpBalanceSheet | null = Array.isArray(data.balance) && data.balance.length > 0 ? data.balance[0] : null;
  const cashflow: FmpCashFlow | null = Array.isArray(data.cashflow) && data.cashflow.length > 0 ? data.cashflow[0] : null;
  const quote: FmpQuote | null = Array.isArray(data.quote) && data.quote.length > 0 ? data.quote[0] : null;

  const incomeDate = income ? periodLabel(income) : 'N/A';
  const balanceDate = balance ? periodLabel(balance) : 'N/A';
  const cashflowDate = cashflow ? periodLabel(cashflow) : 'N/A';

  const metrics: FundamentalMetric[] = [];

  // 1. P/E Ratio
  {
    const price = quote?.price ?? null;
    const eps = income?.epsDiluted ?? null;
    const canCalc = price !== null && eps !== null && eps !== 0;
    metrics.push({
      name: 'P/E Ratio',
      formula: 'Price / EPS',
      values: { 'Price': fmtPrice(price), 'EPS': eps !== null ? `$${eps.toFixed(2)}` : 'N/A' },
      result: canCalc ? fmtRatio(price! / eps!) : 'N/A',
      date: 'TTM',
    });
  }

  // 2. ROE
  {
    const netIncome = income?.netIncome ?? null;
    const equity = balance?.totalStockholdersEquity ?? null;
    const canCalc = netIncome !== null && equity !== null && equity !== 0;
    metrics.push({
      name: 'ROE (Return on Equity)',
      formula: 'Net Income / Shareholders\' Equity',
      values: { 'Net Income': fmtDollar(netIncome), 'Equity': fmtDollar(equity) },
      result: canCalc ? fmtPct(netIncome! / equity!) : 'N/A',
      date: incomeDate,
    });
  }

  // 3. ROA
  {
    const netIncome = income?.netIncome ?? null;
    const totalAssets = balance?.totalAssets ?? null;
    const canCalc = netIncome !== null && totalAssets !== null && totalAssets !== 0;
    metrics.push({
      name: 'ROA (Return on Assets)',
      formula: 'Net Income / Total Assets',
      values: { 'Net Income': fmtDollar(netIncome), 'Total Assets': fmtDollar(totalAssets) },
      result: canCalc ? fmtPct(netIncome! / totalAssets!) : 'N/A',
      date: balanceDate,
    });
  }

  // 4. Gross Margin
  {
    const revenue = income?.revenue ?? null;
    const cogs = income?.costOfRevenue ?? null;
    const canCalc = revenue !== null && cogs !== null && revenue !== 0;
    const margin = canCalc ? (revenue! - cogs!) / revenue! : null;
    metrics.push({
      name: 'Gross Margin',
      formula: '(Revenue - COGS) / Revenue',
      values: { 'Revenue': fmtDollar(revenue), 'COGS': fmtDollar(cogs) },
      result: margin !== null ? fmtPct(margin) : 'N/A',
      date: incomeDate,
    });
  }

  // 5. Free Cash Flow
  {
    const ocf = cashflow?.operatingCashFlow ?? null;
    const capex = cashflow?.capitalExpenditure ?? null;
    const absCapex = capex !== null ? Math.abs(capex) : null;
    const canCalc = ocf !== null && absCapex !== null;
    const fcf = canCalc ? ocf! - absCapex! : null;
    metrics.push({
      name: 'Free Cash Flow',
      formula: 'Operating Cash Flow - CapEx',
      values: { 'OCF': fmtDollar(ocf), 'CapEx': fmtDollar(absCapex) },
      result: fmtDollar(fcf),
      date: cashflowDate,
    });
  }

  // 6. Debt/Equity
  {
    const totalLiab = balance?.totalLiabilities ?? null;
    const equity = balance?.totalStockholdersEquity ?? null;
    const canCalc = totalLiab !== null && equity !== null && equity !== 0;
    metrics.push({
      name: 'Debt/Equity',
      formula: 'Total Liabilities / Shareholders\' Equity',
      values: { 'Total Liabilities': fmtDollar(totalLiab), 'Equity': fmtDollar(equity) },
      result: canCalc ? fmtRatio(totalLiab! / equity!) : 'N/A',
      date: balanceDate,
    });
  }

  // 7. EV/EBIT
  {
    const marketCap = quote?.marketCap ?? null;
    const totalDebt = balance?.totalDebt ?? null;
    const cash = balance?.cashAndCashEquivalents ?? null;
    const ebit = income?.operatingIncome ?? null;
    const canCalcEV = marketCap !== null && totalDebt !== null && cash !== null;
    const ev = canCalcEV ? marketCap! + totalDebt! - cash! : null;
    const canCalc = ev !== null && ebit !== null && ebit !== 0;
    metrics.push({
      name: 'EV/EBIT',
      formula: 'Enterprise Value / EBIT',
      values: { 'EV': fmtDollar(ev), 'EBIT': fmtDollar(ebit) },
      result: canCalc ? fmtRatio(ev! / ebit!) : 'N/A',
      date: incomeDate,
    });
  }

  // 8. Revenue Growth
  {
    const currentRev = income?.revenue ?? null;
    const prevRev = prevIncome?.revenue ?? null;
    const canCalc = currentRev !== null && prevRev !== null && prevRev !== 0;
    const growth = canCalc ? (currentRev! - prevRev!) / prevRev! : null;
    const prevDate = prevIncome ? periodLabel(prevIncome) : 'N/A';
    metrics.push({
      name: 'Revenue Growth (YoY)',
      formula: '(Current Revenue - Previous Revenue) / Previous Revenue',
      values: { 'Current Revenue': fmtDollar(currentRev), 'Previous Revenue': fmtDollar(prevRev) },
      result: growth !== null ? fmtPct(growth) : 'N/A',
      date: `${prevDate} → ${incomeDate}`,
    });
  }

  return {
    symbol,
    companyName: data.companyName,
    description: data.description,
    currency: 'USD',
    fetchedAt: new Date().toISOString(),
    metrics,
    analystTargets: null,
  };
}
