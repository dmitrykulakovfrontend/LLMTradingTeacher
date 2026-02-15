"use client";

import { useState, useEffect, useMemo } from "react";
import type { ModelConfig } from "../lib/models";
import type { CandleData, FundamentalsData, AnalystId, ConsensusResult } from "../lib/types";
import { DEFAULT_ANALYSTS, getAnalyst } from "../lib/analystPrompts";
import { useMultiAnalystAnalysis } from "../hooks/useMultiAnalystAnalysis";
import { extractSignalsFromText, calculateConsensus } from "../lib/consensusAnalysis";
import AnalystSelector from "./AnalystSelector";
import AnalystResultSection from "./AnalystResultSection";
import ConsensusPanel from "./ConsensusPanel";
import TokenCostModal, { shouldShowTokenWarning } from "./TokenCostModal";
import { Button } from "./ui/Button";
import { Message } from "./ui/Message";

interface MultiAnalystPanelProps {
  symbol: string;
  candles: CandleData[];
  fundamentals: FundamentalsData | null;
  model: ModelConfig | null;
  apiKey: string;
}

export default function MultiAnalystPanel({
  symbol,
  candles,
  fundamentals,
  model,
  apiKey,
}: MultiAnalystPanelProps) {
  // Load selected analysts from localStorage
  const [selectedAnalysts, setSelectedAnalysts] = useState<Set<AnalystId>>(() => {
    if (typeof window === "undefined") return new Set(DEFAULT_ANALYSTS);
    const saved = localStorage.getItem("llm-selected-analysts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      } catch {
        return new Set(DEFAULT_ANALYSTS);
      }
    }
    return new Set(DEFAULT_ANALYSTS);
  });

  // Active tab (consensus or specific analyst ID)
  const [activeTab, setActiveTab] = useState<"consensus" | AnalystId>("consensus");

  // Token warning modal
  const [showTokenWarning, setShowTokenWarning] = useState(false);

  // Multi-analyst analysis hook
  const {
    analyses,
    isAnalyzing,
    analyzeMultiple,
    followUp,
    reset,
    getAnalysis,
    isAnyLoading,
    getCompletedAnalyses,
  } = useMultiAnalystAnalysis();

  // Follow-up input per analyst
  const [followUpInputs, setFollowUpInputs] = useState<Map<AnalystId, string>>(new Map());

  // Save selected analysts to localStorage
  useEffect(() => {
    localStorage.setItem("llm-selected-analysts", JSON.stringify(Array.from(selectedAnalysts)));
  }, [selectedAnalysts]);

  // Calculate consensus from completed analyses
  const consensus: ConsensusResult | null = useMemo(() => {
    const completedAnalyses = getCompletedAnalyses();
    if (completedAnalyses.length < 2) return null;

    // Extract signals from each analyst's response
    const signals = completedAnalyses.map((analysis) => {
      // Get the assistant's last message
      const assistantMessages = analysis.messages.filter((m) => m.role === "assistant");
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const text = lastMessage?.content || "";

      return extractSignalsFromText(analysis.analystId, text);
    });

    return calculateConsensus(signals);
  }, [getCompletedAnalyses]);

  // Handle analyze button click
  const handleAnalyze = () => {
    if (!model || !apiKey || selectedAnalysts.size === 0 || candles.length === 0) {
      return;
    }

    // Show token warning for multi-analyst (2+) if not dismissed
    if (selectedAnalysts.size >= 2 && shouldShowTokenWarning()) {
      setShowTokenWarning(true);
      return;
    }

    startAnalysis();
  };

  // Start the actual analysis
  const startAnalysis = () => {
    if (!model || !apiKey) return;

    reset();
    const analystIds = Array.from(selectedAnalysts);
    analyzeMultiple(analystIds, model, apiKey, symbol, candles, fundamentals);

    // Set active tab to first analyst or consensus
    if (selectedAnalysts.size >= 2) {
      setActiveTab("consensus");
    } else if (selectedAnalysts.size === 1) {
      setActiveTab(analystIds[0]);
    }
  };

  // Handle follow-up for specific analyst
  const handleFollowUp = (analystId: AnalystId) => {
    const input = followUpInputs.get(analystId);
    if (!input || !input.trim() || !model || !apiKey) return;

    followUp(analystId, model, apiKey, input.trim());

    // Clear input
    setFollowUpInputs((prev) => {
      const updated = new Map(prev);
      updated.set(analystId, "");
      return updated;
    });
  };

  // Update follow-up input
  const setFollowUpInput = (analystId: AnalystId, value: string) => {
    setFollowUpInputs((prev) => {
      const updated = new Map(prev);
      updated.set(analystId, value);
      return updated;
    });
  };

  // Get loading analysts for selector
  const loadingAnalysts = useMemo(() => {
    const loading = new Set<AnalystId>();
    for (const [id, analysis] of analyses.entries()) {
      if (analysis.isLoading) {
        loading.add(id);
      }
    }
    return loading;
  }, [analyses]);

  // Check if we can analyze
  const canAnalyze = model && apiKey && selectedAnalysts.size > 0 && candles.length > 0 && !isAnalyzing;

  const hasAnalyses = analyses.size > 0;
  const showConsensusTab = selectedAnalysts.size >= 2;

  return (
    <div className="widget-grid-bg border border-white/[0.08] xl:border-0 bg-[#141414] p-3 sm:p-4 flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0 border-b border-white/[0.08] pb-3">
        <h2 className="font-chakra text-lg font-bold text-white tracking-wider uppercase">
          Multi-Analyst Analysis
        </h2>
        {model && (
          <span className="font-manrope text-xs text-[#666666]">{model.name}</span>
        )}
      </div>

      {/* Analyst Selection */}
      <div className="mb-4 shrink-0">
        <AnalystSelector
          selectedAnalysts={selectedAnalysts}
          onChange={setSelectedAnalysts}
          disabled={isAnalyzing}
          loadingAnalysts={loadingAnalysts}
        />
      </div>

      {/* Analyze Button */}
      <div className="mb-4 shrink-0">
        <Button
          variant="primary"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          loading={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing
            ? "Analyzing..."
            : `Analyze with ${selectedAnalysts.size} Analyst${selectedAnalysts.size !== 1 ? "s" : ""}`}
        </Button>
      </div>

      {/* Validation Messages */}
      {!model && (
        <div className="mb-3 shrink-0">
          <Message variant="warning">Please select a model in the settings.</Message>
        </div>
      )}
      {!apiKey && model && (
        <div className="mb-3 shrink-0">
          <Message variant="warning">
            Please enter an API key for {model.provider} in the settings.
          </Message>
        </div>
      )}
      {selectedAnalysts.size === 0 && (
        <div className="mb-3 shrink-0">
          <Message variant="info">Select at least one analyst to begin.</Message>
        </div>
      )}

      {/* Tabs */}
      {hasAnalyses && (
        <div className="flex gap-2 border-b border-white/[0.08] mb-4 shrink-0 overflow-x-auto">
          {showConsensusTab && (
            <TabButton
              active={activeTab === "consensus"}
              onClick={() => setActiveTab("consensus")}
            >
              Consensus
            </TabButton>
          )}
          {Array.from(selectedAnalysts).map((analystId) => {
            const analyst = getAnalyst(analystId);
            return (
              <TabButton
                key={analystId}
                active={activeTab === analystId}
                onClick={() => setActiveTab(analystId)}
              >
                {analyst.name.split(" ")[1] || analyst.name}
              </TabButton>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!hasAnalyses && (
          <div className="py-8 text-center">
            <p className="text-[#666666] font-manrope">
              Select analysts and click Analyze to begin
            </p>
          </div>
        )}

        {hasAnalyses && activeTab === "consensus" && showConsensusTab && (
          <ConsensusPanel consensus={consensus} loading={isAnyLoading()} />
        )}

        {hasAnalyses && activeTab !== "consensus" && (
          <AnalystTabContent
            analystId={activeTab as AnalystId}
            analysis={getAnalysis(activeTab as AnalystId)}
            followUpInput={followUpInputs.get(activeTab as AnalystId) || ""}
            onFollowUpChange={(value) => setFollowUpInput(activeTab as AnalystId, value)}
            onFollowUpSubmit={() => handleFollowUp(activeTab as AnalystId)}
          />
        )}
      </div>

      {/* Token Warning Modal */}
      {showTokenWarning && (
        <TokenCostModal
          analystCount={selectedAnalysts.size}
          onConfirm={() => {
            setShowTokenWarning(false);
            startAnalysis();
          }}
          onCancel={() => setShowTokenWarning(false)}
        />
      )}
    </div>
  );
}

// Tab button component
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        font-chakra text-sm font-bold tracking-wider uppercase px-4 py-2 border-b-2 transition-colors whitespace-nowrap
        ${active
          ? "border-[var(--color-accent-cyan)] text-white"
          : "border-transparent text-[#666666] hover:text-white"
        }
      `}
    >
      {children}
    </button>
  );
}

// Analyst tab content (result + follow-up)
function AnalystTabContent({
  analystId,
  analysis,
  followUpInput,
  onFollowUpChange,
  onFollowUpSubmit,
}: {
  analystId: AnalystId;
  analysis: any;
  followUpInput: string;
  onFollowUpChange: (value: string) => void;
  onFollowUpSubmit: () => void;
}) {
  if (!analysis) return null;

  const analyst = getAnalyst(analystId);
  const hasCompletedAnalysis = analysis.messages.some((m: any) => m.role === "assistant");
  const showFollowUpInput = hasCompletedAnalysis || analysis.isLoading;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 min-h-0">
        <AnalystResultSection
          analyst={analyst}
          messages={analysis.messages}
          streamingText={analysis.streamingText}
          loading={analysis.isLoading}
          error={analysis.error}
        />
      </div>

      {showFollowUpInput && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onFollowUpSubmit();
          }}
          className="flex gap-2 pt-3 border-t border-white/[0.08] shrink-0 mt-3"
        >
          <input
            type="text"
            value={followUpInput}
            onChange={(e) => onFollowUpChange(e.target.value)}
            placeholder={`Ask ${analyst.name.split(" ")[1] || analyst.name} a follow-up...`}
            disabled={analysis.isLoading}
            className="flex-1 min-w-0 border bg-[#141414] font-ibm text-white placeholder-[#666666] focus:outline-none focus:ring-1 border-white/[0.08] focus:border-[var(--color-accent-cyan)] focus:ring-[var(--color-accent-cyan)] px-3 py-2 text-sm transition-all duration-200 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={analysis.isLoading || !followUpInput.trim()}
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
