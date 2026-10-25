// "Create agent": the QA describes the agent in plain words and mentions (@name)
// or picks the skills it may use. Only skills already installed in the chosen
// folder are offered; the service checks it again before writing the file.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { api, type ProjectSummary, type ScopeAgents, type SkillScope } from '../api';
import { t } from '../i18n';
import { IconCheck, IconInfo } from './Icons';

interface Props { project: ProjectSummary; scope: SkillScope; onFindSkills: () => void }

// @name preceded by a space or the start of a line (not e-mail addresses); a trailing "." ends the sentence.
const mentionsIn = (text: string): string[] =>
  [...new Set([...text.matchAll(/(?:^|\s)@([a-z0-9][a-z0-9._-]*)/gim)].map((m) => m[1].replace(/\.+$/, '').toLowerCase()))];
// The @word being typed right before the caret, if any.
const typedMention = (text: string, caret: number) => text.slice(0, caret).match(/(?:^|\s)@([a-z0-9._-]*)$/i);

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function AgentForm({ project, scope, onFindSkills }: Props) {
  const [data, setData] = useState<ScopeAgents | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ query: string; start: number; index: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; file: string; backup?: string } | null>(null);
  const [error, setError] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => { api.scopeAgents(project.id, scope).then(setData).catch((e) => setError(message(e))); }, [project.id, scope]);
  useEffect(() => { setPicked([]); load(); }, [load]);

  const installed = data?.skills ?? [];
  const builtin = data?.builtin ?? []; // Moki's own skills (project and repository agents only)
  const usable = [...installed, ...builtin.map((b) => b.name)];
  const mentioned = useMemo(() => mentionsIn(description), [description]);
  const notInstalled = mentioned.filter((m) => !usable.includes(m));
  const chosen = usable.filter((s) => picked.includes(s) || mentioned.includes(s));
  const options = menu ? usable.filter((s) => s.includes(menu.query.toLowerCase())) : [];
  const menuOpen = options.length > 0;

  // Reads the caret from the element: also runs after a mention is inserted.
  const followCaret = (e: SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const m = typedMention(el.value, el.selectionStart);
    setMenu(m ? { query: m[1], start: el.selectionStart - m[1].length - 1, index: 0 } : null);
  };

  const insert = (skill: string) => {
    if (!menu) return;
    const end = menu.start + 1 + menu.query.length;
    const caret = menu.start + skill.length + 2;
    setDescription(`${description.slice(0, menu.start)}@${skill} ${description.slice(end)}`);
    setMenu(null);
    requestAnimationFrame(() => { box.current?.focus(); box.current?.setSelectionRange(caret, caret); });
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); setMenu(null); return; } // never closes the dialog while typing
    if (!menu || !menuOpen) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setMenu({ ...menu, index: (menu.index + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insert(options[Math.min(menu.index, options.length - 1)]);
    }
  };

  const toggle = (skill: string) => setPicked((p) => (p.includes(skill) ? p.filter((x) => x !== skill) : [...p, skill]));

  const missing = [
    !name.trim() && t('give the agent a name'),
    !description.trim() && t('describe what it does'),
    !chosen.length && t('choose at least one skill'),
    notInstalled.length > 0 && t('remove {mentions}', { mentions: notInstalled.map((m) => `@${m}`).join(', ') }),
  ].filter(Boolean) as string[];

  const create = async () => {
    const toClaude = scope === 'project' && Boolean(project.repository);
    if (toClaude && !window.confirm(t("Create the agent in {folder}?\n\nThis CHANGES {folder}/.claude: the agent is written to its agents folder (the current .claude is backed up to the project's backups/ first).", { folder: project.repository ?? '' }))) return;
    setBusy(true); setError(''); setCreated(null);
    try {
      setCreated(await api.createScopeAgent(project.id, { name, description, skills: chosen, scope }, toClaude));
      setName(''); setDescription(''); setPicked([]);
      load();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };

  const chip = (s: string, about = '') => {
    const isMentioned = mentioned.includes(s);
    const on = isMentioned || picked.includes(s);
    return (
      <button key={s} type="button" className={`chip-btn${on ? ' on' : ''}`} aria-pressed={on} disabled={isMentioned}
        title={isMentioned ? t('Mentioned in the description — remove the @mention to leave it out') : about || undefined} onClick={() => toggle(s)}>
        {on && <IconCheck size={12} />} {s}
      </button>
    );
  };

  const findSkills = <button type="button" className="link" onClick={onFindSkills}>{t('Find skills')}</button>;

  return (
    <>
      <div className="info-note" role="note">
        <IconInfo size={16} />
        <span>{t('An agent only uses the skills already installed in')} {data ? <code>{data.folder}</code> : t('this folder')}{builtin.length > 0 && ` ${t('and the Moki skills')}`}. {t('To give it another skill, install it first in')} {findSkills}.{data && <> {t('It is saved in')} <code>{data.agentsFolder}</code>.</>}</span>
      </div>

      <label className="field">
        <span className="label">{t('Name')}</span>
        <input value={name} maxLength={64} onChange={(e) => setName(e.target.value)} placeholder={t('e.g. api-tester')} />
      </label>

      <div className="field">
        <label className="label" htmlFor="agent-description">{t('Describe the agent')}</label>
        <div className="mention-box">
          <textarea
            id="agent-description" ref={box} rows={6} maxLength={8000} value={description}
            onChange={(e) => setDescription(e.target.value)} onSelect={followCaret} onKeyDown={onKey} onBlur={() => setMenu(null)}
            placeholder={t('e.g. Act as a senior API tester. Check the contracts with @openapi-lint and list every breaking change.')}
            role="combobox" aria-autocomplete="list" aria-expanded={menuOpen} aria-controls="mention-list"
          />
          {menu && menuOpen && (
            <ul id="mention-list" className="mention-menu" role="listbox" aria-label={t('Installed skills')}>
              {options.map((s, i) => (
                <li key={s} role="option" aria-selected={i === menu.index} className={i === menu.index ? 'on' : ''}
                  onMouseDown={(e) => { e.preventDefault(); insert(s); }}>@{s}</li>
              ))}
            </ul>
          )}
        </div>
        <span className="muted small">{t('Type')} <kbd>@</kbd> {t('to mention an installed skill, or pick them below.')}</span>
      </div>

      <div className="field">
        <span className="label">{t('Skills it may use ({n} of {total})', { n: chosen.length, total: usable.length })}</span>
        {data && !usable.length ? (
          <p className="muted small">{t('No skills installed in this folder yet. Install them in')} {findSkills}{t(', then come back.')}</p>
        ) : (
          <>
            {installed.length > 0 && <div className="chips" role="group" aria-label={t('Installed skills')}>{installed.map((s) => chip(s))}</div>}
            {builtin.length > 0 && (
              <>
                <span className="muted small">{t('Moki skills (hover to read what each one does):')}</span>
                <div className="chips" role="group" aria-label={t('Moki skills')}>{builtin.map((b) => chip(b.name, b.description))}</div>
              </>
            )}
          </>
        )}
        {notInstalled.length > 0 && (
          <p className="small warn-text">{t('Not installed in this folder:')} {notInstalled.map((m) => `@${m}`).join(', ')}. {t('Install it in Find skills or remove the mention.')}</p>
        )}
      </div>

      {(created || error) && (
        <div className={`result${error ? ' warn' : ''}`} role="status">
          {error && <p className="result-title">{error}</p>}
          {created && (
            <>
              <p className="result-title"><IconCheck size={17} /> {t('Created agent {name}', { name: created.name })}</p>
              <p className="small"><code>{created.file}</code></p>
              {scope === 'project' && <p className="small">{t('The next request opened from this project tells the AI about it.')}</p>}
              {created.backup && <p className="small">{t('Backup of the previous .claude:')} <code>{created.backup}</code></p>}
            </>
          )}
        </div>
      )}

      {data && data.agents.length > 0 && (
        <p className="muted small">{t('Agents already here:')} {data.agents.join(', ')}</p>
      )}

      <div className="form-actions">
        {missing.length > 0 && <span className="muted small">{t('To continue:')} {missing.join(' · ')}.</span>}
        <button type="button" className="btn" disabled={busy || missing.length > 0} onClick={() => { void create(); }}>
          {busy ? t('Creating…') : t('Create agent')}
        </button>
      </div>
    </>
  );
}
