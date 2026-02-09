'use client';

import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { ChatMessage } from '../lib/types';

interface AnalysisPanelProps {
  messages: ChatMessage[];
  streamingResult: string | null;
  loading: boolean;
  error: string | null;
  modelName?: string;
  onFollowUp: (text: string) => void;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AnalysisPanel({ messages, streamingResult, loading, error, modelName, onFollowUp }: AnalysisPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;
  const hasStreaming = !!streamingResult;

  // Determine which assistant messages are finalized (exist in messages array)
  // The last assistant message may still be streaming — use streamingResult for that
  const completedMessages = messages;
  const isStreamingNewMessage = loading && hasStreaming;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingResult]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    onFollowUp(text);
  };

  // Check if there's at least one completed assistant message (conversation started)
  const hasCompletedAnalysis = completedMessages.some((m) => m.role === 'assistant');
  const showInput = hasCompletedAnalysis || (isStreamingNewMessage);

  return (
    <div className="rounded-lg xl:rounded-none border border-gray-200 dark:border-gray-800 xl:border-0 bg-white dark:bg-gray-900/50 p-3 sm:p-4 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">AI Analysis</h2>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Spinner />
            {hasStreaming ? 'Streaming' : 'Thinking'}{modelName ? ` (${modelName})` : ''}...
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300 mb-3 shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {hasMessages && (
          <div className="space-y-4 mb-3">
            {/* Skip the first user message (raw OHLC data) — only show follow-up user messages */}
            {completedMessages.map((msg, i) => {
              if (i === 0 && msg.role === 'user') return null;
              return <MessageBubble key={i} message={msg} />;
            })}

            {/* Streaming assistant response (not yet in messages array) */}
            {isStreamingNewMessage && (
              <div className="analysis-content text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <Markdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]} rehypePlugins={[rehypeKatex]}>{streamingResult}</Markdown>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {!hasMessages && !loading && !error && (
          <p className="text-gray-400 dark:text-gray-500 py-8 text-center">
            Analysis will appear here after you click Analyze
          </p>
        )}
      </div>

      {showInput && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            disabled={loading}
            className="flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-content text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      <Markdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]} rehypePlugins={[rehypeKatex]}>{message.content}</Markdown>
    </div>
  );
}
