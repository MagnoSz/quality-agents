// "Skills & agents": the Find skills tab searches the public SkillMD registry by
// free text or a preset category and installs a chosen skill for this project
// only or for all projects; the Create agent tab builds agents from those skills;
// This repository removes what is installed only for this project; the Global
// tab reviews what is installed for all projects.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, type InstallResult, type ProjectSummary, type RegistrySkill, type SkillScope, type SkillSearchPage } from '../api';
import { recall, remember } from '../prefs';
import { AgentForm } from './AgentForm';
import { GlobalPanel } from './GlobalPanel';
import { IconCheck, IconExternal, IconSearch, IconX } from './Icons';
import { ProjectPanel } from './ProjectPanel';

interface Props { project: ProjectSummary; initialQuery?: string; onClose: () => void }

type Tab = 'find' | 'agent' | 'repo' | 'global';
const TABS: { id: Tab; label: string; intro: string; scopeLabel: string }[] = [
  { id: 'find', label: 'Find skills', intro: 'Search the public SkillMD registry and install only what you need. Skills are third-party content.', scopeLabel: 'Install for' },
  { id: 'agent', label: 'Create agent', intro: 'Describe an agent in your own words and choose which installed skills it may use.', scopeLabel: 'Create for' },
  { id: 'repo', label: 'This repository', intro: 'Skills and agents installed only for this project. Remove what it no longer needs.', scopeLabel: '' },
  { id: 'global', label: 'Global', intro: 'Skills and agents installed for all projects, in your user folder. Every AI tool on this computer can use them.', scopeLabel: '' },
];

// Preset searches: a registry category, or a query where the registry has no category (QA).
const PRESETS: { label: string; query: string; category: string }[] = [
  { label: 'Programming', query: '', category: 'coding' },
  { label: 'Design', query: '', category: 'design' },
  { label: 'QA & testing', query: 'testing', category: '' },
  { label: 'Security', query: '', category: 'security' },
  { label: 'Docs & writing', query: '', category: 'docs' },
];

const AUDIT: Record<string, { label: string; cls: string }> = {
  pass: { label: 'Audit passed', cls: 'pill-completed' },
  caution: { label: 'Audit: caution', cls: 'pill-in-progress' },
  warning: { label: 'Audit: warning', cls: 'pill-blocked' },
};
const audit = (v: string | null) => (v && AUDIT[v]) || { label: 'Not audited', cls: '' };
// The skill's public page (description, files, audit); slugs are validated owner/name pairs.
const skillPage = (slug: string) => `https://skillmd.com/skills/${slug}`;

