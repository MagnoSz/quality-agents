// "This repository" tab: the skills and agents installed only for this project
// (its linked folder's .claude, or the project folder), to review or remove.
// Removing moves them to the trash; a linked folder's .claude is backed up first.

import { useCallback, useEffect, useState } from 'react';
import { api, type ProjectItems, type ProjectSummary } from '../api';
import { t } from '../i18n';
import { SkillCat } from './SkillCat';

interface Props { project: ProjectSummary }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function ProjectPanel({ project }: Props) {
  const [items, setItems] = useState<ProjectItems | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [backup, setBackup] = useState('');

  const load = useCallback(() => { api.projectItems(project.id).then(setItems).catch((e) => setError(message(e))); }, [project.id]);
  useEffect(load, [load]);

  const remove = async (kind: 'skill' | 'agent', name: string) => {
    const what = kind === 'skill' ? t('Remove the skill "{name}" from', { name }) : t('Remove the agent "{name}" from', { name });
    const where = project.repository ? t("the repository {folder}?\n\nThis CHANGES its .claude (the current .claude is backed up to the project's backups/ first).", { folder: project.repository })
      : t('the project {name}?', { name: project.name });
    if (!window.confirm(`${what} ${where} ${t('It goes to the trash.')}`)) return;
    setBusy(`${kind}:${name}`); setError(''); setBackup('');
    try { setBackup((await api.removeProjectItem(project.id, kind, name, Boolean(project.repository))).backup ?? ''); load(); } catch (e) { setError(message(e)); } finally { setBusy(''); }
  };

  const section = (kind: 'skill' | 'agent', title: string, list: { name: string; description: string }[] | undefined, folder: string | undefined) => (
    <section className="field">
      <div className="skill-card-head">
        <span className="label">{title} ({list?.length ?? 0})</span>
        <span className="statusbar-spacer" />
        {folder && <code className="small">{folder}</code>}
      </div>
      {list && !list.length && <p className="muted small">{kind === 'skill' ? t('No skills installed only for this project.') : t('No agents installed only for this project.')}</p>}
      <ul className="skill-list">
        {list?.map((s) => (
          <li key={s.name} className="skill-card">
            <div className="skill-card-head">
              {kind === 'skill' && <SkillCat name={s.name} />}
              <span className="choice-title">{s.name}</span>
              <span className="statusbar-spacer" />
              <button type="button" className="btn btn-ghost btn-sm" disabled={Boolean(busy)} onClick={() => { void remove(kind, s.name); }}>
                {busy === `${kind}:${s.name}` ? t('Removing…') : t('Remove')}
              </button>
            </div>
            {s.description && <p className="skill-desc small">{s.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      {error && <div className="result warn" role="status"><p className="result-title">{error}</p></div>}
      {backup && <p className="small">{t('Backup of the previous .claude:')} <code>{backup}</code></p>}
      {section('skill', t('Skills'), items?.skills, items?.skillsFolder)}
      {section('agent', t('Agents'), items?.agents, items?.agentsFolder)}
    </>
  );
}
