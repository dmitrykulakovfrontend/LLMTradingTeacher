'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ThemeToggle from './components/ThemeToggle';
import ModelSettings from './components/ModelSettings';
import SymbolInput from './components/SymbolInput';
import PdfUpload from './components/PdfUpload';
import MarketClock from './components/MarketClock';
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

function queryKey(q: StockQuery): string {
  return `${q.symbol}|${q.range}|${q.interval}`;
}

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
  const [dataLoading, setDataLoading] = useState(false);

  const modelRef = useRef<ModelConfig | null>(null);
  const apiKeyRef = useRef('');
  const systemPromptRef = useRef('');
  const fmpApiKeyRef = useRef('');
  const messagesRef = useRef<ChatMessage[]>([]);

  // Cache for fetched data so Analyze can reuse it
  const cachedQueryRef = useRef<string>('');
  const cachedCandlesRef = useRef<CandleData[]>([]);
  const cachedFundRef = useRef<FundamentalsData | null>(null);

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

  // Shared data-fetching logic. Returns { candles, fundData } or null on failure.
  const fetchData = useCallback(async (query: StockQuery): Promise<{ candles: CandleData[]; fundData: FundamentalsData | null } | null> => {
    setChartError(null);
    setChartLoading(true);
    setSymbol(query.symbol);
    setCandles([]);
    const hasFmpKey = !!fmpApiKeyRef.current;
    if (hasFmpKey) {
      setFundamentals({ loading: true, data: null, error: null });
    } else {
      setFundamentals({ loading: false, data: null, error: null });
    }

    const pricePromise = fetchStockData(query);
    const fundPromise = hasFmpKey
      ? fetchFundamentals(query.symbol, fmpApiKeyRef.current)
      : Promise.resolve(null as FundamentalsData | null);

    const [priceResult, fundResult] = await Promise.allSettled([pricePromise, fundPromise]);

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
      return null;
    }

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

    // Cache for reuse
    cachedQueryRef.current = queryKey(query);
    cachedCandlesRef.current = data;
    cachedFundRef.current = fundData;

    return { candles: data, fundData };
  }, []);

  const handleGetData = useCallback(async (query: StockQuery) => {
    setDataLoading(true);
    setAnalysis({ loading: false, result: null, error: null });
    setMessages([]);
    await fetchData(query);
    setDataLoading(false);
  }, [fetchData]);

  const handleAnalyze = useCallback(async (query: StockQuery) => {
    setAnalysis({ loading: false, result: null, error: null });
    setMessages([]);

    // Reuse cached data if query matches
    let data: CandleData[];
    let fundData: FundamentalsData | null;
    const key = queryKey(query);

    if (cachedQueryRef.current === key && cachedCandlesRef.current.length > 0) {
      data = cachedCandlesRef.current;
      fundData = cachedFundRef.current;
      setSymbol(query.symbol);
      // Data already displayed — no need to refetch
    } else {
      const result = await fetchData(query);
      if (!result) return;
      data = result.candles;
      fundData = result.fundData;
    }

    // Validate model settings
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

    // Build conversation and run LLM analysis
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
  }, [fetchData]);

  const handlePdfAnalyze = useCallback(async (pdfText: string, prompt: string) => {
    // Clear stock-related state
    setCandles([]);
    setSymbol('');
    setFundamentals({ loading: false, data: null, error: null });
    setChartError(null);

    const model = modelRef.current;
    const apiKey = apiKeyRef.current;

    if (!model || !apiKey) {
      setAnalysis({ loading: false, result: null, error: 'Please enter your API key first.' });
      return;
    }

    const sysPrompt = 'You are a helpful AI assistant. Analyze the provided document and respond to the user\'s request thoroughly.';
    const userMsg: ChatMessage = {
      role: 'user',
      content: `Here is the document content:\n\n${pdfText}\n\n---\n\n${prompt}`,
    };
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
      setAnalysis((prev) => ({ loading: false, result: prev.result || null, error: message }));
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
  const hasData = candles.length > 0;

  const [allCopied, setAllCopied] = useState(false);
  const handleCopyAll = useCallback(() => {
    const payload: Record<string, unknown> = { candles };
    if (fundamentals.data?.rawResponse) {
      payload.fundamentals = fundamentals.data.rawResponse;
    }
    navigator.clipboard.writeText(JSON.stringify(payload)).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    });
  }, [candles, fundamentals.data]);

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
            <PdfUpload onAnalyze={handlePdfAnalyze} loading={analysis.loading} />
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

            <SymbolInput onAnalyze={handleAnalyze} onGetData={handleGetData} loading={isLoading} dataLoading={dataLoading} />

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
            {hasData && (
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {allCopied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Copy All Data
                  </>
                )}
              </button>
            )}

            {/* Mobile/tablet: PdfUpload + AnalysisPanel inline */}
            <div className="xl:hidden space-y-4">
              <div className="lg:hidden">
                <PdfUpload onAnalyze={handlePdfAnalyze} loading={analysis.loading} />
              </div>
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

          {/* Right panel — AI Analysis (xl+ only) */}
          <div className="border-l border-gray-200 dark:border-gray-800 hidden xl:flex xl:flex-col overflow-hidden">
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
