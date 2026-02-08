'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ThemeToggle from './components/ThemeToggle';
import ModelSettings from './components/ModelSettings';
import SymbolInput from './components/SymbolInput';
import AnalysisPanel from './components/AnalysisPanel';
import { fetchStockData } from './lib/yahoo';
import { analyzeChart } from './lib/llm';
import { formatOHLCForPrompt } from './lib/formatData';
import type { ModelConfig } from './lib/models';
import type { CandleData, StockQuery, AnalysisState } from './lib/types';

const Chart = dynamic(() => import('./components/Chart'), {
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
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [symbol, setSymbol] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false,
    result: null,
    error: null,
  });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  const modelRef = useRef<ModelConfig | null>(null);
  const apiKeyRef = useRef('');

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleSettingsChange = useCallback((model: ModelConfig, apiKey: string) => {
    modelRef.current = model;
    apiKeyRef.current = apiKey;
  }, []);

  const handleAnalyze = useCallback(async (query: StockQuery) => {
    setChartError(null);
    setAnalysis({ loading: false, result: null, error: null });
    setChartLoading(true);
    setSymbol(query.symbol);
    setCandles([]);

    // Step 1: Fetch stock data
    let data: CandleData[];
    try {
      data = await fetchStockData(query);
      setCandles(data);
      setChartLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stock data';
      setChartError(message);
      setChartLoading(false);
      return;
    }

    // Step 2: Validate model settings
    const model = modelRef.current;
    const apiKey = apiKeyRef.current;

    if (!model || !apiKey) {
      setAnalysis({
        loading: false,
        result: null,
        error: 'Please enter your API key first.',
      });
      return;
    }

    // Step 3: Run LLM analysis (use local `data`, not stale `candles` state)
    setAnalysis({ loading: true, result: null, error: null });
    try {
      const prompt = formatOHLCForPrompt(query.symbol, data);
      const result = await analyzeChart(model, apiKey, prompt);
      setAnalysis({ loading: false, result, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setAnalysis({ loading: false, result: null, error: message });
    }
  }, []);

  const isLoading = chartLoading || analysis.loading;

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Stock Pattern Analyzer
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
              AI-powered technical analysis for learning
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-1 space-y-4">
            <ModelSettings onSettingsChange={handleSettingsChange} />
            <SymbolInput onAnalyze={handleAnalyze} loading={isLoading} />
          </div>

          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {chartError && (
              <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                {chartError}
              </div>
            )}
            <Chart data={candles} symbol={symbol} dark={isDark} />
            <AnalysisPanel state={analysis} modelName={modelRef.current?.name} />
          </div>
        </div>
      </div>
    </main>
  );
}
