type ThemePref = 'light' | 'dark';

const STORAGE_KEY = 'kiteview-theme';

export function getTheme(): ThemePref {
  return (localStorage.getItem(STORAGE_KEY) as ThemePref) ?? 'dark';
}

export function setTheme(pref: ThemePref): void {
  localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

function applyTheme(pref: ThemePref): void {
  document.documentElement.classList.toggle('dark', pref === 'dark');
}

export function initTheme(): void {
  applyTheme(getTheme());
}

export function toggleTheme(): ThemePref {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
