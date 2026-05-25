import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchFromRefreshSpec } from './constituentFetchers.js';
import { getRefreshSpec } from './constituentRefreshConfig.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLED_DIR = join(ROOT, 'data', 'constituents');

export function bundledJsonPath(indexId) {
  return join(BUNDLED_DIR, `${indexId}.json`);
}

export function loadBundledConstituents(indexId) {
  const path = bundledJsonPath(indexId);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function resolveBundledConstituents(indexId) {
  const spec = getRefreshSpec(indexId);
  if (!spec) return null;

  const cached = loadBundledConstituents(indexId);
  if (cached?.stocks?.length) {
    return cached;
  }

  const stocks = await fetchFromRefreshSpec(spec);
  return {
    indexId,
    label: spec.label,
    group: spec.group,
    source: spec.kind,
    asOf: new Date().toISOString().slice(0, 10),
    isProxy: false,
    stocks,
  };
}
