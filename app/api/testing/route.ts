import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { QuoteSummaryModules } from "yahoo-finance2/modules/quoteSummary";

export const runtime = "nodejs";

const yf = new YahooFinance();

async function fetchViaYahoo(symbol: string, module: QuoteSummaryModules) {
  const result = await yf.quoteSummary(symbol, {
    modules: [module],
  });

  const data = result[module];

  return { data };
}

export async function POST(request: NextRequest) {
  let body: { symbol: string; module: QuoteSummaryModules };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { symbol, module } = body;

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  if (!module) {
    return NextResponse.json({ error: "module is required" }, { status: 400 });
  }

  const sanitized = symbol.replace(/[^a-zA-Z0-9.\-^]/g, "");
  if (!sanitized) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const data = await fetchViaYahoo(sanitized, module);

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch fundamental data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
