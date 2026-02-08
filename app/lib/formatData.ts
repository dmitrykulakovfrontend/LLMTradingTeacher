import { CandleData } from './types';

export function formatOHLCForPrompt(symbol: string, data: CandleData[]): string {
  const recentData = data.slice(-60);

  const tableRows = recentData
    .map((c) => {
      const timeStr =
        typeof c.time === 'number'
          ? new Date(c.time * 1000).toISOString().replace('T', ' ').slice(0, 19)
          : c.time;
      return `${timeStr} | O: ${c.open.toFixed(2)} | H: ${c.high.toFixed(2)} | L: ${c.low.toFixed(2)} | C: ${c.close.toFixed(2)}${c.volume ? ` | V: ${c.volume}` : ''}`;
    })
    .join('\n');

  return `You are a technical analysis expert teaching a beginner. Analyze this OHLC (Open, High, Low, Close) data for ${symbol}:

${tableRows}

Tasks:
1. Identify any recognizable chart patterns (double top/bottom, head and shoulders, triangles, wedges, flags, support/resistance levels, trend lines, etc.)
2. For each pattern found:
   - Name the pattern
   - Explain what it typically indicates
   - Historical probability of outcome (cite Bulkowski or general TA consensus if applicable)
   - What price action to watch for confirmation
3. Overall trend assessment (bullish/bearish/sideways)
4. Key support and resistance levels

Explain everything like you're teaching someone who's learning technical analysis. Be specific about which candles/timestamps form the pattern.`;
}
