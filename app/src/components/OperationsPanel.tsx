// Side panel of a project, below the files and MCPs: the multi-agent operations
// linked to it (click to start one) and its operation runs with their status
// (open ones first; finished ones folded, the last five). The + links or unlinks
// operations made in Settings › Operations.

import { useEffect, useState } from 'react';
import { api, statusLabel, type Operation, type OperationRun } from '../api';
import { t } from '../i18n';
import { IconCheck, IconPlay } from './Icons';
import { AddButton } from './AddButton';

interface Props {
  project: string;
  tick: number; // bumped when files change, so statuses follow
  active: string | null; // the operation or run shown in the main area
  onStart: (operation: string) => void;
  onRun: (run: string) => void;
}

const ENDED = ['completed', 'cancelled'];
const pill = (status: string) => (status === 'completed' ? 'pill-completed' : status === 'paused' || status === 'cancelled' ? '' : status === 'in-progress' ? 'pill-in-progress' : 'pill-awaiting-approval');

export function OperationsPanel({ project, tick, active, onStart, onRun }: Props) {
  const [linked, setLinked] = useState<Operation[]>([]);
  const [runs, setRuns] = useState<OperationRun[]>([]);
  const [all, setAll] = useState<Operation[] | null>(null); // the link menu, open
  const [error, setError] = useState('');

  useEffect(() => {
    api.projectOperations(project).then(setLinked).catch((e: Error) => setError(e.message));
    api.operationRuns(project).then(setRuns).catch(() => setRuns([]));
  }, [project, tick]);

  const toggle = (id: string) => {
    const ids = linked.some((o) => o.id === id) ? linked.filter((o) => o.id !== id).map((o) => o.id) : [...linked.map((o) => o.id), id];
    api.setProjectOperations(project, ids).then(() => api.projectOperations(project)).then(setLinked).catch((e: Error) => setError(e.message));
  };
  const open = runs.filter((r) => !ENDED.includes(r.status));
  const ended = runs.filter((r) => ENDED.includes(r.status)).slice(0, 5);
  const current = (r: OperationRun) => r.steps.find((s) => s.id === r.visits?.find((v) => v.slot === r.currentStep)?.step);

  const runRow = (r: OperationRun) => (
    <li key={r.id}>
      <button type="button" className={`ops-side-row${active === r.id ? ' active' : ''}`} onClick={() => onRun(r.id)} title={r.id}>
        <span className="ops-side-name">{r.operation.name}</span>
        <span className="ops-side-meta">
          <span className={`pill ${pill(r.status)}`}>{statusLabel(r.status)}</span>
          {!ENDED.includes(r.status) && current(r) && <span className="muted small">{current(r)?.name}</span>}
        </span>
      </button>
    </li>
  );

  return (
    <section className="ops-side" aria-label={t('Operations')}>
      <div className="ops-side-head">
        <span>{t('Operations')}</span>
        <AddButton size="sm" variant="ghost" title={t('Link operations to this project')} onClick={() => { api.operations().then(setAll).catch((e: Error) => setError(e.message)); }} />
      </div>
      {all && (
        <div className="menu-backdrop" onMouseDown={() => setAll(null)}>
          <ul className="term-menu ops-link-menu" role="menu" aria-label={t('Link operations to this project')} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') setAll(null); }}>
            {!all.length && <li className="muted small ops-link-empty">{t('No operations yet. Create them in Settings › Operations.')}</li>}
            {all.map((o) => {
              const on = linked.some((x) => x.id === o.id);
              return (
                <li key={o.id}>
                  <button type="button" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(o.id)}>
                    <span className="ops-link-check">{on && <IconCheck size={13} />}</span> {o.name} <span className="muted small">{t('{n} steps', { n: o.steps.length })}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {error && <p className="error small">{error}</p>}
      {!linked.length && !runs.length && <p className="muted small ops-side-empty">{t('Link the operations this project uses with the +.')}</p>}
      <ul>
        {linked.map((o) => (
          <li key={o.id}>
            <button type="button" className={`ops-side-row${active === o.id ? ' active' : ''}`} onClick={() => onStart(o.id)} title={o.description || t('Start {name}', { name: o.name })}>
              <span className="ops-side-name"><IconPlay size={12} /> {o.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {open.length > 0 && <><div className="ops-side-sub">{t('Under way')}</div><ul>{open.map(runRow)}</ul></>}
      {ended.length > 0 && (
        <details className="ops-side-ended">
          <summary className="ops-side-sub">{t('Finished ({n})', { n: ended.length })}</summary>
          <ul>{ended.map(runRow)}</ul>
        </details>
      )}
    </section>
  );
}
