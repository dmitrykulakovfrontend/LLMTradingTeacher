import { NextRequest, NextResponse } from 'next/server';

// Vercel hobby plan defaults to 10s — bump to 60s (requires Pro plan, gracefully ignored on hobby)
export const maxDuration = 60;

interface AnalyzeBody {
  provider: string;
  model: string;
  apiKey: string;
  prompt: string;
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Please wait and try again.');
    if (res.status === 400 || res.status === 403) throw new Error('Invalid Gemini API key.');
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated.';
}

async function callOpenAI(model: string, apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Please wait and try again.');
    if (res.status === 401) throw new Error('Invalid OpenAI API key.');
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No analysis generated.';
}

async function callAnthropic(model: string, apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Please wait and try again.');
    if (res.status === 401) throw new Error('Invalid Anthropic API key.');
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || 'No analysis generated.';
}

async function callOpenRouter(model: string, apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Please wait and try again.');
    if (res.status === 401) throw new Error('Invalid OpenRouter API key.');
    if (res.status === 402) throw new Error('Insufficient OpenRouter credits.');
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `OpenRouter API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No analysis generated.';
}

export async function POST(request: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { provider, model, apiKey, prompt } = body;

  if (!provider || !model || !apiKey || !prompt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    let result: string;
    switch (provider) {
      case 'gemini':
        result = await callGemini(model, apiKey, prompt);
        break;
      case 'openai':
        result = await callOpenAI(model, apiKey, prompt);
        break;
      case 'anthropic':
        result = await callAnthropic(model, apiKey, prompt);
        break;
      case 'openrouter':
        result = await callOpenRouter(model, apiKey, prompt);
        break;
      default:
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
