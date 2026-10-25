// Interface language: English (the source text) or Brazilian Portuguese. Texts are
// written in English and looked up in i18n/pt-BR.json; a missing translation shows
// the English text. Changing the language re-renders the whole app (App subscribes
// with useLang), so texts must be translated while rendering, never in module constants.

import { useSyncExternalStore } from 'react';
import { recall, remember } from './prefs';
import ptBR from './i18n/pt-BR.json';

export type Lang = 'en' | 'pt-BR';

// Inlined on purpose. A dynamic import() is a separate file, and Electron loads this
// UI from file:// — that fetch fails, the failure was swallowed, and the app stayed
// in English no matter which language the user picked.
const PT_BR = ptBR as Record<string, string>;

let dict: Record<string, string> | null = null;
export let lang: Lang = 'en';
const listeners = new Set<() => void>();

function apply(next: Lang): Lang {
  dict = next === 'pt-BR' ? PT_BR : null;
  lang = next === 'pt-BR' ? 'pt-BR' : 'en';
  document.documentElement.lang = lang;
  return lang;
}
apply(recall('qa-ui-language') === 'pt-BR' ? 'pt-BR' : 'en');

// t('Back to {name}', { name }) — placeholders in braces are replaced after translating.
export const t = (text: string, vars?: Record<string, string | number>): string => {
  const s = dict && Object.hasOwn(dict, text) ? dict[text] : text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
};

export const setLang = (next: Lang): void => {
  remember('qa-ui-language', apply(next));
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useLang = (): Lang => useSyncExternalStore(subscribe, () => lang);

// The AI talks in the interface language until the user picks another one when opening the tool.
export const conversationLanguage = () => recall('qa-language') || (lang === 'pt-BR' ? 'Portuguese (pt-BR)' : 'English');
