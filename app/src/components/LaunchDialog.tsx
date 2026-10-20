// "Open in your AI tool": prepares the request (activity, inbox files, notes)
// and opens the AI tool the QA already uses. Quality Agents has no chat of its own.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, describeRun, type ActivityInfo, type AgentInfo, type InboxFile, type LaunchResult, type OpenRun, type ProjectSummary, type ToolInfo, type ToolKind } from '../api';
import { IconCheck, IconCode, IconCopy, IconFile, IconFolder, IconGlobe, IconPlay, IconRefresh, IconTerminal, IconX } from './Icons';

interface Props {
  project: ProjectSummary;
  tools: ToolInfo[];
  preset?: { activity: string; run?: string };
  onClose: () => void;
}

const remember = (key: string, value: string) => { try { window.localStorage.setItem(key, value); } catch { /* optional */ } };
const recall = (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } };

const KIND_GROUPS: { kind: ToolKind; title: string; icon: ReactNode }[] = [
  { kind: 'terminal', title: 'Opens in a new terminal window', icon: <IconTerminal size={16} /> },
  { kind: 'editor', title: 'Opens the folder in your editor', icon: <IconCode size={16} /> },
  { kind: 'chat', title: 'Web chat (you upload the files)', icon: <IconGlobe size={16} /> },
  { kind: 'print', title: 'Only prepare the request', icon: <IconFile size={16} /> },
];

const formatSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export function LaunchDialog({ project, tools, preset, onClose }: Props) {
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [activity, setActivity] = useState(preset?.activity ?? 'open');
  const [inbox, setInbox] = useState<InboxFile[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [runs, setRuns] = useState<OpenRun[]>([]);
  const [run, setRun] = useState(preset?.run ?? '');
  const [note, setNote] = useState('');
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agent, setAgent] = useState('');
  const [language, setLanguage] = useState(recall('qa-language') || 'English');
  const [tool, setTool] = useState(() => {
    const saved = recall('qa-tool');
    return tools.some((t) => t.id === saved && t.available) ? saved as string : tools.find((t) => t.available)?.id ?? '';
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api.inbox(project.id).then((list) => { setInbox(list); setFiles((sel) => sel.filter((f) => list.some((x) => x.name === f))); }).catch(() => setInbox([]));
    api.openRuns(project.id).then((list) => { setRuns(list); setRun((r) => (list.some((x) => x.id === r) ? r : list[0]?.id ?? '')); }).catch(() => setRuns([]));
  }, [project.id]);

  useEffect(() => {
    api.activities().then((r) => { setActivities(r.activities); setLanguages(r.languages); }).catch(() => { /* empty list */ });
    Promise.all([api.agents(), api.projectAgents(project.id)])
      .then(([list, enabled]) => setAgents(list.filter((a) => a.usable && enabled.includes(a.name))))
      .catch(() => setAgents([]));
    load();
  }, [load, project.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = activities.find((a) => a.id === activity);
  // Agents that use the chosen activity's skill come first; any enabled agent can be chosen.
  const suited = agents.filter((a) => current && a.skills.includes(current.skill));
  const others = agents.filter((a) => !suited.includes(a));
  const selectedTool = tools.find((t) => t.id === tool);
  const missing = [
    current && !current.available && 'this activity is not available yet',
    current?.needsFiles && !files.length && 'select at least one file from the inbox',
    activity === 'resume' && !run && 'choose an activity to continue',
    !selectedTool && 'choose a tool',
  ].filter(Boolean) as string[];

  const submit = async () => {
    setBusy(true); setResult(null); setError(''); setCopied(false);
    remember('qa-tool', tool); remember('qa-language', language);
    try {
      const r = await api.launch({ project: project.id, activity, tool, files, note, language, run: activity === 'resume' ? run : undefined, agent: agent || undefined });
      setResult(r);
      if (!r.opened && r.message) setError(r.message);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } };

  const buttonLabel = !selectedTool ? 'Open' : selectedTool.kind === 'print' ? 'Prepare the request'
    : selectedTool.kind === 'chat' ? 'Prepare for the web chat' : `Open in ${selectedTool.label.replace(/ \(.*\)$/, '')}`;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="launch-title">
        <header className="modal-head">
          <div>
            <h2 id="launch-title">Open {project.name} in your AI tool</h2>
            <p className="muted small">The request is prepared for you. The conversation happens in the AI tool.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="Close (Esc)"><IconX size={18} /></button>
        </header>

        <div className="modal-body">
          <Step n={1} title="What do you want to do?">
            <div className="choice-grid">
              {activities.map((a) => {
                const disabled = !a.available || (a.id === 'resume' && !runs.length);
                const reason = !a.available ? 'not available yet' : a.id === 'resume' && !runs.length ? 'no open activities' : '';
                return (
                  <label key={a.id} className={`choice${activity === a.id ? ' on' : ''}${disabled ? ' disabled' : ''}`}>
                    <input type="radio" name="activity" checked={activity === a.id} disabled={disabled} onChange={() => setActivity(a.id)} />
                    <span className="choice-title">{a.label}</span>
                    <span className="choice-hint">{reason || a.hint}</span>
                  </label>
                );
              })}
            </div>
            {activity === 'resume' && runs.length > 0 && (
              <label className="field">
                <span className="label">Activity to continue</span>
                <select value={run} onChange={(e) => setRun(e.target.value)}>
                  {runs.map((r) => <option key={r.id} value={r.id}>{describeRun(r.id).title} — {describeRun(r.id).date}</option>)}
                </select>
              </label>
            )}
            {agents.length > 0 && (
              <label className="field inline">
                <span className="label">Who should do it?</span>
                <select value={agent} onChange={(e) => setAgent(e.target.value)}>
                  <option value="">Let the skill decide (no specific agent)</option>
                  {suited.length > 0 && <optgroup label="Suited to this activity">{suited.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}</optgroup>}
                  {others.length > 0 && <optgroup label="Other agents in this project">{others.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}</optgroup>}
                </select>
              </label>
            )}
          </Step>

          <Step n={2} title={`Files from the inbox${current?.needsFiles ? '' : ' (optional)'}`} aside={
            <div className="row-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void api.openFolder(project.id, 'inbox'); }}><IconFolder size={15} /> Open inbox folder</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={load}><IconRefresh size={15} /> Refresh</button>
            </div>
          }>
            {!inbox.length ? (
              <p className="muted small">The inbox is empty. Click <strong>Open inbox folder</strong>, put the stories, logs or documents there, then <strong>Refresh</strong>. Word files are converted to text automatically.</p>
            ) : (
              <ul className="file-pick">
                {inbox.map((f) => (
                  <li key={f.name}>
                    <label className={files.includes(f.name) ? 'on' : ''}>
                      <input type="checkbox" checked={files.includes(f.name)} onChange={() => setFiles((s) => (s.includes(f.name) ? s.filter((x) => x !== f.name) : [...s, f.name]))} />
                      <IconFile size={15} />
                      <span className="file-name">{f.name}</span>
                      <span className="muted small">{formatSize(f.size)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Step>

          <Step n={3} title="Anything else the AI should know? (optional)">
            <textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. focus on permissions" />
            <label className="field inline">
              <span className="label">Conversation language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((l) => <option key={l}>{l}</option>)}</select>
            </label>
          </Step>

          <Step n={4} title="Open with">
            {KIND_GROUPS.map((g) => {
              const group = tools.filter((t) => t.kind === g.kind);
              if (!group.length) return null;
              return (
                <div key={g.kind} className="tool-group">
                  <div className="tool-group-title">{g.icon}<span>{g.title}</span></div>
                  <div className="choice-grid">
                    {group.map((t) => (
                      <label key={t.id} className={`choice${tool === t.id ? ' on' : ''}${t.available ? '' : ' disabled'}`}>
                        <input type="radio" name="tool" checked={tool === t.id} disabled={!t.available} onChange={() => setTool(t.id)} />
                        <span className="choice-title">{t.label}</span>
                        <span className="choice-hint">{t.available ? (t.command ? t.command : t.hint) : 'not installed'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </Step>

          {(result || error) && (
            <div className={`result${error ? ' warn' : ''}`} role="status">
              {result?.opened && <p className="result-title"><IconCheck size={17} /> {result.message}</p>}
              {error && <p className="result-title">{error}</p>}
              {result && !result.opened && !error && selectedTool?.kind === 'chat' && (
                <>
                  <p className="result-title">Ready for the web chat</p>
                  <p className="small">Copy the request and upload these files to the chat{result.bundleReady ? '' : ' (run npm run bundle first to create the framework bundle)'}:</p>
                  <ul className="small upload-list">{result.upload?.map((u) => <li key={u}><code>{u}</code></li>)}</ul>
                </>
              )}
              {result?.prompt && (
                <div className="prompt-box">
                  <div className="prompt-head">
                    <span className="label">Request</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void copy(result.prompt); }}><IconCopy size={15} /> {copied ? 'Copied' : 'Copy'}</button>
                  </div>
                  <p className="prompt-text">{result.prompt}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="modal-foot">
          {missing.length > 0 && <span className="muted small">To continue: {missing.join(' · ')}.</span>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn" disabled={busy || missing.length > 0} onClick={() => { void submit(); }}>
            <IconPlay size={15} /> {busy ? 'Opening…' : buttonLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Step({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="step">
      <div className="step-head">
        <legend><span className="step-n">{n}</span>{title}</legend>
        {aside}
      </div>
      {children}
    </fieldset>
  );
}
