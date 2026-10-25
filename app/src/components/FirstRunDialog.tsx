// First launch, when no language has been saved yet. The same choices stay
// in the top-right corner of the start screen afterwards.

import { useEffect, useState } from 'react';
import { UI_LANGUAGES } from './PrefsCorner';
import { IconMoon, IconSun } from './Icons';
import { t } from '../i18n';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  onLanguage: (language: string) => void;
  onTheme: (theme: Theme) => void;
}

export function FirstRunDialog({ theme, onLanguage, onTheme }: Props) {
  const [language, setLanguage] = useState('');
  const light = theme === 'light';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') e.preventDefault(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="modal-backdrop">
      <div className="modal compact" role="dialog" aria-modal="true" aria-labelledby="firstrun-title">
        <header className="modal-head">
          <div>
            <h2 id="firstrun-title">{t('Choose your language and theme')}</h2>
            <p className="muted small">{t('The language is the one the AI talks to you in. You can change both later, in the top-right corner of the start screen.')}</p>
          </div>
        </header>
        <div className="modal-body">
          <label className="field">
            <span className="label">{t('Language')}</span>
            <select autoFocus value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="">{t('Choose a language')}</option>
              {UI_LANGUAGES.map(([id, short]) => <option key={id} value={id}>{short}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">{t('Theme')}</span>
            <button type="button" className={`theme-toggle${light ? ' is-light' : ''}`}
              aria-label={light ? t('Light') : t('Dark')} aria-pressed={light}
              title={light ? t('Light') : t('Dark')} onClick={() => onTheme(light ? 'dark' : 'light')}>
              <span className="theme-toggle-knob">{light ? <IconSun size={13} /> : <IconMoon size={13} />}</span>
            </button>
          </label>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn" disabled={!language} onClick={() => onLanguage(language)}>{t('Continue')}</button>
        </footer>
      </div>
    </div>
  );
}
