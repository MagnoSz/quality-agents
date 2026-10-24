// "Global" tab: the skills and agents installed for all projects (the user's
// folder), to review, open or remove. Removing moves them to the trash.
// Installing and creating stay in Find skills and Create agent.

import { useCallback, useEffect, useState } from 'react';
import { api, type GlobalItems } from '../api';
import { IconFolder, IconPlus, IconSearch } from './Icons';

interface Props { onFindSkills?: () => void; onCreateAgent?: () => void } // without them (start screen) the buttons are hidden

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function GlobalPanel({ onFindSkills, onCreateAgent }: Props) {
  const [items, setItems] = useState<GlobalItems | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => { api.globalItems().then(setItems).catch((e) => setError(message(e))); }, []);
  useEffect(load, [load]);

  const open = (kind: 'skill' | 'agent', name: string) => { setError(''); api.openGlobal(kind, name).catch((e) => setError(message(e))); };

  const remove = async (kind: 'skill' | 'agent', name: string, linkedBy: string[] = []) => {
    const used = linkedBy.length ? `\n\nLinked by: ${linkedBy.join(', ')}. Those projects stop naming it in their requests.` : '';
    if (!window.confirm(`Remove the ${kind} "${name}" from all projects? It goes to the trash.${used}`)) return;
    setBusy(`${kind}:${name}`); setError('');
    try { await api.removeGlobal(kind, name); load(); } catch (e) { setError(message(e)); } finally { setBusy(''); }
  };

  const actions = (kind: 'skill' | 'agent', name: string, linkedBy?: string[]) => (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => open(kind, name)} title={kind === 'skill' ? 'Open its folder' : 'Open the agent file'}><IconFolder size={15} /> Open</button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={Boolean(busy)} onClick={() => { void remove(kind, name, linkedBy); }}>
        {busy === `${kind}:${name}` ? 'Removing…' : 'Remove'}
      </button>
    </>
  );

  return (
    <>
      {error && <div className="result warn" role="status"><p className="result-title">{error}</p></div>}

      <section className="field">
        <div className="skill-card-head">
          <span className="label">Skills ({items?.skills.length ?? 0})</span>
          <span className="statusbar-spacer" />
          {onFindSkills && <button type="button" className="btn btn-sm" onClick={onFindSkills}><IconSearch size={15} /> Find skills for all projects</button>}
        </div>
        {items && !items.skills.length && <p className="muted small">No skills installed for all projects.</p>}
        <ul className="skill-list">
          {items?.skills.map((s) => (
            <li key={s.name} className="skill-card">
              <div className="skill-card-head">
                <span className="choice-title">{s.name}</span>
                <span className="statusbar-spacer" />
                {actions('skill', s.name, s.linkedBy)}
              </div>
              {s.description && <p className="skill-desc small">{s.description}</p>}
              <div className="chips">
                {s.folders.map((f) => <span key={f} className="chip" title={f}>{f.includes('.agents') ? '~/.agents/skills' : '~/.claude/skills'}</span>)}
                {s.linkedBy.length > 0 && <span className="chip" title={s.linkedBy.join(', ')}>Linked by {s.linkedBy.length} project{s.linkedBy.length === 1 ? '' : 's'}</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="field">
        <div className="skill-card-head">
          <span className="label">Agents ({items?.agents.length ?? 0})</span>
          <span className="statusbar-spacer" />
          {onCreateAgent && <button type="button" className="btn btn-sm" onClick={onCreateAgent}><IconPlus size={15} /> Create an agent for all projects</button>}
        </div>
        {items && !items.agents.length && <p className="muted small">No agents for all projects.</p>}
        <ul className="skill-list">
          {items?.agents.map((a) => (
            <li key={a.name} className="skill-card">
              <div className="skill-card-head">
                <span className="choice-title">{a.name}</span>
                <span className="statusbar-spacer" />
                {actions('agent', a.name)}
              </div>
              {a.description && <p className="skill-desc small">{a.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
