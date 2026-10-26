// First screen: choose the workspace to open, like Obsidian's vault switcher.
// A workspace is a folder with its own projects, tags and settings.

import { useEffect, useState, type FormEvent } from 'react';
import { api, type WorkspaceInfo } from '../api';
import { t } from '../i18n';
import { StartPrefs } from '../components/PrefsCorner';
import { AddButton } from '../components/AddButton';
import { IconChevron, IconEdit, IconOpenProject, IconX } from '../components/Icons';

interface Props { version: string; onOpen: (workspace: WorkspaceInfo) => void }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const CAT = `./${encodeURIComponent('Curious Cat Peeking in a Box.png')}`;

export function WorkspacePicker({ version, onOpen }: Props) {
  const [list, setList] = useState<WorkspaceInfo[]>([]);
  const [active, setActive] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState<string | null>(null); // null: inside the Moki folder
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.workspaces().then((r) => { setList(r.list); setActive(r.active); }).catch((e) => setError(message(e)));
  useEffect(() => { void load(); }, []);

  const run = async (fn: () => Promise<WorkspaceInfo | null>) => {
    setBusy(true); setError('');
    try { const w = await fn(); if (w) onOpen(w); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };

  const create = (e: FormEvent) => { e.preventDefault(); void run(() => api.createWorkspace(name, location)); };
  const rename = async (e: FormEvent) => {
    e.preventDefault();
    if (!renaming) return;
    try { await api.renameWorkspace(renaming.id, renaming.name); setRenaming(null); await load(); } catch (err) { setError(message(err)); }
  };
  const forget = async (w: WorkspaceInfo) => {
    if (!window.confirm(t('Remove {name} from the list? Its folder and files stay on this computer: {path}', { name: w.name, path: w.path }))) return;
    try { await api.forgetWorkspace(w.id); await load(); } catch (e) { setError(message(e)); }
  };
  const pickLocation = () => { api.chooseWorkspaceLocation().then((p) => { if (p) setLocation(p); }).catch((e) => setError(message(e))); };

  return (
    <div className="picker">
      <StartPrefs />
      <main className="picker-main">
        <img className="picker-cat" src={CAT} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <h1>Moki</h1>
        <p className="muted">{t('Choose a workspace')} · {t('Version {version}', { version })}</p>

        {error && <p className="error small" role="alert">{error}</p>}

        <ul className="picker-list">
          {list.map((w) => (
            <li key={w.id} className="picker-row">
              {renaming?.id === w.id ? (
                <form className="picker-rename" onSubmit={(e) => { void rename(e); }}>
                  <input autoFocus value={renaming.name} maxLength={60} aria-label={t('Workspace name')}
                    onChange={(e) => setRenaming({ id: w.id, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null); }} />
                  <button type="submit" className="btn btn-sm" disabled={!renaming.name.trim()}>{t('Save')}</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>{t('Cancel')}</button>
                </form>
              ) : <>
                <button type="button" className={`picker-open${w.id === active ? ' last' : ''}`} disabled={busy || w.missing}
                  onClick={() => { void run(() => api.selectWorkspace(w.id)); }} title={w.path}>
                  <span className="picker-name">{w.name}</span>
                  <span className="picker-meta">
                    {w.missing ? t('Folder not found') : `${w.projects} ${w.projects === 1 ? t('project') : t('projects')}`}
                    {w.id === active && <> · {t('last opened')}</>}
                  </span>
                  <span className="picker-path">{w.path}</span>
                  <IconChevron size={16} />
                </button>
                <button type="button" className="icon-btn" title={t('Rename')} aria-label={t('Rename {name}', { name: w.name })} onClick={() => setRenaming({ id: w.id, name: w.name })}><IconEdit size={14} /></button>
                {!w.isDefault && <button type="button" className="icon-btn" title={t('Remove from the list')} aria-label={t('Remove {name} from the list', { name: w.name })} onClick={() => { void forget(w); }}><IconX size={14} /></button>}
              </>}
            </li>
          ))}
        </ul>

        <div className="home-actions picker-actions">
          {!creating ? (
            <div className="home-action">
              <div>
                <strong>{t('Create a new workspace')}</strong>
                <p className="muted small">{t('A separate place for other projects, with its own tags and settings.')}</p>
              </div>
              <AddButton size="lg" title={t('Create')} onClick={() => setCreating(true)} />
            </div>
          ) : (
            <form className="home-action create" onSubmit={create}>
              <label className="field">
                <strong>{t('Workspace name')}</strong>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Client X')} maxLength={60} />
              </label>
              <div className="field">
                <span className="label">{t('Where')}</span>
                <span className="row-actions">
                  <code className="small">{location ?? t('In the Moki folder (workspaces/)')}</code>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={pickLocation}>{t('Change…')}</button>
                  {location && <button type="button" className="icon-btn" onClick={() => setLocation(null)} title={t('Back to the Moki folder')}><IconX size={14} /></button>}
                </span>
              </div>
              <div className="row-actions">
                <button type="submit" className="btn" disabled={busy || !name.trim()}>{busy ? t('Creating…') : t('Create workspace')}</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setCreating(false); setName(''); setLocation(null); setError(''); }}>{t('Cancel')}</button>
              </div>
            </form>
          )}
          <div className="home-action">
            <div>
              <strong>{t('Open a folder as a workspace')}</strong>
              <p className="muted small">{t('A folder you already have. Moki adds a projects folder inside it.')}</p>
            </div>
            <button type="button" className="home-action-icon" disabled={busy} onClick={() => { void run(() => api.openWorkspaceFolder()); }}
              title={t('Open a folder as a workspace')} aria-label={t('Open a folder as a workspace')}><IconOpenProject size={20} /></button>
          </div>
        </div>
      </main>
    </div>
  );
}
