import { useState, useRef, useCallback } from "react";
import { analyzeChart } from "../lib/llm";
import { buildInitialUserMessage } from "../lib/formatData";
import { getAnalyst } from "../lib/analystPrompts";
import type { ModelConfig } from "../lib/models";
import type { ChatMessage, CandleData, FundamentalsData, AnalystId, AnalystAnalysis } from "../lib/types";

/**
 * Hook for managing multi-analyst analysis
 *
 * Handles parallel execution of multiple analyst analyses with independent
 * streaming, loading states, and error handling per analyst.
 */
export function useMultiAnalystAnalysis() {
  const [analyses, setAnalyses] = useState<Map<AnalystId, AnalystAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysesRef = useRef<Map<AnalystId, AnalystAnalysis>>(new Map());

  /**
   * Analyze chart with multiple analysts in parallel
   */
  const analyzeMultiple = useCallback(
    async (
      analystIds: AnalystId[],
      model: ModelConfig,
      apiKey: string,
      symbol: string,
      candles: CandleData[],
      fundData: FundamentalsData | null,
    ) => {
      if (analystIds.length === 0) return;

      setIsAnalyzing(true);

      // Initialize analysis state for each analyst
      const initialAnalyses = new Map<AnalystId, AnalystAnalysis>();
      for (const analystId of analystIds) {
        initialAnalyses.set(analystId, {
          analystId,
          messages: [],
          streamingText: null,
          isLoading: true,
          error: null,
        });
      }

      setAnalyses(new Map(initialAnalyses));
      analysesRef.current = new Map(initialAnalyses);

      // Build the initial user message (same OHLC data for all analysts)
      const userMessage = buildInitialUserMessage(symbol, candles, fundData);

      // Launch parallel analyses using Promise.allSettled
      const analysisPromises = analystIds.map(async (analystId) => {
        try {
          const analyst = getAnalyst(analystId);
          const messages: ChatMessage[] = [
            { role: "user", content: userMessage },
          ];

          let assistantText = "";

          // Stream analysis with real-time updates
          await analyzeChart(
            model,
            apiKey,
            analyst.systemPrompt,
            messages,
            (chunk) => {
              assistantText += chunk;

              // Update streaming text for this analyst
              setAnalyses((prev) => {
                const updated = new Map(prev);
                const current = updated.get(analystId);
                if (current) {
                  updated.set(analystId, {
                    ...current,
                    streamingText: assistantText,
                  });
                }
                return updated;
              });

              analysesRef.current = new Map(analysesRef.current);
              const current = analysesRef.current.get(analystId);
              if (current) {
                analysesRef.current.set(analystId, {
                  ...current,
                  streamingText: assistantText,
                });
              }
            },
          );

          // Analysis complete - finalize this analyst
          const completedMessages: ChatMessage[] = [
            ...messages,
            { role: "assistant", content: assistantText },
          ];

          setAnalyses((prev) => {
            const updated = new Map(prev);
            updated.set(analystId, {
              analystId,
              messages: completedMessages,
              streamingText: null,
              isLoading: false,
              error: null,
            });
            return updated;
          });

          analysesRef.current.set(analystId, {
            analystId,
            messages: completedMessages,
            streamingText: null,
            isLoading: false,
            error: null,
          });

          return { analystId, success: true };
        } catch (error) {
          // Handle error for this analyst
          const errorMessage = error instanceof Error ? error.message : "Analysis failed";

          setAnalyses((prev) => {
            const updated = new Map(prev);
            const current = updated.get(analystId);
            if (current) {
              updated.set(analystId, {
                ...current,
                streamingText: null,
                isLoading: false,
                error: errorMessage,
              });
            }
            return updated;
          });

          analysesRef.current = new Map(analysesRef.current);
          const current = analysesRef.current.get(analystId);
          if (current) {
            analysesRef.current.set(analystId, {
              ...current,
              streamingText: null,
              isLoading: false,
              error: errorMessage,
            });
          }

          return { analystId, success: false, error: errorMessage };
        }
      });

      // Wait for all analyses to complete (or fail)
      await Promise.allSettled(analysisPromises);

      setIsAnalyzing(false);
    },
    [],
  );

  /**
   * Follow up with a specific analyst
   */
  const followUp = useCallback(
    async (
      analystId: AnalystId,
      model: ModelConfig,
      apiKey: string,
      text: string,
    ) => {
      const analysis = analysesRef.current.get(analystId);
      if (!analysis) return;

      const analyst = getAnalyst(analystId);
      const userMsg: ChatMessage = { role: "user", content: text };
      const fullMessages = [...analysis.messages, userMsg];

      // Update messages immediately
      setAnalyses((prev) => {
        const updated = new Map(prev);
        updated.set(analystId, {
          ...analysis,
          messages: fullMessages,
          streamingText: "",
          isLoading: true,
          error: null,
        });
        return updated;
      });

      analysesRef.current.set(analystId, {
        ...analysis,
        messages: fullMessages,
        streamingText: "",
        isLoading: true,
        error: null,
      });

      try {
        let assistantText = "";

        await analyzeChart(
          model,
          apiKey,
          analyst.systemPrompt,
          fullMessages,
          (chunk) => {
            assistantText += chunk;

            setAnalyses((prev) => {
              const updated = new Map(prev);
              const current = updated.get(analystId);
              if (current) {
                updated.set(analystId, {
                  ...current,
                  streamingText: assistantText,
                });
              }
              return updated;
            });

            const current = analysesRef.current.get(analystId);
            if (current) {
              analysesRef.current.set(analystId, {
                ...current,
                streamingText: assistantText,
              });
            }
          },
        );

        // Follow-up complete
        const completedMessages: ChatMessage[] = [
          ...fullMessages,
          { role: "assistant", content: assistantText },
        ];

        setAnalyses((prev) => {
          const updated = new Map(prev);
          updated.set(analystId, {
            analystId,
            messages: completedMessages,
            streamingText: null,
            isLoading: false,
            error: null,
          });
          return updated;
        });

        analysesRef.current.set(analystId, {
          analystId,
          messages: completedMessages,
          streamingText: null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Follow-up failed";

        setAnalyses((prev) => {
          const updated = new Map(prev);
          const current = updated.get(analystId);
          if (current) {
            updated.set(analystId, {
              ...current,
              streamingText: null,
              isLoading: false,
              error: errorMessage,
            });
          }
          return updated;
        });

        const current = analysesRef.current.get(analystId);
        if (current) {
          analysesRef.current.set(analystId, {
            ...current,
            streamingText: null,
            isLoading: false,
            error: errorMessage,
          });
        }
      }
    },
    [],
  );

  /**
   * Reset all analyses
   */
  const reset = useCallback(() => {
    setAnalyses(new Map());
    analysesRef.current = new Map();
    setIsAnalyzing(false);
  }, []);

  /**
   * Get analysis for a specific analyst
   */
  const getAnalysis = useCallback(
    (analystId: AnalystId): AnalystAnalysis | undefined => {
      return analyses.get(analystId);
    },
    [analyses],
  );

  /**
   * Check if any analyst is currently loading
   */
  const isAnyLoading = useCallback(() => {
    return Array.from(analyses.values()).some((a) => a.isLoading);
  }, [analyses]);

  /**
   * Get completed analyses (for consensus calculation)
   */
  const getCompletedAnalyses = useCallback(() => {
    return Array.from(analyses.values()).filter(
      (a) => !a.isLoading && !a.error && a.messages.length > 0,
    );
  }, [analyses]);

  return {
    analyses,
    isAnalyzing,
    analyzeMultiple,
    followUp,
    reset,
    getAnalysis,
    isAnyLoading,
    getCompletedAnalyses,
  };
}
