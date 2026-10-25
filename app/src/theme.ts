// Light or dark appearance. A saved choice wins; until the user picks one, the
// app follows the operating system. theme.ts writes data-theme on <html>.

export type Theme = 'light' | 'dark';

const KEY = 'qa-theme';

export function systemTheme(): Theme {
  try { return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch { return 'dark'; }
}

export function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch { return null; }
}

export function currentTheme(): Theme {
  return savedTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function persistTheme(theme: Theme): void {
  try { localStorage.setItem(KEY, theme); } catch { /* optional */ }
  applyTheme(theme);
}

// Call once, before the first render, so the window does not flash the wrong palette.
export function installTheme(): void {
  const apply = () => applyTheme(savedTheme() ?? systemTheme());
  apply();
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (!savedTheme()) apply(); });
  } catch { /* optional */ }
}
