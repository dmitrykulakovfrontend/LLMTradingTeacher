import { NextRequest, NextResponse } from 'next/server';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

async function fmpFetch(path: string, apiKey: string): Promise<unknown> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${FMP_BASE}${path}${separator}apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP returned ${res.status}`);
  }
  return res.json();
}

export async function POST(request: NextRequest) {
  let body: { symbol?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { symbol, apiKey } = body;

  if (!symbol || !apiKey) {
    return NextResponse.json({ error: 'symbol and apiKey are required' }, { status: 400 });
  }

  const sanitized = symbol.replace(/[^a-zA-Z0-9.\-^]/g, '');
  if (!sanitized) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  const sym = encodeURIComponent(sanitized);

  try {
    const [incomeRes, balanceRes, cashflowRes, quoteRes] = await Promise.allSettled([
      fmpFetch(`/income-statement?symbol=${sym}&period=annual&limit=2`, apiKey),
      fmpFetch(`/balance-sheet-statement?symbol=${sym}&period=annual&limit=1`, apiKey),
      fmpFetch(`/cashflow-statement?symbol=${sym}&period=annual&limit=1`, apiKey),
      fmpFetch(`/quote?symbol=${sym}`, apiKey),
    ]);

    const income = incomeRes.status === 'fulfilled' ? incomeRes.value : [];
    const balance = balanceRes.status === 'fulfilled' ? balanceRes.value : [];
    const cashflow = cashflowRes.status === 'fulfilled' ? cashflowRes.value : [];
    const quote = quoteRes.status === 'fulfilled' ? quoteRes.value : [];

    // Check if we got any data at all
    const allEmpty =
      (Array.isArray(income) && income.length === 0) &&
      (Array.isArray(balance) && balance.length === 0) &&
      (Array.isArray(cashflow) && cashflow.length === 0) &&
      (Array.isArray(quote) && quote.length === 0);

    if (allEmpty) {
      // Check if it's an auth error by looking at rejected reasons
      const firstError = [incomeRes, balanceRes, cashflowRes, quoteRes]
        .find((r) => r.status === 'rejected');
      const errMsg = firstError?.status === 'rejected'
        ? firstError.reason?.message || 'No data returned'
        : 'No fundamental data found for this symbol';
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }

    return NextResponse.json({ income, balance, cashflow, quote });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch fundamental data from FMP' },
      { status: 500 }
    );
  }
}
