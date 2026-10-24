// Start screen: pick a project (system under test) or create one — like
// Obsidian's vault switcher.

import { useState, type FormEvent } from 'react';
import type { ProjectSummary, ToolInfo } from '../api';
import { GlobalDialog } from '../components/GlobalDialog';
import { IconBox, IconChevron, IconGlobe, IconPlus, IconUsers } from '../components/Icons';

interface Props {
  projects: ProjectSummary[];
  tools: ToolInfo[];
  version: string;
  onOpen: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onLibrary: () => void;
}

const onboarding: Record<string, string> = {
  'not-started': 'Context not started', partial: 'Context in progress', complete: 'Context complete',
};

export function Home({ projects, tools, version, onOpen, onCreate, onLibrary }: Props) {
  const [creating, setCreating] = useState(projects.length === 0);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showGlobal, setShowGlobal] = useState(false);
  const installed = tools.filter((t) => t.command && t.available);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await onCreate(name); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  };

  return (
    <div className="home">
      <aside className="home-list">
        <div className="home-list-head">Projects</div>
        {projects.length === 0 && <p className="muted small home-empty">No projects yet.</p>}
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <button type="button" className="home-project" onClick={() => onOpen(p.id)}>
                <span className="home-project-name">{p.name}</span>
                <span className="home-project-meta">
                  {onboarding[p.onboardingStatus] ?? p.onboardingStatus} · {p.runs} {p.runs === 1 ? 'activity' : 'activities'}
                  {p.openRuns > 0 && <span className="dot dot-warn" title={`${p.openRuns} open`} />}
                </span>
                <IconChevron size={16} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="home-main">
        <img className="hero" src="./hero.png" alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = './favicon.svg'; e.currentTarget.className = 'hero fallback'; }} />
        <h1>Quality Agents</h1>
        <p className="muted">Version {version}</p>

        <div className="home-actions">
          {!creating ? (
            <div className="home-action">
              <div>
                <strong>Create a new project</strong>
                <p className="muted small">One project per system you test. Its context and history stay on this computer.</p>
              </div>
              <button type="button" className="btn" onClick={() => setCreating(true)}><IconPlus size={16} /> Create</button>
            </div>
          ) : (
            <form className="home-action create" onSubmit={(e) => { void submit(e); }}>
              <label className="field">
                <strong>Project name</strong>
                <span className="muted small">The system under test, e.g. "Billing Portal".</span>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Billing Portal" maxLength={80} />
              </label>
              {error && <p className="error small">{error}</p>}
              <div className="row-actions">
                <button type="submit" className="btn" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create project'}</button>
                {projects.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => { setCreating(false); setError(''); }}>Cancel</button>}
              </div>
            </form>
          )}
          {projects.length > 0 && (
            <div className="home-action">
              <div>
                <strong>Open a project</strong>
                <p className="muted small">Choose one from the list on the left.</p>
              </div>
              <IconBox size={22} />
            </div>
          )}
          <div className="home-action">
            <div>
              <strong>Agent library</strong>
              <p className="muted small">The agents that do the work, by category. Duplicate one to make your own.</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={onLibrary}><IconUsers size={16} /> Agents</button>
          </div>
          <div className="home-action">
            <div>
              <strong>Skills &amp; agents for all projects</strong>
              <p className="muted small">Review or remove what is installed in your user folder (~/.claude, ~/.agents).</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setShowGlobal(true)}><IconGlobe size={16} /> Manage</button>
          </div>
        </div>

        <p className="muted small home-tools">
          {installed.length
            ? <>AI tools found: {installed.map((t) => t.label.replace(/ \(.*\)$/, '')).join(' · ')}</>
            : 'No AI tool found on this computer. Install Claude Code, Codex, Cursor or another supported tool.'}
        </p>
      </main>
      {showGlobal && <GlobalDialog onClose={() => setShowGlobal(false)} />}
    </div>
  );
}
