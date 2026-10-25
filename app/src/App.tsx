import { useCallback, useEffect, useState } from 'react';
import { api, hasBridge, type ProjectSummary, type Starter, type TerminalRef, type ToolInfo } from './api';
import { t, useLang } from './i18n';
import { NoteDialog } from './components/NoteDialog';
import { Ribbon } from './components/Ribbon';
import { Home } from './screens/Home';
import { Workspace, linkedNotice } from './screens/Workspace';
import type { SettingsTab } from './screens/Settings';

const noteParams = new URLSearchParams(window.location.search);
const isNoteWindow = noteParams.get('view') === 'note';

const LAST_PROJECT = 'qa-last-project';
const recall = () => { try { return window.localStorage.getItem(LAST_PROJECT); } catch { return null; } };
const remember = (id: string | null) => {
  try { if (id) window.localStorage.setItem(LAST_PROJECT, id); else window.localStorage.removeItem(LAST_PROJECT); } catch { /* optional */ }
};

export function App() {
  useLang(); // the whole app re-renders in the new language
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null); // a new project opens with "Set up"
  const [createdNotice, setCreatedNotice] = useState(''); // what linking its folder did
  const [settings, setSettings] = useState<SettingsTab | null>(null);
  const [launchOnOpen, setLaunchOnOpen] = useState(false);
  const [pendingTerm, setPendingTerm] = useState<TerminalRef | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null); // a file a note window asked to open

  // Note windows can show a terminal they started, or open a file they mention, here.
  useEffect(() => {
    if (isNoteWindow) return;
    const show = (project: string) => { setSettings(null); setProjectId(project); remember(project); };
    const offTerm = window.qa?.onShowTerminal?.((project, terminal) => { setPendingTerm(terminal); show(project); });
    const offPath = window.qa?.onOpenInMain?.((project, path) => { setPendingPath(path); show(project); });
    return () => { offTerm?.(); offPath?.(); };
  }, []);

  const loadProjects = useCallback(() => api.projects().then(setProjects), []);

  useEffect(() => {
    if (!hasBridge()) { setError(t('Moki must be opened with the qa command.')); return; }
    Promise.all([api.session(), api.projects(), api.integrations()])
      .then(([session, list, toolList]) => {
        setVersion(session.version);
        setProjects(list);
        setTools(toolList);
        // Reopen the last project, like Obsidian reopens the last vault.
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'note') { setReady(true); return; }
        const requested = params.get('project');
        if (params.get('view') === 'library') setSettings('agents');
        if (params.get('view') === 'launch') setLaunchOnOpen(true);
        const last = requested || recall();
        if (last && list.some((p) => p.id === last)) setProjectId(last);
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const open = (id: string) => { setSettings(null); setProjectId(id); setCreated(null); remember(id); };
  const home = () => { setSettings(null); setProjectId(null); setCreated(null); remember(null); void loadProjects(); };
  const create = async (name: string, starter: Starter, folder?: string) => {
    const project = await api.createProject(name, starter, folder);
    await loadProjects();
    open(project.id);
    setCreated(project.id);
    setCreatedNotice(folder ? linkedNotice(project) : '');
  };
  const onProjectChanged = useCallback(() => { void loadProjects(); }, [loadProjects]);

  if (error) return <div className="notice"><img src="./favicon.svg" alt="" width={40} height={40} /><h1>{t('Something went wrong')}</h1><p>{error}</p></div>;
  if (!ready) return <div className="notice muted">{t('Loading…')}</div>;
  if (isNoteWindow) {
    const loose = noteParams.get('loose');
    return (
      <div className="note-float">
        <NoteDialog
          project={noteParams.get('project')}
          path={noteParams.get('path')}
          looseId={loose && loose !== 'new' ? loose : null}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          floating
          onClose={() => window.close()}
        />
      </div>
    );
  }

  const openTerminal = (terminal: TerminalRef, id: string) => {
    setPendingTerm(terminal);
    setSettings(null);
    setProjectId(id);
    remember(id);
  };

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <div className="shell">
        <Ribbon settingsOn={settings !== null} onHome={home} onSettings={() => setSettings(settings ? null : 'agents')} />
        <Home projects={projects} tools={tools} version={version} onOpen={open} onCreate={create} settings={settings} onSettings={setSettings} project={null} onTerminal={openTerminal} />
      </div>
    );
  }
  return <Workspace key={project.id} project={project} tools={tools} onHome={home} settings={settings} onSettings={setSettings} onProjectChanged={onProjectChanged} launchOnOpen={launchOnOpen} startSetup={created === project.id} startNotice={created === project.id ? createdNotice : ''} pendingTerminal={pendingTerm} onPendingTerminal={() => setPendingTerm(null)} pendingPath={pendingPath} onPendingPath={() => setPendingPath(null)} />;
}
