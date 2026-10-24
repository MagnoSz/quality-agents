// Small per-user UI preferences (last tool, language, skill scope). Storage may be unavailable.

export const remember = (key: string, value: string) => { try { window.localStorage.setItem(key, value); } catch { /* optional */ } };
export const recall = (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } };
