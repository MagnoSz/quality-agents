// "Native and created": the skills that come with Moki (skills/ in the framework) and
// the ones the user created with "Create skill" (proposals in this project's
// skill-proposals/), whether they are installed yet or not. Installing a proposal
// uses the same rules as the Create skill tab.

import { useCallback, useEffect, useState } from 'react';
import { api, type ProjectSummary, type SkillInfo, type SkillScope } from '../api';
import { t } from '../i18n';
import { SkillCat } from './SkillCat';

interface Props {
  project: ProjectSummary;
  scope: SkillScope; // where "Install" puts a proposal (the dialog's "Install for")
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const STATUS: Record<string, { label: string; cls: string }> = {
  stable: { label: 'Ready', cls: 'pill-completed' },
  draft: { label: 'In testing', cls: 'pill-in-progress' },
};

export function SkillLibrary({ project, scope }: Props) {
  const [native, setNative] = useState<SkillInfo[] | null>(null);
  const [created, setCreated] = useState<{ name: string; description: string }[] | null>(null);
  const [installed, setInstalled] = useState<{ project: string[]; global: string[] }>({ project: [], global: [] });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(() => {
    api.skills().then(setNative).catch((e) => setError(message(e)));
    api.skillProposals(project.id).then(setCreated).catch(() => setCreated([]));
    api.installedSkills(project.id).then(setInstalled).catch(() => { /* keep */ });
  }, [project.id]);
  useEffect(load, [load]);

  const where = (name: string) => (installed.project.includes(name) ? t('This project') : installed.global.includes(name) ? t('All projects') : '');

  const install = async (name: string) => {
    const toClaude = scope === 'project' && Boolean(project.repository);
    const target = scope !== 'project' ? t('all projects (your user folder)')
      : toClaude ? t("the project {name}?\n\nThis CHANGES {folder}/.claude: the skill is written to its skills folder (the current .claude is backed up to the project's backups/ first)", { name: project.name, folder: project.repository })
      : t('the project {name}', { name: project.name });
    if (!window.confirm(`${t('Install the proposal "{name}" for {where}', { name, where: target })}${toClaude ? '.' : '?'}\n\n${t('Review its SKILL.md first: a skill can instruct the AI to run commands.')}`)) return;
    setBusy(name); setError(''); setInfo('');
    try {
      const r = await api.installProposal(project.id, name, scope, toClaude);
      setInfo(`${t('Installed {name} in {folders}', { name: r.name, folders: r.folders.join(', ') })}${r.backup ? `. ${t('Backup of the previous .claude:')} ${r.backup}` : ''}`);
      load();
    } catch (e) { setError(message(e)); } finally { setBusy(''); }
  };

  return (
    <>
      {error && <div className="result warn" role="status"><p className="result-title">{error}</p></div>}
      {info && <div className="result" role="status"><p className="result-title">{info}</p></div>}

      <section className="field">
        <div className="skill-card-head">
          <span className="label">{t('Come with Moki')} ({native?.length ?? 0})</span>
        </div>
        <p className="muted small">{t('Always available in every project. The activities of the side panel use them.')}</p>
        <ul className="skill-list">
          {native?.map((s) => {
            const status = STATUS[s.status] ?? { label: 'Coming soon', cls: '' };
            return (
              <li key={s.name} className={`skill-card${STATUS[s.status] ? '' : ' muted-card'}`}>
                <div className="skill-card-head">
                  <SkillCat name={s.name} />
                  <span className="choice-title">{s.name}</span>
                  <span className="chip">{t('Native')}</span>
                  <span className="statusbar-spacer" />
                  <span className={`pill ${status.cls}`}>{t(status.label)}</span>
                </div>
                {s.description && <p className="skill-desc small">{s.description}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="field">
        <div className="skill-card-head">
          <span className="label">{t('Created by you')} ({created?.length ?? 0})</span>
        </div>
        {created && !created.length && <p className="muted small">{t('None yet. Skills you create with "Create skill" appear here, installed or not.')}</p>}
        <ul className="skill-list">
          {created?.map((s) => {
            const at = where(s.name);
            return (
              <li key={s.name} className="skill-card">
                <div className="skill-card-head">
                  <SkillCat name={s.name} />
                  <span className="choice-title">{s.name}</span>
                  <span className="chip">{t('Your skill')}</span>
                  <span className="statusbar-spacer" />
                  {at
                    ? <span className="pill pill-completed" title={t('Installed for: {where}', { where: at })}>{t('Installed')} · {at}</span>
                    : <button type="button" className="btn btn-sm" disabled={Boolean(busy)} onClick={() => { void install(s.name); }}>{busy === s.name ? t('Installing…') : t('Install')}</button>}
                </div>
                {s.description && <p className="skill-desc small">{s.description}</p>}
                <p className="skill-desc small muted"><code>skill-proposals/{s.name}/SKILL.md</code></p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
