import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { errorResponse } from "../utils/api-helpers";

export const runtime = "nodejs";

const yf = new YahooFinance();

const ALLOWED_TYPES = new Set(["EQUITY", "ETF", "INDEX", "MUTUALFUND"]);

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 1) {
    return errorResponse("Query parameter 'q' is required", 400);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await yf.search(
      query,
      { quotesCount: 8, newsCount: 0 },
      { validateResult: false },
    ) as any;

    const quotes = (result.quotes ?? [])
      .filter(
        (q: Record<string, unknown>) =>
          q.isYahooFinance === true && ALLOWED_TYPES.has(q.quoteType as string),
      )
      .map((q: Record<string, unknown>) => ({
        symbol: q.symbol ?? "",
        shortname: q.shortname ?? "",
        longname: q.longname ?? "",
        exchange: q.exchange ?? "",
        quoteType: q.quoteType ?? "",
      }));

    return NextResponse.json({ results: quotes });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Search failed";
    return errorResponse(message, 500);
  }
}
