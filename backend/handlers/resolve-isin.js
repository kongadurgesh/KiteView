import { chartMeta, searchYahooEquities } from '../yahooSymbol.js';

/**
 * Resolves ISIN codes to Yahoo Finance symbols with retry logic.
 * ISINs are Indian security codes (e.g., INE002A01011 for TCS).
 * Strategy: Try search first, then direct chart meta, then NSE suffix variant.
 */
export default async function handler(req, res) {
  const isin = (req.query.q || req.query.isin || '').trim().toUpperCase();
  
  if (!isin) {
    return res.status(400).json({ error: 'q or isin query parameter required' });
  }

  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const maxRetries = 2;
  let lastError = null;

  // Try multiple strategies with retry logic
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Strategy 1: Try direct chartMeta lookup with ISIN as symbol
      let result = await chartMetaWithTimeout(isin, headers, 5000);
      if (result) {
        return res.status(200).json({
          symbol: result.symbol,
          shortname: result.shortname,
          exchange: result.exchange,
          isin,
        });
      }

      // Strategy 2: Try with .NS suffix (Indian NSE)
      if (!isin.includes('.')) {
        result = await chartMetaWithTimeout(`${isin}.NS`, headers, 5000);
        if (result) {
          return res.status(200).json({
            symbol: result.symbol,
            shortname: result.shortname,
            exchange: result.exchange,
            isin,
          });
        }
      }

      // Strategy 3: Search Yahoo equities (fallback)
      const searchResults = await searchYahooEquitiesWithTimeout(isin, headers, 5000);
      if (searchResults && searchResults.length > 0) {
        // Look for exact match first, then take first result
        const exact = searchResults.find((r) => 
          r.symbol.toUpperCase() === isin || 
          r.symbol.toUpperCase() === `${isin}.NS`
        );
        const result = exact || searchResults[0];
        return res.status(200).json({
          symbol: result.symbol,
          shortname: result.shortname,
          exchange: result.exchange || '',
          isin,
        });
      }

      // If not found and we haven't exceeded retries, wait and retry
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 500; // Exponential backoff
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
    } catch (err) {
      lastError = err;
      // Log but continue to next retry or strategy
      console.error(`[ISIN Resolution] Attempt ${attempt + 1} failed:`, err.message);

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 500;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
    }
  }

  // All attempts exhausted
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(404).json({
    error: 'ISIN not found',
    isin,
    details: lastError?.message || 'Could not resolve ISIN after retries',
  });
}

/**
 * Fetch chart metadata with timeout to prevent hanging requests.
 */
async function chartMetaWithTimeout(symbol, headers, timeoutMs = 5000) {
  return Promise.race([
    chartMeta(symbol, headers),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('chartMeta timeout')), timeoutMs)
    ),
  ]).catch(() => null);
}

/**
 * Search Yahoo equities with timeout.
 */
async function searchYahooEquitiesWithTimeout(query, headers, timeoutMs = 5000) {
  return Promise.race([
    searchYahooEquities(query, headers, { limit: 5 }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('searchYahooEquities timeout')), timeoutMs)
    ),
  ]).catch(() => []);
}
