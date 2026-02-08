'use client';

import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { CandleData } from '../lib/types';

interface ChartProps {
  data: CandleData[];
  symbol: string;
  dark?: boolean;
}

const DARK_THEME = {
  background: '#0f1117',
  text: '#9ca3af',
  grid: '#1f2937',
  border: '#374151',
};

const LIGHT_THEME = {
  background: '#ffffff',
  text: '#6b7280',
  grid: '#f3f4f6',
  border: '#e5e7eb',
};

export default function Chart({ data, symbol, dark = true }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    if (data.length === 0) return;

    const theme = dark ? DARK_THEME : LIGHT_THEME;
    const height = window.innerWidth < 640 ? 300 : 450;

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

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    series.setData(data as Parameters<typeof series.setData>[0]);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const newHeight = window.innerWidth < 640 ? 300 : 450;
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: newHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, dark]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3 sm:p-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {symbol ? `${symbol} Chart` : 'Chart'}
      </h2>
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
