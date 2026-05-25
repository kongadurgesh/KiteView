import { toYahooByMarket } from './constituentSymbol.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

export function dedupeStocks(stocks) {
  const seen = new Set();
  const out = [];
  for (const s of stocks) {
    if (!s?.symbol || seen.has(s.symbol)) continue;
    seen.add(s.symbol);
    out.push(s);
  }
  return out;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Official Nifty / NSE index CSVs (https://www.niftyindices.com). */
export async function fetchNiftyIndicesCsv(slug, market = 'nse') {
  const url = `https://www.niftyindices.com/IndexConstituent/ind_${slug}list.csv`;
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Nifty Indices ${slug}: HTTP ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith('<!')) throw new Error(`Nifty Indices ${slug}: HTML response (invalid slug?)`);

  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const symIdx = header.findIndex((h) => /^symbol$/i.test(h));
  const nameIdx = header.findIndex((h) => /^company name$/i.test(h));
  if (symIdx < 0) throw new Error(`Nifty Indices ${slug}: missing Symbol column`);

  const stocks = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const sym = cols[symIdx]?.replace(/^"|"$/g, '').trim();
    if (!sym) continue;
    const name = nameIdx >= 0 ? cols[nameIdx]?.replace(/^"|"$/g, '').trim() : sym;
    stocks.push({ ...toYahooByMarket(sym, name, market), marketCap: 0 });
  }
  return dedupeStocks(stocks);
}

export async function fetchCsv(url, market) {
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CSV ${url}: HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const symIdx = header.findIndex((h) => /^symbol$/i.test(h));
  const nameIdx = header.findIndex((h) => /^(security|company|name)$/i.test(h));
  if (symIdx < 0) throw new Error(`CSV missing Symbol column: ${url}`);

  const stocks = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const sym = cols[symIdx]?.replace(/^"|"$/g, '').trim();
    if (!sym) continue;
    const name = nameIdx >= 0 ? cols[nameIdx]?.replace(/^"|"$/g, '').trim() : sym;
    stocks.push({ ...toYahooByMarket(sym, name, market), marketCap: 0 });
  }
  return dedupeStocks(stocks);
}

export async function fetchWikipediaTable(page, market, { minRows = 10, maxRows = 600, section } = {}) {
  const sectionParam = section != null ? `&section=${section}` : '';
  const api = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&formatversion=2&format=json${sectionParam}`;
  const res = await fetchWithTimeout(api, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wikipedia ${page}: HTTP ${res.status}`);
  const data = await res.json();
  const html = data?.parse?.text ?? '';

  const stocks = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let symCol = 0;
  let nameCol = 1;
  let headerFound = false;

  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      stripHtml(m[1]),
    );
    if (cells.length === 0) continue;

    const lower = cells.map((c) => c.toLowerCase());
    if (
      lower.some((c) =>
        ['symbol', 'ticker', 'company', 'constituent', 'security', 'code'].includes(c),
      )
    ) {
      symCol = lower.findIndex((c) => c === 'symbol' || c === 'ticker' || c === 'code' || c.includes('ticker'));
      if (symCol < 0) symCol = lower.findIndex((c) => c === 'company' || c === 'constituent');
      if (symCol < 0) symCol = 0;
      nameCol = lower.findIndex((c) => c === 'company' || c === 'security' || c === 'name');
      if (nameCol < 0) nameCol = symCol === 0 ? 1 : 0;
      headerFound = true;
      continue;
    }

    if (!headerFound) continue;

    let sym = cells[symCol] ?? '';
    sym = sym.replace(/\[[^\]]*\]/g, '').trim();
    const rawToken = sym.split(/\s/)[0];
    const base = rawToken.replace(/\.(BO|NS|L|DE|PA|AX|HK|T)$/i, '').toUpperCase();
    if (!base || base.length > 12) continue;
    if (/^(COMPANY|SYMBOL|#|RANK|INDEX|TICKER|CODE)$/i.test(base)) continue;
    if (!/^[A-Z0-9.&-]+$/i.test(base)) continue;

    const name = cells[nameCol] ?? base;
    stocks.push({ ...toYahooByMarket(rawToken, name, market), marketCap: 0 });
    if (stocks.length >= maxRows) break;
  }

  const unique = dedupeStocks(stocks);
  if (unique.length < minRows) {
    throw new Error(`Wikipedia ${page}: only ${unique.length} constituents parsed`);
  }
  return unique;
}

export async function fetchFromRefreshSpec(spec) {
  if (spec.kind === 'niftyindices') {
    return fetchNiftyIndicesCsv(spec.csvSlug, spec.yahooMarket ?? 'nse');
  }
  if (spec.kind === 'csv') {
    return fetchCsv(spec.csvUrl, spec.yahooMarket ?? 'us');
  }
  if (spec.kind === 'wikipedia-table') {
    return fetchWikipediaTable(spec.wikiPage, spec.yahooMarket ?? 'us', {
      minRows: spec.minRows ?? 10,
      maxRows: spec.maxRows ?? 600,
      section: spec.wikiSection,
    });
  }
  throw new Error(`Unknown refresh kind: ${spec.kind}`);
}
