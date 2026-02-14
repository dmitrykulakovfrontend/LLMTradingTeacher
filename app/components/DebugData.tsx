"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  quoteSummary_modules,
  QuoteSummaryModules,
} from "yahoo-finance2/modules/quoteSummary";
import JsonView from "./JsonView";
import {
  FundamentalsTimeSeriesModule,
  FundamentalsTimeSeriesType,
  Timeframe,
} from "../lib/types";
import { useRangeSelector } from "../hooks/useRangeSelector";
import { fetchFundamentalsTimeSeries } from "../lib/fundamentalsTimeSeries";
import {
  FundamentalsTimeSeries_Modules,
  FundamentalsTimeSeries_Types,
} from "yahoo-finance2/modules/fundamentalsTimeSeries";

export default function DebugData({
  symbol,
  module,
  setModule,
  type,
  setType,
}: {
  symbol: string;
  module: FundamentalsTimeSeriesModule;
  setModule: (module: FundamentalsTimeSeriesModule) => void;
  type: FundamentalsTimeSeriesType;
  setType: (type: FundamentalsTimeSeriesType) => void;
}) {
  const { range, RangeSelector } = useRangeSelector({
    defaultRange: "6mo",
  });

  const testQuery = useQuery({
    queryKey: ["fundamentalsTimeSeries", symbol, module, range, type],
    queryFn: () => fetchFundamentalsTimeSeries(symbol!, module, range, type),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
  return (
    <div className="border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden p-4 space-y-3">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Fundamentals Time Series
      </label>
      <RangeSelector />
      <select
        value={module}
        onChange={(e) =>
          setModule(e.target.value as FundamentalsTimeSeriesModule)
        }
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        {FundamentalsTimeSeries_Modules.map((module) => (
          <option key={module} value={module}>
            {module}
          </option>
        ))}
      </select>

      <select
        value={type}
        onChange={(e) => setType(e.target.value as FundamentalsTimeSeriesType)}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        {FundamentalsTimeSeries_Types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <pre className="flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
        {testQuery.isLoading ? (
          "Loading..."
        ) : testQuery.data ? (
          <JsonView data={testQuery.data} header={module} />
        ) : (
          "error?"
        )}
      </pre>
    </div>
  );
}
