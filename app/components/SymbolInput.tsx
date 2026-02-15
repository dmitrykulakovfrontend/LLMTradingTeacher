"use client";

import { useRangeSelector } from "../hooks/useRangeSelector";
import { TickerSearch } from "./ui/TickerSearch";
import type { StockQuery } from "../lib/types";

interface SymbolInputProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  onAnalyze: (query: StockQuery) => void;
  onGetData: (query: StockQuery) => void;
  loading: boolean;
  dataLoading: boolean;
}

export default function SymbolInput({
  symbol,
  onSymbolChange,
  onAnalyze,
  onGetData,
  loading,
  dataLoading,
}: SymbolInputProps) {
  const { range, interval, RangeSelector } = useRangeSelector({
    defaultRange: "1mo",
    defaultInterval: "1d",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    onAnalyze({
      symbol: symbol.trim().toUpperCase(),
      range,
      interval,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <TickerSearch
          value={symbol}
          onChange={onSymbolChange}
          onSelect={onSymbolChange}
          placeholder="AAPL"
          className="w-32"
        />

        <RangeSelector />

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            disabled={dataLoading || loading || !symbol.trim()}
            onClick={() =>
              onGetData({
                symbol: symbol.trim().toUpperCase(),
                range,
                interval,
              })
            }
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {dataLoading ? "Fetching" : "Get Data"}
          </button>

          <button
            type="submit"
            disabled={loading || !symbol.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Analyzing" : "Analyze"}
          </button>
        </div>
      </div>
    </form>
  );
}
