// An operation run, in the main area of the project: the path it took, one row
// each time a step ran (a loop shows a step again), with its AI, status, result
// and summary; the question an agent is waiting on; approve the step waiting for
// you, pick the way on when no arrow fits a result or a loop reached its limit,
// start a step that did not open, pause (the running step ends, nothing new
// starts), resume or cancel. The side panel keeps the status while this is closed.

import { useEffect, useState } from 'react';
import { api, statusLabel, type OperationRun, type OperationVisit, type ToolInfo } from '../api';
import { conversationLanguage, t } from '../i18n';
import { IconFolder, IconPlay, IconTerminal, IconX } from './Icons';

interface Props {
  project: string;
  run: string;
  tick: number;
  tools: ToolInfo[];
  hasTerminal: (id: string) => boolean;
  onTerminal: (terminal: { id: string; title: string }) => void;
  onOpenFile: (path: string) => void;
  onClose: () => void;
  onChanged: () => void; // something changed here: the side panel and the next steps follow
}

const visitText = (v: OperationVisit) => (v.status === 'running' && v.question ? t('Waiting for you') : ({
  'awaiting-approval': t('Waiting for your approval'), ready: t('Ready to start'), running: t('In progress'), done: t('Step done'),
} as Record<string, string>)[v.status] ?? v.status);

