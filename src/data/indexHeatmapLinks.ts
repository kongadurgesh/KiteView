import { getHeatmapIndexOption } from './heatmapIndices';
import type { IndexCategory, IndexInstrument } from './indicesCatalog';

export function heatmapIndexIdFor(instrument: IndexInstrument): string | null {
  if (instrument.category !== 'indian' && instrument.category !== 'global') return null;
  return getHeatmapIndexOption(instrument.id) ? instrument.id : null;
}

export function indexCategoryOpensHeatmap(category: IndexCategory): boolean {
  return category === 'indian' || category === 'global';
}
