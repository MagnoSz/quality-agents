// Interface language: English (the source text) or Brazilian Portuguese. Texts are
// written in English and looked up in i18n/pt-BR.json; a missing translation shows
// the English text. Changing the language re-renders the whole app (App subscribes
// with useLang), so texts must be translated while rendering, never in module constants.

import { useSyncExternalStore } from 'react';
import { recall, remember } from './prefs';

export type Lang = 'en' | 'pt-BR';

let dict: Record<string, string> | null = null;
export let lang: Lang = 'en';
const listeners = new Set<() => void>();

// Only Portuguese loads a dictionary; English costs nothing. Anything that goes wrong
// (storage unavailable, unknown value, dictionary not loaded) falls back to English.
async function load(next: Lang): Promise<Lang> {
  dict = next === 'pt-BR' ? await import('./i18n/pt-BR.json').then((m) => m.default as Record<string, string>, () => null) : null;
  lang = dict ? 'pt-BR' : 'en';
  document.documentElement.lang = lang;
  return lang;
}
await load(recall('qa-ui-language') === 'pt-BR' ? 'pt-BR' : 'en');

// t('Back to {name}', { name }) — placeholders in braces are replaced after translating.
export const t = (text: string, vars?: Record<string, string | number>): string => {
  const s = dict && Object.hasOwn(dict, text) ? dict[text] : text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
};

export const setLang = async (next: Lang) => {
  remember('qa-ui-language', await load(next));
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useLang = (): Lang => useSyncExternalStore(subscribe, () => lang);

// The AI talks in the interface language until the user picks another one when opening the tool.
export const conversationLanguage = () => recall('qa-language') || (lang === 'pt-BR' ? 'Portuguese (pt-BR)' : 'English');
