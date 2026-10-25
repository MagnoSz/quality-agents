// AI tool catalog: every AI tool Moki can open, as cards, to choose "where" in the
// side panel. Same look as the activity catalog. Tools not found on this computer
// are shown greyed out, so the QA knows they exist and what to install.

import { useEffect } from 'react';
import type { ToolInfo } from '../api';
import { t } from '../i18n';
import { CatIcon } from './CatIcon';
import { IconX } from './Icons';

interface Props {
  tools: ToolInfo[]; // terminal and editor tools, installed or not
  selected: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

const toolName = (tool: ToolInfo) => t(tool.label).replace(/ \(.*\)$/, '');

export function ToolCatalog({ tools, selected, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Installed first, in the tool list's order.
  const list = [...tools.filter((x) => x.available), ...tools.filter((x) => !x.available)];

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal catalog" role="dialog" aria-modal="true" aria-labelledby="tool-catalog-title">
        <header className="modal-head">
          <div>
            <h2 id="tool-catalog-title">{t('Where should the AI work?')}</h2>
            <p className="muted small">{t('The AI tools Moki can open. Only the ones found on this computer can be chosen.')}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title={t('Close (Esc)')}><IconX size={18} /></button>
        </header>
        <div className="modal-body">
          <ul className="catalog-grid">
            {list.map((tool) => (
              <li key={tool.id}>
                <button type="button" className={`catalog-card${tool.id === selected ? ' on' : ''}`} disabled={!tool.available}
                  aria-pressed={tool.id === selected} onClick={() => { onPick(tool.id); onClose(); }}>
                  <span className="catalog-top">
                    <span className="catalog-num">{tool.kind === 'editor' ? t('Editor') : t('Terminal')}</span>
                    {tool.command && <span className="catalog-skill">{tool.command}</span>}
                  </span>
                  <span className="catalog-main">
                    <span className="catalog-emblem" aria-hidden="true"><CatIcon id={tool.kind === 'editor' ? 'code' : 'terminal'} size={64} /></span>
                    <span className="catalog-text">
                      <span className="catalog-title">{toolName(tool)}</span>
                      <span className="catalog-hint">{tool.kind === 'editor'
                        ? t('Opens your editor with its AI. The request is copied: paste it in the AI chat.')
                        : t('Opens in a terminal tab here, with the project context loaded.')}</span>
                    </span>
                  </span>
                  <span className="catalog-tags">
                    <span className={`catalog-tag${tool.available ? '' : ' muted-tag'}`}>{tool.available ? t('Installed') : t('Not installed')}</span>
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
