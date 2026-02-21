import type {
  CandleData,
  IndicatorPoint,
  BollingerBandsResult,
  MACDResult,
} from "./types";

/**
 * Simple Moving Average — average of closing prices over N periods.
 */
export function calculateSMA(
  data: CandleData[],
  period: number,
): IndicatorPoint[] {
  if (data.length < period) return [];

  const result: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  result.push({ time: data[period - 1].time, value: sum / period });

  for (let i = period; i < data.length; i++) {
    sum += data[i].close - data[i - period].close;
    result.push({ time: data[i].time, value: sum / period });
  }

  return result;
}

/**
 * Exponential Moving Average — gives more weight to recent prices.
 * EMA = Price(t) × k + EMA(y) × (1−k), where k = 2/(N+1)
 * Seeded with first SMA value.
 */
export function calculateEMA(
  data: CandleData[],
  period: number,
): IndicatorPoint[] {
  if (data.length < period) return [];

  const k = 2 / (period + 1);
  const result: IndicatorPoint[] = [];

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: ema });
  }

  return result;
}

/**
 * Internal EMA on raw values (not CandleData) — used by MACD.
 */
function emaFromValues(
  values: number[],
  period: number,
): number[] {
  if (values.length < period) return [];

  const k = 2 / (period + 1);
  const result: number[] = [];

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let ema = sum / period;
  // Pad with nullish entries so indices align
  for (let i = 0; i < period - 1; i++) {
    result.push(NaN);
  }
  result.push(ema);

  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }

  return result;
}

/**
 * Bollinger Bands — middle = SMA(period), upper/lower = middle ± stdDev × σ
 */
export function calculateBollingerBands(
  data: CandleData[],
  period: number,
  stdDev: number,
): BollingerBandsResult {
  if (data.length < period) return { upper: [], middle: [], lower: [] };

  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    const mean = sum / period;

    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j].close - mean;
      sqSum += diff * diff;
    }
    const sd = Math.sqrt(sqSum / period);

    middle.push({ time: data[i].time, value: mean });
    upper.push({ time: data[i].time, value: mean + stdDev * sd });
    lower.push({ time: data[i].time, value: mean - stdDev * sd });
  }

  return { upper, middle, lower };
}

/**
 * Relative Strength Index — Wilder's smoothing method.
 * RSI = 100 - (100 / (1 + RS)), RS = avg gain / avg loss
 */
export function calculateRSI(
  data: CandleData[],
  period: number,
): IndicatorPoint[] {
  if (data.length < period + 1) return [];

  const result: IndicatorPoint[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // First average — simple average
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  result.push({ time: data[period].time, value: rsi });

  // Subsequent — Wilder's smoothing
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    result.push({ time: data[i + 1].time, value: rsi });
  }

  return result;
}

/**
 * MACD — Moving Average Convergence Divergence.
 * MACD Line = EMA(fast) - EMA(slow)
 * Signal Line = EMA(signalPeriod) of MACD Line
 * Histogram = MACD Line - Signal Line
 */
export function calculateMACD(
  data: CandleData[],
  fast: number,
  slow: number,
  signalPeriod: number,
): MACDResult {
  if (data.length < slow) return { macd: [], signal: [], histogram: [] };

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(data, fast);
  const slowEMA = calculateEMA(data, slow);

  // MACD line starts where slow EMA starts (both EMAs have data)
  // fastEMA starts at index (fast-1) in data, slowEMA starts at (slow-1)
  // We need to align them by time
  const slowStartIndex = slow - 1; // index in data where slowEMA[0] corresponds
  const fastOffset = slow - fast; // how many more fastEMA entries exist before slowEMA starts

  const macdValues: number[] = [];
  const macdPoints: IndicatorPoint[] = [];

  for (let i = 0; i < slowEMA.length; i++) {
    const macdVal = fastEMA[i + fastOffset].value - slowEMA[i].value;
    macdValues.push(macdVal);
    macdPoints.push({ time: slowEMA[i].time, value: macdVal });
  }

  // Signal line = EMA of MACD values
  const signalEMA = emaFromValues(macdValues, signalPeriod);

  // Build signal and histogram arrays, starting where signal EMA is valid
  const signalPoints: IndicatorPoint[] = [];
  const histogramPoints: IndicatorPoint[] = [];

  for (let i = 0; i < signalEMA.length; i++) {
    if (isNaN(signalEMA[i])) continue;
    signalPoints.push({ time: macdPoints[i].time, value: signalEMA[i] });
    histogramPoints.push({
      time: macdPoints[i].time,
      value: macdValues[i] - signalEMA[i],
    });
  }

  return {
    macd: macdPoints,
    signal: signalPoints,
    histogram: histogramPoints,
  };
}
