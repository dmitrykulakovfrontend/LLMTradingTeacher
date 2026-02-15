'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../lib/types';
import { Spinner } from './ui/Spinner';
import { Message } from './ui/Message';
import { Button } from './ui/Button';
import { MarkdownRenderer } from './ui/MarkdownRenderer';

interface AnalysisPanelProps {
  messages: ChatMessage[];
  streamingResult: string | null;
  loading: boolean;
  error: string | null;
  modelName?: string;
  onFollowUp: (text: string) => void;
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
    <div className="widget-grid-bg border border-white/[0.08] xl:border-0 bg-[#141414] p-3 sm:p-4 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0 border-b border-white/[0.08] pb-3">
        <h2 className="font-chakra text-lg font-bold text-white tracking-wider uppercase">AI Analysis</h2>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#666666] font-manrope">
            <Spinner />
            {hasStreaming ? 'Streaming' : 'Thinking'}{modelName ? ` (${modelName})` : ''}...
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 shrink-0">
          <Message variant="error">{error}</Message>
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
              <MarkdownRenderer>{streamingResult}</MarkdownRenderer>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {!hasMessages && !loading && !error && (
          <p className="text-[#666666] font-manrope py-8 text-center">
            Analysis will appear here after you click Analyze
          </p>
        )}
      </div>

      {showInput && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-white/[0.08] shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            disabled={loading}
            className="flex-1 min-w-0 border bg-[#141414] font-ibm text-white placeholder-[#666666] focus:outline-none focus:ring-1 border-white/[0.08] focus:border-[var(--color-accent-cyan)] focus:ring-[var(--color-accent-cyan)] px-3 py-2 text-sm transition-all duration-200 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            variant="primary"
            size="md"
          >
            Send
          </Button>
        </form>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] border border-[var(--color-accent-cyan)]/30 bg-[var(--color-accent-cyan)]/10 px-3 py-2 text-sm text-white font-manrope">
          {message.content}
        </div>
      </div>
    );
  }

  return <MarkdownRenderer>{message.content}</MarkdownRenderer>;
}
