# KiteView

**A soaring view of the markets** — A comprehensive Indian stock analysis and portfolio management platform built with React, TypeScript, and Yahoo Finance data.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4) ![Vite](https://img.shields.io/badge/Vite-5-646CFF) ![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black)

---

## Table of Contents

- [Features](#features)
  - [Live Screener](#1-live-screener)
  - [Market Heatmap](#2-market-heatmap)
  - [Stock Lookup & Pattern Detection](#3-stock-lookup--pattern-detection)
  - [Stock Comparison Tool](#4-stock-comparison-tool)
  - [Portfolio Management](#5-portfolio-management)
  - [Performance Chart](#6-performance-chart)
  - [Risk Dashboard](#7-risk-dashboard)
  - [Dividend Dashboard](#8-dividend-dashboard)
  - [Dark Mode](#9-dark-mode)
- [Technical Architecture](#technical-architecture)
  - [Frontend](#frontend)
  - [Backend / API Proxy](#backend--api-proxy)
  - [Data Sources](#data-sources)
  - [Data Storage](#data-storage)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Pattern Detection Logic](#pattern-detection-logic)
- [Getting Started](#getting-started)
- [Deployment](#deployment)

---

## Features

### 1. Live Screener

Scans the entire NSE universe (stocks with market cap > ₹1,000 Cr) to find stocks that triggered a bullish breakout pattern **today**.

- Server-side batch scanning with concurrency of 30 for speed
- Filters for only the most recent trading day's breakouts
- Displays: Stock name, CMP, Buy Price, Buy Trigger, Pattern, 52W High/Low, % distance from 52W extremes, All-Time High, Market Cap
- Toggle to show/hide buy price columns
- Auto-scan and manual scan modes
- Results cached in `sessionStorage` to persist across tab switches

### 2. Market Heatmap

A treemap visualization of NSE stocks, sized by market cap and colored by daily percentage change.

- Squarified treemap layout algorithm (no external library)
- Color gradient: deep red (-3% or worse) → gray (0%) → deep green (+3% or better)
- Sector filter dropdown
- Click any tile to jump to the Lookup tab for that stock
- Shows gainers/losers count and color legend

### 3. Stock Lookup & Pattern Detection

Search for any Indian stock and detect candlestick patterns with custom buy price calculation.

- **Symbol autocomplete**: Search by company name (e.g., "NALCO" → `NATIONALUM.NS`) via Yahoo Finance search API
- **Two patterns detected**:
  - **Bullish Harami**: Red candle → inside green candle → breakout green candle
  - **Bullish Engulfing**: Red candle → engulfing green candle → breakout green candle
- **Custom buy price logic**: `Buy Price = 0.98 × Candle3.Close`
- **Buy trigger price**: `0.985 × Candle3.Close`
- **Signal indicator**: BUY (current price ≤ buy price) or WAIT
- **Stop loss calculator**: Configurable percentage dropdown (1%–10%)
- **Quantity & Investment table**: Shows how many shares to buy for investment amounts from ₹10K to ₹10L
- **Stock metadata**: 52-week high/low, all-time high, market cap category (Large/Mid/Small Cap), sector, industry

### 4. Stock Comparison Tool

Compare 2–4 stocks side by side within the Lookup tab.

- Multi-stock search with chip-based selection (up to 4 stocks)
- **Overlaid price chart**: Normalized percentage returns using Recharts LineChart
- **Time range selector**: 1M, 3M, 6M, 1Y
- **Comparison table**: CMP, Market Cap, P/E, Forward P/E, P/B, Beta, Dividend Yield, 52W Change, Sector
- Color-coded lines for each stock

### 5. Portfolio Management

Full-featured portfolio tracker with transaction management.

- **Add transactions**: BUY/SELL with quantity, price, and date
- **Import from Excel/CSV**: Upload `.xlsx` or `.csv` files with ISIN, Buy Price, Quantity columns — ISINs are auto-resolved to NSE ticker symbols
- **Position tracking**: Average buy price, total quantity, invested amount, current value, total P&L (absolute and percentage)
- **Live prices**: Batch-fetched from Yahoo Finance for all holdings
- **Sortable table**: Sort by any column (name, quantity, avg buy, CMP, invested, current, P&L, P&L %)
- **Portfolio actions**: Delete individual positions, clear entire portfolio, export functionality
- **Transaction history**: View and manage all transactions per stock
- Data persisted in `localStorage`

### 6. Performance Chart

Compare your portfolio's performance against major Nifty indices.

- **Indices**: Nifty 50, Bank Nifty, Midcap 50, Nifty 200
- **View modes**:
  - Normalized % returns (all lines start at 0%)
  - Absolute values (dual Y-axis: portfolio value left, index value right)
- **Time ranges**: 1M, 3M, 6M, 1Y, ALL
- Computes daily portfolio value from transaction history and historical prices

### 7. Risk Dashboard

Comprehensive portfolio risk analytics with interactive visualizations.

- **Metrics cards** (each with an interactive lightbulb icon providing improvement suggestions):
  - **Diversification Score**: Based on Herfindahl-Hirschman Index (HHI)
  - **Portfolio Beta**: Relative volatility vs Nifty 50
  - **Annualized Volatility**: Standard deviation of daily returns × √252
  - **Sharpe Ratio**: Risk-adjusted returns (assumes 7% risk-free rate)
  - **Max Drawdown**: Largest peak-to-trough decline
- **Sector Allocation**: Interactive donut chart — click any sector to see company-wise breakdown in a modal
- **Stock Allocation**: Donut chart showing individual stock weightings

### 8. Dividend Dashboard

Dividend income analysis for portfolio holdings.

- **Summary cards**: Total Annual Dividend Income, Portfolio Yield, Dividend-Paying Stocks count
- **Holdings table**: Dividend per share, yield %, projected annual income, ex-dividend date
- **Monthly income projection**: Recharts bar chart showing projected monthly dividend income
- Collapsible section below Risk Dashboard

### 9. Dark Mode

System-aware theme with manual override.

- Three-state toggle: Light → Dark → System
- Persisted in `localStorage`
- Detects system preference via `matchMedia`
- All components styled with Tailwind `dark:` variants

---

## Technical Architecture

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript 5.6** | Type safety |
| **Vite 5** | Build tool and dev server |
| **Tailwind CSS 3.4** | Utility-first styling |
| **Recharts 3** | Charts (LineChart, BarChart, PieChart) |
| **read-excel-file** | XLSX parsing for portfolio import |
| **@vercel/analytics** | Usage analytics |
| **@vercel/speed-insights** | Performance monitoring |

### Backend / API Proxy

| Layer | Purpose |
|---|---|
| **Express.js** (`server.js`) | Local development proxy server on port 3006 |
| **Vercel Serverless Functions** (`api/`) | Production API proxy deployed on Vercel |

All API calls to Yahoo Finance are proxied through the backend to handle CORS restrictions and Yahoo's crumb/cookie authentication.

### Data Sources

All market data is sourced from **Yahoo Finance** via multiple API endpoints:

| Yahoo API | Used For |
|---|---|
| `v8/finance/chart` | Historical OHLCV candlestick data |
| `v7/finance/quote` | Live quotes, batch prices, market cap |
| `v10/finance/quoteSummary` | Asset profile (sector/industry), key statistics (P/E, P/B, beta), dividend data, calendar events |
| `v1/finance/search` | Symbol autocomplete |
| `v1/finance/screener` | NSE stock universe filtering |

**Authentication**: Yahoo Finance requires a crumb token and session cookie. The backend implements `getYahooCrumb()` which fetches these from `fc.yahoo.com` and caches them for 10 minutes.

### Data Storage

| Store | Data |
|---|---|
| `localStorage` | Portfolio transactions, theme preference |
| `sessionStorage` | Screener stock list cache |
| In-memory (server) | Yahoo crumb/cookie cache |

---

## Project Structure

```
bullish-harami-buy-price-app/
├── api/                              # Vercel Serverless Functions
│   ├── chart/[symbol].js             # Historical price data proxy
│   ├── quote/[symbol].js             # Live quote proxy (supports batch)
│   ├── profile/[symbol].js           # Asset profile (sector, industry)
│   ├── stats/[symbol].js             # Key statistics (P/E, P/B, beta)
│   ├── dividends/[symbol].js         # Dividend data & ex-dates
│   ├── search.js                     # Symbol autocomplete
│   ├── screener-list.js              # NSE stock universe
│   └── screener-scan.js              # Server-side pattern scanning
├── src/
│   ├── App.tsx                       # Root component, tab navigation, theme
│   ├── types.ts                      # TypeScript interfaces
│   ├── components/
│   │   ├── ScreenerPage.tsx          # Live breakout screener
│   │   ├── HeatmapPage.tsx           # Market heatmap treemap
│   │   ├── SearchBar.tsx             # Symbol search with autocomplete
│   │   ├── ResultCard.tsx            # Pattern detection result display
│   │   ├── QuantityTable.tsx         # Investment quantity calculator
│   │   ├── StockComparePage.tsx      # Multi-stock comparison tool
│   │   ├── PortfolioPage.tsx         # Portfolio management hub
│   │   ├── AddTransactionModal.tsx   # Buy/Sell transaction form
│   │   ├── ImportExcelModal.tsx      # Excel/CSV portfolio import
│   │   ├── TransactionHistory.tsx    # Transaction log per stock
│   │   ├── PerformanceChart.tsx      # Portfolio vs indices chart
│   │   ├── RiskDashboard.tsx         # Risk analytics & donut charts
│   │   └── DividendDashboard.tsx     # Dividend income dashboard
│   └── utils/
│       ├── fetchStockData.ts         # API data fetching functions
│       ├── patternDetector.ts        # Candlestick pattern detection
│       ├── buyPrice.ts              # Buy price calculation
│       ├── screener.ts              # Screener utilities & caching
│       ├── portfolio.ts             # Portfolio CRUD & localStorage
│       ├── portfolioChart.ts        # Historical portfolio value computation
│       ├── riskMetrics.ts           # Risk metric computations
│       └── theme.ts                 # Dark mode theme management
├── server.js                         # Express proxy for local development
├── vercel.json                       # Vercel deployment config & routing
├── tailwind.config.js                # Tailwind with dark mode class strategy
├── package.json
├── tsconfig.json
└── index.html
```

---

## API Endpoints

All endpoints are available at `http://localhost:3006` in development and at the deployed Vercel URL in production.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chart/:symbol` | Historical OHLCV data. Query params: `range` (1d, 5d, 1mo, 1y, max), `interval` (1d, 1mo) |
| GET | `/api/quote/:symbols` | Live quote data. Supports comma-separated symbols for batch requests |
| GET | `/api/profile/:symbol` | Sector and industry from Yahoo's asset profile |
| GET | `/api/stats/:symbol` | Key statistics: P/E, P/B, beta, forward P/E, dividend yield, 52W change |
| GET | `/api/dividends/:symbol` | Dividend rate, yield, trailing annual rate, ex-dividend date |
| GET | `/api/search?q=query` | Symbol autocomplete filtered to NSE/BSE exchanges |
| GET | `/api/screener-list` | Full NSE stock universe (market cap > ₹1,000 Cr) |
| POST | `/api/screener-scan` | Server-side pattern scanning. Body: `{ symbols: string[] }` |

---

## Pattern Detection Logic

### Bullish Harami (3-candle pattern)

```
Candle 1 (Red):  Close < Open (bearish)
Candle 2 (Green): Contained within Candle 1's range (high < C1.high, low > C1.low)
Candle 3 (Green): Breaks above both candles (high > C1.high, close > C1.open)
```

### Bullish Engulfing + Breakout (3-candle pattern)

```
Candle 1 (Red):  Close < Open (bearish)
Candle 2 (Green): Engulfs Candle 1 (close > C1.open, open < C1.close, range exceeds C1)
Candle 3 (Green): Confirms breakout (low > both candles, close > C2.close)
```

### Filters Applied

- Volume > 2,00,000 on the breakout candle
- Close > ₹50
- Market Cap > ₹5,000 Cr

### Price Calculations

```
Buy Price         = 0.98  × Candle3.Close
Buy Trigger Price = 0.985 × Candle3.Close
Stop Loss         = Buy Price × (1 - stop_loss_percentage)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/<your-username>/bullish-harami-buy-price-app.git
cd bullish-harami-buy-price-app
npm install
```

### Development

Start both the proxy server and the Vite dev server:

```bash
# Terminal 1: Start the CORS proxy for Yahoo Finance (port 3006)
npm run proxy

# Terminal 2: Start the Vite dev server (port 5173)
npm run dev
```

Or run both together:

```bash
npm start
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

This runs TypeScript type-checking (`tsc -b`) followed by the Vite production build. Output goes to the `dist/` directory.

---

## Deployment

The app is configured for **Vercel** deployment.

### Configuration

- `vercel.json` handles routing: API routes are directed to serverless functions in `api/`, all other routes fall through to the SPA's `index.html`
- Serverless functions in `api/` mirror the Express routes in `server.js`
- Vercel Analytics and Speed Insights are integrated

### Deploy

```bash
npx vercel
```

Or connect the GitHub repository to Vercel for automatic deployments on push.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **No external treemap library** | Custom squarify algorithm keeps bundle size small and gives full control over tile rendering |
| **Server-side screener scanning** | Client-side scanning of 500+ stocks was too slow; server-side with concurrency of 30 completes in seconds |
| **`read-excel-file` over `xlsx`** | `xlsx@0.18.5` had HIGH severity security vulnerabilities; `read-excel-file` is lightweight and secure |
| **Tab panels use `display: none`** | Preserves component state (e.g., screener results) when switching tabs, unlike conditional rendering which unmounts |
| **Yahoo crumb caching** | Yahoo Finance requires crumb/cookie auth; caching for 10 minutes avoids redundant auth round-trips |
| **`localStorage` for portfolio** | Simple, zero-setup persistence; suitable for a personal finance tool without backend database requirements |
| **Tailwind `darkMode: 'class'`** | Enables programmatic dark mode control with system preference detection and manual override |
