"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TickerSearchResult } from "../../lib/types";
import { Spinner } from "./Spinner";

interface TickerSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (symbol: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

async function fetchTickerSearch(query: string): Promise<TickerSearchResult[]> {
  const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error("Search failed");
  }
  const data = await res.json();
  return data.results ?? [];
}

export function TickerSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Search ticker...",
  disabled = false,
  className = "",
}: TickerSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query
  useEffect(() => {
    if (value.length < 2) {
      setDebouncedQuery("");
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Fetch search results
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["tickerSearch", debouncedQuery],
    queryFn: () => fetchTickerSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // Open dropdown when we have results and a query
  useEffect(() => {
    if (debouncedQuery.length >= 2 && (results.length > 0 || isFetching)) {
      setIsOpen(true);
    }
  }, [results, debouncedQuery, isFetching]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle selecting a result
  const handleSelect = useCallback(
    (result: TickerSearchResult) => {
      onChange(result.symbol);
      onSelect?.(result.symbol);
      setIsOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [onChange, onSelect],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case "Enter":
          if (highlightIndex >= 0 && highlightIndex < results.length) {
            e.preventDefault();
            handleSelect(results[highlightIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [isOpen, results, highlightIndex, handleSelect],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upper = e.target.value.toUpperCase();
    onChange(upper);
    setHighlightIndex(-1);
  };

  const handleFocus = () => {
    if (debouncedQuery.length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${className}`}
        autoComplete="off"
      />

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-y-auto border border-white/[0.12] bg-[#1a1a1a] shadow-lg shadow-black/50 z-50">
          {isFetching && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-[#666666]">
              <Spinner size="xs" />
              <span className="font-manrope text-xs">Searching...</span>
            </div>
          )}

          {!isFetching && results.length === 0 && (
            <div className="px-3 py-4 text-center font-manrope text-xs text-[#666666]">
              No matches found
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={result.symbol}
              type="button"
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer ${
                index === highlightIndex
                  ? "bg-[var(--color-accent-cyan)]/15 text-white"
                  : "text-[#a0a0a0] hover:bg-white/[0.05]"
              }`}
            >
              <span className="font-ibm text-sm font-bold text-white shrink-0 w-20 truncate">
                {result.symbol}
              </span>
              <span className="font-manrope text-xs truncate flex-1">
                {result.longname || result.shortname}
              </span>
              <span className="font-ibm text-[10px] text-[#666666] shrink-0">
                {result.quoteType}
              </span>
            </button>
          ))}

          {isFetching && results.length > 0 && (
            <div className="flex items-center justify-center py-1 border-t border-white/[0.06]">
              <Spinner size="xs" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
