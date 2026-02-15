"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import ThemeToggle from "./components/ThemeToggle";
import ModelSettings from "./components/ModelSettings";
import SymbolInput from "./components/SymbolInput";
import PdfUpload from "./components/widgets/PdfUpload";
import MarketClock from "./components/widgets/MarketClock";
import MultiAnalystPanel from "./components/MultiAnalystPanel";
import FundamentalsPanel from "./components/FundamentalsPanel";
import { useStockData } from "./hooks/useStockData";
import { useFundamentals } from "./hooks/useFundamentals";
import { useAnalysis } from "./hooks/useAnalysis";
import type { ModelConfig } from "./lib/models";
import type {
  FundamentalsTimeSeriesModule,
  FundamentalsTimeSeriesType,
  StockQuery,
} from "./lib/types";
import DebugData from "./components/widgets/DebugData";
import Collapseable from "./components/ui/Collapseable";
import EtfOverlap from "./components/widgets/EtfOverlap";
import PortfolioXRay from "./components/widgets/PortfolioXRay";
import { Message } from "./components/ui/Message";
import { CopyButton } from "./components/ui/CopyButton";

const Chart = dynamic(() => import("./components/widgets/Chart"), {
  ssr: false,
  loading: () => (
    <div className="widget-grid-bg border border-white/[0.08] bg-[#141414] p-4">
      <div className="flex items-center justify-center h-60 sm:h-90 text-[#666666] font-manrope">
        Loading chart...
      </div>
    </div>
  ),
});

export default function Home() {
  const [symbol, setSymbol] = useState("AAPL");
  const [activeQuery, setActiveQuery] = useState<StockQuery | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [module, setModule] =
    useState<FundamentalsTimeSeriesModule>("financials");
  const [type, setType] = useState<FundamentalsTimeSeriesType>("annual");

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
    isLoading: analysisLoading,
    analyzePdf,
    reset: resetAnalysis,
  } = useAnalysis();

  const candles = stockQuery.data ?? [];

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

  // Analysis is now handled internally by MultiAnalystPanel
  // Just load the data when user clicks "Get Data"
  const handleAnalyze = handleGetData;

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


  const isLoading =
    stockQuery.isLoading || analysisLoading || fundQuery.isLoading;
  const hasData = candles.length > 0;

  const allDataPayload = (() => {
    const payload: Record<string, unknown> = { candles };
    if (fundQuery.data?.rawResponse) {
      payload.fundamentals = fundQuery.data.rawResponse;
    }
    return payload;
  })();

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.08] px-4 xl:px-6 py-3 widget-grid-bg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <h1 className="font-chakra text-xl font-bold text-white tracking-wider uppercase whitespace-nowrap">
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
          <div className="border-r border-white/[0.08] overflow-y-auto p-4 space-y-4 hidden lg:block bg-[var(--color-bg-surface)]">
            <ModelSettings onSettingsChange={handleSettingsChange} />
            <PdfUpload onAnalyze={handlePdfAnalyze} loading={analysisLoading} />
          </div>

          {/* Center content */}
          <div className="overflow-y-auto p-4 space-y-4 bg-[var(--color-bg-primary)]">
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
              <Message variant="error">
                {stockQuery.error.message}
              </Message>
            )}
            <Chart data={candles} symbol={symbol} dark={isDark} />
            <Collapseable title="Data Explorer">
              <DebugData
                symbol={symbol}
                module={module}
                setModule={setModule}
                type={type}
                setType={setType}
              />
            </Collapseable>
            <Collapseable title="Fundamentals">
              <FundamentalsPanel
                data={fundQuery.data ?? null}
                loading={fundQuery.isLoading}
                error={fundQuery.error?.message ?? null}
              />
            </Collapseable>
            <Collapseable title="ETF Overlap Comparator">
              <EtfOverlap />
            </Collapseable>
            <PortfolioXRay />
            {hasData && (
              <CopyButton
                data={allDataPayload}
                label="Copy All Data"
                variant="secondary"
                size="sm"
              />
            )}

            {/* Mobile/tablet: PdfUpload + MultiAnalystPanel inline */}
            <div className="xl:hidden space-y-4">
              <div className="lg:hidden">
                <PdfUpload
                  onAnalyze={handlePdfAnalyze}
                  loading={analysisLoading}
                />
              </div>
              <MultiAnalystPanel
                symbol={symbol}
                candles={candles}
                fundamentals={fundQuery.data ?? null}
                model={modelRef.current}
                apiKey={apiKeyRef.current}
              />
            </div>
          </div>

          {/* Right panel — Multi-Analyst Analysis (xl+ only) */}
          <div className="border-l border-white/[0.08] bg-[var(--color-bg-surface)] hidden xl:flex xl:flex-col overflow-hidden">
            <MultiAnalystPanel
              symbol={symbol}
              candles={candles}
              fundamentals={fundQuery.data ?? null}
              model={modelRef.current}
              apiKey={apiKeyRef.current}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
