import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface ChatMsg {
  role: string;
  content: string;
}

interface AnalyzeBody {
  provider: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  messages: ChatMsg[];
}

// --- Helpers ---

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function handleUpstreamError(provider: string, status: number): string {
  if (status === 429) return 'Rate limit exceeded. Please wait and try again.';
  if (status === 401) return `Invalid ${provider} API key.`;
  if (status === 402) return `Insufficient ${provider} credits.`;
  if (status === 400 || status === 403) return `Invalid ${provider} API key.`;
  return `${provider} API error: ${status}`;
}

const encoder = new TextEncoder();

/** Parse an SSE stream, extract text deltas via extractText, and write them to the controller. */
async function pipeSSEStream(
  upstream: Response,
  extractText: (parsed: Record<string, unknown>) => string | null,
  controller: ReadableStreamDefaultController
) {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const data = JSON.parse(dataStr);
          const text = extractText(data);
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// --- Provider streaming requests ---

async function streamGemini(
  model: string, apiKey: string, systemPrompt: string, messages: ChatMsg[], controller: ReadableStreamDefaultController
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) throw new Error(handleUpstreamError('Gemini', res.status));

  await pipeSSEStream(res, (data) => {
    const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts;
    return parts?.[0]?.text || null;
  }, controller);
}

async function streamOpenAI(
  model: string, apiKey: string, systemPrompt: string, messages: ChatMsg[], controller: ReadableStreamDefaultController
) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error((errData as { error?: { message?: string } }).error?.message || handleUpstreamError('OpenAI', res.status));
  }

  await pipeSSEStream(res, (data) => {
    return (data as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content || null;
  }, controller);
}

async function streamAnthropic(
  model: string, apiKey: string, systemPrompt: string, messages: ChatMsg[], controller: ReadableStreamDefaultController
) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      max_tokens: 4096,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error((errData as { error?: { message?: string } }).error?.message || handleUpstreamError('Anthropic', res.status));
  }

  await pipeSSEStream(res, (data) => {
    if ((data as { type?: string }).type === 'content_block_delta') {
      return (data as { delta?: { text?: string } }).delta?.text || null;
    }
    return null;
  }, controller);
}

async function streamOpenRouter(
  model: string, apiKey: string, systemPrompt: string, messages: ChatMsg[], controller: ReadableStreamDefaultController
) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error((errData as { error?: { message?: string } }).error?.message || handleUpstreamError('OpenRouter', res.status));
  }

  await pipeSSEStream(res, (data) => {
    return (data as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content || null;
  }, controller);
}

// --- Main handler ---

export async function POST(request: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid request body', 400);
  }

  const { provider, model, apiKey, systemPrompt, messages } = body;

  if (!provider || !model || !apiKey || !systemPrompt || !messages?.length) {
    return errorResponse('Missing required fields', 400);
  }

  const streamFn = {
    gemini: streamGemini,
    openai: streamOpenAI,
    anthropic: streamAnthropic,
    openrouter: streamOpenRouter,
  }[provider];

  if (!streamFn) {
    return errorResponse(`Unknown provider: ${provider}`, 400);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamFn(model, apiKey, systemPrompt, messages, controller);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        controller.enqueue(encoder.encode(`__ERROR__:${message}`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
