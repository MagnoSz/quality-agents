// Project workspace, Obsidian-style: ribbon, file tree, tabs with documents
// (view and edit), and a side panel with the activity or project details.

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type FileContent, type ProjectSummary, type ToolInfo, type TreeNode } from '../api';
import { DocView } from '../components/DocView';
import { FileTree } from '../components/FileTree';
import { LaunchDialog } from '../components/LaunchDialog';
import { SidePanel } from '../components/SidePanel';
import { IconFolder, IconHome, IconPanel, IconPlay, IconRefresh, IconUsers, IconX } from '../components/Icons';

interface Props { project: ProjectSummary; tools: ToolInfo[]; onHome: () => void; onLibrary: () => void; onProjectChanged: () => void; launchOnOpen?: boolean }

interface Tab { path: string; content: FileContent; draft: string; mode: 'preview' | 'edit'; saving: boolean }

const DEFAULT_EXPANDED = ['context', 'inbox', 'runs'];
const textOf = (c: FileContent): string => (c.kind === 'markdown' || c.kind === 'text' ? c.text : '');
const isDirty = (t: Tab): boolean => (t.content.kind === 'markdown' || t.content.kind === 'text') && t.content.editable && t.draft !== t.content.text;

// Resolves a link found in a document relative to that document's folder.
function resolveLink(from: string, href: string): string | null {
  const parts = from.split('/').slice(0, -1);
  for (const seg of decodeURI(href.split('#')[0]).split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { if (!parts.length) return null; parts.pop(); } else parts.push(seg);
  }
  return parts.join('/');
}

