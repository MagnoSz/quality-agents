import { useCallback, useEffect, useState } from 'react';
import { api, hasBridge, type ProjectSummary, type Starter, type TerminalRef, type ToolInfo, type WorkspaceInfo } from './api';
import { t, useLang } from './i18n';
import { Notebook } from './components/Notebook';
import { hiddenIds, setMenuWorkspace } from './side-menu';
import { Ribbon } from './components/Ribbon';
import { Home } from './screens/Home';
import { Workspace, linkedNotice } from './screens/Workspace';
import { WorkspacePicker } from './screens/WorkspacePicker';
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
  // The open workspace. null: the app starts on the workspace picker, like Obsidian's vault switcher.
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [search, setSearch] = useState(false); // the search panel replaces the left list
  const toggleSearch = useCallback(() => setSearch((s) => !s), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    Promise.all([api.session(), api.projects(), api.integrations(), api.workspaces()])
      .then(([session, list, toolList, spaces]) => {
        setVersion(session.version);
        setProjects(list);
        setTools(toolList);
        setMenuWorkspace(spaces.active);
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'note') { setReady(true); return; }
        const requested = params.get('project');
        // A project asked for at start (checks, shortcuts) opens in the workspace opened last; otherwise the picker comes first.
        if (!requested) { setReady(true); return; }
        setWorkspace(spaces.list.find((w) => w.id === spaces.active) ?? null);
        if (params.get('view') === 'library') setSettings('agents');
        if (params.get('view') === 'launch') setLaunchOnOpen(true);
        const last = requested || recall();
        // A project hidden from the list is not reopened on its own. An explicit request still opens it.
        if (last && list.some((p) => p.id === last) && (requested || !hiddenIds().includes(last))) setProjectId(last);
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const open = (id: string) => { setSettings(null); setProjectId(id); setCreated(null); remember(id); };
  const home = () => { setSettings(null); setProjectId(null); setCreated(null); remember(null); void loadProjects(); };
  const create = async (name: string, starter: Starter, folder?: string, tags: string[] = []) => {
    const project = await api.createProject(name, starter, folder, tags);
    await loadProjects();
    open(project.id);
    setCreated(project.id);
    setCreatedNotice(folder ? linkedNotice(project) : '');
  };
  const onProjectChanged = useCallback(() => { void loadProjects(); }, [loadProjects]);
  // A workspace was opened (picker or switcher): its projects, on the start screen. null goes back to the picker.
  const openWorkspace = (w: WorkspaceInfo | null) => {
    setSettings(null); setProjectId(null); setCreated(null); remember(null);
    setWorkspace(w);
    if (!w) return;
    setMenuWorkspace(w.id);
    void loadProjects();
  };

  if (error) return <div className="notice"><img src="./favicon.svg" alt="" width={40} height={40} /><h1>{t('Something went wrong')}</h1><p>{error}</p></div>;
  if (!ready) return <div className="notice muted">{t('Loading…')}</div>;
  if (isNoteWindow) {
    const loose = noteParams.get('loose');
    return (
      <div className="note-float">
        <Notebook project={noteParams.get('project')} path={noteParams.get('path')} loose={loose} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
      </div>
    );
  }

  // A search result: its project, and the file in it.
  const openFound = (id: string, path?: string) => {
    setSearch(false); setSettings(null); setCreated(null);
    setProjectId(id); remember(id);
    if (path) setPendingPath(path);
  };

  const openTerminal = (terminal: TerminalRef, id: string) => {
    setPendingTerm(terminal);
    setSettings(null);
    setProjectId(id);
    remember(id);
  };

  if (!workspace) return <WorkspacePicker version={version} onOpen={openWorkspace} />;

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <div className="shell">
        <Ribbon settingsOn={settings !== null} onHome={home} onSettings={() => setSettings(settings ? null : 'agents')} searchOn={search} onSearch={toggleSearch} />
        <Home projects={projects} tools={tools} version={version} onOpen={open} onCreate={create} settings={settings} onSettings={setSettings} project={null} onTerminal={openTerminal} workspace={workspace} onWorkspace={openWorkspace} search={search} onSearch={toggleSearch} onFound={openFound} onDeleted={() => { void loadProjects(); }} />
      </div>
    );
  }
  return <Workspace key={project.id} project={project} tools={tools} onHome={home} settings={settings} onSettings={setSettings} onProjectChanged={onProjectChanged} launchOnOpen={launchOnOpen} startSetup={created === project.id} startNotice={created === project.id ? createdNotice : ''} pendingTerminal={pendingTerm} onPendingTerminal={() => setPendingTerm(null)} pendingPath={pendingPath} onPendingPath={() => setPendingPath(null)} search={search} onSearch={toggleSearch} onFound={openFound} />;
}
