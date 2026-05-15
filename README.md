# KiteView

**A soaring view of the markets** — Indian stock analysis and portfolio tracking built with React, TypeScript, and Yahoo Finance data.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4) ![Vite](https://img.shields.io/badge/Vite-5-646CFF) ![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black)

---

## Table of Contents

- [Features](#features)
  - [Overview](#1-overview)
  - [Live Screener](#2-live-screener)
  - [Market Heatmap](#3-market-heatmap)
  - [Stock Lookup & Pattern Detection](#4-stock-lookup--pattern-detection)
  - [Stock Comparison](#5-stock-comparison)
  - [Portfolio Management](#6-portfolio-management)
  - [About](#7-about)
  - [Dark Mode & Layout](#8-dark-mode--layout)
- [Technical Architecture](#technical-architecture)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Pattern Detection Logic](#pattern-detection-logic)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Key Design Decisions](#key-design-decisions)

---

## Features

### 1. Overview

Landing page with quick navigation into every major tool.

- Card grid for Screener, Heatmap, Lookup, Compare, Portfolio, and About
- Lightweight animated previews (respects `prefers-reduced-motion`)
- Flat, minimal UI using shared design tokens

### 2. Live Screener

Scans the NSE universe (market cap > ₹1,000 Cr) for bullish breakout patterns on the latest trading day.

- Server-side batch scanning with concurrency of 30
- Columns: stock, CMP, buy price, buy trigger, pattern, 52W high/low, distance from extremes, ATH, market cap
- Toggle buy-price columns; auto-scan and manual scan
- Results cached in `sessionStorage`
- Click a row to open **Lookup** for that symbol

### 3. Market Heatmap

Treemap of NSE stocks sized by market cap and colored by performance.

- Custom squarified treemap (no external treemap library)
- Timeframes: **1D**, **1W**, **1M**, **1Y**
- Color scale: red (down) → gray (flat) → green (up)
- Sector filter; click a tile to jump to **Lookup**
- Batch quote loading via `/api/heatmap-batch`

### 4. Stock Lookup & Pattern Detection

Search any NSE/BSE symbol and run candlestick pattern detection with buy-level math.

- Symbol autocomplete (Yahoo Finance search)
- Patterns: **Bullish Harami**, **Bullish Engulfing** (with breakout confirmation)
- Buy price = `0.98 ×` breakout close; buy trigger = `0.985 ×` breakout close
- BUY / WAIT signal vs current price
- Stop-loss calculator (1%–10%)
- Quantity table for investment sizes ₹10K–₹10L
- Metadata: 52W range, ATH, cap tier, sector, industry
- **Compare** action sends the symbol to the Compare page

### 5. Stock Comparison

Dedicated page to compare up to four stocks (not embedded in Lookup).

- Chip-based symbol search with autocomplete
- Normalized return chart (Recharts) with ranges **1M**, **3M**, **6M**, **1Y**
- Optional benchmark overlay: Nifty 50 or Sensex
- Comparison table: CMP, market cap, P/E, forward P/E, P/B, beta, 52W change, sector
- Best/worst highlighting per metric row
- Seed symbol support when navigating from Lookup or Screener

### 6. Portfolio Management

Transaction-based portfolio tracker with analytics.

- **Transactions**: BUY/SELL with qty, price, date
- **Import**: `.xlsx`, `.xls`, or `.csv` (ISIN, buy price, quantity) via `xlsx`
- **Positions**: avg buy, qty, invested, live value, P&L (₹ and %)
- **Live prices**: batch quotes for all holdings
- **Sortable** positions table
- **Performance chart**: portfolio vs Nifty 50, Bank Nifty, Midcap 50, Nifty 200 (normalized or absolute; 1M–ALL)
- **Risk dashboard**: HHI diversification, beta, volatility, Sharpe, max drawdown, sector/stock allocation donuts
- Persisted in `localStorage`

### 7. About

Author profile, investing philosophy, and linked P&L proof spreadsheets.

### 8. Dark Mode & Layout

- **Theme**: Light / dark toggle on the sidebar (class-based, persisted in `localStorage`)
- **Shell**: Collapsible sidebar, mobile slide-out drawer, top **market ticker** (Nifty, Sensex, Bank Nifty, Nifty IT)
- **Responsive**: `max-w-7xl` content, horizontal scroll on wide tables, sticky first column where needed

---

## Technical Architecture

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | UI |
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
│   ├── app/
│   │   ├── App.tsx                   # Theme, navigation state, AppShell
│   │   └── pages.tsx                 # PAGE_COMPONENTS registry (one active page)
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
│   │   ├── lookup/
│   │   │   ├── LookupPage.tsx
│   │   │   ├── useLookup.ts
│   │   │   ├── SearchBar.tsx, ResultCard.tsx, QuantityTable.tsx
│   │   ├── compare/ComparePage.tsx
│   │   ├── portfolio/
│   │   │   ├── PortfolioPage.tsx
│   │   │   └── components/           # Modals, charts, risk, history
│   │   └── about/AboutPage.tsx
│   ├── lib/
│   │   ├── format.ts                 # fmtInr, fmtNumber, fmtPct, …
│   │   └── cn.ts
│   ├── services/
│   │   ├── fetchStockData.ts         # Chart, quote, heatmap batch helpers
│   │   └── apiBatch.ts               # Client batch helpers (compare, lookup)
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
| POST | `/api/screener-scan` | Pattern scan. Body: `{ symbols: string[] }` |
| POST | `/api/heatmap-batch` | Batch quotes for heatmap. Body: `{ symbols, timeframe }` |

---

## Pattern Detection Logic

### Bullish Harami (3-candle)

```
Candle 1 (Red):   Close < Open
Candle 2 (Green): Inside Candle 1 range
Candle 3 (Green): Breaks above both; close > Candle 1 open
```

### Bullish Engulfing + breakout (3-candle)

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
