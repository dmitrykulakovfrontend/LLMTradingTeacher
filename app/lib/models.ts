export type Provider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  modelId: string;
}

export const MODELS: ModelConfig[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', modelId: 'gemini-2.5-flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', modelId: 'gemini-2.5-pro' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', modelId: 'gpt-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', modelId: 'gpt-4o-mini' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' },
  { id: 'or-gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'openrouter', modelId: 'google/gemini-2.5-flash' },
  { id: 'or-gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'openrouter', modelId: 'google/gemini-2.5-pro' },
  { id: 'or-claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'openrouter', modelId: 'anthropic/claude-sonnet-4' },
  { id: 'or-claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'openrouter', modelId: 'anthropic/claude-sonnet-4.5' },
  { id: 'or-gpt-4o', name: 'GPT-4o', provider: 'openrouter', modelId: 'openai/gpt-4o' },
  { id: 'or-gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openrouter', modelId: 'openai/gpt-4o-mini' },
  { id: 'or-deepseek-r1', name: 'DeepSeek R1', provider: 'openrouter', modelId: 'deepseek/deepseek-r1' },
  { id: 'or-deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'openrouter', modelId: 'deepseek/deepseek-v3.2' },
  { id: 'or-llama-4-maverick', name: 'Llama 4 Maverick', provider: 'openrouter', modelId: 'meta-llama/llama-4-maverick' },
];

export const PROVIDERS: Record<Provider, { name: string; placeholder: string; url: string }> = {
  gemini: { name: 'Google Gemini', placeholder: 'Enter Gemini API key', url: 'ai.google.dev' },
  openai: { name: 'OpenAI', placeholder: 'Enter OpenAI API key', url: 'platform.openai.com' },
  anthropic: { name: 'Anthropic', placeholder: 'Enter Anthropic API key', url: 'console.anthropic.com' },
  openrouter: { name: 'OpenRouter', placeholder: 'Enter OpenRouter API key', url: 'openrouter.ai/keys' },
};

export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

export function getModel(id: string): ModelConfig {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

export function getStorageKey(provider: Provider): string {
  return `llm-api-key-${provider}`;
}
