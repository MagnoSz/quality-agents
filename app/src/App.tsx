import { useCallback, useEffect, useState } from 'react';
import { api, hasBridge, type ProjectSummary, type ToolInfo } from './api';
import { Home } from './screens/Home';
import { Library } from './screens/Library';
import { Workspace } from './screens/Workspace';

const LAST_PROJECT = 'qa-last-project';
const recall = () => { try { return window.localStorage.getItem(LAST_PROJECT); } catch { return null; } };
const remember = (id: string | null) => {
  try { if (id) window.localStorage.setItem(LAST_PROJECT, id); else window.localStorage.removeItem(LAST_PROJECT); } catch { /* optional */ }
};

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [library, setLibrary] = useState(false);

  const loadProjects = useCallback(() => api.projects().then(setProjects), []);

  useEffect(() => {
    if (!hasBridge()) { setError('Quality Agents must be opened with the qa command.'); return; }
    Promise.all([api.session(), api.projects(), api.integrations()])
      .then(([session, list, toolList]) => {
        setVersion(session.version);
        setProjects(list);
        setTools(toolList);
        // Reopen the last project, like Obsidian reopens the last vault.
        const params = new URLSearchParams(window.location.search);
        const requested = params.get('project');
        if (params.get('view') === 'library') setLibrary(true);
        const last = requested || recall();
        if (last && list.some((p) => p.id === last)) setProjectId(last);
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const open = (id: string) => { setProjectId(id); remember(id); };
  const home = () => { setProjectId(null); remember(null); void loadProjects(); };
  const create = async (name: string) => {
    const created = await api.createProject(name);
    await loadProjects();
    open(created.id);
  };
  const onProjectChanged = useCallback(() => { void loadProjects(); }, [loadProjects]);

  if (error) return <div className="notice"><img src="./favicon.svg" alt="" width={40} height={40} /><h1>Something went wrong</h1><p>{error}</p></div>;
  if (!ready) return <div className="notice muted">Loading…</div>;

  const project = projects.find((p) => p.id === projectId);
  if (library) return <Library backLabel={project ? `Back to ${project.name}` : 'All projects'} onBack={() => setLibrary(false)} />;
  return project
    ? <Workspace key={project.id} project={project} tools={tools} onHome={home} onLibrary={() => setLibrary(true)} onProjectChanged={onProjectChanged} />
    : <Home projects={projects} tools={tools} version={version} onOpen={open} onCreate={create} onLibrary={() => setLibrary(true)} />;
}
