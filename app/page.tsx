"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import ThemeToggle from "./components/ThemeToggle";
import ModelSettings from "./components/ModelSettings";
import SymbolInput from "./components/SymbolInput";
import PdfUpload from "./components/PdfUpload";
import MarketClock from "./components/MarketClock";
import AnalysisPanel from "./components/AnalysisPanel";
import FundamentalsPanel from "./components/FundamentalsPanel";
import { fetchStockData } from "./lib/yahoo";
import { fetchFundamentals } from "./lib/fundamentals";
import { useStockData } from "./hooks/useStockData";
import { useFundamentals } from "./hooks/useFundamentals";
import { useAnalysis } from "./hooks/useAnalysis";
import type { ModelConfig } from "./lib/models";
import type { StockQuery } from "./lib/types";
import {
  quoteSummary_modules,
  QuoteSummaryModules,
} from "yahoo-finance2/modules/quoteSummary";
import { fetchTest } from "./lib/test";

const Chart = dynamic(() => import("./components/Chart"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4">
      <div className="flex items-center justify-center h-60 sm:h-90 text-gray-400 dark:text-gray-500">
        Loading chart...
      </div>
    </div>
  ),
});

export default function Home() {
  const queryClient = useQueryClient();

  const [symbol, setSymbol] = useState("AAPL");
  const [activeQuery, setActiveQuery] = useState<StockQuery | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [module, setModule] = useState<QuoteSummaryModules>("assetProfile");

  const modelRef = useRef<ModelConfig | null>(null);
  const apiKeyRef = useRef("");
  const systemPromptRef = useRef("");
  const fmpApiKeyRef = useRef("");

  // TanStack Query hooks
  const stockQuery = useStockData(activeQuery);
  const fundQuery = useFundamentals(
    activeQuery?.symbol ?? null,
    fmpApiKeyRef.current || null,
  );
  const {
    messages,
    streamingText,
    isLoading: analysisLoading,
    error: analysisError,
    analyze,
    followUp,
    analyzePdf,
    reset: resetAnalysis,
  } = useAnalysis();

  const candles = stockQuery.data ?? [];

  const testQuery = useQuery({
    queryKey: ["test", symbol, module],
    queryFn: () => fetchTest(symbol!, module),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handleSettingsChange = useCallback(
    (
      model: ModelConfig,
      apiKey: string,
      systemPrompt: string,
      fmpApiKey: string,
    ) => {
      modelRef.current = model;
      apiKeyRef.current = apiKey;
      systemPromptRef.current = systemPrompt;
      fmpApiKeyRef.current = fmpApiKey;
    },
    [],
  );

  const handleGetData = useCallback(
    (query: StockQuery) => {
      resetAnalysis();
      setActiveQuery(query);
    },
    [resetAnalysis],
  );

  const handleAnalyze = useCallback(
    async (query: StockQuery) => {
      resetAnalysis();
      setActiveQuery(query);

      const model = modelRef.current;
      const apiKey = apiKeyRef.current;

      if (!model || !apiKey) {
        return;
      }

      try {
        const stockData = await queryClient.ensureQueryData({
          queryKey: ["stockData", query.symbol, query.range, query.interval],
          queryFn: () => fetchStockData(query),
          staleTime: 2 * 60 * 1000,
        });

        let fundData = null;
        try {
          fundData = await queryClient.ensureQueryData({
            queryKey: [
              "fundamentals",
              query.symbol,
              fmpApiKeyRef.current || "yahoo",
            ],
            queryFn: () =>
              fetchFundamentals(query.symbol, fmpApiKeyRef.current || null),
            staleTime: 5 * 60 * 1000,
          });
        } catch {
          // Fundamentals failure is non-fatal
        }

        analyze(
          model,
          apiKey,
          systemPromptRef.current,
          query.symbol,
          stockData,
          fundData,
        );
      } catch {
        // Stock data fetch failed — React Query will also show the error
      }
    },
    [queryClient, resetAnalysis, analyze],
  );

  const handlePdfAnalyze = useCallback(
    (pdfText: string, prompt: string) => {
      setActiveQuery(null);

      const model = modelRef.current;
      const apiKey = apiKeyRef.current;

      if (!model || !apiKey) {
        return;
      }

      analyzePdf(model, apiKey, pdfText, prompt);
    },
    [analyzePdf],
  );

  const handleFollowUp = useCallback(
    (text: string) => {
      const model = modelRef.current;
      const apiKey = apiKeyRef.current;
      const sysPrompt = systemPromptRef.current;

      if (!model || !apiKey || !sysPrompt) {
        return;
      }

      followUp(model, apiKey, sysPrompt, text);
    },
    [followUp],
  );

  const isLoading =
    stockQuery.isLoading || analysisLoading || fundQuery.isLoading;
  const hasData = candles.length > 0;

  const [allCopied, setAllCopied] = useState(false);
  const handleCopyAll = useCallback(() => {
    const payload: Record<string, unknown> = { candles };
    if (fundQuery.data?.rawResponse) {
      payload.fundamentals = fundQuery.data.rawResponse;
    }
    navigator.clipboard.writeText(JSON.stringify(payload)).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    });
  }, [candles, fundQuery.data]);

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 dark:border-gray-800 px-4 xl:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              Stock Pattern Analyzer
            </h1>
            <div className="hidden md:block">
              <MarketClock />
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Body — fills remaining viewport */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_400px] gap-0">
          {/* Left sidebar */}
          <div className="border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4 space-y-4 hidden lg:block">
            <ModelSettings onSettingsChange={handleSettingsChange} />
            <PdfUpload onAnalyze={handlePdfAnalyze} loading={analysisLoading} />
          </div>

          {/* Center content */}
          <div className="overflow-y-auto p-4 space-y-4">
            {/* Mobile-only: sidebar widgets inline */}
            <div className="lg:hidden space-y-4">
              <ModelSettings onSettingsChange={handleSettingsChange} />
              <div className="md:hidden">
                <MarketClock />
              </div>
            </div>

            <SymbolInput
              symbol={symbol}
              onSymbolChange={setSymbol}
              onAnalyze={handleAnalyze}
              onGetData={handleGetData}
              loading={isLoading}
              dataLoading={stockQuery.isFetching}
            />

            {stockQuery.error && (
              <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                {stockQuery.error.message}
              </div>
            )}
            <Chart data={candles} symbol={symbol} dark={isDark} />

            <div className="border-l border-gray-200 dark:border-gray-800 hidden xl:flex xl:flex-col overflow-hidden p-4 space-y-3">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quote Module
              </label>
              <select
                value={module}
                onChange={(e) =>
                  setModule(e.target.value as QuoteSummaryModules)
                }
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {quoteSummary_modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
              <pre className="flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {testQuery.isLoading
                  ? "Loading..."
                  : testQuery.data
                    ? JSON.stringify(testQuery.data, null, 2)
                    : "error?"}
              </pre>
            </div>
            <FundamentalsPanel
              data={fundQuery.data ?? null}
              loading={fundQuery.isLoading}
              error={fundQuery.error?.message ?? null}
            />
            {hasData && (
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {allCopied ? (
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
                    Copy All Data
                  </>
                )}
              </button>
            )}

            {/* Mobile/tablet: PdfUpload + AnalysisPanel inline */}
            <div className="xl:hidden space-y-4">
              <div className="lg:hidden">
                <PdfUpload
                  onAnalyze={handlePdfAnalyze}
                  loading={analysisLoading}
                />
              </div>
              <AnalysisPanel
                messages={messages}
                streamingResult={streamingText ?? (analysisLoading ? "" : null)}
                loading={analysisLoading}
                error={analysisError}
                modelName={modelRef.current?.name}
                onFollowUp={handleFollowUp}
              />
            </div>
          </div>

          {/* Right panel — AI Analysis (xl+ only) */}
          <div className="border-l border-gray-200 dark:border-gray-800 hidden xl:flex xl:flex-col overflow-hidden">
            <AnalysisPanel
              messages={messages}
              streamingResult={streamingText ?? (analysisLoading ? "" : null)}
              loading={analysisLoading}
              error={analysisError}
              modelName={modelRef.current?.name}
              onFollowUp={handleFollowUp}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
