"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import type { CandleData, IndicatorConfig } from "../../lib/types";
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
} from "../../lib/indicators";
import IndicatorSelector from "../IndicatorSelector";

interface ChartProps {
  data: CandleData[];
  symbol: string;
  dark?: boolean;
}

const DARK_THEME = {
  background: "#0f1117",
  text: "#9ca3af",
  grid: "#1f2937",
  border: "#374151",
};

const LIGHT_THEME = {
  background: "#ffffff",
  text: "#6b7280",
  grid: "#f3f4f6",
  border: "#e5e7eb",
};

const ZOOM_STEP = 0.2;
const PAN_STEP = 10;

const STORAGE_KEY = "chart-indicator-config";

const DEFAULT_CONFIG: IndicatorConfig = {
  sma20: false,
  sma50: false,
  sma200: false,
  ema12: false,
  ema26: false,
  bollingerBands: false,
  rsi: false,
  macd: false,
};

function loadIndicatorConfig(): IndicatorConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export default function Chart({ data, symbol, dark = true }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>(loadIndicatorConfig);

  // Persist indicator config
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(indicatorConfig));
  }, [indicatorConfig]);

  // Memoized indicator calculations
  const sma20Data = useMemo(() => data.length > 0 ? calculateSMA(data, 20) : [], [data]);
  const sma50Data = useMemo(() => data.length > 0 ? calculateSMA(data, 50) : [], [data]);
  const sma200Data = useMemo(() => data.length > 0 ? calculateSMA(data, 200) : [], [data]);
  const ema12Data = useMemo(() => data.length > 0 ? calculateEMA(data, 12) : [], [data]);
  const ema26Data = useMemo(() => data.length > 0 ? calculateEMA(data, 26) : [], [data]);
  const bollingerData = useMemo(() => data.length > 0 ? calculateBollingerBands(data, 20, 2) : { upper: [], middle: [], lower: [] }, [data]);
  const rsiData = useMemo(() => data.length > 0 ? calculateRSI(data, 14) : [], [data]);
  const macdData = useMemo(() => data.length > 0 ? calculateMACD(data, 12, 26, 9) : { macd: [], signal: [], histogram: [] }, [data]);

  // Calculate dynamic height
  const hasRsi = indicatorConfig.rsi;
  const hasMacd = indicatorConfig.macd;

  const getChartHeight = useCallback(() => {
    const base = window.innerWidth < 640 ? 300 : 450;
    let extra = 0;
    if (hasRsi) extra += 120;
    if (hasMacd) extra += 120;
    return base + extra;
  }, [hasRsi, hasMacd]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    if (data.length === 0) return;

    const theme = dark ? DARK_THEME : LIGHT_THEME;
    const height = getChartHeight();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      crosshair: { mode: 0 },
      timeScale: {
        borderColor: theme.border,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: theme.border,
      },
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!chartRef.current) return;
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      ) {
        return;
      }

      const timeScale = chartRef.current.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (!range) return;

      const length = range.to - range.from;

      switch (e.key) {
        case "+":
        case "=": {
          const newLength = length * (1 - ZOOM_STEP);
          const center = (range.from + range.to) / 2;
          timeScale.setVisibleLogicalRange({
            from: center - newLength / 2,
            to: center + newLength / 2,
          });
          break;
        }
        case "-":
        case "_": {
          const newLength = length * (1 + ZOOM_STEP);
          const center = (range.from + range.to) / 2;
          timeScale.setVisibleLogicalRange({
            from: center - newLength / 2,
            to: center + newLength / 2,
          });
          break;
        }
        case "ArrowLeft": {
          timeScale.scrollToPosition(
            timeScale.scrollPosition() - PAN_STEP,
            false,
          );
          break;
        }
        case "ArrowRight": {
          timeScale.scrollToPosition(
            timeScale.scrollPosition() + PAN_STEP,
            false,
          );
          break;
        }
      }
    };

    // --- Pane 0: Candlestick + Overlays ---

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });
    candleSeries.setData(data as Parameters<typeof candleSeries.setData>[0]);

    // SMA overlays
    if (indicatorConfig.sma20 && sma20Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceScaleId: "right" });
      s.setData(sma20Data as Parameters<typeof s.setData>[0]);
    }
    if (indicatorConfig.sma50 && sma50Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, priceScaleId: "right" });
      s.setData(sma50Data as Parameters<typeof s.setData>[0]);
    }
    if (indicatorConfig.sma200 && sma200Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 1, priceScaleId: "right" });
      s.setData(sma200Data as Parameters<typeof s.setData>[0]);
    }

    // EMA overlays
    if (indicatorConfig.ema12 && ema12Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: "#06b6d4", lineWidth: 1, priceScaleId: "right" });
      s.setData(ema12Data as Parameters<typeof s.setData>[0]);
    }
    if (indicatorConfig.ema26 && ema26Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: "#ec4899", lineWidth: 1, priceScaleId: "right" });
      s.setData(ema26Data as Parameters<typeof s.setData>[0]);
    }

    // Bollinger Bands
    if (indicatorConfig.bollingerBands && bollingerData.middle.length > 0) {
      const upperS = chart.addSeries(LineSeries, {
        color: "rgba(100,149,237,0.5)",
        lineWidth: 1,
        priceScaleId: "right",
      });
      upperS.setData(bollingerData.upper as Parameters<typeof upperS.setData>[0]);

      const middleS = chart.addSeries(LineSeries, {
        color: "rgba(100,149,237,0.8)",
        lineWidth: 1,
        priceScaleId: "right",
        lineStyle: 2, // dashed
      });
      middleS.setData(bollingerData.middle as Parameters<typeof middleS.setData>[0]);

      const lowerS = chart.addSeries(LineSeries, {
        color: "rgba(100,149,237,0.5)",
        lineWidth: 1,
        priceScaleId: "right",
      });
      lowerS.setData(bollingerData.lower as Parameters<typeof lowerS.setData>[0]);
    }

    // --- Sub-panes: RSI and MACD ---
    let nextPane = 1;

    // RSI pane
    if (indicatorConfig.rsi && rsiData.length > 0) {
      const rsiPane = nextPane++;

      const rsiSeries = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 2,
        priceScaleId: "right",
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: 0, maxValue: 100 },
        }),
      }, rsiPane);
      rsiSeries.setData(rsiData as Parameters<typeof rsiSeries.setData>[0]);

      // Overbought line (70)
      const overboughtData = rsiData.map((p) => ({ time: p.time, value: 70 }));
      const obSeries = chart.addSeries(LineSeries, {
        color: "rgba(255,255,255,0.2)",
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
      }, rsiPane);
      obSeries.setData(overboughtData as Parameters<typeof obSeries.setData>[0]);

      // Oversold line (30)
      const oversoldData = rsiData.map((p) => ({ time: p.time, value: 30 }));
      const osSeries = chart.addSeries(LineSeries, {
        color: "rgba(255,255,255,0.2)",
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
      }, rsiPane);
      osSeries.setData(oversoldData as Parameters<typeof osSeries.setData>[0]);
    }

    // MACD pane
    if (indicatorConfig.macd && macdData.macd.length > 0) {
      const macdPane = nextPane++;

      // MACD line
      const macdSeries = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceScaleId: "right",
      }, macdPane);
      macdSeries.setData(macdData.macd as Parameters<typeof macdSeries.setData>[0]);

      // Signal line
      if (macdData.signal.length > 0) {
        const signalSeries = chart.addSeries(LineSeries, {
          color: "#ef4444",
          lineWidth: 2,
          priceScaleId: "right",
        }, macdPane);
        signalSeries.setData(macdData.signal as Parameters<typeof signalSeries.setData>[0]);
      }

      // Histogram
      if (macdData.histogram.length > 0) {
        const histSeries = chart.addSeries(HistogramSeries, {
          priceScaleId: "right",
        }, macdPane);
        const histColored = macdData.histogram.map((p) => ({
          time: p.time,
          value: p.value,
          color: p.value >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
        }));
        histSeries.setData(histColored as Parameters<typeof histSeries.setData>[0]);
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const newHeight = getChartHeight();
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: newHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, dark, indicatorConfig, sma20Data, sma50Data, sma200Data, ema12Data, ema26Data, bollingerData, rsiData, macdData, getChartHeight]);

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = JSON.stringify(data);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {symbol ? `${symbol} Chart` : "Chart"}
        </h2>
        {data.length > 0 && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Data
              </>
            )}
          </button>
        )}
      </div>

      {data.length > 0 && (
        <div className="mb-3">
          <IndicatorSelector
            config={indicatorConfig}
            onChange={setIndicatorConfig}
          />
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] sm:h-[450px] text-gray-400 dark:text-gray-500">
          Enter a symbol and click Analyze to see the chart
        </div>
      ) : (
        <div ref={containerRef} className="w-full rounded" />
      )}
    </div>
  );
}
