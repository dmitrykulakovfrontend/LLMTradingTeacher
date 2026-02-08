import type { ModelConfig } from './models';

export async function analyzeChart(
  model: ModelConfig,
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: model.provider,
      model: model.modelId,
      apiKey,
      prompt,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Analysis failed (${response.status})`);
  }

  return data.result;
}
