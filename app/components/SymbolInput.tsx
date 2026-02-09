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
  onGetData: (query: StockQuery) => void;
  loading: boolean;
  dataLoading: boolean;
}

export default function SymbolInput({ onAnalyze, onGetData, loading, dataLoading }: SymbolInputProps) {
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
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="AAPL"
          className="w-24 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Timeframe)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TIMEFRAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value as Interval)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {INTERVAL_OPTIONS.filter((opt) => validIntervals.includes(opt.value)).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            disabled={dataLoading || loading || !symbol.trim()}
            onClick={() => {
              if (!symbol.trim()) return;
              onGetData({ symbol: symbol.trim().toUpperCase(), range, interval });
            }}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {dataLoading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Fetching
              </span>
            ) : (
              'Get Data'
            )}
          </button>
          <button
            type="submit"
            disabled={loading || !symbol.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
