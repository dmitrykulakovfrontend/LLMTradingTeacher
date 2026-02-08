'use client';

import { useState, useEffect } from 'react';
import type { Timeframe, Interval, StockQuery } from '../lib/types';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '1d', label: '1 Day' },
  { value: '5d', label: '5 Days' },
  { value: '1mo', label: '1 Month' },
  { value: '3mo', label: '3 Months' },
];

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: '5m', label: '5 Min' },
  { value: '15m', label: '15 Min' },
  { value: '1h', label: '1 Hour' },
  { value: '1d', label: '1 Day' },
];

const VALID_INTERVALS: Record<Timeframe, Interval[]> = {
  '1d': ['5m', '15m', '1h'],
  '5d': ['5m', '15m', '1h'],
  '1mo': ['15m', '1h', '1d'],
  '3mo': ['1h', '1d'],
};

interface SymbolInputProps {
  onAnalyze: (query: StockQuery) => void;
  loading: boolean;
}

export default function SymbolInput({ onAnalyze, loading }: SymbolInputProps) {
  const [symbol, setSymbol] = useState('AAPL');
  const [range, setRange] = useState<Timeframe>('1mo');
  const [interval, setInterval] = useState<Interval>('1d');

  const validIntervals = VALID_INTERVALS[range];

  useEffect(() => {
    if (!validIntervals.includes(interval)) {
      setInterval(validIntervals[0]);
    }
  }, [range, interval, validIntervals]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    onAnalyze({ symbol: symbol.trim().toUpperCase(), range, interval });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL, GOOG, TSLA"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeframe</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Timeframe)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TIMEFRAME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as Interval)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {INTERVAL_OPTIONS.filter((opt) => validIntervals.includes(opt.value)).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !symbol.trim()}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : (
          'Analyze'
        )}
      </button>
    </form>
  );
}
