// What an agent needs and delivers in a multi-agent operation: inputs (in words),
// output files, the MCP servers it uses (to read data or to execute something
// outside Moki) and its default AI tool. Without onChange it only shows them.

import { useState, type KeyboardEvent } from 'react';
import type { AgentContract, AgentMcp, ToolInfo } from '../api';
import { t } from '../i18n';
import { IconPlus, IconX } from './Icons';

interface Props {
  value: AgentContract;
  onChange?: (next: AgentContract) => void;
  mcps?: string[]; // MCP servers configured where the AI tools start, offered as names
  tools?: ToolInfo[]; // AI tools that run in a terminal
  access?: string; // a read-only agent delivers no files and executes nothing
}

const modeLabel = (mode: string) => (mode === 'execute' ? t('Executes') : t('Reads'));

// A list typed one item at a time: Enter or the + adds it, the x removes it.
function ItemList({ label, hint, items, placeholder, onChange, disabled = false }: {
  label: string; hint: string; items: string[]; placeholder: string; onChange?: (items: string[]) => void; disabled?: boolean;
}) {
  const [typed, setTyped] = useState('');
  const add = () => {
    const item = typed.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!item || !onChange) return;
    if (!items.some((x) => x.toLowerCase() === item.toLowerCase())) onChange([...items, item]);
    setTyped('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
  return (
    <div className="field contract-list">
      <span className="label">{label}</span>
      <span className="muted small">{hint}</span>
      {items.length > 0
        ? (
          <div className="chips" role="list" aria-label={label}>
            {items.map((x) => (
              <span key={x} className="chip" role="listitem">
                {x}
                {onChange && <button type="button" className="chip-x" onClick={() => onChange(items.filter((y) => y !== x))} title={t('Remove')} aria-label={`${t('Remove')} ${x}`}><IconX size={11} /></button>}
              </span>
            ))}
          </div>
        )
        : !onChange && <span className="muted small">—</span>}
      {onChange && (
        <span className="row-actions">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={onKey} placeholder={placeholder} maxLength={120} disabled={disabled} aria-label={label} />
          <button type="button" className="icon-btn" onClick={add} disabled={disabled || !typed.trim()} title={t('Add')} aria-label={`${t('Add')}: ${label}`}><IconPlus size={15} /></button>
        </span>
      )}
    </div>
  );
}

export function AgentContractFields({ value, onChange, mcps = [], tools = [], access = '' }: Props) {
  const [mcpName, setMcpName] = useState('');
  const readOnly = access === 'read-only';
  const set = (patch: Partial<AgentContract>) => onChange?.({ ...value, ...patch });
  const setMcp = (name: string, patch: Partial<AgentMcp>) => set({ mcps: value.mcps.map((m) => (m.name === name ? { ...m, ...patch } : m)) });
  const addMcp = () => {
    const name = mcpName.trim();
    if (!name || value.mcps.some((m) => m.name === name)) return;
    set({ mcps: [...value.mcps, { name, mode: 'read' }] });
    setMcpName('');
  };
  const terminal = tools.filter((x) => x.kind === 'terminal');
  const aiLabel = value.ai ? terminal.find((x) => x.id === value.ai)?.label ?? value.ai : t('The one chosen when it runs');

  return (
    <fieldset className="contract">
      <legend>{t('In an operation')}</legend>
      <p className="muted small">{t('What this agent needs, what it delivers and what it uses. A multi-agent operation passes the files one agent delivers to the next.')}</p>

      <ItemList label={t('Inputs')} hint={t('What it needs to start, in words (e.g. User stories).')} items={value.inputs}
        placeholder={t('e.g. User stories')} onChange={onChange ? (inputs) => set({ inputs }) : undefined} />

      <ItemList label={t('Outputs')} hint={readOnly ? t('A read-only agent writes nothing, so it delivers no files.') : t('Files it delivers, with the extension (e.g. test-cases.xlsx). * matches any name (e.g. *.pdf).')}
        items={value.outputs} placeholder={t('e.g. test-cases.xlsx')} onChange={onChange ? (outputs) => set({ outputs }) : undefined} disabled={readOnly} />

      <ItemList label={t('Possible results')} hint={t('How it can end (e.g. approved, rejected). In an operation, each result can lead to a different agent.')}
        items={value.outcomes ?? []} placeholder={t('e.g. approved')} onChange={onChange ? (outcomes) => set({ outcomes }) : undefined} />

      <div className="field contract-list">
        <span className="label">{t('MCP servers')}</span>
        <span className="muted small">{t('Reads: only queries data. Executes: changes something outside Moki, so the operation asks you before that step.')}</span>
        {value.mcps.length > 0
          ? (
            <ul className="contract-mcps" aria-label={t('MCP servers')}>
              {value.mcps.map((m) => (
                <li key={m.name}>
                  <code>{m.name}</code>
                  {onChange
                    ? (
                      <select value={m.mode} onChange={(e) => setMcp(m.name, { mode: e.target.value })} aria-label={t('How {name} is used', { name: m.name })}>
                        <option value="read">{t('Reads')}</option>
                        <option value="execute" disabled={readOnly}>{t('Executes')}</option>
                      </select>
                    )
                    : <span className={`pill${m.mode === 'execute' ? ' pill-warn' : ''}`}>{modeLabel(m.mode)}</span>}
                  {onChange && <button type="button" className="icon-btn" onClick={() => set({ mcps: value.mcps.filter((x) => x.name !== m.name) })} title={t('Remove')} aria-label={`${t('Remove')} ${m.name}`}><IconX size={13} /></button>}
                </li>
              ))}
            </ul>
          )
          : !onChange && <span className="muted small">—</span>}
        {onChange && (
          <span className="row-actions">
            <input list="known-mcps" value={mcpName} onChange={(e) => setMcpName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMcp(); } }}
              placeholder={mcps.length ? t('Choose or type a server name') : t('Server name, e.g. jira')} maxLength={64} aria-label={t('MCP server')} />
            <datalist id="known-mcps">{mcps.filter((n) => !value.mcps.some((m) => m.name === n)).map((n) => <option key={n} value={n} />)}</datalist>
            <button type="button" className="icon-btn" onClick={addMcp} disabled={!mcpName.trim()} title={t('Add')} aria-label={`${t('Add')}: ${t('MCP server')}`}><IconPlus size={15} /></button>
          </span>
        )}
      </div>

      <div className="field">
        <span className="label">{t('Default AI')}</span>
        {onChange
          ? (
            <select value={value.ai} onChange={(e) => set({ ai: e.target.value })} aria-label={t('Default AI')}>
              <option value="">{t('The one chosen when it runs')}</option>
              {terminal.map((x) => <option key={x.id} value={x.id}>{x.label}{x.available ? '' : ` (${t('not installed')})`}</option>)}
            </select>
          )
          : <span>{aiLabel}</span>}
      </div>
    </fieldset>
  );
}
