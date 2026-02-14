import { QuoteSummaryModules } from "yahoo-finance2/modules/quoteSummary";

export async function fetchTest(symbol: string, module: QuoteSummaryModules) {
  const body: Record<string, string> = { symbol, module };

  const response = await fetch("/api/testing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: "Failed to fetch fundamentals" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data: { data: QuoteSummaryModules } = await response.json();
  return data;
}
