// Top-right of the start screen: the language the AI talks in, and light or dark.
// Siglas only, no labels. The theme applies to the whole app.

import { IconMoon, IconSun } from './Icons';
import { t } from '../i18n';
import type { Theme } from '../theme';

export const UI_LANGUAGES: [string, string][] = [
  ['English', 'EN'],
  ['Portuguese (pt-BR)', 'PT-BR'],
  ['Spanish', 'ES'],
];

interface Props {
  language: string;
  theme: Theme;
  onLanguage: (language: string) => void;
  onTheme: (theme: Theme) => void;
}

export function PrefsCorner({ language, theme, onLanguage, onTheme }: Props) {
  const light = theme === 'light';
  return (
    <div className="home-corner">
      <select className="lang-select" aria-label={t('Language the AI talks to you in')} title={t('Language the AI talks to you in')} value={language}
        onChange={(e) => onLanguage(e.target.value)}>
        {UI_LANGUAGES.map(([id, short]) => <option key={id} value={id}>{short}</option>)}
      </select>
      <button type="button" className={`theme-toggle${light ? ' is-light' : ''}`}
        aria-label={light ? t('Light') : t('Dark')} aria-pressed={light}
        title={light ? t('Light') : t('Dark')} onClick={() => onTheme(light ? 'dark' : 'light')}>
        <span className="theme-toggle-knob">{light ? <IconSun size={13} /> : <IconMoon size={13} />}</span>
      </button>
    </div>
  );
}
