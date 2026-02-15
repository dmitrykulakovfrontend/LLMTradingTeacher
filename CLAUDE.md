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
- **TickerSearch**: Autocomplete input for stock/ETF symbols using Yahoo Finance search API. Debounced (300ms, min 2 chars), keyboard navigation, dropdown results. Used in SymbolInput, EtfOverlap, PortfolioXRay

**Widget Components (`app/components/widgets/`):**
- **Widget**: Standardized container with header, loading, error states, optional collapsible
- **PortfolioXRay**: Portfolio exposure analyzer that flattens ETF holdings to reveal actual company exposure with concentration warnings
- **EtfOverlap**: Compare multiple ETFs to find overlapping holdings
- **Chart**: Candlestick chart with lightweight-charts (dynamically imported)
- **MarketClock**: Live market hours display for major exchanges
- **PdfUpload**: PDF document uploader with text extraction
- **JsonView**: Enhanced JSON viewer with collapsible nodes
- **DebugData**: Debug panel for exploring fundamentals data

**Analysis Components (`app/components/`):**
- **MultiAnalystPanel**: Multi-analyst technical analysis with 5 different methodologies and consensus view
- **AnalystSelector**: Analyst selection checkbox UI with Select All/Deselect All
- **AnalystResultSection**: Individual analyst result display with streaming support
- **ConsensusPanel**: Consensus view showing agreement metrics, common patterns, and disagreements
- **TokenCostModal**: Token usage warning modal with cost estimates

**Utilities:**
- `app/api/utils/api-helpers.ts`: sanitizeSymbol, parseJsonBody, errorResponse, validateRequired, withErrorHandling
- `app/lib/formatters.ts`: formatDollar, formatPercent, formatRatio, formatPrice, formatCompact, formatNumber
- `app/lib/portfolioXRay.ts`: calculatePortfolioExposure, generateWarnings (for Portfolio X-Ray feature)
- `app/lib/etfOverlap.ts`: computeEtfOverlap (for ETF overlap comparison)
- `app/lib/analystPrompts.ts`: System prompts for 5 technical analysts (Bulkowski, Murphy, Nison, Pring, Edwards & Magee)
- `app/lib/consensusAnalysis.ts`: extractSignalsFromText, calculateConsensus (for Multi-Analyst feature)

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

## Multi-Analyst Technical Analysis Panel

**Purpose:** Provides multiple technical analysis perspectives simultaneously by running the same chart through 5 different analyst methodologies. Users can select which analysts to consult (1-5) and get a consensus view when multiple analysts are selected.

**The 5 Analysts:**
1. **Thomas Bulkowski** - Chart patterns with statistical probabilities from Encyclopedia of Chart Patterns
2. **John Murphy** - Intermarket analysis & classic TA (Technical Analysis of Financial Markets)
3. **Steve Nison** - Japanese candlestick patterns (Japanese Candlestick Charting Techniques)
4. **Martin Pring** - Momentum and oscillators (Technical Analysis Explained)
5. **Edwards & Magee** - Support/resistance & classic patterns (Technical Analysis of Stock Trends, 1948)

**Key Components:**
- `app/components/MultiAnalystPanel.tsx` — Main panel with tab UI, analyst selection, and orchestration
- `app/components/AnalystSelector.tsx` — Checkbox UI for selecting analysts
- `app/components/AnalystResultSection.tsx` — Individual analyst result display
- `app/components/ConsensusPanel.tsx` — Consensus view showing agreement/disagreement
- `app/components/TokenCostModal.tsx` — Token cost warning modal
- `app/lib/analystPrompts.ts` — System prompts for each analyst methodology
- `app/lib/consensusAnalysis.ts` — Signal extraction and consensus calculation logic
- `app/hooks/useMultiAnalystAnalysis.ts` — Multi-analyst state management with parallel execution

**How It Works:**
1. User selects analysts via checkboxes (default: all 5 selected)
2. Clicks "Analyze" button in MultiAnalystPanel
3. If 2+ analysts selected, shows token cost warning modal (dismissable)
4. Parallel LLM calls execute using `Promise.allSettled` pattern
5. Each analyst streams results independently to their tab
6. Consensus is calculated from completed analyses using keyword/pattern matching
7. Tab UI switches between individual analysts and consensus view

**Consensus Calculation:**
- Extracts sentiment (bullish/bearish/neutral) via keyword matching
- Identifies chart patterns mentioned by each analyst
- Finds patterns mentioned by 2+ analysts (common patterns)
- Calculates agreement percentage based on sentiment distribution
- Generates key agreements and disagreements summaries
- Confidence score considers agreement level, common patterns, and signal alignment

**Agreement Formula:**
- All same sentiment: 100%
- Majority (60%+): 60-80%
- Split evenly: 40-50%
- No clear majority: 30-40%

**Confidence Adjustments:**
- +10% if 3+ common patterns identified
- +10% if support/resistance levels align within 2%
- -20% if contradictory high-confidence signals

**Storage:**
- Selected analysts saved to localStorage (`llm-selected-analysts`)
- Token warning dismissal preference (`llm-token-warning-dismissed`)

**Follow-ups:** Each analyst tab maintains separate conversation history for follow-up questions.

**Token Usage:** Multi-analyst analysis uses ~2000 input tokens + ~2000 output tokens per analyst. Cost warning modal estimates total usage before proceeding.

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
- `AnalystId`, `AnalystConfig`, `AnalystAnalysis`, `ExtractedSignals`, `ConsensusResult` — Multi-Analyst feature
- `TickerSearchResult` — Ticker search autocomplete
- `Timeframe`, `Interval` — time range/interval unions
