"use client";

import { useRef, useEffect } from "react";
import type { AnalystConfig, ChatMessage } from "../lib/types";
import { Spinner } from "./ui/Spinner";
import { Message } from "./ui/Message";
import { MarkdownRenderer } from "./ui/MarkdownRenderer";

interface AnalystResultSectionProps {
  analyst: AnalystConfig;
  messages: ChatMessage[];
  streamingText: string | null;
  loading: boolean;
  error: string | null;
}

export default function AnalystResultSection({
  analyst,
  messages,
  streamingText,
  loading,
  error,
}: AnalystResultSectionProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;
  const hasStreaming = !!streamingText;

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingText]);

  // Determine which messages are finalized
  const completedMessages = messages;
  const isStreamingNewMessage = loading && hasStreaming;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.08] shrink-0">
        <div>
          <h3 className="font-chakra text-base font-bold text-white tracking-wider">
            {analyst.name}
          </h3>
          <p className="font-manrope text-xs text-[#666666] mt-0.5">
            {analyst.description}
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#666666] font-manrope">
            <Spinner size="sm" />
            {hasStreaming ? "Streaming" : "Thinking"}...
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-3 shrink-0">
          <Message variant="error">{error}</Message>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {hasMessages && (
          <div className="space-y-4 mb-3">
            {/* Skip the first user message (raw OHLC data) - only show follow-up user messages */}
            {completedMessages.map((msg, i) => {
              if (i === 0 && msg.role === "user") return null;
              return <MessageBubble key={i} message={msg} />;
            })}

            {/* Streaming assistant response (not yet in messages array) */}
            {isStreamingNewMessage && (
              <MarkdownRenderer>{streamingText}</MarkdownRenderer>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {!hasMessages && !loading && !error && (
          <p className="text-[#666666] font-manrope py-8 text-center">
            {analyst.name}'s analysis will appear here
          </p>
        )}

        {loading && !hasStreaming && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Spinner size="lg" />
            <p className="text-[#666666] font-manrope text-sm">
              {analyst.name} is analyzing the chart...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
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
