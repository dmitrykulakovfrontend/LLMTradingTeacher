"use client";

import { useState, JSX } from "react";
import type { Timeframe, Interval } from "../lib/types";
type RangeSelectorParams =
  | { defaultRange: Timeframe; defaultInterval?: Interval }
  | { defaultRange?: Timeframe; defaultInterval: Interval };

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "1d", label: "1 Day" },
  { value: "5d", label: "5 Days" },
  { value: "1mo", label: "1 Month" },
  { value: "3mo", label: "3 Months" },
  { value: "6mo", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "5y", label: "5 Years" },
  { value: "10y", label: "10 Years" },
  { value: "ytd", label: "Year to Date" },
  { value: "max", label: "Max" },
];

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: "5m", label: "5 Min" },
  { value: "15m", label: "15 Min" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "1 Day" },
  { value: "1wk", label: "1 Week" },
  { value: "1mo", label: "1 Month" },
];

export function useRangeSelector(params: {
  defaultRange: Timeframe;
  defaultInterval: Interval;
}): {
  range: Timeframe;
  interval: Interval;
  setRange: (range: Timeframe) => void;
  setInterval: (interval: Interval) => void;
  RangeSelector: () => JSX.Element;
};
export function useRangeSelector(params: {
  defaultRange: Timeframe;
  defaultInterval?: Interval;
}): {
  range: Timeframe;
  interval: Interval | undefined;
  setRange: (range: Timeframe) => void;
  setInterval: (interval: Interval) => void;
  RangeSelector: () => JSX.Element;
};

export function useRangeSelector(params: {
  defaultRange?: Timeframe;
  defaultInterval: Interval;
}): {
  range: Timeframe | undefined;
  interval: Interval;
  setRange: (range: Timeframe) => void;
  setInterval: (interval: Interval) => void;
  RangeSelector: () => JSX.Element;
};

export function useRangeSelector(params: RangeSelectorParams): {
  range: Timeframe | undefined;
  interval: Interval | undefined;
  setRange: (range: Timeframe) => void;
  setInterval: (interval: Interval) => void;
  RangeSelector: () => JSX.Element;
} {
  const [range, setRange] = useState<Timeframe | undefined>(
    params.defaultRange,
  );
  const [interval, setInterval] = useState<Interval | undefined>(
    params.defaultInterval,
  );

  const RangeSelector = () => (
    <>
      {range && (
        <select
          value={range}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onChange={(e) => setRange(e.target.value as Timeframe)}
        >
          {TIMEFRAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {interval && (
        <select
          value={interval}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onChange={(e) => setInterval(e.target.value as Interval)}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </>
  );

  return {
    range,
    interval,
    setRange,
    setInterval,
    RangeSelector,
  };
}
