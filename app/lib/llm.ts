import type { ModelConfig } from './models';

const ERROR_PREFIX = '__ERROR__:';

export async function analyzeChart(
  model: ModelConfig,
  apiKey: string,
  prompt: string,
  onChunk: (text: string) => void
): Promise<void> {
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

  // Non-streaming error (bad request, missing fields, etc.)
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Analysis failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    accumulated += chunk;

    // Check if the stream started with an error sentinel
    if (accumulated.startsWith(ERROR_PREFIX)) {
      // Wait for stream to finish so we get the full error message
      continue;
    }

    onChunk(chunk);
  }

  // After stream ends, check if the entire response was an error
  if (accumulated.startsWith(ERROR_PREFIX)) {
    throw new Error(accumulated.slice(ERROR_PREFIX.length));
  }

  if (!accumulated) {
    throw new Error('No analysis generated.');
  }
}