export function SkillsDialog({ project, initialQuery = '', onClose }: Props) {
  const [tab, setTab] = useState<Tab>('find');
  const [query, setQuery] = useState(initialQuery.slice(0, 200));
  const [preset, setPreset] = useState('');
  const [scope, setScope] = useState<SkillScope>(recall('qa-skill-scope') === 'global' ? 'global' : 'project');
  const [criteria, setCriteria] = useState({ query: '', category: '' }); // of the results shown, for paging
  const [results, setResults] = useState<SkillSearchPage | null>(null);
  const listTop = useRef<HTMLDivElement>(null);
  const [installed, setInstalled] = useState<{ project: string[]; global: string[] }>({ project: [], global: [] });
  const [busy, setBusy] = useState('');
  const [loadingPage, setLoadingPage] = useState(1);
  const [done, setDone] = useState<InstallResult | null>(null);
  const [error, setError] = useState('');

  const loadInstalled = useCallback(() => { api.installedSkills(project.id).then(setInstalled).catch(() => { /* keep */ }); }, [project.id]);
  useEffect(loadInstalled, [loadInstalled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The current page stays visible while the next one loads; status and errors show above the list.
  const search = async (q: string, category: string, page = 1) => {
    setBusy('search'); setLoadingPage(page); setError(''); setDone(null);
    listTop.current?.scrollIntoView({ block: 'start' });
    try {
      setResults(await api.searchSkills(q, category, page));
      setCriteria({ query: q, category });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };
  const goTo = (page: number) => { void search(criteria.query, criteria.category, page); };

  const submit = (e: FormEvent) => { e.preventDefault(); setPreset(''); if (query.trim()) void search(query, ''); };

  const install = async (s: RegistrySkill) => {
    const toClaude = scope === 'project' && Boolean(project.repository);
    const where = scope !== 'project' ? 'all projects (your user folder)'
      : toClaude ? `the project ${project.name}?\n\nThis CHANGES ${project.repository}/.claude: the skill is written to its skills folder (the current .claude is backed up to the project's backups/ first)` : `the project ${project.name}`;
    const warning = s.verdict === 'pass' ? '' : `\n\nThe registry ${s.verdict ? `flagged this skill (${s.verdict})` : 'has not audited this skill'}. A skill can instruct the AI to run commands — review it before using it.`;
    if (!window.confirm(`Install "${s.title}" (${s.slug}) for ${where}${toClaude ? '.' : '?'}${warning}`)) return;
    setBusy(s.slug); setError(''); setDone(null);
    try { setDone(await api.installSkill(project.id, s.slug, scope, toClaude)); loadInstalled(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(''); }
  };

  const isInstalled = (slug: string) => installed[scope].includes(slug.split('/')[1]);
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const openTab = (id: Tab) => { setTab(id); if (id === 'find') loadInstalled(); };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="skills-title">
        <header className="modal-head">
          <div>
            <h2 id="skills-title">Skills &amp; agents</h2>
            <p className="muted small">{current.intro}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="Close (Esc)"><IconX size={18} /></button>
        </header>

        <div className="dialog-tabs" role="tablist" aria-label="Skills and agents">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`dialog-tab${tab === t.id ? ' on' : ''}`} onClick={() => openTab(t.id)}>
              {t.id === 'repo' && !project.repository ? 'This project' : t.label}
            </button>
          ))}
        </div>

        <div className="modal-body" role="tabpanel">
          {tab !== 'global' && tab !== 'repo' && <div className="field inline">
            <span className="label">{current.scopeLabel}</span>
            <div className="choice-grid scope-grid">
              {([
                ['project', project.repository ? 'This repository only' : 'This project only', project.repository ? `${project.repository}/.claude/${tab === 'agent' ? 'agents' : 'skills'}` : project.name],
                ['global', 'All projects', tab === 'agent' ? 'your user folder (~/.claude/agents)' : 'your user folder, every AI tool'],
              ] as const).map(([id, title, hint]) => (
                <label key={id} className={`choice${scope === id ? ' on' : ''}`}>
                  <input type="radio" name="scope" checked={scope === id} onChange={() => { setScope(id); remember('qa-skill-scope', id); }} />
                  <span className="choice-title">{title}</span>
                  <span className="choice-hint">{hint}</span>
                </label>
              ))}
            </div>
          </div>}

          {tab === 'repo' ? <ProjectPanel project={project} />
            : tab === 'global' ? <GlobalPanel onFindSkills={() => { setScope('global'); openTab('find'); }} onCreateAgent={() => { setScope('global'); openTab('agent'); }} />
            : tab === 'agent' ? <AgentForm project={project} scope={scope} onFindSkills={() => openTab('find')} /> : (<>
          <form className="skill-search" onSubmit={submit}>
            <input type="search" value={query} maxLength={200} autoFocus onChange={(e) => setQuery(e.target.value)} placeholder="e.g. skills to help me write code" />
            <button type="submit" className="btn" disabled={!query.trim() || Boolean(busy)}><IconSearch size={15} /> Search</button>
          </form>

          <div className="chips" role="group" aria-label="Categories">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className={`chip-btn${preset === p.label ? ' on' : ''}`} disabled={Boolean(busy)}
                onClick={() => { setPreset(p.label); void search(p.query, p.category); }}>{p.label}</button>
            ))}
          </div>

          <div ref={listTop} />
          {busy === 'search' && <p className="muted small">{loadingPage > 1 ? `Loading page ${loadingPage}…` : 'Searching…'} The registry can take a few seconds.</p>}
          {(done || error) && (
            <div className={`result${error ? ' warn' : ''}`} role="status">
              {error && <p className="result-title">{error}</p>}
              {done && (
                <>
                  <p className="result-title"><IconCheck size={17} /> Installed {done.name} ({done.files} files)</p>
                  <ul className="small upload-list">{done.folders.map((f) => <li key={f}><code>{f}</code></li>)}</ul>
                  {scope === 'project' && <p className="small">The next request opened from this project tells the AI about it.</p>}
                  {done.backup && <p className="small">Backup of the previous .claude: <code>{done.backup}</code></p>}
                  {done.unverified.length > 0 && <p className="small warn-text">Downloaded from GitHub without a registry checksum: {done.unverified.join(', ')}</p>}
                </>
              )}
            </div>
          )}

          {results && (results.items.length === 0 ? <p className="muted small">No skills found. Try other words, in English.</p> : (
            <ul className={`skill-list${busy === 'search' ? ' loading' : ''}`}>
              {results.items.map((s) => {
                const a = audit(s.verdict);
                const has = isInstalled(s.slug);
                return (
                  <li key={s.slug} className="skill-card">
                    <div className="skill-card-head">
                      <span className="choice-title">{s.title}</span>
                      <span className="muted small">{s.slug}</span>
                      <span className="statusbar-spacer" />
                      <button type="button" className="icon-btn" onClick={() => { void api.openLink(skillPage(s.slug)); }}
                        title="Open on SkillMD to review the skill and its files before installing" aria-label={`Open ${s.title} on SkillMD`}><IconExternal size={16} /></button>
                      <button type="button" className="btn btn-sm" disabled={has || Boolean(busy)} onClick={() => { void install(s); }}>
                        {has ? 'Installed' : busy === s.slug ? 'Installing…' : 'Install'}
                      </button>
                    </div>
                    <p className="skill-desc small">{s.description}</p>
                    <div className="chips">
                      {s.verified && <span className="pill pill-completed">Verified</span>}
                      <span className={`pill ${a.cls}`}>{a.label}</span>
                      {s.category && <span className="chip">{s.category}</span>}
                      {s.rating > 0 && <span className="chip">★ {s.rating.toFixed(1)}</span>}
                      <span className="chip">{s.installs} installs</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ))}
          {results && results.pages > 1 && (
            <nav className="pager" aria-label="Result pages">
              <button type="button" className="btn btn-ghost btn-sm" disabled={Boolean(busy) || results.page <= 1} onClick={() => goTo(results.page - 1)}>‹ Previous</button>
              <span className="muted small">Page {results.page} of {results.pages}{results.capped ? '+' : ''} · {results.total}{results.capped ? '+' : ''} skills</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={Boolean(busy) || (results.page >= results.pages && !results.capped)} onClick={() => goTo(results.page + 1)}>Next ›</button>
            </nav>
          )}
          </>)}
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
