// "Set up the project": what it is for, in the QA's own words, and which global
// skills it uses (linked by name, nothing copied). New skills come from the
// registry (Find skills, prefilled with the description); the AI tool can then
// adapt the context to the description ("Prepare the project" activity).

import { useCallback, useEffect, useState } from 'react';
import { api, type ProjectSummary } from '../api';
import { SkillsDialog } from './SkillsDialog';
import { IconSearch, IconX } from './Icons';

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onSaved: (prepare: boolean) => void; // prepare: open the AI tool to adapt the context
}

export function SetupDialog({ project, onClose, onSaved }: Props) {
  const [description, setDescription] = useState(project.description);
  const [global, setGlobal] = useState<string[]>([]);
  const [linked, setLinked] = useState<string[]>(project.linkedSkills);
  const [prepare, setPrepare] = useState(true);
  const [finding, setFinding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadGlobal = useCallback(() => { api.installedSkills(project.id).then((s) => setGlobal(s.global)).catch(() => { /* keep */ }); }, [project.id]);
  useEffect(loadGlobal, [loadGlobal]);

  // While Find skills is open on top, Escape belongs to it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !finding) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finding, onClose]);

  const toggle = (name: string) => setLinked((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  const canPrepare = Boolean(description.trim());

  const save = async () => {
    setBusy(true); setError('');
    try {
      // Links to skills that are no longer installed are dropped.
      await api.setupProject(project.id, { description, linkedSkills: linked.filter((n) => global.includes(n)) });
      onSaved(prepare && canPrepare);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  return (<>
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <header className="modal-head">
          <div>
            <h2 id="setup-title">Set up {project.name}</h2>
            <p className="muted small">Say what this project is for and choose the skills it uses. You can change this later.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="Close (Esc)"><IconX size={18} /></button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span className="label">What do you want to do? (optional)</span>
            <textarea rows={3} maxLength={2000} autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder='e.g. "I want to start a project with React"' />
          </label>

          <div className="field">
            <span className="label">Skills for all projects to use here</span>
            <span className="muted small">Linked by name: requests from this project tell the AI to use them. Nothing is copied.</span>
            {global.length === 0 ? <p className="muted small">No skills installed for all projects yet.</p> : (
              <ul className="file-pick">
                {global.map((n) => (
                  <li key={n}>
                    <label className={linked.includes(n) ? 'on' : ''}>
                      <input type="checkbox" checked={linked.includes(n)} onChange={() => toggle(n)} />
                      <span className="file-name">{n}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="row-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFinding(true)}><IconSearch size={15} /> Find new skills</button>
            </div>
          </div>

          <label className="field inline">
            <input type="checkbox" checked={prepare && canPrepare} disabled={!canPrepare} onChange={(e) => setPrepare(e.target.checked)} />
            <span>Then ask the AI to adapt the project context to this description (it proposes, you approve)</span>
          </label>
          {error && <p className="error small">{error}</p>}
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Skip</button>
          <button type="button" className="btn" disabled={busy} onClick={() => { void save(); }}>{busy ? 'Saving…' : 'Save'}</button>
        </footer>
      </div>
    </div>
    {finding && <SkillsDialog project={project} initialQuery={description} onClose={() => { setFinding(false); loadGlobal(); }} />}
  </>);
}
