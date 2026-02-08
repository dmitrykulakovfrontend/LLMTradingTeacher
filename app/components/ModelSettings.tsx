'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MODELS,
  PROVIDERS,
  DEFAULT_MODEL_ID,
  getModel,
  getStorageKey,
  type ModelConfig,
  type Provider,
} from '../lib/models';

interface ModelSettingsProps {
  onSettingsChange: (model: ModelConfig, apiKey: string) => void;
}

interface UsageInfo {
  supported: boolean;
  usage?: number;
  limit?: number | null;
  rateLimit?: string | null;
  keyValid?: boolean;
  error?: string;
}

export default function ModelSettings({ onSettingsChange }: ModelSettingsProps) {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [apiKey, setApiKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const model = getModel(modelId);
  const provider = PROVIDERS[model.provider];

  const notifyParent = useCallback(
    (m: ModelConfig, key: string) => {
      onSettingsChange(m, key);
    },
    [onSettingsChange]
  );

  const fetchUsage = useCallback(async (providerName: string, key: string) => {
    if (!key) {
      setUsage(null);
      return;
    }
    setUsageLoading(true);
    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerName, apiKey: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsage({ supported: false, error: data.error });
      } else {
        setUsage(data);
      }
    } catch {
      setUsage({ supported: false, error: 'Failed to check' });
    }
    setUsageLoading(false);
  }, []);

  // Load saved model + key on mount
  useEffect(() => {
    const savedModelId = localStorage.getItem('llm-selected-model') || DEFAULT_MODEL_ID;
    setModelId(savedModelId);
    const m = getModel(savedModelId);
    const savedKey = localStorage.getItem(getStorageKey(m.provider)) || '';
    setApiKey(savedKey);
    notifyParent(m, savedKey);
    if (savedKey) fetchUsage(m.provider, savedKey);
  }, [notifyParent, fetchUsage]);

  const handleModelChange = (newModelId: string) => {
    setModelId(newModelId);
    localStorage.setItem('llm-selected-model', newModelId);
    const m = getModel(newModelId);
    const savedKey = localStorage.getItem(getStorageKey(m.provider)) || '';
    setApiKey(savedKey);
    setVisible(false);
    setUsage(null);
    notifyParent(m, savedKey);
    if (savedKey) fetchUsage(m.provider, savedKey);
  };

  const handleKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem(getStorageKey(model.provider), value);
    notifyParent(model, value);
    setUsage(null);
  };

  const handleCheckUsage = () => {
    if (apiKey) fetchUsage(model.provider, apiKey);
  };

  // Group models by provider for the dropdown
  const grouped = MODELS.reduce(
    (acc, m) => {
      const p = m.provider;
      if (!acc[p]) acc[p] = [];
      acc[p].push(m);
      return acc;
    },
    {} as Record<Provider, ModelConfig[]>
  );

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          AI Model
        </label>
        <select
          value={modelId}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.entries(grouped).map(([providerKey, models]) => (
            <optgroup key={providerKey} label={PROVIDERS[providerKey as Provider].name}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {provider.name} API Key
        </label>
        <div className="flex gap-2">
          <input
            type={visible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder={provider.placeholder}
            className="flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="shrink-0 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {apiKey ? 'Key saved to browser' : `Get a key at ${provider.url}`}
          </p>
          {apiKey && (
            <button
              type="button"
              onClick={handleCheckUsage}
              disabled={usageLoading}
              className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50"
            >
              {usageLoading ? 'Checking...' : 'Check usage'}
            </button>
          )}
        </div>
      </div>

      {usage && (
        <UsageDisplay info={usage} providerName={model.provider} />
      )}
    </div>
  );
}

function UsageDisplay({ info, providerName }: { info: UsageInfo; providerName: string }) {
  if (info.error) {
    return (
      <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
        {info.error}
      </div>
    );
  }

  if (info.supported && info.usage !== undefined) {
    const used = info.usage;
    const limit = info.limit;
    const pct = limit ? Math.min((used / limit) * 100, 100) : null;

    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Credits used</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            ${used.toFixed(2)}{limit ? ` / $${limit.toFixed(2)}` : ''}
          </span>
        </div>
        {pct !== null && (
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {limit && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ${(limit - used).toFixed(2)} remaining
          </p>
        )}
        {info.rateLimit && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rate limit: {info.rateLimit}
          </p>
        )}
      </div>
    );
  }

  if (info.keyValid) {
    return (
      <div className="rounded-md border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-xs text-green-600 dark:text-green-400">
        Key valid &mdash; usage tracking not available for {PROVIDERS[providerName as Provider]?.name ?? providerName}
      </div>
    );
  }

  return null;
}
