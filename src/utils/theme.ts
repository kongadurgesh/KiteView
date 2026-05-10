type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kiteview-theme';

export function getTheme(): ThemePref {
  return (localStorage.getItem(STORAGE_KEY) as ThemePref) ?? 'system';
}

export function setTheme(pref: ThemePref): void {
  localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

function applyTheme(pref: ThemePref): void {
  const isDark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function initTheme(): void {
  applyTheme(getTheme());
  // Listen for system changes when set to 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system');
  });
}

export function cycleTheme(): ThemePref {
  const order: ThemePref[] = ['system', 'light', 'dark'];
  const current = getTheme();
  const next = order[(order.indexOf(current) + 1) % order.length];
  setTheme(next);
  return next;
}
