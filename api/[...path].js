import chartHandler from './lib/handlers/chart.js';
import quoteHandler from './lib/handlers/quote.js';
import profileHandler from './lib/handlers/profile.js';
import statsHandler from './lib/handlers/stats.js';
import searchHandler from './lib/handlers/search.js';
import screenerListHandler from './lib/handlers/screener-list.js';
import screenerScanHandler from './lib/handlers/screener-scan.js';
import chartBatchHandler from './lib/handlers/chart-batch.js';
import statsBatchHandler from './lib/handlers/stats-batch.js';
import heatmapBatchHandler from './lib/handlers/heatmap-batch.js';
import lookupBundleHandler from './lib/handlers/lookup-bundle.js';
import watchlistSnapshotHandler from './lib/handlers/watchlist-snapshot.js';
import swotBatchHandler from './lib/handlers/swot-batch.js';

/** Single Vercel serverless entry — routes all /api/*. */
const SINGLE = {
  'GET search': searchHandler,
  'GET screener-list': screenerListHandler,
  'POST screener-scan': screenerScanHandler,
  'POST chart-batch': chartBatchHandler,
  'POST stats-batch': statsBatchHandler,
  'POST heatmap-batch': heatmapBatchHandler,
  'GET lookup-bundle': lookupBundleHandler,
  'POST watchlist-snapshot': watchlistSnapshotHandler,
  'POST swot-batch': swotBatchHandler,
};

const WITH_SYMBOL = {
  'GET chart': chartHandler,
  'GET quote': quoteHandler,
  'GET profile': profileHandler,
  'GET stats': statsHandler,
};

export default async function handler(req, res) {
  const segments = req.query.path;
  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  const method = req.method ?? 'GET';

  if (segments.length === 1) {
    const route = SINGLE[`${method} ${segments[0]}`];
    if (route) return route(req, res);
    return res.status(404).json({ error: 'Not found' });
  }

  if (segments.length === 2) {
    const route = WITH_SYMBOL[`${method} ${segments[0]}`];
    if (route) {
      req.query.symbol = decodeURIComponent(segments[1]);
      return route(req, res);
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
