/** Centralized static copy for page headers, intros, and tool cards. */

export const PAGE_COPY = {
  overview: {
    title: 'KiteView',
    description:
      'A single workspace to scan for breakout patterns, inspect a symbol, read the market heatmap, compare names, and track a portfolio.',
  },
  screener: {
    title: 'Live Screener',
    description:
      'Scan NSE stocks (market cap above ₹1,000 Cr) for breakout stocks. Use Today for the latest session, or pick a date range for historical breakouts. Signal is BUY when CMP is within 2% of the calculated buy price.',
  },
  heatmap: {
    title: 'Market Heatmap',
    description:
      'Treemap sized by market cap and colored by performance. Filter by index and switch between 1D, 1W, 1M, and 1Y timeframes.',
  },
  analysis: {
    title: 'Stock Analysis',
    description:
      'Research any NSE symbol: overview, SWOT (Trendlyne), technicals, checklist, and a breakout panel when a qualifying pattern is detected.',
    patternChartNote:
      'Base, pattern, and breakout bars. Dashed lines = buy trigger and buy price.',
    dvmNote: 'Rule-based Durability, Valuation, Momentum (0–100)',
    noPattern:
      'No qualifying breakout in the last 1Y.',
  },
  compare: {
    title: 'Stock Comparison',
    description:
      'Add up to four NSE symbols to compare normalized returns, optional Nifty 50 or Sensex overlay, and side-by-side valuation metrics.',
    emptyTitle: 'Compare up to 4 stocks',
    emptyDescription:
      'Search below to add symbols. Chart normalized performance from the start of each range and rank P/E, beta, 52-week change, and more.',
  },
  portfolio: {
    title: 'Portfolio',
    description:
      'Track BUY and SELL transactions, live P&L, performance vs indices, and risk metrics. Import holdings from Excel or CSV.',
  },
  about: {
    title: 'About',
    description: 'Author profile, investing philosophy, and verified P&L track record.',
    identityName: 'Durgesh Konga',
    identityTagline: 'Retail investor since Sep 2021, net positive every FY since then.',
    philosophyTitle: 'Investment Philosophy',
    philosophyQuote: '"Small losses, big wins, that\'s the game."',
    philosophyBody:
      'I follow a disciplined approach rooted in this principle, exit losing positions early with strict stop-losses, and hold winners with patience to maximise returns. Combined with technical breakout patterns and fundamental quality filters, every trade is sized and managed with risk at its core.',
    trackRecordTitle: 'Track Record',
  },
  toolCards: {
    screener: {
      title: 'Screener',
      blurb: 'Scan ranked NSE lists for breakout stocks.',
    },
    heatmap: {
      title: 'Heatmap',
      blurb: 'Treemap by market cap with 1D / 1W / 1M / 1Y color.',
    },
    analysis: {
      title: 'Analysis',
      blurb: 'Trendlyne SWOT, technicals, checklist, and conditional breakout levels.',
    },
    compare: {
      title: 'Compare',
      blurb: 'Normalized performance, index overlay, and a ranked metric grid.',
    },
    portfolio: {
      title: 'Portfolio',
      blurb: 'Holdings, P&L, performance vs indices, and risk analytics.',
    },
    about: {
      title: 'About',
      blurb: 'Author profile, philosophy, and track record proof links.',
    },
  },
} as const;
