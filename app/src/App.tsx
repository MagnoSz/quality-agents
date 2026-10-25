import { useCallback, useEffect, useState } from 'react';
import { api, hasBridge, type ProjectSummary, type Starter, type ToolInfo } from './api';
import { t, useLang } from './i18n';
import { Home } from './screens/Home';
import { Library } from './screens/Library';
import { Workspace, linkedNotice } from './screens/Workspace';

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
  const [library, setLibrary] = useState(false);
  const [launchOnOpen, setLaunchOnOpen] = useState(false);

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
        const requested = params.get('project');
        if (params.get('view') === 'library') setLibrary(true);
        if (params.get('view') === 'launch') setLaunchOnOpen(true);
        const last = requested || recall();
        if (last && list.some((p) => p.id === last)) setProjectId(last);
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const open = (id: string) => { setProjectId(id); setCreated(null); remember(id); };
  const home = () => { setProjectId(null); setCreated(null); remember(null); void loadProjects(); };
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

  const project = projects.find((p) => p.id === projectId);
  if (library) return <Library backLabel={project ? t('Back to {name}', { name: project.name }) : t('All projects')} onBack={() => setLibrary(false)} />;
  return project
    ? <Workspace key={project.id} project={project} tools={tools} onHome={home} onLibrary={() => setLibrary(true)} onProjectChanged={onProjectChanged} launchOnOpen={launchOnOpen} startSetup={created === project.id} startNotice={created === project.id ? createdNotice : ''} />
    : <Home projects={projects} tools={tools} version={version} onOpen={open} onCreate={create} onLibrary={() => setLibrary(true)} />;
}
