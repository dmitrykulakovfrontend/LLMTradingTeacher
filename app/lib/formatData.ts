import { CandleData, FundamentalsData } from "./types";

export const DEFAULT_SYSTEM_PROMPT = buildSystemPrompt();

export function buildSystemPrompt(): string {
  return `You are a financial analyst and technical analysis expert teaching a beginner. You analyze stocks using PRICE DATA and REAL FUNDAMENTAL DATA provided to you.

## YOUR TASKS:

### Part 1: Technical Analysis
1. Identify chart patterns (double top/bottom, head and shoulders, triangles, wedges, flags, support/resistance, trend lines)
2. For each pattern:
   - Name it
   - Which candles/timestamps form it
   - What it typically indicates
   - Historical probability (cite Bulkowski if applicable)
   - Confirmation signals to watch
3. Overall trend: bullish/bearish/sideways
4. Key support and resistance levels

### Part 2: Fundamental Analysis (INTERPRET the pre-calculated data)
You are given REAL, pre-calculated fundamental metrics from actual company filings. The formulas and values are already computed.

DO NOT recalculate these numbers. Instead, for each metric:
1. Explain what the value MEANS for an investor in plain language
2. Compare to typical industry benchmarks or healthy ranges
3. Identify whether it's a strength, weakness, or neutral
4. Note any concerning trends

### Part 3: Overall Assessment
- Combine technical and fundamental views into a coherent picture
- Bull case vs bear case
- Key risks to watch
- What would you look for before making a decision?

IMPORTANT: The fundamental data provided is REAL and pre-calculated from actual filings. Trust the numbers. Focus on INTERPRETATION and TEACHING, not recalculation. If any metric shows "N/A", skip it — do not estimate or make up values.

When the user asks follow-up questions, answer in the context of the stock data already provided. Be concise on follow-ups unless the user asks for detail.`;
}

export function buildInitialUserMessage(
  symbol: string,
  data: CandleData[],
  fundamentals?: FundamentalsData | null,
): string {
  const recentData = data.slice(-60);
  const tableRows = recentData
    .map((c) => {
      const timeStr =
        typeof c.time === "number"
          ? new Date(c.time * 1000).toISOString().replace("T", " ").slice(0, 19)
          : c.time;
      return `${timeStr} | O: ${c.open.toFixed(2)} | H: ${c.high.toFixed(2)} | L: ${c.low.toFixed(2)} | C: ${c.close.toFixed(2)}${c.volume ? ` | V: ${c.volume}` : ""}`;
    })
    .join("\n");

  let msg = `Analyze ${symbol} using the following data:

## OHLC Price Data (last ${recentData.length} candles):

${tableRows}`;

  if (fundamentals?.metrics && fundamentals.metrics.length > 0) {
    msg += `\n\n## Fundamental Data (REAL, pre-calculated from filings — DO NOT recalculate):\n\n`;
    for (const m of fundamentals.metrics) {
      const valuesStr = Object.entries(m.values)
        .map(([k, v]) => `${k} = ${v}`)
        .join(", ");
      msg += `**${m.name}** (${m.date})\n  Formula: ${m.formula}\n  Values: ${valuesStr}\n  Result: ${m.result}\n\n`;
    }

    if (fundamentals.analystTargets) {
      const t = fundamentals.analystTargets;
      msg += `**Analyst Price Targets** (${t.numAnalysts ?? "N/A"} analysts, Consensus: ${t.recommendation ?? "N/A"})\n`;
      msg += `  Low: ${t.low != null ? `$${t.low.toFixed(2)}` : "N/A"} | Mean: ${t.mean != null ? `$${t.mean.toFixed(2)}` : "N/A"} | Median: ${t.median != null ? `$${t.median.toFixed(2)}` : "N/A"} | High: ${t.high != null ? `$${t.high.toFixed(2)}` : "N/A"}\n`;
    }
  } else if (fundamentals === null || fundamentals === undefined) {
    // No fundamentals available — tell LLM to focus on technical
  } else if (fundamentals.metrics.length === 0) {
    msg += `\n\nNote: Fundamental data was not available for this symbol. Provide technical analysis only.`;
  }

  return msg;
}
