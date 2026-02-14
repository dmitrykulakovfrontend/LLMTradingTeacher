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

async function fetchViaYahoo(symbol: string) {
  const result = await yf.quoteSummary(symbol, {
    modules: [
      "financialData",
      "defaultKeyStatistics",
      "incomeStatementHistory",
      "balanceSheetHistory",
      "cashflowStatementHistory",
      "summaryDetail",
      "summaryProfile",
    ],
  });

  const fd = result.financialData;
  const ks = result.defaultKeyStatistics;
  const isHist = result.incomeStatementHistory?.incomeStatementHistory ?? [];
  const bsHist = result.balanceSheetHistory?.balanceSheetStatements ?? [];
  const cfHist = result.cashflowStatementHistory?.cashflowStatements ?? [];
  console.dir({ detail: result.summaryDetail, profile: result.summaryProfile });

  // Map to FMP-compatible response shape
  const income = isHist.slice(0, 2).map((stmt) => ({
    date:
      stmt.endDate instanceof Date
        ? stmt.endDate.toISOString().split("T")[0]
        : String(stmt.endDate),
    fiscalYear:
      stmt.endDate instanceof Date ? String(stmt.endDate.getFullYear()) : "",
    period: "FY",
    revenue: stmt.totalRevenue ?? fd?.totalRevenue ?? 0,
    costOfRevenue:
      stmt.costOfRevenue ??
      (fd ? (fd.totalRevenue ?? 0) - (fd.grossProfits ?? 0) : 0),
    grossProfit: stmt.grossProfit ?? fd?.grossProfits ?? 0,
    grossProfitRatio: fd?.grossMargins ?? 0,
    operatingIncome: stmt.ebit ?? fd?.ebitda ?? 0,
    netIncome: stmt.netIncome ?? ks?.netIncomeToCommon ?? 0,
    eps: ks?.trailingEps ?? 0,
    epsDiluted: ks?.trailingEps ?? 0,
  }));

  // If no statement history, build from financialData
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

  const balance = bsHist.slice(0, 1).map((stmt) => {
    const netIncome = ks?.netIncomeToCommon ?? 0;
    const roe = fd?.returnOnEquity ?? 0;
    const roa = fd?.returnOnAssets ?? 0;
    const equity = roe !== 0 ? netIncome / roe : 0;
    const totalAssets = roa !== 0 ? netIncome / roa : 0;
    const de = fd?.debtToEquity ?? 0;
    const totalLiabilities = de !== 0 ? (de / 100) * equity : 0;

    const raw = stmt as unknown as Record<string, unknown>;
    return {
      date:
        stmt.endDate instanceof Date
          ? stmt.endDate.toISOString().split("T")[0]
          : String(stmt.endDate),
      fiscalYear:
        stmt.endDate instanceof Date ? String(stmt.endDate.getFullYear()) : "",
      period: "FY",
      totalAssets:
        typeof raw.totalAssets === "number" ? raw.totalAssets : totalAssets,
      totalLiabilities:
        typeof raw.totalLiab === "number" ? raw.totalLiab : totalLiabilities,
      totalStockholdersEquity:
        typeof raw.totalStockholderEquity === "number"
          ? raw.totalStockholderEquity
          : equity,
      totalDebt: fd?.totalDebt ?? 0,
      cashAndCashEquivalents: fd?.totalCash ?? 0,
    };
  });

  // If no balance sheet history, compute from ratios
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

  const cashflow = cfHist.slice(0, 1).map((stmt) => {
    const raw = stmt as unknown as Record<string, unknown>;
    return {
      date:
        stmt.endDate instanceof Date
          ? stmt.endDate.toISOString().split("T")[0]
          : String(stmt.endDate),
      fiscalYear:
        stmt.endDate instanceof Date ? String(stmt.endDate.getFullYear()) : "",
      period: "FY",
      operatingCashFlow:
        typeof raw.totalCashFromOperatingActivities === "number"
          ? raw.totalCashFromOperatingActivities
          : (fd?.operatingCashflow ?? 0),
      capitalExpenditure:
        typeof raw.capitalExpenditures === "number"
          ? raw.capitalExpenditures
          : (fd?.operatingCashflow ?? 0) - (fd?.freeCashflow ?? 0),
      freeCashFlow: fd?.freeCashflow ?? 0,
    };
  });

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

  return { income, balance, cashflow, quote };
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
