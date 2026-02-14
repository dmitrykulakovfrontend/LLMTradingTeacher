import { Interval, Timeframe } from "@/app/lib/types";
import { rangeToPeriod1 } from "@/app/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";

const yf = new YahooFinance();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "1mo";
  const interval = searchParams.get("interval") || "1d";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  const sanitized = symbol.replace(/[^a-zA-Z0-9.\-^]/g, "");
  if (!sanitized) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const result = await yf.chart(sanitized, {
      period1: rangeToPeriod1(range as Timeframe),
      interval: interval as Interval,
    });

    const candles = result.quotes
      .filter(
        (q) =>
          q.open !== null &&
          q.high !== null &&
          q.low !== null &&
          q.close !== null,
      )
      .map((q) => ({
        time:
          interval === "1d"
            ? q.date.toISOString().split("T")[0]
            : Math.floor(q.date.getTime() / 1000),
        open: q.open!,
        high: q.high!,
        low: q.low!,
        close: q.close!,
        volume: q.volume ?? undefined,
      }));

    return NextResponse.json(candles);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch stock data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