export function Workspace({ project, tools, onHome, onLibrary, onProjectChanged, launchOnOpen = false }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(DEFAULT_EXPANDED));
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [launch, setLaunch] = useState<{ activity: string; run?: string } | null>(launchOnOpen ? { activity: 'open' } : null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const loadTree = useCallback(() => { api.tree(project.id).then(setTree).catch((e: Error) => setError(e.message)); }, [project.id]);

  // Live updates: the AI tool writes files while the app is open.
  useEffect(() => {
    loadTree();
    void api.watch(project.id);
    const off = api.onChanged((changed) => {
      if (changed !== project.id) return;
      loadTree();
      setRefreshKey((k) => k + 1);
      onProjectChanged();
      for (const t of tabsRef.current) {
        if (isDirty(t)) continue;
        api.readFile(project.id, t.path)
          .then((content) => setTabs((all) => all.map((x) => (x.path === t.path && !isDirty(x) ? { ...x, content, draft: textOf(content) } : x))))
          .catch(() => { /* file removed: keep the tab as it was */ });
      }
    });
    return () => { off(); void api.watch(null); };
  }, [project.id, loadTree, onProjectChanged]);

  const openPath = useCallback((path: string) => {
    setError('');
    if (tabsRef.current.some((t) => t.path === path)) { setActive(path); return; }
    api.readFile(project.id, path).then((content) => {
      setTabs((all) => [...all, { path, content, draft: textOf(content), mode: 'preview', saving: false }]);
      setActive(path);
      // Reveal the file in the tree.
      setExpanded((s) => { const n = new Set(s); path.split('/').slice(0, -1).reduce((acc, seg) => { const p = acc ? `${acc}/${seg}` : seg; n.add(p); return p; }, ''); return n; });
    }).catch((e: Error) => setError(e.message));
  }, [project.id]);

  const update = (path: string, patch: Partial<Tab>) => setTabs((all) => all.map((t) => (t.path === path ? { ...t, ...patch } : t)));

  const save = useCallback((path: string) => {
    const tab = tabsRef.current.find((t) => t.path === path);
    if (!tab || !isDirty(tab)) return;
    update(path, { saving: true });
    api.writeFile(project.id, path, tab.draft)
      .then((content) => update(path, { content, draft: textOf(content), saving: false }))
      .catch((e: Error) => { update(path, { saving: false }); setError(e.message); });
  }, [project.id]);

  const close = useCallback((path: string) => {
    const tab = tabsRef.current.find((t) => t.path === path);
    if (tab && isDirty(tab) && !window.confirm(`Discard unsaved changes in ${path.split('/').pop()}?`)) return;
    setTabs((all) => {
      const i = all.findIndex((t) => t.path === path);
      const next = all.filter((t) => t.path !== path);
      setActive((cur) => (cur === path ? next[Math.min(i, next.length - 1)]?.path ?? null : cur));
      return next;
    });
  }, []);

  const goHome = () => {
    if (tabsRef.current.some(isDirty) && !window.confirm('There are unsaved changes. Leave anyway?')) return;
    onHome();
  };

  const goLibrary = () => {
    if (tabsRef.current.some(isDirty) && !window.confirm('There are unsaved changes. Leave anyway?')) return;
    onLibrary();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !active) return;
      const key = e.key.toLowerCase();
      if (key === 's') { e.preventDefault(); save(active); }
      if (key === 'w') { e.preventDefault(); close(active); }
      if (key === 'e') {
        e.preventDefault();
        setTabs((all) => all.map((t) => (t.path === active && t.content.kind === 'markdown' && t.content.editable ? { ...t, mode: t.mode === 'edit' ? 'preview' : 'edit' } : t)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, save, close]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (tabsRef.current.some(isDirty)) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const tab = tabs.find((t) => t.path === active) ?? null;
  const runId = active?.match(/^runs\/([^/]+)\//)?.[1] ?? null;
  const words = tab && tab.content.kind === 'markdown' ? tab.draft.split(/\s+/).filter(Boolean).length : null;

  const onLink = (href: string) => {
    if (/^https?:\/\//.test(href)) { void api.openLink(href); return; }
    if (!tab) return;
    const target = resolveLink(tab.path, href);
    if (target) openPath(target);
  };

  return (
    <div className={`workspace${showPanel ? '' : ' no-panel'}`}>
      <nav className="ribbon" aria-label="Actions">
        <button type="button" className="icon-btn" onClick={goHome} title="All projects"><IconHome size={19} /></button>
        <button type="button" className="icon-btn accent" onClick={() => setLaunch({ activity: 'open' })} title="Open in your AI tool"><IconPlay size={19} /></button>
        <button type="button" className="icon-btn" onClick={() => { void api.openFolder(project.id); }} title="Open the project folder"><IconFolder size={19} /></button>
        <button type="button" className="icon-btn" onClick={goLibrary} title="Agent library"><IconUsers size={19} /></button>
        <button type="button" className="icon-btn" onClick={() => { loadTree(); setRefreshKey((k) => k + 1); }} title="Refresh"><IconRefresh size={19} /></button>
        <span className="ribbon-spacer" />
        <button type="button" className="icon-btn" onClick={() => setShowPanel((v) => !v)} title="Show or hide the side panel"><IconPanel size={19} /></button>
      </nav>

      <aside className="sidebar">
        <div className="sidebar-head">
          <button type="button" className="project-switch" onClick={goHome} title="Switch project">{project.name}</button>
        </div>
        <div className="sidebar-scroll">
          <FileTree
            nodes={tree}
            activePath={active}
            onOpen={openPath}
            expanded={expanded}
            onToggle={(p) => setExpanded((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; })}
          />
        </div>
      </aside>

      <main className="main">
        {tabs.length > 0 && (
          <div className="tabs" role="tablist">
            {tabs.map((t) => (
              <div key={t.path} role="tab" aria-selected={t.path === active} className={`tab${t.path === active ? ' active' : ''}`} onClick={() => setActive(t.path)} title={t.path}
                onAuxClick={(e) => { if (e.button === 1) close(t.path); }}>
                <span className="tab-name">{t.path.split('/').pop()}</span>
                {isDirty(t) && <span className="tab-dirty" title="Unsaved changes">●</span>}
                <button type="button" className="tab-close" onClick={(e) => { e.stopPropagation(); close(t.path); }} title="Close (Ctrl+W)"><IconX size={13} /></button>
              </div>
            ))}
          </div>
        )}
        {error && <div className="error-bar">{error}<button type="button" className="icon-btn" onClick={() => setError('')}><IconX size={14} /></button></div>}
        {tab ? (
          <DocView
            content={tab.content}
            mode={tab.mode}
            draft={tab.draft}
            dirty={isDirty(tab)}
            saving={tab.saving}
            onDraft={(draft) => update(tab.path, { draft })}
            onMode={(mode) => update(tab.path, { mode })}
            onSave={() => save(tab.path)}
            onOpenExternal={() => { api.openExternal(project.id, tab.path).catch((e: Error) => setError(e.message)); }}
            onLink={onLink}
          />
        ) : (
          <div className="welcome">
            <h1>{project.name}</h1>
            <p className="muted">Open a file on the left, or start working with your AI tool.</p>
            <div className="welcome-actions">
              <button type="button" className="btn" onClick={() => setLaunch({ activity: 'open' })}><IconPlay size={15} /> Open in your AI tool</button>
              <button type="button" className="btn btn-ghost" onClick={() => { void api.openFolder(project.id, 'inbox'); }}><IconFolder size={15} /> Open inbox folder</button>
            </div>
            <div className="welcome-tips muted small">
              <p><strong>Inbox</strong> — put the stories, logs and documents for the AI here.</p>
              <p><strong>Activities</strong> — every review, test design or analysis, with its results.</p>
              <p><strong>Context</strong> — what the AI knows about this system. You can edit it here.</p>
            </div>
          </div>
        )}
      </main>

      {showPanel && <SidePanel project={project} runId={runId} refreshKey={refreshKey} onOpenPath={openPath} onLaunch={(p) => setLaunch(p ?? { activity: 'open' })} onLibrary={goLibrary} />}

      <footer className="statusbar">
        <span>{project.name}</span>
        {tab && <span className="muted">{tab.path}</span>}
        {tab && isDirty(tab) && <span className="warn-text">unsaved</span>}
        <span className="statusbar-spacer" />
        {words !== null && <span className="muted">{words} words</span>}
      </footer>

      {launch && <LaunchDialog project={project} tools={tools} preset={launch} onClose={() => setLaunch(null)} />}
    </div>
  );
}
