import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";

const yf = new YahooFinance();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "symbols query parameter is required" },
      { status: 400 },
    );
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().replace(/[^a-zA-Z0-9.\-^]/g, "").toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "At least one valid symbol is required" },
      { status: 400 },
    );
  }

  if (symbols.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 ETFs allowed" },
      { status: 400 },
    );
  }

  try {
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const result = await yf.quoteSummary(sym, {
          modules: ["topHoldings"],
        });

        const topHoldings = result.topHoldings;
        if (
          !topHoldings ||
          !topHoldings.holdings ||
          topHoldings.holdings.length === 0
        ) {
          throw new Error(
            `No holdings data found for ${sym}. It may not be an ETF.`,
          );
        }

        return {
          symbol: sym,
          holdings: topHoldings.holdings
            .filter((h) => h.symbol)
            .map((h) => ({
              symbol: h.symbol,
              holdingName: h.holdingName,
              holdingPercent: h.holdingPercent,
            })),
        };
      }),
    );

    const data: Array<{
      symbol: string;
      holdings: Array<{
        symbol: string;
        holdingName: string;
        holdingPercent: number;
      }>;
    }> = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        data.push(result.value);
      } else {
        errors.push({
          symbol: symbols[i],
          error: result.reason?.message || "Unknown error",
        });
      }
    });

    return NextResponse.json({ data, errors });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch ETF holdings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