export function OperationRunView({ project, run, tick, tools, hasTerminal, onTerminal, onOpenFile, onClose, onChanged }: Props) {
  const [state, setState] = useState<OperationRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { api.operationRun(project, run).then(setState).catch((e: Error) => setError(e.message)); }, [project, run, tick]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(''); setMessage('');
    try { await fn(); setState(await api.operationRun(project, run)); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const startStep = (slot: string) => act(async () => {
    const r = await api.startOperationStep(project, run, slot, conversationLanguage());
    if (r.terminal) onTerminal(r.terminal); else if (!r.opened) setMessage(r.message ?? t('Could not open the tool.'));
  });

  if (!state) return <div className="ops-run">{error ? <p className="error">{error}</p> : <p className="muted">…</p>}</div>;
  const ended = ['completed', 'cancelled'].includes(state.status);
  const label = (id: string) => tools.find((x) => x.id === id)?.label.replace(/ \(.*\)$/, '') ?? id;
  const stepName = (id: string) => state.steps.find((s) => s.id === id)?.name ?? id;
  const folder = `runs/${state.id}`;
  const last = state.visits[state.visits.length - 1];
  const d = state.decision;

  return (
    <div className="ops-run" role="region" aria-label={state.operation.name}>
      <header className="ops-run-head">
        <div>
          <h1>{state.operation.name}</h1>
          <p className="muted small">
            <span className={`pill pill-${state.status}`}>{statusLabel(state.status)}</span>
            {state.paused && state.status !== 'paused' && !ended && <> · {t('Pauses when the current step ends')}</>}
            {' '}· {new Date(state.createdAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void api.openFolder(project, folder); }}><IconFolder size={15} /> {t('Open folder')}</button>
          {!ended && (state.paused
            ? <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { void act(() => api.pauseOperation(project, run, false)); }}><IconPlay size={14} /> {t('Resume')}</button>
            : <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { void act(() => api.pauseOperation(project, run, true)); }}>{t('Pause')}</button>)}
          {!ended && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { if (window.confirm(t('Cancel this operation? The steps already done stay in its folder.'))) void act(() => api.cancelOperation(project, run)); }}>{t('Cancel operation')}</button>}
          <button type="button" className="icon-btn" onClick={onClose} title={t('Close')} aria-label={t('Close')}><IconX size={18} /></button>
        </div>
      </header>
      {error && <p className="error small">{error}</p>}
      {message && <p className="warn-text small">{message}</p>}

      <ol className="ops-timeline">
        {state.visits.map((v, i) => {
          const step = state.steps.find((s) => s.id === v.step);
          const isLast = v === last && !ended;
          const prev = state.visits.find((x) => x.slot === v.from);
          return (
            <li key={v.slot} className={`ops-timeline-step ${v.status}${v.question && v.status === 'running' ? ' asking' : ''}`}>
              <span className="ops-timeline-n">{i + 1}</span>
              <div className="ops-timeline-body">
                <div className="ops-timeline-title">
                  <strong>{step?.name ?? v.step}</strong>
                  {v.round > 1 && <span className="chip">{t('time {n}', { n: v.round })}</span>}
                  {step?.lane && <span className="chip">{step.lane}</span>}
                  <span className="muted small">{label(step?.ai ?? '')}</span>
                  {v.outcome && <span className="pill pill-outcome">{v.outcome}</span>}
                  <span className="ops-timeline-status">{visitText(v)}</span>
                </div>
                {isLast && v.status === 'running' && v.question && (
                  <div className="ops-question" role="status">
                    <p><strong>{t('{agent} asks:', { agent: step?.name ?? v.step })}</strong> {v.question}</p>
                    <p className="muted small">{t('Answer in its terminal; the operation goes on by itself.')}</p>
                  </div>
                )}
                {isLast && v.status === 'running' && (
                  <p className="small muted">
                    {v.missing?.length ? t('Still to deliver: {files}', { files: v.missing.join(', ') }) : t('Its files are there; it ends when it writes its summary.')}
                    {v.terminal && hasTerminal(v.terminal) && <> <button type="button" className="link" onClick={() => onTerminal({ id: v.terminal as string, title: label(step?.ai ?? '') })}><IconTerminal size={13} /> {t('Show its terminal')}</button></>}
                  </p>
                )}
                {isLast && v.status === 'awaiting-approval' && (
                  <div className="row-actions">
                    {prev && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void api.openFolder(project, `${folder}/outputs/${prev.slot}`).catch((e: Error) => setError(e.message)); }}><IconFolder size={14} /> {t('Review what {agent} delivered', { agent: stepName(prev.step) })}</button>}
                    <button type="button" className="btn btn-sm" disabled={busy || state.paused} onClick={() => { void act(async () => { await api.approveOperationStep(project, run); }); }}>{t('Approve and start {agent}', { agent: step?.name ?? v.step })}</button>
                    {(step?.executes.length ?? 0) > 0 && <span className="warn-text small">{t('It executes through {mcps}.', { mcps: step?.executes.join(', ') ?? '' })}</span>}
                  </div>
                )}
                {isLast && v.status === 'ready' && !state.paused && !d && (
                  <button type="button" className="btn btn-sm" disabled={busy} onClick={() => { void startStep(v.slot); }}><IconPlay size={13} /> {t('Start this step')}</button>
                )}
                {v.status === 'done' && (
                  <div className="row-actions">
                    {v.handoff && <button type="button" className="link small" onClick={() => onOpenFile(`${folder}/handoff/${v.slot}.md`)}>{t('Read its summary')}</button>}
                    <button type="button" className="link small" onClick={() => { void api.openFolder(project, `${folder}/outputs/${v.slot}`).catch((e: Error) => setError(e.message)); }}>{t('Open what it delivered')}</button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {d && !ended && (
        <section className="ops-decision" role="group" aria-label={t('Your decision')}>
          {d.kind === 'path'
            ? <p><strong>{d.outcome ? t('{agent} ended with "{result}", and no arrow leads on from that result.', { agent: stepName(state.visits.find((v) => v.slot === d.from)?.step ?? ''), result: d.outcome }) : t('{agent} did not say how it ended.', { agent: stepName(state.visits.find((v) => v.slot === d.from)?.step ?? '') })}</strong> {t('Which way now?')}</p>
            : <p><strong>{t('{agent} already ran {n} times, the limit of this operation.', { agent: stepName(d.options[0]?.to ?? ''), n: state.maxRounds })}</strong> {t('Run it once more?')}</p>}
          <div className="row-actions">
            {d.options.map((o) => (
              <button key={`${o.to}:${o.when}`} type="button" className="btn btn-sm" disabled={busy} onClick={() => { void act(() => api.chooseOperationPath(project, run, o.to)); }}>
                {d.kind === 'path' && o.when ? t('Go on to {agent} (as "{result}")', { agent: stepName(o.to), result: o.when }) : d.kind === 'path' ? t('Go on to {agent}', { agent: stepName(o.to) }) : t('Run {agent} once more', { agent: stepName(o.to) })}
              </button>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { void act(() => api.chooseOperationPath(project, run, '')); }}>{t('End the operation here')}</button>
          </div>
        </section>
      )}
    </div>
  );
}
