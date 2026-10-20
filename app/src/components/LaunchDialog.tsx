// "Open in your AI tool": a short wizard — one question per screen — that
// prepares the request (activity, inbox files, agent, notes) and opens the AI
// tool the QA already uses. Quality Agents has no chat of its own.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, describeRun, type ActivityInfo, type AgentInfo, type InboxFile, type LaunchResult, type OpenRun, type ProjectSummary, type ToolInfo, type ToolKind } from '../api';
import { IconCheck, IconCode, IconCopy, IconFile, IconFolder, IconGlobe, IconPlay, IconRefresh, IconTerminal, IconX } from './Icons';

interface Props {
  project: ProjectSummary;
  tools: ToolInfo[];
  preset?: { activity: string; run?: string };
  onClose: () => void;
}

type StepKey = 'activity' | 'run' | 'files' | 'agent' | 'details' | 'tool' | 'review';

const remember = (key: string, value: string) => { try { window.localStorage.setItem(key, value); } catch { /* optional */ } };
const recall = (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } };

const KIND_ICON: Record<ToolKind, ReactNode> = {
  terminal: <IconTerminal size={16} />, editor: <IconCode size={16} />, chat: <IconGlobe size={16} />, print: <IconFile size={16} />,
};
const KIND_HINT: Record<ToolKind, string> = {
  terminal: 'Opens in a new terminal window', editor: 'Opens the folder in your editor, request copied',
  chat: 'Web chat — you upload the files', print: 'Only prepares the request for you to copy',
};

const formatSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export function LaunchDialog({ project, tools, preset, onClose }: Props) {
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [activity, setActivity] = useState(preset?.activity ?? '');
  const [inbox, setInbox] = useState<InboxFile[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [runs, setRuns] = useState<OpenRun[]>([]);
  const [run, setRun] = useState(preset?.run ?? '');
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agent, setAgent] = useState('');
  const [note, setNote] = useState('');
  const [language, setLanguage] = useState(recall('qa-language') || 'English');
  const [tool, setTool] = useState(() => {
    const saved = recall('qa-tool');
    return tools.some((t) => t.id === saved && t.available) ? saved as string : '';
  });
  const [step, setStep] = useState<StepKey>(preset?.activity === 'resume' && preset.run ? 'details' : 'activity');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api.inbox(project.id).then((list) => { setInbox(list); setFiles((sel) => sel.filter((f) => list.some((x) => x.name === f))); }).catch(() => setInbox([]));
    api.openRuns(project.id).then(setRuns).catch(() => setRuns([]));
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
  const resume = activity === 'resume';
  const steps: StepKey[] = ['activity', ...(resume ? ['run' as const] : ['files' as const, ...(agents.length ? ['agent' as const] : [])]), 'details', 'tool', 'review'];
  const index = Math.max(0, steps.indexOf(step));
  const next = () => setStep(steps[Math.min(index + 1, steps.length - 1)]);
  const back = () => { setResult(null); setError(''); setStep(steps[Math.max(index - 1, 0)]); };

  // Agents that use the chosen activity's skill come first.
  const suited = agents.filter((a) => current && a.skills.includes(current.skill));
  const others = agents.filter((a) => !suited.includes(a));
  const selectedTool = tools.find((t) => t.id === tool);
  const installed = tools.filter((t) => t.available);
  const notInstalled = tools.filter((t) => !t.available);

  const submit = async () => {
    setBusy(true); setResult(null); setError(''); setCopied(false);
    remember('qa-tool', tool); remember('qa-language', language);
    try {
      const r = await api.launch({ project: project.id, activity, tool, files, note, language, run: resume ? run : undefined, agent: agent || undefined });
      setResult(r);
      if (!r.opened && r.message) setError(r.message);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } };

  const buttonLabel = !selectedTool ? 'Open' : selectedTool.kind === 'print' ? 'Prepare the request'
    : selectedTool.kind === 'chat' ? 'Prepare for the web chat' : `Open in ${selectedTool.label.replace(/ \(.*\)$/, '')}`;

  const questions: Record<StepKey, { title: string; hint: string }> = {
    activity: { title: 'What do you want to do?', hint: 'Choose one.' },
    run: { title: 'Which activity do you want to continue?', hint: 'These are the activities that are not finished yet.' },
    files: {
      title: current?.needsFiles ? 'Which files should the AI use?' : 'Should the AI use any file?',
      hint: current?.needsFiles ? 'Choose at least one file from the project inbox.' : 'Optional — you can continue without files.',
    },
    agent: { title: 'Who should do it?', hint: 'An agent is a specialist with its own instructions. If you are not sure, let the skill decide.' },
    details: { title: 'Anything else the AI should know?', hint: 'Optional. Write it as you would tell a colleague.' },
    tool: { title: 'Which AI tool do you want to use?', hint: 'Only the tools found on this computer can be chosen.' },
    review: { title: 'Everything ready', hint: 'Check your answers. Click an answer to change it.' },
  };
  const q = questions[step];

  const agentLabel = agent || 'Let the skill decide';
  const summary: { step: StepKey; label: string; value: string }[] = [
    { step: 'activity', label: 'Activity', value: current?.label ?? '—' },
    ...(resume ? [{ step: 'run' as StepKey, label: 'Continue', value: run ? describeRun(run).title : '—' }] : [
      { step: 'files' as StepKey, label: 'Files', value: files.length ? files.join(', ') : 'None' },
      ...(agents.length ? [{ step: 'agent' as StepKey, label: 'Who does it', value: agentLabel }] : []),
    ]),
    { step: 'details', label: 'Notes', value: note.trim() || 'None' },
    { step: 'details', label: 'Conversation language', value: language },
    { step: 'tool', label: 'AI tool', value: selectedTool?.label ?? '—' },
  ];

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <header className="modal-head">
          <div>
            <p className="wizard-progress">Open {project.name} in your AI tool · step {index + 1} of {steps.length}</p>
            <h2 id="wizard-title">{q.title}</h2>
            <p className="muted small">{q.hint}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="Close (Esc)"><IconX size={18} /></button>
        </header>
        <div className="wizard-bar"><span style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>

        <div className="modal-body">
          {step === 'activity' && (
            <div className="answer-list">
              {/* Only what can be done now: unavailable skills and an empty "resume" are hidden. */}
              {activities.filter((a) => a.available && (a.id !== 'resume' || runs.length > 0)).map((a) => {
                return (
                  <Answer key={a.id} title={a.label} hint={a.hint} on={activity === a.id}
                    onPick={() => {
                      setActivity(a.id);
                      if (a.id === 'resume') setRun((r) => (runs.some((x) => x.id === r) ? r : runs[0]?.id ?? ''));
                      setStep(a.id === 'resume' ? 'run' : 'files');
                    }} />
                );
              })}
            </div>
          )}

          {step === 'run' && (
            <div className="answer-list">
              {runs.map((r) => (
                <Answer key={r.id} title={describeRun(r.id).title} hint={`${describeRun(r.id).date}${r.currentStep ? ` · stopped at: ${r.currentStep}` : ''}`}
                  on={run === r.id} onPick={() => { setRun(r.id); next(); }} />
              ))}
            </div>
          )}

          {step === 'files' && (
            <>
              {!inbox.length ? (
                <div className="wizard-empty">
                  <p>The project inbox is empty.</p>
                  <p className="muted small">Click <strong>Open inbox folder</strong>, put the stories, logs or documents there, then click <strong>Refresh</strong>. Word files are converted to text automatically.</p>
                </div>
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
              <div className="row-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void api.openFolder(project.id, 'inbox'); }}><IconFolder size={15} /> Open inbox folder</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={load}><IconRefresh size={15} /> Refresh</button>
              </div>
            </>
          )}

          {step === 'agent' && (
            <div className="answer-list">
              <Answer title="Let the skill decide" hint="Recommended if you are not sure." on={!agent} onPick={() => { setAgent(''); next(); }} />
              {suited.length > 0 && <p className="answer-group">Suited to this activity</p>}
              {suited.map((a) => <Answer key={a.name} title={a.name} hint={a.description} on={agent === a.name} onPick={() => { setAgent(a.name); next(); }} />)}
              {others.length > 0 && <p className="answer-group">Other agents in this project</p>}
              {others.map((a) => <Answer key={a.name} title={a.name} hint={a.description} on={agent === a.name} onPick={() => { setAgent(a.name); next(); }} />)}
            </div>
          )}

          {step === 'details' && (
            <>
              <textarea rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. focus on permissions" autoFocus />
              <label className="field inline">
                <span className="label">The AI should talk to me in</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((l) => <option key={l}>{l}</option>)}</select>
              </label>
            </>
          )}

          {step === 'tool' && (
            <div className="answer-list">
              {installed.map((t) => (
                <Answer key={t.id} icon={KIND_ICON[t.kind]} title={t.label} hint={KIND_HINT[t.kind]} on={tool === t.id}
                  onPick={() => { setTool(t.id); next(); }} />
              ))}
              {notInstalled.length > 0 && <p className="muted small">Not found on this computer: {notInstalled.map((t) => t.label.replace(/ \(.*\)$/, '')).join(' · ')}</p>}
            </div>
          )}

          {step === 'review' && (
            <>
              <dl className="wizard-summary">
                {summary.map((s) => (
                  <button type="button" key={s.label} className="wizard-summary-row" onClick={() => { setResult(null); setError(''); setStep(s.step); }} title="Change">
                    <dt>{s.label}</dt><dd>{s.value}</dd>
                  </button>
                ))}
              </dl>

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
            </>
          )}
        </div>

        <footer className="modal-foot">
          {index > 0 && <button type="button" className="btn btn-ghost" onClick={back}>Back</button>}
          <span className="wizard-spacer" />
          {step === 'files' && (
            <button type="button" className="btn" disabled={Boolean(current?.needsFiles) && !files.length} onClick={next}>
              {files.length ? 'Continue' : current?.needsFiles ? 'Choose a file to continue' : 'Continue without files'}
            </button>
          )}
          {step === 'details' && <button type="button" className="btn" onClick={next}>{note.trim() ? 'Continue' : 'Nothing else — continue'}</button>}
          {step === 'review' && (result?.opened
            ? <button type="button" className="btn" onClick={onClose}>Done</button>
            : <button type="button" className="btn" disabled={busy || !selectedTool} onClick={() => { void submit(); }}><IconPlay size={15} /> {busy ? 'Opening…' : buttonLabel}</button>)}
        </footer>
      </div>
    </div>
  );
}

function Answer({ title, hint, on, disabled, icon, onPick }: { title: string; hint: string; on: boolean; disabled?: boolean; icon?: ReactNode; onPick: () => void }) {
  return (
    <button type="button" className={`answer${on ? ' on' : ''}`} disabled={disabled} onClick={onPick}>
      {icon && <span className="answer-icon">{icon}</span>}
      <span className="answer-text">
        <span className="answer-title">{title}</span>
        <span className="answer-hint">{hint}</span>
      </span>
    </button>
  );
}
