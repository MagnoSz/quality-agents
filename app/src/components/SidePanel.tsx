// Right panel: details of the activity the open file belongs to, or an overview
// of the project — with the action to open it in the AI tool.

import { useEffect, useState } from 'react';
import { api, describeRun, statusLabel, type AgentInfo, type OpenRun, type ProjectSummary, type RunState } from '../api';
import { IconFolder, IconPlay } from './Icons';

interface Props {
  project: ProjectSummary;
  runId: string | null;
  refreshKey: number;
  onOpenPath: (path: string) => void;
  onLaunch: (preset?: { activity: string; run?: string }) => void;
  onLibrary: () => void;
  onMyFolder: () => void; // opens the linked folder, or links one first
  onSetup: () => void; // description and the global skills the project uses
}

const onboarding: Record<string, string> = { 'not-started': 'Not started', partial: 'In progress', complete: 'Complete' };

export function SidePanel({ project, runId, refreshKey, onOpenPath, onLaunch, onLibrary, onMyFolder, onSetup }: Props) {
  const [run, setRun] = useState<RunState | null>(null);
  const [runs, setRuns] = useState<OpenRun[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [agentError, setAgentError] = useState('');

  useEffect(() => {
    if (runId) api.run(project.id, runId).then(setRun).catch(() => setRun(null));
    else setRun(null);
  }, [project.id, runId, refreshKey]);

  useEffect(() => {
    api.openRuns(project.id).then(setRuns).catch(() => setRuns([]));
    api.inbox(project.id).then((f) => setInboxCount(f.length)).catch(() => setInboxCount(0));
    api.agents().then((list) => setAgents(list.filter((a) => a.usable))).catch(() => setAgents([]));
    api.projectAgents(project.id).then(setEnabled).catch(() => setEnabled([]));
  }, [project.id, refreshKey]);

  const toggleAgent = (name: string) => {
    const next = enabled.includes(name) ? enabled.filter((n) => n !== name) : [...enabled, name];
    setAgentError('');
    api.setProjectAgents(project.id, next).then(setEnabled).catch((e: Error) => setAgentError(e.message));
  };

  const prefix = `workspace/projects/${project.id}/`;
  const local = (p: string) => (p.startsWith(prefix) ? p.slice(prefix.length) : null);

  if (run) {
    const info = describeRun(run.id);
    const open = !['completed', 'cancelled'].includes(run.status);
    return (
      <aside className="panel">
        <div className="panel-label">Activity</div>
        <h2 className="panel-title">{info.title}</h2>
        <p className="muted small">{info.date}{run.skill || run.workflow ? ` · ${run.skill ?? run.workflow}` : ''}</p>
        <span className={`pill pill-${run.status}`}>{statusLabel[run.status] ?? run.status}</span>
        {run.currentStep && <p className="small"><span className="muted">Current step:</span> {run.currentStep}</p>}

        {open && (
          <button type="button" className="btn btn-block" onClick={() => onLaunch({ activity: 'resume', run: run.id })}>
            <IconPlay size={15} /> Continue in your AI tool
          </button>
        )}

        {Boolean(run.completedSteps?.length) && (
          <section className="panel-section">
            <h3>Done</h3>
            <div className="chips">{run.completedSteps?.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </section>
        )}
        {Boolean(run.pending?.length) && (
          <section className="panel-section">
            <h3>Pending ({run.pending?.length})</h3>
            <ul className="panel-list">{run.pending?.map((p) => <li key={p.id}><strong>{p.id}</strong> {p.description}</li>)}</ul>
          </section>
        )}
        {Boolean(run.approvals?.length) && (
          <section className="panel-section">
            <h3>Approvals</h3>
            <ul className="panel-list">{run.approvals?.map((a, i) => <li key={`${a.step}-${i}`}><strong>{a.step}</strong> — {a.decision}{a.notes ? ` (${a.notes})` : ''}</li>)}</ul>
          </section>
        )}
        {Boolean(run.artifacts?.length) && (
          <section className="panel-section">
            <h3>Files produced</h3>
            <ul className="panel-list links">
              {run.artifacts?.map((a) => {
                const rel = local(a);
                return <li key={a}>{rel ? <button type="button" className="link" onClick={() => onOpenPath(rel)}>{rel.split('/').pop()}</button> : <span className="muted">{a}</span>}</li>;
              })}
            </ul>
          </section>
        )}
      </aside>
    );
  }

  return (
    <aside className="panel">
      <div className="panel-label">Project</div>
      <h2 className="panel-title">{project.name}</h2>
      <p className="muted small">{project.id}</p>
      {project.description && <p className="small">{project.description}</p>}
      <button type="button" className="btn btn-block" onClick={() => onLaunch()}><IconPlay size={15} /> Open in your AI tool</button>

      <dl className="facts">
        <div><dt>Context</dt><dd>{onboarding[project.onboardingStatus] ?? project.onboardingStatus}</dd></div>
        <div><dt>Deliverables</dt><dd>{project.deliverableLanguage}</dd></div>
        <div><dt>Files in inbox</dt><dd>{inboxCount}</dd></div>
      </dl>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onMyFolder} title={project.repository || 'Link a folder of this computer to the project'}><IconFolder size={15} /> {project.repository ? 'Open my folder' : 'Choose my folder'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onSetup} title="Description and the global skills this project uses">Set up project{project.linkedSkills.length ? ` · ${project.linkedSkills.length} linked skill${project.linkedSkills.length === 1 ? '' : 's'}` : ''}</button>

      <section className="panel-section">
        <h3>Agents in this project</h3>
        <ul className="agent-toggles">
          {agents.map((a) => (
            <li key={a.name}>
              <label title={a.description}>
                <input type="checkbox" checked={enabled.includes(a.name)} onChange={() => toggleAgent(a.name)} />
                <span>{a.name}</span>
                {a.source === 'custom' && <span className="chip">yours</span>}
              </label>
            </li>
          ))}
        </ul>
        {agentError && <p className="error small">{agentError}</p>}
        <button type="button" className="link small" onClick={onLibrary}>Open the agent library</button>
      </section>

      <section className="panel-section">
        <h3>Open activities</h3>
        {runs.length === 0 && <p className="muted small">None. Activities you start appear here until they are completed.</p>}
        <ul className="panel-list links">
          {runs.map((r) => (
            <li key={r.id}>
              <button type="button" className="link" onClick={() => onOpenPath(`runs/${r.id}/state.json`)}>{describeRun(r.id).title}</button>
              <span className="muted small"> · {statusLabel[r.status] ?? r.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
