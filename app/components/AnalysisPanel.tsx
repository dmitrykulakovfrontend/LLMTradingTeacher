'use client';

import Markdown from 'react-markdown';
import type { AnalysisState } from '../lib/types';

interface AnalysisPanelProps {
  state: AnalysisState;
  modelName?: string;
}

export default function AnalysisPanel({ state, modelName }: AnalysisPanelProps) {
  const hasContent = !!state.result;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">AI Analysis</h2>
        {state.loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {hasContent ? 'Streaming' : 'Thinking'}{modelName ? ` (${modelName})` : ''}...
          </div>
        )}
      </div>

      {state.error && (
        <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300 mb-3">
          {state.error}
        </div>
      )}

      {hasContent && (
        <div className="analysis-content text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <Markdown>{state.result!}</Markdown>
        </div>
      )}

      {!state.loading && !state.error && !hasContent && (
        <p className="text-gray-400 dark:text-gray-500 py-8 text-center">
          Analysis will appear here after you click Analyze
        </p>
      )}
    </div>
  );
}
