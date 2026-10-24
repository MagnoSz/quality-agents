// Project workspace, Obsidian-style: ribbon, file tree, tabs with documents
// (view and edit) and terminals (AI tools or a shell), and a side panel with
// the activity or project details.

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { api, type FileContent, type ProjectSummary, type TerminalRef, type ToolInfo, type TreeNode } from '../api';
import { DocView } from '../components/DocView';
import { FileTree } from '../components/FileTree';
import { LaunchDialog } from '../components/LaunchDialog';
import { SidePanel } from '../components/SidePanel';
import { SetupDialog } from '../components/SetupDialog';
import { SkillsDialog } from '../components/SkillsDialog';
import { TerminalView } from '../components/TerminalView';
import { IconBox, IconFolder, IconHome, IconLink, IconPanel, IconPlay, IconPlus, IconRefresh, IconTerminal, IconUsers, IconX } from '../components/Icons';

interface Props { project: ProjectSummary; tools: ToolInfo[]; onHome: () => void; onLibrary: () => void; onProjectChanged: () => void; launchOnOpen?: boolean; startSetup?: boolean }

interface Tab { path: string; content: FileContent; draft: string; mode: 'preview' | 'edit'; saving: boolean }
interface TermTab extends TerminalRef { running: boolean }

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

export function Workspace({ project, tools, onHome, onLibrary, onProjectChanged, launchOnOpen = false, startSetup = false }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(DEFAULT_EXPANDED));
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [launch, setLaunch] = useState<{ activity: string; run?: string } | null>(launchOnOpen ? { activity: 'open' } : null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [terms, setTerms] = useState<TermTab[]>([]);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [showSetup, setShowSetup] = useState(startSetup); // after creating the project or linking a folder
  const [termMenu, setTermMenu] = useState<{ left: number; top: number } | null>(null);
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
    setActiveTerm(null);
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

  const addTerminal = useCallback((t: TerminalRef) => { setTerms((all) => [...all, { ...t, running: true }]); setActiveTerm(t.id); }, []);

  // tool '' opens the user's shell; otherwise the AI tool starts right away in the tab.
  const newTerminal = (tool: string) => {
    setTermMenu(null);
    setError('');
    const bridge = api.term();
    if (!bridge) { setError('Terminals are only available in the desktop app.'); return; }
    bridge.create(tool)
      .then((r) => (r.terminal ? addTerminal(r.terminal) : setError(r.error ?? 'Could not open the terminal.')))
      .catch((e: Error) => setError(e.message));
  };
  const openTermMenu = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTermMenu({ left: r.left, top: r.bottom + 4 });
  };

  // Closing the tab stops what runs in it (TerminalView kills it when unmounted).
  const closeTerm = (id: string) => {
    if (terms.find((t) => t.id === id)?.running && !window.confirm('Close this terminal? What is running in it will stop.')) return;
    setTerms((all) => {
      const i = all.findIndex((t) => t.id === id);
      const next = all.filter((t) => t.id !== id);
      setActiveTerm((cur) => (cur === id ? next[Math.min(i, next.length - 1)]?.id ?? null : cur));
      return next;
    });
  };

  // Leaving the workspace closes its terminals.
  const canLeave = () => !(tabsRef.current.some(isDirty) && !window.confirm('There are unsaved changes. Leave anyway?'))
    && !(terms.some((t) => t.running) && !window.confirm('Terminals are still running in this project. Leaving closes them. Leave anyway?'));

  const goHome = () => { if (canLeave()) onHome(); };

  const goLibrary = () => { if (canLeave()) onLibrary(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !active || activeTerm) return; // in a terminal the keys belong to it
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
  }, [active, activeTerm, save, close]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (tabsRef.current.some(isDirty)) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Links a folder of this machine (chosen in the native dialog). Its AI settings are backed up; nothing in it changes.
  const linkFolder = () => {
    setError(''); setNotice('');
    api.linkRepository(project.id).then((r) => {
      if (!r) return;
      onProjectChanged(); loadTree();
      setNotice(r.backup ? `Linked ${r.repository}. Its AI settings were backed up to ${r.backup}` : `Linked ${r.repository}. It has no AI settings (.claude, AGENTS.md…) to back up.`);
      setShowSetup(true);
    }).catch((e: Error) => setError(e.message));
  };
  const myFolder = () => {
    if (!project.repository) { linkFolder(); return; }
    api.openLinkedFolder(project.id).catch((e: Error) => setError(e.message));
  };

  const tab = activeTerm ? null : tabs.find((t) => t.path === active) ?? null;
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
        <button type="button" className="icon-btn" onClick={openTermMenu} title="New terminal"><IconTerminal size={19} /></button>
        <button type="button" className="icon-btn" onClick={() => { void api.openFolder(project.id); }} title="Open the project folder"><IconFolder size={19} /></button>
        <button type="button" className={`icon-btn${project.repository ? ' accent' : ''}`} onClick={linkFolder}
          title={project.repository ? `Linked folder: ${project.repository} (click to link another)` : 'Link a folder of this computer to the project'}><IconLink size={19} /></button>
        <button type="button" className="icon-btn" onClick={goLibrary} title="Agent library"><IconUsers size={19} /></button>
        <button type="button" className="icon-btn" onClick={() => setShowSkills(true)} title="Skills & agents"><IconBox size={19} /></button>
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
            activePath={activeTerm ? null : active}
            onOpen={openPath}
            expanded={expanded}
            onToggle={(p) => setExpanded((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; })}
          />
        </div>
      </aside>

      <main className="main">
        <div className="tabs" role="tablist">
          {tabs.map((t) => {
            const on = !activeTerm && t.path === active;
            return (
              <div key={t.path} role="tab" aria-selected={on} className={`tab${on ? ' active' : ''}`} onClick={() => { setActive(t.path); setActiveTerm(null); }} title={t.path}
                onAuxClick={(e) => { if (e.button === 1) close(t.path); }}>
                <span className="tab-name">{t.path.split('/').pop()}</span>
                {isDirty(t) && <span className="tab-dirty" title="Unsaved changes">●</span>}
                <button type="button" className="tab-close" onClick={(e) => { e.stopPropagation(); close(t.path); }} title="Close (Ctrl+W)"><IconX size={13} /></button>
              </div>
            );
          })}
          {terms.map((t) => (
            <div key={t.id} role="tab" aria-selected={t.id === activeTerm} className={`tab tab-term${t.id === activeTerm ? ' active' : ''}${t.running ? '' : ' exited'}`}
              onClick={() => setActiveTerm(t.id)} title={t.running ? t.title : `${t.title} (finished)`} onAuxClick={(e) => { if (e.button === 1) closeTerm(t.id); }}>
              <IconTerminal size={13} />
              <span className="tab-name">{t.title}</span>
              <button type="button" className="tab-close" onClick={(e) => { e.stopPropagation(); closeTerm(t.id); }} title="Close the terminal"><IconX size={13} /></button>
            </div>
          ))}
          <button type="button" className="tab-new" onClick={openTermMenu} title="New terminal"><IconPlus size={15} /></button>
        </div>
        {notice && <div className="error-bar info-bar" role="status">{notice}<button type="button" className="icon-btn" onClick={() => setNotice('')}><IconX size={14} /></button></div>}
        {error && <div className="error-bar">{error}<button type="button" className="icon-btn" onClick={() => setError('')}><IconX size={14} /></button></div>}
        {terms.map((t) => (
          <TerminalView key={t.id} id={t.id} active={t.id === activeTerm} onExit={() => setTerms((all) => all.map((x) => (x.id === t.id ? { ...x, running: false } : x)))} />
        ))}
        {activeTerm ? null : tab ? (
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
              <button type="button" className="btn btn-ghost" onClick={openTermMenu}><IconTerminal size={15} /> New terminal</button>
              <button type="button" className="btn btn-ghost" onClick={myFolder} title={project.repository || 'Link a folder of this computer to the project'}><IconFolder size={15} /> {project.repository ? 'Open my folder' : 'Choose my folder'}</button>
            </div>
            <div className="welcome-tips muted small">
              <p><strong>Inbox</strong> — put the stories, logs and documents for the AI here.</p>
              <p><strong>Activities</strong> — every review, test design or analysis, with its results.</p>
              <p><strong>Context</strong> — what the AI knows about this system. You can edit it here.</p>
            </div>
          </div>
        )}
      </main>

      {showPanel && <SidePanel project={project} runId={runId} refreshKey={refreshKey} onOpenPath={openPath} onLaunch={(p) => setLaunch(p ?? { activity: 'open' })} onLibrary={goLibrary} onMyFolder={myFolder} onSetup={() => setShowSetup(true)} />}

      <footer className="statusbar">
        <span>{project.name}</span>
        {tab && <span className="muted">{tab.path}</span>}
        {tab && isDirty(tab) && <span className="warn-text">unsaved</span>}
        <span className="statusbar-spacer" />
        {words !== null && <span className="muted">{words} words</span>}
      </footer>

      {termMenu && (
        <div className="menu-backdrop" onMouseDown={() => setTermMenu(null)}>
          <ul className="term-menu" role="menu" style={termMenu} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') setTermMenu(null); }}>
            <li><button type="button" role="menuitem" autoFocus onClick={() => newTerminal('')}><IconTerminal size={15} /> Terminal <span className="muted small">your shell</span></button></li>
            {tools.filter((t) => t.kind === 'terminal').map((t) => (
              <li key={t.id}>
                <button type="button" role="menuitem" disabled={!t.available} onClick={() => newTerminal(t.id)}>
                  <IconPlay size={15} /> {t.label} <span className="muted small">{t.available ? t.command : 'not installed'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showSkills && <SkillsDialog project={project} onClose={() => setShowSkills(false)} />}
      {showSetup && <SetupDialog project={project} onClose={() => setShowSetup(false)}
        onSaved={(prepare) => { setShowSetup(false); onProjectChanged(); if (prepare) setLaunch({ activity: 'setup' }); }} />}
      {launch && <LaunchDialog project={project} tools={tools} preset={launch} onClose={() => setLaunch(null)} onTerminal={(t) => { setLaunch(null); addTerminal(t); }} />}
    </div>
  );
}
