// Deleting a project for good: the button only works after the word "delete"
// is typed, so it never happens by a stray click.

import { useEffect, useState, type FormEvent } from 'react';
import { api, type ProjectSummary } from '../api';
import { t } from '../i18n';
import { IconX } from './Icons';

const WORD = 'delete';

interface Props { project: ProjectSummary; onClose: () => void; onDeleted: () => void }

export function DeleteProjectDialog({ project, onClose, onDeleted }: Props) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (typed !== WORD) return;
    setBusy(true); setError('');
    try { await api.deleteProject(project.id, typed); onDeleted(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className="modal compact" role="dialog" aria-modal="true" aria-labelledby="delete-title" onSubmit={(e) => { void submit(e); }}>
        <header className="modal-head">
          <h2 id="delete-title">{t('Delete {name}', { name: project.name })}</h2>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy} title={t('Close (Esc)')}><IconX size={18} /></button>
        </header>
        <div className="modal-body">
          <p>{t('The project folder, with its context, notes, activities and evidence, is deleted from this computer. It does not go to the trash and cannot be undone.')}</p>
          {project.repository && <p className="muted small">{t('The linked folder {folder} is not touched.', { folder: project.repository })}</p>}
          <label className="field">
            <span>{t('Type {word} to confirm', { word: WORD })}</span>
            <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={WORD} autoComplete="off" spellCheck={false} disabled={busy} />
          </label>
          {error && <p className="error small">{error}</p>}
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('Cancel')}</button>
          <button type="submit" className="btn btn-danger" disabled={busy || typed !== WORD}>{busy ? t('Deleting…') : t('Delete for good')}</button>
        </footer>
      </form>
    </div>
  );
}
