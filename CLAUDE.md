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

## Design System

**Aesthetic:** "Terminal Precision" - Aviation-inspired geometric precision with monospaced data displays and neon accents on deep black.

**Typography:**
- Headers/Labels: Chakra Petch (geometric, distinctive)
- Numbers/Data: IBM Plex Mono (professional monospace for precision)
- Body Text: Manrope (refined, readable)

**Colors (CSS variables in globals.css):**
- Base: `--color-bg-primary` (#0a0a0a)
- Surfaces: `--color-bg-elevated` (#1a1a1a), `--color-bg-surface` (#141414)
- Gains: `--color-gain` (#00ff88) with glow effects
- Losses: `--color-loss` (#ff0055) with glow effects
- Accent: `--color-accent-cyan` (#00d9ff)
- Text: `--color-text-primary` (white), `--color-text-secondary` (#a0a0a0), `--color-text-muted` (#666666)

## Component Library

**Shared UI (`app/components/ui/`):**
- **Spinner**: Loading indicators with size variants (xs, sm, md, lg)
- **Button**: Primary (cyan), secondary (border), ghost, danger variants with loading state
- **Message**: Error/warning/success/info message boxes with semantic colors
- **CopyButton**: Clipboard copy with state management, accepts any data type
- **TextInput**: Standardized form inputs with label, error, helper text support
- **MarkdownRenderer**: Pre-configured Markdown with math support for AI responses

**Widget Components (`app/components/widgets/`):**
- **Widget**: Standardized container with header, loading, error states, optional collapsible
- **PortfolioXRay**: Portfolio exposure analyzer that flattens ETF holdings to reveal actual company exposure with concentration warnings
- **EtfOverlap**: Compare multiple ETFs to find overlapping holdings
- **Chart**: Candlestick chart with lightweight-charts (dynamically imported)
- **MarketClock**: Live market hours display for major exchanges
- **PdfUpload**: PDF document uploader with text extraction
- **JsonView**: Enhanced JSON viewer with collapsible nodes
- **DebugData**: Debug panel for exploring fundamentals data

**Utilities:**
- `app/api/utils/api-helpers.ts`: sanitizeSymbol, parseJsonBody, errorResponse, validateRequired, withErrorHandling
- `app/lib/formatters.ts`: formatDollar, formatPercent, formatRatio, formatPrice, formatCompact, formatNumber
- `app/lib/portfolioXRay.ts`: calculatePortfolioExposure, generateWarnings (for Portfolio X-Ray feature)
- `app/lib/etfOverlap.ts`: computeEtfOverlap (for ETF overlap comparison)

## yahoo-finance2 Notes

IMPORTANT: The `incomeStatementHistory`, `balanceSheetHistory`, `cashflowStatementHistory` quoteSummary modules are deprecated since Nov 2024. Use `fundamentalsTimeSeries` instead. The `financialData`, `defaultKeyStatistics`, `quoteType`, `summaryProfile`, `topHoldings` modules still work.

## Portfolio X-Ray Feature

**Purpose:** Reveals actual exposure to underlying companies by "flattening" ETF holdings. Users input portfolio holdings (ETFs + stocks with % allocations), and the tool calculates real exposure accounting for ETF overlap.

**Key Components:**
- `app/components/widgets/PortfolioXRay.tsx` — Main widget (self-contained with localStorage persistence)
- `app/lib/portfolioXRay.ts` — Calculation logic (calculatePortfolioExposure, generateWarnings)
- `app/api/etf-holdings/route.ts` — Reused API endpoint for fetching ETF holdings via yahoo-finance2

**Calculation Logic:**
1. For each ETF in portfolio: fetch top holdings, multiply ETF allocation × holding weight
2. For each direct stock: add allocation directly
3. Sum all contributions to each company
4. Generate concentration warnings (>15% single stock, >40% top 5)

**Warning Thresholds:**
- High severity: Single company >15% total exposure
- Medium severity: Top 5 companies >40% combined
- Low severity: Portfolio allocations ≠100%

**Storage:** Portfolio saved to localStorage for persistence between sessions.

## Code Style

- Double quotes, trailing commas
- Use font utility classes: `.font-chakra` (headers), `.font-ibm` (numbers), `.font-manrope` (body)
- Use shared UI components from `app/components/ui/` instead of inline patterns
- Widget components should use `<Widget>` wrapper for consistent styling
- Format numbers using `app/lib/formatters` (formatDollar, formatPercent, etc.)
- API routes use helpers from `app/api/utils/api-helpers` for validation/errors
- Input sanitization: use `sanitizeSymbol()` from api-helpers
- API errors: use `errorResponse()` from api-helpers
- Use CSS variables for colors (e.g., `text-[var(--color-gain)]`)
- Apply grid background with `.widget-grid-bg` class
- Glow effects on live data: `.glow-gain`, `.glow-loss`
- Dark mode classes always paired: `bg-white dark:bg-gray-800`, `text-gray-900 dark:text-gray-100`
- Collapsible sections use the `<Collapseable>` component (note: intentional spelling)

## Creating New Widgets

1. Create component in `app/components/widgets/[WidgetName].tsx`
2. Use `<Widget>` wrapper for container with header, loading, error handling:
   ```tsx
   <Widget
     title="Widget Title"
     subtitle="Optional description"
     loading={isLoading}
     error={error}
     collapsible={true}
   >
     {/* widget content */}
   </Widget>
   ```
3. Use shared UI components (Button, TextInput, Message, etc.)
4. Use formatters from `app/lib/formatters` for numbers
5. Apply Terminal Precision aesthetic:
   - Monospaced fonts for data (`.font-ibm`)
   - Geometric fonts for headers (`.font-chakra`)
   - Grid backgrounds (`.widget-grid-bg`)
   - Glow effects on important values (`.glow-gain`, `.glow-loss`)
   - Cyan accent color for highlights
6. Follow existing patterns in PortfolioXRay, EtfOverlap, and other widgets
7. Self-contained: manage own hooks, state, API calls
8. Support dark mode (already handled by CSS variables)
9. Responsive design with Tailwind breakpoints

## Key Types (app/lib/types.ts)

- `CandleData`, `StockQuery` — chart data
- `FmpFundamentalsResponse` → `FundamentalsData` — fundamentals pipeline
- `EtfHoldingsResponse`, `EtfOverlapResult` — ETF overlap feature
- `PortfolioHolding`, `ExposureBreakdown`, `PortfolioXRayResult`, `ConcentrationWarning` — Portfolio X-Ray feature
- `Timeframe`, `Interval` — time range/interval unions
