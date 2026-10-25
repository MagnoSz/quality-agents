// Agent library: built-in agents (read-only) and the user's own agents, by
// category. A built-in agent is customized by duplicating it; the copy lives in
// workspace/library/agents/ and can be edited or deleted.

import { useCallback, useEffect, useState } from 'react';
import { api, type AgentDetail, type AgentInfo, type Category } from '../api';
import { t } from '../i18n';
import { IconCopy, IconEdit, IconEye, IconHome, IconTrash, IconX } from '../components/Icons';

interface Props { onBack: () => void; backLabel: string }

export const accessLabel = (access: string): string => ({
  'read-only': t('Reads only — writes nothing'),
  'project-write': t('Writes only in the project folder'),
  'repository-write': t('May change a linked repository, after an approved plan'),
} as Record<string, string>)[access] ?? access;

const statusText = (status: string): string => ({ stable: t('Stable'), draft: t('Draft'), 'pending-migration': t('Pending migration'), planned: t('Planned') } as Record<string, string>)[status] ?? status;

export function Library({ onBack, backLabel }: Props) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (select?: string) => {
    const [list, cats] = await Promise.all([api.agents(), api.categories()]);
    setAgents(list);
    setCategories(cats);
    setSelected((cur) => select ?? (cur && list.some((a) => a.name === cur) ? cur : (list.find((a) => a.usable) ?? list[0])?.name ?? null));
  }, []);

  useEffect(() => { load().catch((e: Error) => setError(e.message)); }, [load]);

  useEffect(() => {
    setEditing(false);
    if (!selected) { setDetail(null); return; }
    api.agent(selected).then((d) => { setDetail(d); setDraft(d.text); }).catch((e: Error) => setError(e.message));
  }, [selected]);

  const dirty = editing && detail !== null && draft !== detail.text;
  const choose = (name: string) => {
    if (dirty && !window.confirm(t('Discard unsaved changes?'))) return;
    setError('');
    setSelected(name);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  const duplicate = () => run(async () => {
    if (!detail) return;
    const copy = await api.duplicateAgent(detail.name);
    await load(copy.name);
  });

  const save = () => run(async () => {
    if (!detail) return;
    await api.saveAgent(detail.name, draft);
    const fresh = await api.agent(detail.name);
    setDetail(fresh); setDraft(fresh.text); setEditing(false);
    await load(detail.name);
  });

  const remove = () => run(async () => {
    if (!detail || !window.confirm(t('Delete the agent "{name}"? This removes its file from your library.', { name: detail.name }))) return;
    await api.deleteAgent(detail.name);
    await load(agents.find((a) => a.name !== detail.name)?.name);
  });

  const leave = () => { if (!dirty || window.confirm(t('Discard unsaved changes?'))) onBack(); };

  return (
    <div className="library">
      <aside className="home-list">
        <button type="button" className="btn btn-ghost btn-sm library-back" onClick={leave}><IconHome size={15} /> {backLabel}</button>
        <div className="home-list-head">{t('Agents')}</div>
        {categories.map((c) => {
          const group = agents.filter((a) => a.category === c.id);
          if (!group.length) return null;
          return (
            <section key={c.id} className="library-group">
              <div className="library-group-head" title={c.description}>{c.label}</div>
              <ul>
                {group.map((a) => (
                  <li key={a.name}>
                    <button type="button" className={`library-item${a.name === selected ? ' active' : ''}`} onClick={() => choose(a.name)}>
                      <span className={`dot ${a.usable ? 'dot-ok' : 'dot-muted'}`} title={statusText(a.status)} />
                      <span className="library-item-name">{a.name}</span>
                      {a.source === 'custom' && <span className="chip">{t('yours')}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </aside>

      <main className="library-main">
        {error && <div className="error-bar">{error}<button type="button" className="icon-btn" onClick={() => setError('')}><IconX size={14} /></button></div>}
        {!detail ? <div className="welcome"><p className="muted">{t('No agents found.')}</p></div> : (
          <div className="library-detail">
            <header className="library-head">
              <div>
                <h1>{detail.name}</h1>
                <p className="muted">{detail.description}</p>
              </div>
              <div className="row-actions">
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { void duplicate(); }} title={t('Copy to your library to customize it')}><IconCopy size={15} /> {t('Duplicate')}</button>
                {detail.source === 'custom' && !editing && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><IconEdit size={15} /> {t('Edit')}</button>}
                {detail.source === 'custom' && editing && <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraft(detail.text); setEditing(false); }}><IconEye size={15} /> {t('Cancel')}</button>
                  <button type="button" className="btn btn-sm" disabled={busy || !dirty} onClick={() => { void save(); }}>{busy ? t('Saving…') : t('Save')}</button>
                </>}
                {detail.source === 'custom' && <button type="button" className="icon-btn" disabled={busy} onClick={() => { void remove(); }} title={t('Delete this agent')}><IconTrash size={17} /></button>}
              </div>
            </header>

            <dl className="facts library-facts">
              <div><dt>{t('Category')}</dt><dd>{categories.find((c) => c.id === detail.category)?.label ?? detail.category}</dd></div>
              <div><dt>{t('Status')}</dt><dd>{statusText(detail.status)}{detail.usable ? '' : ` — ${t('not available yet')}`}</dd></div>
              <div><dt>{t('Access')}</dt><dd>{accessLabel(detail.access)}</dd></div>
              <div><dt>{t('Version')}</dt><dd>{detail.version}</dd></div>
              <div><dt>{t('Origin')}</dt><dd>{detail.source === 'builtin' ? t('Built-in (read-only)') : detail.basedOn ? t('Yours, based on {agent}', { agent: detail.basedOn }) : t('Yours')}</dd></div>
              <div><dt>{t('Skills')}</dt><dd className="chips">{detail.skills.map((s) => <span key={s} className="chip">{s}</span>)}</dd></div>
            </dl>

            {editing
              ? <textarea className="editor library-editor" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
              : <article className="markdown library-body" dangerouslySetInnerHTML={{ __html: detail.html }} />}
            <p className="muted small library-path">{detail.path}</p>
          </div>
        )}
      </main>
    </div>
  );
}
