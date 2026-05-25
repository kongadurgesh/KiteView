import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BUNDLED_REFRESH_SPECS } from '../backend/constituentRefreshConfig.js';
import { dedupeStocks, fetchFromRefreshSpec } from '../backend/constituentFetchers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'constituents');
const TODAY = new Date().toISOString().slice(0, 10);

mkdirSync(OUT_DIR, { recursive: true });

function writeBundle(indexId, spec, stocks, source) {
  const payload = {
    indexId,
    label: spec.label,
    group: spec.group,
    source,
    asOf: TODAY,
    isProxy: false,
    stocks,
  };
  writeFileSync(join(OUT_DIR, `${indexId}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

async function refreshOne(indexId, spec) {
  const stocks = dedupeStocks(await fetchFromRefreshSpec(spec));
  writeBundle(indexId, spec, stocks, spec.kind);
  console.log(`✓ ${indexId}: ${stocks.length} stocks (${spec.kind})`);
  return { indexId, count: stocks.length, source: spec.kind, asOf: TODAY, isProxy: false };
}

async function main() {
  const manifest = { asOf: TODAY, indices: [] };
  const failures = [];

  for (const [indexId, spec] of Object.entries(BUNDLED_REFRESH_SPECS)) {
    try {
      const entry = await refreshOne(indexId, spec);
      manifest.indices.push(entry);
    } catch (err) {
      failures.push({ indexId, error: err.message });
      console.error(`✗ ${indexId}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nManifest: ${manifest.indices.length} ok, ${failures.length} failed`);
  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

main();
