# Stock Pattern Analyzer

Next.js 16 app (App Router) for stock analysis with AI. TypeScript, Tailwind CSS, dark mode.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (also runs TypeScript checks)
- No test suite configured

## Tech Stack

- **Framework**: Next.js 16 (App Router, `"use client"` components)
- **Data**: yahoo-finance2 v3.13.0 (server-side only, in API routes)
- **State**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with `dark:` prefix for dark mode
- **Charts**: lightweight-charts (dynamically imported, no SSR)

## Architecture

- **API routes** (`app/api/`): Server-side, `export const runtime = "nodejs"`, instantiate `new YahooFinance()` at module scope. Use `Promise.allSettled` for parallel fetches with partial failure tolerance.
- **Client fetch libs** (`app/lib/`): Thin wrappers that call API routes and return typed data.
- **React Query hooks** (`app/hooks/`): `useQuery` with 2-5 min stale times, `placeholderData: (prev) => prev`.
- **Components** (`app/components/`): Receive data as props from page.tsx. Self-contained components (like EtfOverlap) manage their own hooks.
- **Page** (`app/page.tsx`): 3-column responsive grid. State lifted here, passed to components.

## yahoo-finance2 Notes

IMPORTANT: The `incomeStatementHistory`, `balanceSheetHistory`, `cashflowStatementHistory` quoteSummary modules are deprecated since Nov 2024. Use `fundamentalsTimeSeries` instead. The `financialData`, `defaultKeyStatistics`, `quoteType`, `summaryProfile`, `topHoldings` modules still work.

## Code Style

- Double quotes, trailing commas
- Input sanitization: `symbol.replace(/[^a-zA-Z0-9.\-^]/g, "")`
- API errors: return `NextResponse.json({ error: message }, { status: code })`
- Dark mode classes always paired: `bg-white dark:bg-gray-800`, `text-gray-900 dark:text-gray-100`
- Collapsible sections use the `<Collapseable>` component (note: intentional spelling)

## Key Types (app/lib/types.ts)

- `CandleData`, `StockQuery` — chart data
- `FmpFundamentalsResponse` → `FundamentalsData` — fundamentals pipeline
- `EtfHoldingsResponse`, `EtfOverlapResult` — ETF overlap feature
- `Timeframe`, `Interval` — time range/interval unions
