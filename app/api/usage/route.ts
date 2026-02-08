import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { provider: string; apiKey: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { provider, apiKey } = body;
  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    switch (provider) {
      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          if (res.status === 401) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
          return NextResponse.json({ error: `OpenRouter error: ${res.status}` }, { status: res.status });
        }
        const data = await res.json();
        const usage = data.data?.usage ?? 0;
        const limit = data.data?.limit ?? null;
        const rateLimit = data.data?.rate_limit;
        return NextResponse.json({
          supported: true,
          usage,
          limit,
          rateLimit: rateLimit ? `${rateLimit.requests} req / ${rateLimit.interval}` : null,
        });
      }

      case 'openai': {
        // OpenAI doesn't expose billing via API key alone — validate the key instead
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          if (res.status === 401) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
          return NextResponse.json({ supported: false });
        }
        return NextResponse.json({ supported: false, keyValid: true });
      }

      case 'gemini': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (!res.ok) {
          if (res.status === 400 || res.status === 403) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
          return NextResponse.json({ supported: false });
        }
        return NextResponse.json({ supported: false, keyValid: true });
      }

      case 'anthropic': {
        // Anthropic has no public usage endpoint — just validate the key
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        // 401 = bad key, anything else (including 200/429) = key works
        if (res.status === 401) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        return NextResponse.json({ supported: false, keyValid: true });
      }

      default:
        return NextResponse.json({ supported: false });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 502 });
  }
}
