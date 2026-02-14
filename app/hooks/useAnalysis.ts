import { useMutation } from '@tanstack/react-query';
import { useState, useRef, useCallback } from 'react';
import { analyzeChart } from '../lib/llm';
import { buildSystemPrompt, buildInitialUserMessage } from '../lib/formatData';
import type { ModelConfig } from '../lib/models';
import type { ChatMessage, CandleData, FundamentalsData } from '../lib/types';

interface AnalysisParams {
  model: ModelConfig;
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
}

export function useAnalysis() {
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);

  const mutation = useMutation({
    mutationFn: async (params: AnalysisParams) => {
      setStreamingText('');
      let assistantText = '';

      await analyzeChart(
        params.model,
        params.apiKey,
        params.systemPrompt,
        params.messages,
        (chunk) => {
          assistantText += chunk;
          setStreamingText((prev) => (prev || '') + chunk);
        },
      );

      return { assistantText, messages: params.messages };
    },
    onSuccess: ({ assistantText, messages: inputMessages }) => {
      const updated = [
        ...inputMessages,
        { role: 'assistant' as const, content: assistantText },
      ];
      messagesRef.current = updated;
      setMessages(updated);
      setStreamingText(null);
    },
  });

  const analyze = useCallback(
    (
      model: ModelConfig,
      apiKey: string,
      systemPrompt: string,
      symbol: string,
      candles: CandleData[],
      fundData: FundamentalsData | null,
    ) => {
      const sysPrompt = systemPrompt || buildSystemPrompt();
      const userMsg: ChatMessage = {
        role: 'user',
        content: buildInitialUserMessage(symbol, candles, fundData),
      };
      const newMessages: ChatMessage[] = [userMsg];
      messagesRef.current = newMessages;
      setMessages(newMessages);

      mutation.mutate({
        model,
        apiKey,
        systemPrompt: sysPrompt,
        messages: newMessages,
      });
    },
    [mutation],
  );

  const followUp = useCallback(
    (model: ModelConfig, apiKey: string, systemPrompt: string, text: string) => {
      const userMsg: ChatMessage = { role: 'user', content: text };
      const fullMessages = [...messagesRef.current, userMsg];
      messagesRef.current = fullMessages;
      setMessages(fullMessages);

      mutation.mutate({
        model,
        apiKey,
        systemPrompt,
        messages: fullMessages,
      });
    },
    [mutation],
  );

  const analyzePdf = useCallback(
    (model: ModelConfig, apiKey: string, pdfText: string, prompt: string) => {
      const sysPrompt =
        "You are a helpful AI assistant. Analyze the provided document and respond to the user's request thoroughly.";
      const userMsg: ChatMessage = {
        role: 'user',
        content: `Here is the document content:\n\n${pdfText}\n\n---\n\n${prompt}`,
      };
      const newMessages: ChatMessage[] = [userMsg];
      messagesRef.current = newMessages;
      setMessages(newMessages);

      mutation.mutate({
        model,
        apiKey,
        systemPrompt: sysPrompt,
        messages: newMessages,
      });
    },
    [mutation],
  );

  const reset = useCallback(() => {
    setStreamingText(null);
    setMessages([]);
    messagesRef.current = [];
    mutation.reset();
  }, [mutation]);

  return {
    messages,
    streamingText,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    analyze,
    followUp,
    analyzePdf,
    reset,
  };
}
