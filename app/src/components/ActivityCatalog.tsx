// Activity catalog: every activity as a card, to choose "what to do" in the side panel.
// An activity is an entry point; each one runs one of Moki's own skills (several
// activities can share a skill, e.g. "Project context" and "Prepare the project").
// Each card shows the activity's cat from the cat library (icons/cats.ts).

import { useEffect } from 'react';
import type { ActivityInfo } from '../api';
import { t } from '../i18n';
import { ACTIVITY_CAT } from '../icons/cats';
import { CatIcon } from './CatIcon';
import { IconX } from './Icons';

interface Props {
  activities: ActivityInfo[];
  selected: string;
  onPick: (id: string) => void;
  onClose: () => void;
  blocked?: (activity: ActivityInfo) => string | null; // a reason when it cannot be chosen here
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function ActivityCatalog({ activities, selected, onPick, onClose, blocked }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = activities.filter((a) => a.id !== 'resume');

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal catalog" role="dialog" aria-modal="true" aria-labelledby="catalog-title">
        <header className="modal-head">
          <div>
            <h2 id="catalog-title">{t('What do you want to do?')}</h2>
            <p className="muted small">{t('Each activity runs one of the skills that come with Moki.')}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title={t('Close (Esc)')}><IconX size={18} /></button>
        </header>
        <div className="modal-body">
          <ul className="catalog-grid">
            {list.map((a, i) => (
              <li key={a.id}>
                <button type="button" className={`catalog-card${a.id === selected ? ' on' : ''}`} disabled={!a.available || Boolean(blocked?.(a))}
                  aria-pressed={a.id === selected} onClick={() => { onPick(a.id); onClose(); }}>
                  <span className="catalog-top">
                    <span className="catalog-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="catalog-skill">{a.skill}</span>
                  </span>
                  <span className="catalog-main">
                    <span className="catalog-emblem" aria-hidden="true"><CatIcon id={ACTIVITY_CAT[a.id] ?? 'run'} size={64} /></span>
                    <span className="catalog-text">
                      <span className="catalog-title">{t(a.label)}</span>
                      {a.hint && <span className="catalog-hint">{capitalize(t(a.hint))}</span>}
                    </span>
                  </span>
                  <span className="catalog-tags">
                    {!a.available ? <span className="catalog-tag muted-tag">{t('Not available yet')}</span>
                      : blocked?.(a) ? <span className="catalog-tag muted-tag">{blocked(a)}</span>
                      : a.needsFiles ? <span className="catalog-tag">{t('Uses inbox files')}</span>
                        : <span className="catalog-tag">{t('Starts right away')}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
