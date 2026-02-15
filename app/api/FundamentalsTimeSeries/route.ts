import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import {
  FundamentalsTimeSeriesModule,
  FundamentalsTimeSeriesType,
  Timeframe,
} from "../../lib/types";
import { rangeToPeriod1 } from "@/app/lib/utils";

export const runtime = "nodejs";

const yf = new YahooFinance();

export async function POST(request: NextRequest) {
  let body: {
    symbol: string;
    module: FundamentalsTimeSeriesModule;
    range: string;
    type: FundamentalsTimeSeriesType;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { symbol, module, range, type } = body;

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  if (!module) {
    return NextResponse.json({ error: "module is required" }, { status: 400 });
  }
  if (!range) {
    return NextResponse.json({ error: "range is required" }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const sanitized = symbol.replace(/[^a-zA-Z0-9.\-^]/g, "");
  if (!sanitized) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const result = await yf.fundamentalsTimeSeries(symbol, {
      module,
      period1: rangeToPeriod1(range as Timeframe),
      type,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch fundamental data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
