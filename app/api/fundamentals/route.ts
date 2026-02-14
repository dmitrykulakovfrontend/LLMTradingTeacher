import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";

const yf = new YahooFinance();

const FMP_BASE = "https://financialmodelingprep.com/stable";

async function fmpFetch(path: string, apiKey: string): Promise<unknown> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${FMP_BASE}${path}${separator}apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP returned ${res.status}`);
  }
  return res.json();
}

async function fetchViaFmp(symbol: string, apiKey: string) {
  const sym = encodeURIComponent(symbol);

  const [incomeRes, balanceRes, cashflowRes, quoteRes] =
    await Promise.allSettled([
      fmpFetch(`/income-statement?symbol=${sym}&period=annual&limit=2`, apiKey),
      fmpFetch(
        `/balance-sheet-statement?symbol=${sym}&period=annual&limit=1`,
        apiKey,
      ),
      fmpFetch(
        `/cashflow-statement?symbol=${sym}&period=annual&limit=1`,
        apiKey,
      ),
      fmpFetch(`/quote?symbol=${sym}`, apiKey),
    ]);

  const income = incomeRes.status === "fulfilled" ? incomeRes.value : [];
  const balance = balanceRes.status === "fulfilled" ? balanceRes.value : [];
  const cashflow = cashflowRes.status === "fulfilled" ? cashflowRes.value : [];
  const quote = quoteRes.status === "fulfilled" ? quoteRes.value : [];

  const allEmpty =
    Array.isArray(income) &&
    income.length === 0 &&
    Array.isArray(balance) &&
    balance.length === 0 &&
    Array.isArray(cashflow) &&
    cashflow.length === 0 &&
    Array.isArray(quote) &&
    quote.length === 0;

  if (allEmpty) {
    const firstError = [incomeRes, balanceRes, cashflowRes, quoteRes].find(
      (r) => r.status === "rejected",
    );
    const errMsg =
      firstError?.status === "rejected"
        ? firstError.reason?.message || "No data returned"
        : "No fundamental data found for this symbol";
    throw new Error(errMsg);
  }

  return { income, balance, cashflow, quote };
}

// Helper to safely read a numeric field from a fundamentalsTimeSeries entry
function tsNum(
  entry: Record<string, unknown> | undefined,
  key: string,
): number {
  if (!entry) return 0;
  const v = entry[key];
  return typeof v === "number" ? v : 0;
}

// Convert a fundamentalsTimeSeries date (unix seconds) to "YYYY-MM-DD"
function tsDate(entry: Record<string, unknown>): string {
  const d = entry.date;
  if (typeof d === "number") {
    return new Date(d * 1000).toISOString().split("T")[0];
  }
  return String(d ?? "");
}

function tsFiscalYear(entry: Record<string, unknown>): string {
  const d = entry.date;
  if (typeof d === "number") {
    return String(new Date(d * 1000).getFullYear());
  }
  return "";
}

async function fetchViaYahoo(symbol: string) {
  // Two parallel calls:
  // 1. quoteSummary for metadata + current metrics (NOT deprecated)
  // 2. fundamentalsTimeSeries for financial statements (replaces deprecated *History modules)
  const [summaryResult, tsResult] = await Promise.all([
    yf.quoteSummary(symbol, {
      modules: [
        "quoteType",
        "summaryProfile",
        "financialData",
        "defaultKeyStatistics",
      ],
    }),
    yf.fundamentalsTimeSeries(
      symbol,
      {
        module: "all",
        period1: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000),
        type: "annual",
      },
      { validateResult: false },
    ),
  ]);

  const fd = summaryResult.financialData;
  console.log("summaryResult", summaryResult);
  const ks = summaryResult.defaultKeyStatistics;
  const companyName =
    summaryResult.quoteType?.longName ||
    summaryResult.quoteType?.shortName ||
    undefined;
  const description =
    summaryResult.summaryProfile?.longBusinessSummary || undefined;

  // Separate fundamentalsTimeSeries entries by type
  const tsEntries = (tsResult ?? []) as Record<string, unknown>[];
  const financialsEntries = tsEntries
    .filter(
      (e) =>
        e.totalRevenue !== undefined ||
        e.netIncome !== undefined ||
        e.grossProfit !== undefined,
    )
    .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));

  const balanceEntries = tsEntries
    .filter(
      (e) => e.totalAssets !== undefined || e.stockholdersEquity !== undefined,
    )
    .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));

  const cashflowEntries = tsEntries
    .filter(
      (e) => e.operatingCashFlow !== undefined || e.freeCashFlow !== undefined,
    )
    .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));

  // Map financials to FMP income statement shape (most recent 2 for YoY growth)
  const income = financialsEntries.slice(0, 2).map((entry) => {
    const revenue = tsNum(entry, "totalRevenue");
    const grossProfit = tsNum(entry, "grossProfit");
    return {
      date: tsDate(entry),
      fiscalYear: tsFiscalYear(entry),
      period: "FY",
      revenue,
      costOfRevenue: tsNum(entry, "costOfRevenue"),
      grossProfit,
      grossProfitRatio: revenue !== 0 ? grossProfit / revenue : 0,
      operatingIncome: tsNum(entry, "operatingIncome"),
      netIncome: tsNum(entry, "netIncome"),
      eps: tsNum(entry, "basicEPS"),
      epsDiluted: tsNum(entry, "dilutedEPS"),
    };
  });

  // Fallback: if fundamentalsTimeSeries returned no income data, use financialData
  if (income.length === 0 && fd) {
    income.push({
      date: new Date().toISOString().split("T")[0],
      fiscalYear: String(new Date().getFullYear()),
      period: "TTM",
      revenue: fd.totalRevenue ?? 0,
      costOfRevenue: (fd.totalRevenue ?? 0) - (fd.grossProfits ?? 0),
      grossProfit: fd.grossProfits ?? 0,
      grossProfitRatio: fd.grossMargins ?? 0,
      operatingIncome: fd.ebitda ?? 0,
      netIncome: ks?.netIncomeToCommon ?? 0,
      eps: ks?.trailingEps ?? 0,
      epsDiluted: ks?.trailingEps ?? 0,
    });
  }

  // Map balance sheet entries (most recent 1)
  const balance = balanceEntries.slice(0, 1).map((entry) => ({
    date: tsDate(entry),
    fiscalYear: tsFiscalYear(entry),
    period: "FY",
    totalAssets: tsNum(entry, "totalAssets"),
    totalLiabilities: tsNum(entry, "totalLiabilitiesNetMinorityInterest"),
    totalStockholdersEquity: tsNum(entry, "stockholdersEquity"),
    totalDebt: tsNum(entry, "totalDebt"),
    cashAndCashEquivalents: tsNum(entry, "cashAndCashEquivalents"),
  }));

  // Fallback: compute from financialData ratios
  if (balance.length === 0 && fd) {
    const netIncome = ks?.netIncomeToCommon ?? 0;
    const roe = fd.returnOnEquity ?? 0;
    const roa = fd.returnOnAssets ?? 0;
    const equity = roe !== 0 ? netIncome / roe : 0;
    const totalAssets = roa !== 0 ? netIncome / roa : 0;
    const de = fd.debtToEquity ?? 0;
    const totalLiabilities = de !== 0 ? (de / 100) * equity : 0;

    balance.push({
      date: new Date().toISOString().split("T")[0],
      fiscalYear: String(new Date().getFullYear()),
      period: "TTM",
      totalAssets,
      totalLiabilities,
      totalStockholdersEquity: equity,
      totalDebt: fd.totalDebt ?? 0,
      cashAndCashEquivalents: fd.totalCash ?? 0,
    });
  }

  // Map cash flow entries (most recent 1)
  const cashflow = cashflowEntries.slice(0, 1).map((entry) => ({
    date: tsDate(entry),
    fiscalYear: tsFiscalYear(entry),
    period: "FY",
    operatingCashFlow: tsNum(entry, "operatingCashFlow"),
    capitalExpenditure: tsNum(entry, "capitalExpenditure"),
    freeCashFlow: tsNum(entry, "freeCashFlow"),
  }));

  // Fallback
  if (cashflow.length === 0 && fd) {
    cashflow.push({
      date: new Date().toISOString().split("T")[0],
      fiscalYear: String(new Date().getFullYear()),
      period: "TTM",
      operatingCashFlow: fd.operatingCashflow ?? 0,
      capitalExpenditure: (fd.operatingCashflow ?? 0) - (fd.freeCashflow ?? 0),
      freeCashFlow: fd.freeCashflow ?? 0,
    });
  }

  // Quote data — still from quoteSummary (financialData + defaultKeyStatistics)
  const quote = [
    {
      symbol,
      price: fd?.currentPrice ?? 0,
      marketCap:
        (ks?.enterpriseValue ?? 0) -
        (fd?.totalDebt ?? 0) +
        (fd?.totalCash ?? 0),
    },
  ];

  return { income, balance, cashflow, quote, companyName, description };
}

export async function POST(request: NextRequest) {
  let body: { symbol?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { symbol, apiKey } = body;

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const sanitized = symbol.replace(/[^a-zA-Z0-9.\-^]/g, "");
  if (!sanitized) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const data = apiKey
      ? await fetchViaFmp(sanitized, apiKey)
      : await fetchViaYahoo(sanitized);

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch fundamental data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
