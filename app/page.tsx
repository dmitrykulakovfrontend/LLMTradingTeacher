'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ThemeToggle from './components/ThemeToggle';
import ModelSettings from './components/ModelSettings';
import SymbolInput from './components/SymbolInput';
import AnalysisPanel from './components/AnalysisPanel';
import FundamentalsPanel from './components/FundamentalsPanel';
import { fetchStockData } from './lib/yahoo';
import { fetchFundamentals } from './lib/fundamentals';
import { analyzeChart } from './lib/llm';
import { buildSystemPrompt, buildInitialUserMessage } from './lib/formatData';
import type { ModelConfig } from './lib/models';
import type { CandleData, StockQuery, AnalysisState, ChatMessage, FundamentalsState, FundamentalsData } from './lib/types';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false,
    result: null,
    error: null,
  });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsState>({
    loading: false,
    data: null,
    error: null,
  });
  const [isDark, setIsDark] = useState(true);

  const modelRef = useRef<ModelConfig | null>(null);
  const apiKeyRef = useRef('');
  const systemPromptRef = useRef('');
  const fmpApiKeyRef = useRef('');
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleSettingsChange = useCallback((model: ModelConfig, apiKey: string, systemPrompt: string, fmpApiKey: string) => {
    modelRef.current = model;
    apiKeyRef.current = apiKey;
    systemPromptRef.current = systemPrompt;
    fmpApiKeyRef.current = fmpApiKey;
  }, []);

  const handleAnalyze = useCallback(async (query: StockQuery) => {
    setChartError(null);
    setAnalysis({ loading: false, result: null, error: null });
    setMessages([]);
    setChartLoading(true);
    setSymbol(query.symbol);
    setCandles([]);
    const hasFmpKey = !!fmpApiKeyRef.current;
    if (hasFmpKey) {
      setFundamentals({ loading: true, data: null, error: null });
    } else {
      setFundamentals({ loading: false, data: null, error: null });
    }

    // Step 1: Fetch price data (and fundamentals in parallel if FMP key is set)
    const pricePromise = fetchStockData(query);
    const fundPromise = hasFmpKey
      ? fetchFundamentals(query.symbol, fmpApiKeyRef.current)
      : Promise.resolve(null as FundamentalsData | null);

    const [priceResult, fundResult] = await Promise.allSettled([pricePromise, fundPromise]);

    // Handle price data (always first)
    let data: CandleData[];
    if (priceResult.status === 'fulfilled') {
      data = priceResult.value;
      setCandles(data);
      setChartLoading(false);
    } else {
      const message = priceResult.reason instanceof Error
        ? priceResult.reason.message
        : 'Failed to fetch stock data';
      setChartError(message);
      setChartLoading(false);
      setFundamentals({ loading: false, data: null, error: null });
      return;
    }

    // Handle fundamentals (non-blocking — analysis can still proceed without it)
    let fundData: FundamentalsData | null = null;
    if (hasFmpKey && fundResult.status === 'fulfilled' && fundResult.value) {
      fundData = fundResult.value;
      setFundamentals({ loading: false, data: fundData, error: null });
    } else if (hasFmpKey && fundResult.status === 'rejected') {
      const message = fundResult.reason instanceof Error
        ? fundResult.reason.message
        : 'Failed to fetch fundamentals';
      setFundamentals({ loading: false, data: null, error: message });
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

    // Step 3: Build conversation and run LLM analysis (with fundamentals if available)
    const sysPrompt = systemPromptRef.current || buildSystemPrompt();
    const userMsg: ChatMessage = { role: 'user', content: buildInitialUserMessage(query.symbol, data, fundData) };
    const newMessages: ChatMessage[] = [userMsg];

    messagesRef.current = newMessages;
    setMessages(newMessages);
    setAnalysis({ loading: true, result: '', error: null });

    try {
      let assistantText = '';
      await analyzeChart(model, apiKey, sysPrompt, newMessages, (chunk) => {
        assistantText += chunk;
        setAnalysis((prev) => ({ ...prev, result: (prev.result || '') + chunk }));
      });
      const updated = [...newMessages, { role: 'assistant' as const, content: assistantText }];
      messagesRef.current = updated;
      setMessages(updated);
      setAnalysis((prev) => ({ ...prev, loading: false }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setAnalysis((prev) => ({
        loading: false,
        result: prev.result || null,
        error: message,
      }));
    }
  }, []);

  const handleFollowUp = useCallback(async (text: string) => {
    const model = modelRef.current;
    const apiKey = apiKeyRef.current;
    const sysPrompt = systemPromptRef.current;

    if (!model || !apiKey || !sysPrompt) {
      setAnalysis((prev) => ({ ...prev, error: 'Please enter your API key first.' }));
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    const fullMessages = [...messagesRef.current, userMsg];
    messagesRef.current = fullMessages;
    setMessages(fullMessages);
    setAnalysis({ loading: true, result: '', error: null });

    try {
      let assistantText = '';
      await analyzeChart(model, apiKey, sysPrompt, fullMessages, (chunk) => {
        assistantText += chunk;
        setAnalysis((prev) => ({ ...prev, result: (prev.result || '') + chunk }));
      });
      const updated = [...fullMessages, { role: 'assistant' as const, content: assistantText }];
      messagesRef.current = updated;
      setMessages(updated);
      setAnalysis((prev) => ({ ...prev, loading: false }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Follow-up failed';
      setAnalysis((prev) => ({
        loading: false,
        result: prev.result || null,
        error: message,
      }));
    }
  }, []);

  const isLoading = chartLoading || analysis.loading || fundamentals.loading;

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
            <FundamentalsPanel
              data={fundamentals.data}
              loading={fundamentals.loading}
              error={fundamentals.error}
            />
            <AnalysisPanel
              messages={messages}
              streamingResult={analysis.result}
              loading={analysis.loading}
              error={analysis.error}
              modelName={modelRef.current?.name}
              onFollowUp={handleFollowUp}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
