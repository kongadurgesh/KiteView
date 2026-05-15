export type CapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Unknown';

export const CAP_CATEGORY_ORDER: CapCategory[] = ['Large Cap', 'Mid Cap', 'Small Cap', 'Unknown'];

export function getCapCategory(marketCapCr: number): CapCategory {
  if (!marketCapCr || marketCapCr <= 0) return 'Unknown';
  if (marketCapCr >= 20000) return 'Large Cap';
  if (marketCapCr >= 5000) return 'Mid Cap';
  return 'Small Cap';
}

export function capCategoryColor(category: CapCategory): string {
  switch (category) {
    case 'Large Cap':
      return '#2563eb';
    case 'Mid Cap':
      return '#14b8a6';
    case 'Small Cap':
      return '#64748b';
    case 'Unknown':
      return '#f59e0b';
  }
}

export function capCategoryBadgeClass(category: CapCategory): { label: CapCategory; color: string } {
  switch (category) {
    case 'Large Cap':
      return {
        label: category,
        color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/15',
      };
    case 'Mid Cap':
      return {
        label: category,
        color: 'text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-500/15',
      };
    case 'Small Cap':
      return {
        label: category,
        color: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
      };
    case 'Unknown':
      return {
        label: category,
        color: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15',
      };
  }
}
