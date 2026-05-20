# KiteView

**A soaring view of the markets** — Indian stock analysis and portfolio tracking built with React, TypeScript, and Yahoo Finance data.

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
  - [About](#7-about)
  - [Dark Mode & Layout](#8-dark-mode--layout)
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

- Card grid for Screener, Heatmap, Stock Analysis, Compare, Portfolio, and About
- Lightweight animated previews (respects `prefers-reduced-motion`)
- Flat, minimal UI using shared design tokens

### 2. Live Screener

Scans the NSE universe (market cap > ₹1,000 Cr) for breakout stocks.

- **Today** mode: patterns on the latest trading session (auto-scan or manual)
- **Date range** mode: historical scan — finds the latest breakout whose pattern date falls in your selected window (up to 365 days)
- **Signal** column: **BUY** when CMP is within 2% of buy price (`0.98 ×` breakout close); otherwise **WAIT**
- Server-side batch scanning; columns include signal, pattern date, CMP, % vs buy price (green/red), buy price (toggle), 52W stats, ATH, market cap
- Click a row to open **Stock Analysis** (`/analysis?symbol=…`)

### 3. Market Heatmap

Treemap of NSE stocks sized by market cap and colored by performance.

- Custom squarified treemap (no external treemap library)
- Timeframes: **1D**, **1W**, **1M**, **1Y**
- Color scale: red (down) → gray (flat) → green (up)
- Sector filter; click a tile to jump to **Stock Analysis** (`/analysis?symbol=…`)
- Batch quote loading via `/api/heatmap-batch`

### 4. Stock Analysis

Research any NSE/BSE symbol with always-on sections and a conditional breakout panel.

- Symbol autocomplete (Yahoo Finance search); **shareable URL** `/analysis?symbol=TCS.NS` (`/lookup?symbol=` redirects for old links)
- **Instrument strip**: name, symbol, CMP, Rescan, Compare, **Copy link**, **Open on Yahoo**
- **Overview**: session snapshot, key stats, 52W range, ATH, cap tier, sector
- **SWOT**: rule-based 2×2 grid from market data (not investment advice)
- **Technicals**: % from 52W high/low, range position, 50-day SMA, RSI (14), **1Y price chart**
- **Investment checklist** and **DVM scorecard** (Durability / Valuation / Momentum, rule-based 0–100)
- **Company profile**, **financial highlights**, **analyst recommendations**, **recent news** (Yahoo `quoteSummary` modules via analysis bundle)
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
- **Import**: `.xlsx`, `.xls`, or `.csv` (ISIN, buy price, quantity) via `xlsx`
- **Positions**: avg buy, qty, invested, live value, P&L (₹ and %)
- **Live prices**: batch quotes for all holdings
- **Sortable** positions table
- **Performance chart**: portfolio vs Nifty 50, Bank Nifty, Midcap 50, Nifty 200 (normalized or absolute; 1M–ALL)
- **Risk dashboard**: HHI diversification, beta, volatility, Sharpe, max drawdown, sector/stock/market-cap allocation donuts (click a cap slice to see holdings)
- Persisted in `localStorage`

### 7. About

Author profile, investing philosophy, and linked P&L proof spreadsheets.

### 8. Dark Mode & Layout

- **Theme**: Light / dark toggle on the sidebar (class-based, persisted in `localStorage`)
- **Shell**: Collapsible sidebar, mobile slide-out drawer, top **market ticker** (Nifty, Sensex, Bank Nifty, Nifty IT)
- **Routing**: Each page has its own URL (React Router); sidebar uses links so refresh and share work
- **Persistent pages**: Visited routes stay mounted when you navigate away — scan results, analysis, compare symbols, heatmap filters, and scroll position are kept until you refresh the tab
- **Responsive**: `max-w-7xl` content, horizontal scroll on wide tables, sticky first column where needed

---

## Technical Architecture

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | UI |
| **React Router 7** | Client-side routes and shareable URLs |
| **TypeScript 5.6** | Types |
| **Vite 5** | Dev server & production build |
| **Tailwind CSS 3.4** | Styling + semantic tokens (`surface`, `ink`, `accent`, …) |
| **Framer Motion** | Overview page motion |
| **Recharts 3** | Line, bar, and pie charts |
| **xlsx** | Portfolio Excel/CSV import |
| **@vercel/analytics** / **speed-insights** | Production telemetry |

### Backend / API proxy

| Layer | Role |
|---|---|
| **`server.js`** | Express proxy on port **3006** (local dev) |
| **`api/`** | Vercel serverless functions (production) |

Yahoo Finance calls are proxied server-side for CORS and crumb/cookie auth (`getYahooCrumb()`, 10-minute cache).

### Data sources

| Yahoo API | Used for |
|---|---|
| `v8/finance/chart` | OHLCV history |
| `v7/finance/quote` | Live quotes (incl. batch) |
| `v10/finance/quoteSummary` | Profile, key stats |
| `v1/finance/search` | Symbol search |
| `v1/finance/screener` | NSE universe |

### Data storage

| Store | Contents |
|---|---|
| `localStorage` | Portfolio, theme |
| `sessionStorage` | Screener list cache |
| Server memory | Yahoo crumb/cookie cache |

---

## Project Structure

```
KiteView/
├── api/                              # Vercel serverless (mirrors server.js routes)
│   ├── chart/[symbol].js
│   ├── quote/[symbol].js
│   ├── profile/[symbol].js
│   ├── stats/[symbol].js
│   ├── search.js
│   ├── screener-list.js
│   ├── screener-scan.js
│   ├── heatmap-batch.js
│   └── lib/yahooCrumb.js
├── src/
│   ├── main.tsx                      # App entry
│   ├── index.css                     # Tailwind + component layer (.card, .btn-primary, …)
│   ├── types.ts                      # Shared TypeScript types
│   ├── types/stockStats.ts           # Key stats DTO (Compare + Analysis)
│   ├── types/analysisExtras.ts       # Profile, news, recommendations, financials
│   ├── app/
│   │   ├── App.tsx                   # Route definitions
│   │   ├── AppLayout.tsx             # Shell + theme + persistent pages
│   │   ├── PersistentOutlet.tsx      # Keeps visited pages mounted
│   │   ├── persistentPages.tsx       # Path → page component map
│   │   ├── routes.ts                 # Path map + analysis/compare URL helpers
│   │   └── navigation.ts             # useAppNavigation hook
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
│   │   │   ├── useStockAnalysis.ts, swotEngine.ts, technicalUtils.ts, analysisScores.ts
│   │   │   ├── quoteSnapshot.ts, patternChartCandles.ts, LookupRedirect.tsx
│   │   │   ├── components/           # Overview, SWOT, technicals, pattern, profile, news, …
│   │   │   └── QuantityTable.tsx
│   │   ├── compare/ComparePage.tsx
│   │   ├── portfolio/
│   │   │   ├── PortfolioPage.tsx
│   │   │   └── components/           # Modals, charts, risk, history
│   │   └── about/AboutPage.tsx
│   ├── content/pageCopy.ts           # Page titles, descriptions, static copy
│   ├── lib/
│   │   ├── format.ts                 # Shared INR, %, mcap, volume, time formatters
│   │   ├── nseSymbol.ts              # normalizeNseSymbol for URLs / API
│   │   └── cn.ts
│   ├── services/
│   │   ├── fetchStockData.ts         # Chart, quote, heatmap batch helpers
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
├── vercel.json
├── tailwind.config.js
├── package.json
└── index.html
```

---

## Routes

| Path | Page |
|---|---|
| `/` | Overview |
| `/screener` | Live Screener |
| `/heatmap` | Market Heatmap |
| `/analysis` | Stock Analysis (`?symbol=` optional) |
| `/lookup` | Redirects to `/analysis` (preserves `?symbol=`) |
| `/compare` | Stock Comparison (`?symbol=` optional) |
| `/portfolio` | Portfolio |
| `/about` | About |

Unknown paths redirect to `/`. Vercel serves `index.html` for all non-API routes (SPA fallback in `vercel.json`).

---

## API Endpoints

Base URL: `http://localhost:3006` in development; your Vercel deployment URL in production.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chart/:symbol` | Historical OHLCV. Query: `range`, `interval` |
| GET | `/api/quote/:symbols` | Live quote(s); comma-separated symbols supported |
| GET | `/api/profile/:symbol` | Sector and industry |
| GET | `/api/stats/:symbol` | P/E, forward P/E, P/B, beta, 52W change, market cap |
| GET | `/api/search?q=` | Symbol autocomplete (NSE/BSE) |
| GET | `/api/screener-list` | NSE universe (cap > ₹1,000 Cr) |
| POST | `/api/screener-scan` | Pattern scan. Body: `{ symbols, mode: 'today' \| 'historical', fromDate?, toDate? }` — historical requires both dates |
| POST | `/api/heatmap-batch` | Batch quotes for heatmap. Body: `{ symbols, timeframe }` |
| POST | `/api/chart-batch` | Batch chart data. Body: `{ symbols, range?, interval? }` → `{ charts }` |
| POST | `/api/stats-batch` | Batch key stats. Body: `{ symbols }` → `{ stats }` |
| GET | `/api/lookup-bundle?symbol=` | Chart 1y + max, quote, profile, financials, recommendations, news |

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

### Development

```bash
# Proxy (port 3006) + Vite (port 5173)
npm start
```

Or separately:

```bash
npm run proxy   # Terminal 1
npm run dev     # Terminal 2
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
```

Runs `tsc -b` then Vite; output in `dist/`.

---

## Deployment

Configured for **Vercel**:

- `vercel.json` routes `/api/*` to `api/` functions; all other paths serve the SPA
- `api/` handlers mirror `server.js` for production
- Analytics and Speed Insights enabled in `src/app/App.tsx`

```bash
npx vercel
```

Or connect the GitHub repo for automatic deploys on push.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Feature folders** | Each screen owns its UI; shared pieces live in `components/ui` and `layout` |
| **Page registry** | `pages.tsx` maps `Page` → component; only the active route mounts |
| **Semantic Tailwind tokens** | Consistent surfaces and typography without scattered `gray-*` strings |
| **Custom treemap** | No treemap dependency; full control over heatmap tiles |
| **Server-side screener** | 500+ symbols scanned with concurrency instead of slow client loops |
| **`localStorage` portfolio** | No backend DB; suitable for personal tracking |
| **Yahoo crumb cache** | Avoids repeated auth handshakes to `fc.yahoo.com` |
