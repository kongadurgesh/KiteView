# Bullish Harami Buy Price Calculator

Detects the Red-Green-Breakout 3-candle pattern in Indian stocks and calculates a buy price at 98% of the breakout candle's close.

## Pattern

1. **Candle 1 (Red)** — Bearish candle (Close < Open)
2. **Candle 2 (Harami)** — Inside green candle contained within Candle 1's range
3. **Candle 3 (Breakout)** — Green candle breaking above both previous candles

## Running

Start both the proxy server and the dev server:

```bash
# Terminal 1: Start the CORS proxy for Yahoo Finance
npm run proxy

# Terminal 2: Start the Vite dev server
npm run dev
```

Or run both together:

```bash
npm start
```

Open http://localhost:5173 in your browser. Enter a ticker symbol (e.g., `SBIN`, `INFY`, `RELIANCE`). The `.NS` suffix is auto-appended for NSE stocks.

## Filters

- Volume > 2,00,000
- Today's volume > yesterday's volume
- Market Cap > 5,000 Cr
- Close > 50
