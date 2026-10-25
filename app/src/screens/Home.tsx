// Start screen: pick a project (system under test) or create one — like
// Obsidian's vault switcher.

import { useState, type FormEvent } from 'react';
import { api, type ProjectSummary, type Starter, type ToolInfo } from '../api';
import { recall, remember } from '../prefs';
import { lang, setLang, t, type Lang } from '../i18n';
import { GlobalDialog } from '../components/GlobalDialog';
import { IconBox, IconChevron, IconFolder, IconGlobe, IconPlus, IconUsers, IconX } from '../components/Icons';

interface Props {
  projects: ProjectSummary[];
  tools: ToolInfo[];
  version: string;
  onOpen: (id: string) => void;
  onCreate: (name: string, starter: Starter, folder?: string) => Promise<void>;
  onLibrary: () => void;
}

const onboarding = (status: string): string => ({
  'not-started': t('Context not started'), partial: t('Context in progress'), complete: t('Context complete'),
} as Record<string, string>)[status] ?? status;

// Each language is named in itself.
const LANGUAGES: [Lang, string][] = [['en', 'English'], ['pt-BR', 'Português (Brasil)']];

export function Home({ projects, tools, version, onOpen, onCreate, onLibrary }: Props) {
  const [creating, setCreating] = useState(projects.length === 0);
  const [name, setName] = useState('');
  const [folder, setFolder] = useState(''); // an existing folder to link, from "Link an existing folder"
  const [starter, setStarter] = useState<Starter>(recall('qa-starter') === 'blank' ? 'blank' : 'qa'); // the last choice is the default
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showGlobal, setShowGlobal] = useState(false);
  const installed = tools.filter((t) => t.command && t.available);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    remember('qa-starter', starter);
    try { await onCreate(name, starter, folder || undefined); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  };

  // The project is named after the chosen folder; the name can still be changed before creating it.
  const pickFolder = () => {
    setError('');
    api.pickFolder().then((r) => {
      if (!r) return;
      setFolder(r.folder); setName(r.name); setCreating(true);
    }).catch((err: Error) => { setCreating(true); setError(err.message); });
  };

  return (
    <div className="home">
      <aside className="home-list">
        <div className="home-list-head">{t('Projects')}</div>
        {projects.length === 0 && <p className="muted small home-empty">{t('No projects yet.')}</p>}
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <button type="button" className="home-project" onClick={() => onOpen(p.id)}>
                <span className="home-project-name">{p.name}</span>
                <span className="home-project-meta">
                  {onboarding(p.onboardingStatus)} · {p.runs} {p.runs === 1 ? t('activity') : t('activities')}
                  {p.openRuns > 0 && <span className="dot dot-warn" title={t('{n} open', { n: p.openRuns })} />}
                </span>
                <IconChevron size={16} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="home-main">
        <img className="hero" src="./hero.png" alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = './favicon.svg'; e.currentTarget.className = 'hero fallback'; }} />
        <h1>Moki</h1>
        <p className="muted">{t('Version {version}', { version })}</p>

        <div className="home-actions">
          {!creating ? (
            <div className="home-action">
              <div>
                <strong>{t('Create a new project')}</strong>
                <p className="muted small">{t('One project per system you test. Its context and history stay on this computer.')}</p>
              </div>
              <button type="button" className="btn" onClick={() => setCreating(true)}><IconPlus size={16} /> {t('Create')}</button>
            </div>
          ) : (
            <form className="home-action create" onSubmit={(e) => { void submit(e); }}>
              <label className="field">
                <strong>{t('Project name')}</strong>
                <span className="muted small">{t('The system under test, e.g. "Billing Portal".')}</span>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Billing Portal" maxLength={80} />
              </label>
              <fieldset className="field">
                <legend className="label">{t('Start with')}</legend>
                <label className="field inline">
                  <input type="radio" name="starter" checked={starter === 'qa'} onChange={() => setStarter('qa')} />
                  <span>{t('QA context files')} <span className="muted small">{t('(glossary, business rules, flows, permissions…)')}</span></span>
                </label>
                <label className="field inline">
                  <input type="radio" name="starter" checked={starter === 'blank'} onChange={() => setStarter('blank')} />
                  <span>{t('A blank project')} <span className="muted small">{t('(after your description, the AI asks what it needs and proposes a plan)')}</span></span>
                </label>
              </fieldset>
              {folder && (
                <div className="field">
                  <span className="label">{t('Existing folder')}</span>
                  <span className="row-actions">
                    <code className="small">{folder}</code>
                    <button type="button" className="icon-btn" onClick={() => setFolder('')} title={t('Do not link a folder')}><IconX size={14} /></button>
                  </span>
                  <span className="muted small">{t('Its AI settings (.claude, AGENTS.md…) are backed up inside it, in .moki-backup/. Nothing else in it changes.')}</span>
                </div>
              )}
              {error && <p className="error small">{error}</p>}
              <div className="row-actions">
                <button type="submit" className="btn" disabled={busy || !name.trim()}>{busy ? t('Creating…') : t('Create project')}</button>
                {projects.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => { setCreating(false); setFolder(''); setError(''); }}>{t('Cancel')}</button>}
              </div>
            </form>
          )}
          <div className="home-action">
            <div>
              <strong>{t('Link an existing folder')}</strong>
              <p className="muted small">{t('Use a folder you already have, such as the system\'s repository, as a new project.')}</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={pickFolder}><IconFolder size={16} /> {t('Choose…')}</button>
          </div>
          {projects.length > 0 && (
            <div className="home-action">
              <div>
                <strong>{t('Open a project')}</strong>
                <p className="muted small">{t('Choose one from the list on the left.')}</p>
              </div>
              <IconBox size={22} />
            </div>
          )}
          <div className="home-action">
            <div>
              <strong>{t('Agent library')}</strong>
              <p className="muted small">{t('The agents that do the work, by category. Duplicate one to make your own.')}</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={onLibrary}><IconUsers size={16} /> {t('Agents')}</button>
          </div>
          <div className="home-action">
            <div>
              <strong>{t('Skills & agents for all projects')}</strong>
              <p className="muted small">{t('Review or remove what is installed in your user folder (~/.claude, ~/.agents).')}</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setShowGlobal(true)}><IconGlobe size={16} /> {t('Manage')}</button>
          </div>
          <div className="home-action">
            <div>
              <strong>{t('Language')}</strong>
              <p className="muted small">{t('Of the app and, by default, of the conversation with the AI.')}</p>
            </div>
            <div className="chips" role="radiogroup" aria-label={t('Language')}>
              {LANGUAGES.map(([id, name]) => (
                <button key={id} type="button" role="radio" aria-checked={lang === id} className={`chip-btn${lang === id ? ' on' : ''}`}
                  onClick={() => { void setLang(id); }}>{name}</button>
              ))}
            </div>
          </div>
        </div>

        <p className="muted small home-tools">
          {installed.length
            ? <>{t('AI tools found:')} {installed.map((ai) => ai.label.replace(/ \(.*\)$/, '')).join(' · ')}</>
            : t('No AI tool found on this computer. Install Claude Code, Codex, Cursor or another supported tool.')}
        </p>
      </main>
      {showGlobal && <GlobalDialog onClose={() => setShowGlobal(false)} />}
    </div>
  );
}
