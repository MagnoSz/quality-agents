// A new file or folder inside a project folder, from the tree menu. Files are
// Markdown (.md, added when the name has no extension) or text (.txt).

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { t } from '../i18n';
import { IconX } from './Icons';

interface Props { project: string; parent: string; kind: 'file' | 'folder'; onClose: () => void; onCreated: (path: string) => void }

export function NewEntryDialog({ project, parent, kind, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { onCreated(await api.createEntry(project, parent, name, kind)); } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false); }
  };

  const where = parent || t('the project folder');
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal compact" role="dialog" aria-modal="true" aria-labelledby="new-entry-title" onSubmit={(e) => { void submit(e); }}>
        <header className="modal-head">
          <div>
            <h2 id="new-entry-title">{kind === 'file' ? t('New file') : t('New folder')}</h2>
            <p className="muted small">{t('In {folder}', { folder: where })}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title={t('Close (Esc)')}><IconX size={18} /></button>
        </header>
        <div className="modal-body">
          <label className="field">
            <span>{t('Name')}</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="off" spellCheck={false}
              placeholder={kind === 'file' ? t('e.g. login-scenarios.md') : t('e.g. sprint-12')} />
            {kind === 'file' && <span className="muted small">{t('Markdown (.md) or text (.txt). Without an extension it becomes .md.')}</span>}
          </label>
          {error && <p className="error small">{error}</p>}
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('Cancel')}</button>
          <button type="submit" className="btn" disabled={busy || !name.trim()}>{busy ? t('Creating…') : t('Create')}</button>
        </footer>
      </form>
    </div>
  );
}
