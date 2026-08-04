# KiteView

**A soaring view of the markets** — Indian stock analysis, watchlists, and cloud-synced portfolio tracking built with React, TypeScript, Yahoo Finance data, and Supabase Auth.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4) ![Vite](https://img.shields.io/badge/Vite-5-646CFF) ![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black)

---

## Table of Contents

- [Features](#features)
  - [Overview](#1-overview)
  - [Live Screener](#2-live-screener)
  - [Market Heatmap](#3-market-heatmap)
  - [Stock Analysis](#4-stock-analysis)
  - [Stock Comparison](#5-stock-comparison)
  - [Portfolio Management](#6-portfolio-management)
  - [Watchlist](#7-watchlist)
  - [Indices](#8-indices)
  - [About](#9-about)
  - [Dark Mode & Layout](#10-dark-mode--layout)
  - [Authentication & Cloud Sync](#11-authentication--cloud-sync)
- [Technical Architecture](#technical-architecture)
- [Project Structure](#project-structure)
- [Routes](#routes)
- [API Endpoints](#api-endpoints)
- [Pattern Detection Logic](#pattern-detection-logic)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Key Design Decisions](#key-design-decisions)

---

## Features

### 1. Overview

Landing page with quick navigation into every major tool.

- Clickable tool cards (whole card navigates) with animated previews for Screener, Heatmap, Indices, Stock Analysis, Compare, Watchlist, Portfolio, and About
- Lightweight animated previews (respects `prefers-reduced-motion`)
- Flat, minimal UI using shared design tokens

### 2. Live Screener

Scans the NSE universe for breakout stocks with filter-first controls.

- **Today** mode: patterns on the latest trading session
- **Date range** mode: historical scan — finds the latest breakout whose pattern date falls in your selected window (up to 365 days)
- **Single-row scan controls** with compact dropdown filters and Scan/Reset actions below the filter rail
- **Filter-based scan**: index, pattern, market cap range (Cr), and price range
- **Multi-select filters**: index and pattern
- **Signal** column: **BUY** when CMP is within 2% of buy price (`0.98 ×` breakout close); otherwise **WAIT**
- Server-side filter-aware scanning; **#** row index plus signal, pattern date, CMP, % vs buy price (green/red), buy price, Dist Low, Dist High, Dist ATH, market cap, **SWOT (S/W/O/T)**, **+ Watchlist**
- Click a row to open **Stock Analysis** (`/analysis?symbol=…`)

### 3. Market Heatmap

Treemap of NSE stocks sized by market cap and colored by performance.

- Custom squarified treemap (no external treemap library)
- Tiles show **company name** (when space allows), change %, and price on larger cells
- Timeframes: **1D**, **1W**, **1M**, **1Y**
- Selected index quote is shown inline in the filters row and updates with index/timeframe changes
- Color scale: red (down) → gray (flat) → green (up)
- Sector filter; click a tile to jump to **Stock Analysis** (`/analysis?symbol=…`)
- Batch quote loading via `/api/heatmap-batch`

### 4. Stock Analysis

Research any Yahoo-listed equity (NSE, BSE, US, and other exchanges) with always-on sections and a conditional breakout panel.

- Symbol autocomplete (global Yahoo Finance search); resolves tickers via `/api/resolve-symbol`; **shareable URL** `/analysis?symbol=AAPL` or `/analysis?symbol=TCS.NS` (`/lookup?symbol=` redirects for old links)
- **Instrument strip**: name, symbol, CMP, Rescan, Compare, **Copy link**, **Open on Yahoo**, **+ Watchlist**
- **Overview**: session snapshot, key stats, 52W range, ATH, cap tier, sector
- **SWOT**: embedded Trendlyne SWOT widget (updates per symbol)
- **Technicals**: % from 52W high/low, range position, 50-day SMA, RSI (14), **1Y price chart**
- **Last 5 quarters P&L** — Total Revenue, Pretax Income, Net Income, Basic EPS with green/red vs oldest quarter, and **DVM scorecard** (Durability / Valuation / Momentum, rule-based 0–100)
- **Company profile**, **financial highlights**, **analyst recommendations**, **recent news** (Yahoo `quoteSummary` modules via analysis bundle)
- **Quarterly results** table: INR (Cr/L) for NSE/BSE; USD (K/M/B/T) for global symbols
- **Breakout panel** (right column on desktop): only when a qualifying breakout is detected — pattern chart, buy/trigger, **BUY/WAIT signal** (BUY when CMP within 2% of buy price), stop-loss, quantity table
- **No pattern**: compact callout + link to Screener; analysis sections still shown
- Buy price = `0.98 ×` breakout close; buy trigger = `0.985 ×` breakout close; **BUY** when `CMP ≤ buy price × 1.02`

### 5. Stock Comparison

Dedicated page to compare up to four stocks (not embedded in Stock Analysis).

- Chip-based symbol search with autocomplete
- Normalized return chart (Recharts) with ranges **1M**, **3M**, **6M**, **1Y**
- Optional benchmark overlay: Nifty 50 or Sensex
- Comparison table: CMP, market cap, P/E, forward P/E, P/B, beta, 52W change, sector
- Best/worst highlighting per metric row
- Deep links via `/compare?symbol=TCS.NS` (e.g. from Stock Analysis or Screener)

### 6. Portfolio Management

Transaction-based portfolio tracker with analytics.

- **Transactions**: BUY/SELL with qty, price, date
- **Import**: `.csv` only (native parser; no spreadsheet dependency)
- **Positions**: avg buy, SWOT S/W/O/T, qty, invested, live value, P&L (₹ and %)
- **Live prices**: batch quotes for all holdings
- **Sortable** positions table with **#** row index; expanded row shows numbered transaction history
- **Performance chart**: portfolio vs Nifty 50, Bank Nifty, Midcap 50, Nifty 200 (normalized or absolute; 1M–ALL)
- **Risk dashboard**: HHI diversification, beta, volatility, Sharpe, max drawdown, sector/stock/market-cap allocation donuts (click a cap slice to see holdings)
- Sign-in required; portfolio is persisted per user in Supabase and available across browsers
- In-app delete confirmation modal instead of browser `confirm()` for full portfolio deletion

### 7. Watchlist

Research lists with live snapshots and optional browser alerts.

- SWOT values are now enriched client-side as a fallback when Trendlyne cannot be reached from the server, so Screener and Watchlist remain populated in dev and production.

- **Multiple lists**: create, rename, delete; default list on first visit
- **Add from Analysis or Screener**: seeds entry buy price and pattern date when a breakout is present
- **Live table** via `POST /api/watchlist-snapshot`: **#** row index, CMP, BUY/WAIT, buy price, pattern date, SWOT S/W
- **Thesis panel** per row: note, target/stop, entry buy price, pattern date; alert toggles (BUY window, SWOT flip, pattern today)
- **Refresh** on load, manual button, and every 5 minutes while the tab is visible
- **Browser notifications** when alerts fire on refresh (optional; requires permission)
- Sign-in required; watchlists are persisted per user in Supabase and available across browsers

### 8. Indices

Live benchmark dashboard grouped by asset class (Yahoo Finance quotes, 15s refresh).

- **Indian / Global**: click a card to open **Market Heatmap** with **official index constituents** (not Yahoo’s ~30-component subset)
- **Constituent sources**: [Nifty Indices](https://www.niftyindices.com) CSVs (Indian), GitHub S&P 500 dataset (US), Wikipedia tables (Dow, Nasdaq 100, FTSE, DAX, CAC, ASX, Sensex). **Yahoo Finance** is used only for live quotes/market cap on heatmap tiles
- **Approximate indices**: Nikkei 225, Hang Seng, Russell 2000, KOSPI — labeled “approx” (regional cap-ranked proxy until a free full list is wired)
- **Refresh bundled lists**: `npm run refresh-constituents` → writes `data/constituents/*.json` (commit after refresh)
- **Heatmap index picker**: grouped **Indian** and **Global** filters; S&P 500, Dow, Nasdaq 100, FTSE, DAX, Nikkei, Hang Seng, sector indices (Bank Nifty, IT, …), and NSE cap slices
- **Forex**: USD/INR, EUR/USD, GBP/USD, USD/JPY
- **Commodity**: Gold, silver, crude, natural gas (COMEX futures via Yahoo)
- **Crypto**: Bitcoin, Ethereum
- Gift Nifty omitted (no Yahoo ticker; NSE IX futures out of scope)

### 9. About

Author profile, investing philosophy, and linked P&L proof spreadsheets.

### 10. Dark Mode & Layout

- **Theme**: Light / dark toggle on the sidebar (class-based, persisted in `localStorage`)
- **Shell**: Collapsible sidebar, mobile slide-out drawer, top **market ticker** (Indian indices, S&P 500, gold, silver, USD/INR) with **marquee scroll** when the bar overflows (1s delay on tab load; pauses on hover; respects reduced motion)
- **Routing**: Each page has its own URL (React Router); sidebar uses links so refresh and share work
- **Persistent pages**: Visited routes stay mounted when you navigate away — scan results, analysis, compare symbols, heatmap filters, and scroll position are kept until you refresh the tab
- **Responsive**: `max-w-7xl` content, horizontal scroll on wide tables, sticky first column where needed

### 11. Authentication & Cloud Sync

Supabase-backed auth and per-user data storage make portfolio and watchlist browser-independent.

- Login methods: **email/password**, **magic link**, and **Google OAuth**
- Portfolio and watchlists are stored as user-owned JSON documents in Supabase with **Row Level Security (RLS)**
- Portfolio and Watchlist pages are gated behind login; the sidebar exposes **Sign In** / **Sign Out**
- Theme preference remains local to the browser; browser notification permission remains browser-specific
- Setup helpers included: `supabase-schema.sql` and `.env.local.example`

---

## Technical Architecture

### Frontend

| Technology                                 | Purpose                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| **React 18**                               | UI                                                        |
| **React Router 7**                         | Client-side routes and shareable URLs                     |
| **TypeScript 5.6**                         | Types                                                     |
| **Vite 5**                                 | Dev server & production build                             |
| **Tailwind CSS 3.4**                       | Styling + semantic tokens (`surface`, `ink`, `accent`, …) |
| **Framer Motion**                          | Overview page motion                                      |
| **Recharts 3**                             | Line, bar, and pie charts                                 |
| **Supabase**                               | Auth + per-user cloud persistence                         |
| **@vercel/analytics** / **speed-insights** | Production telemetry                                      |

### Backend / API proxy

| Layer           | Role                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| **`server.js`** | Express proxy on port **3006** (local dev)                             |
| **`api/`**      | One Vercel serverless function (`index.js`); logic lives in `backend/` |

Yahoo Finance calls are proxied server-side for CORS and crumb/cookie auth (`getYahooCrumb()`, 10-minute cache).

### Data sources

| Yahoo API                  | Used for                  |
| -------------------------- | ------------------------- |
| `v8/finance/chart`         | OHLCV history             |
| `v7/finance/quote`         | Live quotes (incl. batch) |
| `v10/finance/quoteSummary` | Profile, key stats        |
| `v1/finance/search`        | Symbol search             |
| `v1/finance/screener`      | NSE universe              |

### Data storage

| Store            | Contents                        |
| ---------------- | ------------------------------- |
| Supabase         | Portfolio, watchlists           |
| `localStorage`   | Theme preference                |
| `sessionStorage` | Screener cache, alert snapshots |
| Server memory    | Yahoo crumb/cookie cache        |

---

## Project Structure

```
KiteView/
├── .env.local.example                # Supabase env var template
├── api/
│   └── index.js                      # Vercel entry — all /api/* rewritten here
├── backend/
│   ├── handlers/                     # Route handlers (imported, not separate functions)
│   │   └── index-constituents.js
│   ├── patternDetect.js
│   ├── trendlyneSwot.js
│   ├── heatmapIndexConfig.js
│   ├── constituentFetchers.js        # Nifty Indices / CSV / Wikipedia fetchers
│   ├── constituentRefreshConfig.js
│   ├── bundledConstituents.js
│   └── constituentSymbol.js          # Exchange ticker → Yahoo symbol
├── data/
│   └── constituents/                 # Bundled index member lists (refresh via npm script)
├── scripts/
│   └── refresh-constituents.mjs
│   ├── watchlistSnapshot.js
│   └── yahooCrumb.js
├── src/
│   ├── main.tsx                      # App entry
│   ├── index.css                     # Tailwind + component layer (.card, .btn-primary, …)
│   ├── types.ts                      # Shared TypeScript types
│   ├── types/stockStats.ts           # Key stats DTO (Compare + Analysis)
│   ├── types/watchlist.ts            # Watchlist + snapshot types
│   ├── types/analysisExtras.ts       # Profile, news, recommendations, financials
│   ├── app/
│   │   ├── App.tsx                   # Route definitions
│   │   ├── AppLayout.tsx             # Shell + theme + persistent pages
│   │   ├── PersistentOutlet.tsx      # Keeps visited pages mounted
│   │   ├── persistentPages.tsx       # Path → page component map
│   │   ├── routes.ts                 # Path map + analysis/compare URL helpers
│   │   └── navigation.ts             # useAppNavigation hook
│   ├── auth/
│   │   ├── AuthContext.tsx           # useAuth hook + shared auth state
│   │   ├── AuthProvider.tsx          # Supabase session wiring
│   │   ├── LoginModal.tsx            # Email / magic link / Google sign-in UI
│   │   └── supabase.ts               # Client singleton
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # Sidebar + ticker + main
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MarketTicker.tsx
│   │   │   ├── PageLayout.tsx
│   │   │   └── types.ts              # Page union type
│   │   └── ui/                       # Reusable primitives
│   │       ├── Button.tsx, Card.tsx, Alert.tsx, Modal.tsx, …
│   │       ├── DataTable.tsx, SearchField.tsx, PageHeader.tsx
│   │       └── index.ts
│   ├── features/
│   │   ├── overview/OverviewPage.tsx
│   │   ├── screener/ScreenerPage.tsx
│   │   ├── heatmap/HeatmapPage.tsx
│   │   ├── lookup/                   # Stock Analysis feature (route /analysis)
│   │   │   ├── StockAnalysisPage.tsx
│   │   │   ├── useStockAnalysis.ts, technicalUtils.ts, analysisScores.ts
│   │   │   ├── quoteSnapshot.ts, patternChartCandles.ts, LookupRedirect.tsx
│   │   │   ├── components/           # Overview, SWOT, technicals, pattern, profile, news, …
│   │   │   └── QuantityTable.tsx
│   │   ├── compare/ComparePage.tsx
│   │   ├── portfolio/
│   │   │   ├── PortfolioPage.tsx
│   │   │   └── components/           # Modals, charts, risk, history
│   │   ├── watchlist/
│   │   │   ├── WatchlistPage.tsx
│   │   │   ├── WatchlistProvider.tsx
│   │   │   ├── watchlistStore.ts, watchlistAlerts.ts
│   │   │   └── components/AddToWatchlistButton.tsx, RenameWatchlistModal.tsx
│   │   ├── indices/IndicesPage.tsx
│   │   └── about/AboutPage.tsx
│   ├── data/
│   │   ├── indicesCatalog.ts         # Index symbols by category + ticker subset
│   │   ├── heatmapIndices.ts         # Heatmap index filter options (shared)
│   │   └── indexHeatmapLinks.ts      # Indices → heatmap filter mapping
│   ├── content/pageCopy.ts           # Page titles, descriptions, static copy
│   ├── lib/
│   │   ├── format.ts                 # Shared INR, %, mcap, volume, time formatters
│   │   ├── nseSymbol.ts              # normalizeNseSymbol for URLs / API
│   │   └── cn.ts
│   ├── services/
│   │   ├── fetchStockData.ts         # Chart, quote, heatmap batch helpers
│   │   ├── indexQuotes.ts            # Batch index/forex/commodity/crypto quotes
│   │   └── apiBatch.ts               # Client batch helpers (compare, analysis bundle)
│   └── utils/                        # Domain logic only
│       ├── patternDetector.ts
│       ├── buyPrice.ts
│       ├── screener.ts
│       ├── portfolio.ts
│       ├── portfolioChart.ts
│       ├── riskMetrics.ts
│       └── theme.ts
├── server.js
├── supabase-schema.sql               # Supabase tables + RLS policies
├── vercel.json
├── tailwind.config.js
├── package.json
└── index.html
```

---

## Routes

| Path         | Page                                                         |
| ------------ | ------------------------------------------------------------ |
| `/`          | Overview                                                     |
| `/screener`  | Live Screener                                                |
| `/heatmap`   | Market Heatmap (`?index=` optional — e.g. from Indices page) |
| `/analysis`  | Stock Analysis (`?symbol=` optional)                         |
| `/lookup`    | Redirects to `/analysis` (preserves `?symbol=`)              |
| `/compare`   | Stock Comparison (`?symbol=` optional)                       |
| `/portfolio` | Portfolio                                                    |
| `/watchlist` | Watchlist                                                    |
| `/indices`   | Indices                                                      |
| `/about`     | About                                                        |

Unknown paths redirect to `/`. Vercel serves `index.html` for all non-API routes (SPA fallback in `vercel.json`).

---

## API Endpoints

Base URL: same-origin `/api` (Vite proxies to port **3006** in dev; Vercel serves the API in production).

| Method | Endpoint                           | Description                                                                                                                                                                         |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/chart/:symbol`               | Historical OHLCV. Query: `range`, `interval`                                                                                                                                        |
| GET    | `/api/index-constituents?indexId=` | Index members for heatmap from bundled lists (+ Yahoo quote enrichment). Slice indices use client NSE list; proxy indices return approximate regional lists                         |
| GET    | `/api/quote/:symbols`              | Live quote(s); comma-separated symbols supported                                                                                                                                    |
| GET    | `/api/profile/:symbol`             | Sector and industry                                                                                                                                                                 |
| GET    | `/api/stats/:symbol`               | P/E, forward P/E, P/B, beta, 52W change, market cap                                                                                                                                 |
| GET    | `/api/search?q=`                   | Symbol autocomplete (global equities)                                                                                                                                               |
| GET    | `/api/resolve-symbol?q=`           | Resolve user input to Yahoo symbol (e.g. `AAPL`, `TCS`)                                                                                                                             |
| GET    | `/api/screener-list`               | NSE universe (cap > ₹1,000 Cr)                                                                                                                                                      |
| POST   | `/api/screener-scan`               | Pattern scan. Body: `{ symbols, mode: 'today' \| 'historical', fromDate?, toDate?, filters? }`; `filters` supports `patterns`, `marketCapCr`, `priceRange`, `sectors`, `industries` |
| POST   | `/api/heatmap-batch`               | Batch quotes for heatmap. Body: `{ symbols, timeframe }`                                                                                                                            |
| POST   | `/api/chart-batch`                 | Batch chart data. Body: `{ symbols, range?, interval? }` → `{ charts }`                                                                                                             |
| POST   | `/api/stats-batch`                 | Batch key stats. Body: `{ symbols }` → `{ stats }`                                                                                                                                  |
| GET    | `/api/lookup-bundle?symbol=`       | Chart 1y + max, quote, profile, financials, recommendations, news, quarterlyResults                                                                                                 |
| POST   | `/api/watchlist-snapshot`          | Watchlist live data. Body: `{ symbols }` (max 50) → `{ snapshots }` per symbol: CMP, signal, pattern, SWOT                                                                          |
| POST   | `/api/swot-batch`                  | Trendlyne SWOT counts. Body: `{ symbols }` (max 50) → `{ swot }` with strengths/weaknesses per symbol                                                                               |

---

## Pattern Detection Logic

### Harami (3-candle)

```
Candle 1 (Red):   Close < Open
Candle 2 (Green): Inside Candle 1 range
Candle 3 (Green): Breaks above both; close > Candle 1 open
```

### Engulfing + breakout (3-candle)

```
Candle 1 (Red):   Close < Open
Candle 2 (Green): Engulfs Candle 1
Candle 3 (Green): Confirms breakout above prior highs
```

### Filters

- Breakout volume > 2,00,000
- Close > ₹50
- Market cap > ₹5,000 Cr (screener universe uses ₹1,000 Cr list filter)

### Price calculations

```
Buy Price         = 0.98  × Candle3.Close
Buy Trigger Price = 0.985 × Candle3.Close
Stop Loss         = Buy Price × (1 − stop_loss_%)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/<your-username>/KiteView.git
cd KiteView
npm install
```

### Supabase setup

1. Create a free Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL Editor.
3. Copy `.env.local.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. In Supabase Auth, configure the providers you want to use:

- Email/password
- Magic link
- Google OAuth

For Google OAuth, create a free Google Cloud OAuth client and use Supabase's callback URL:

```bash
https://<your-project-id>.supabase.co/auth/v1/callback
```

### Development

```bash
# API proxy (3006) + Vite (5173) — default for local dev
npm run dev
```

Or run the proxy alone if Vite is already up:

```bash
npm run proxy
```

Open [http://localhost:5173](http://localhost:5173).

`npm run dev` and `npm start` stop any existing process on port **3006** first so API route changes take effect. If you see `404` on a new `/api/...` endpoint, restart with `npm run proxy` or `npm start`.

### Build

```bash
npm run build
```

Runs `tsc -b` then Vite; output in `dist/`.

---

## Deployment

Configured for **Vercel**:

- `vercel.json` rewrites non-`/api` paths to the SPA; `/api/*` is handled by the serverless function
- `server.js` mirrors the same routes for local dev (`npm run proxy` / `npm start`)
- Analytics and Speed Insights enabled in `src/app/App.tsx`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel environment variables
- In Supabase Auth URL configuration, add your Vercel URL and `http://localhost:5173/**` as allowed redirects

```bash
npx vercel
```

Or connect the GitHub repo for automatic deploys on push.

---

## Key Design Decisions

| Decision                     | Rationale                                                                   |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Feature folders**          | Each screen owns its UI; shared pieces live in `components/ui` and `layout` |
| **Page registry**            | `pages.tsx` maps `Page` → component; only the active route mounts           |
| **Semantic Tailwind tokens** | Consistent surfaces and typography without scattered `gray-*` strings       |
| **Custom treemap**           | No treemap dependency; full control over heatmap tiles                      |
| **Server-side screener**     | 500+ symbols scanned with concurrency instead of slow client loops          |
| **Supabase user storage**    | Browser-independent portfolio/watchlist sync with per-user access control   |
| **Yahoo crumb cache**        | Avoids repeated auth handshakes to `fc.yahoo.com`                           |
