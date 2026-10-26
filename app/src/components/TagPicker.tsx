// Tags of a project or a file: chips, and a field that adds a tag from the
// catalog or creates a new one. Tags share context between projects.

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { api, type Tag } from '../api';
import { t } from '../i18n';
import { IconX } from './Icons';

interface Props {
  catalog: Tag[];
  value: string[];
  onChange: (ids: string[]) => void;
  onCatalog: (catalog: Tag[]) => void; // a tag was created
  compact?: boolean;
}

export function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span className="tag-chip" style={{ '--tag': tag.color } as CSSProperties} title={tag.description || tag.name}>
      <span className="tag-dot" />{tag.name}
      {onRemove && <button type="button" className="tag-x" onClick={onRemove} title={t('Remove tag')} aria-label={t('Remove tag')}><IconX size={11} /></button>}
    </span>
  );
}

export function TagPicker({ catalog, value, onChange, onCatalog, compact = false }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const chosen = value.map((id) => catalog.find((tg) => tg.id === id)).filter((tg): tg is Tag => Boolean(tg));
  const query = text.trim().toLowerCase();
  const options = catalog.filter((tg) => !value.includes(tg.id) && (!query || tg.name.toLowerCase().includes(query))).slice(0, 8);

  const add = async () => {
    if (!query) return;
    setError('');
    const known = catalog.find((tg) => tg.name.toLowerCase() === query);
    try {
      const tag = known ?? await api.saveTag({ name: text.trim() });
      if (!known) onCatalog(await api.tags());
      if (!value.includes(tag.id)) onChange([...value, tag.id]);
      setText('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); void add(); }
    if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  };

  return (
    <div className={`tag-picker${compact ? ' compact' : ''}`}>
      {chosen.map((tg) => <TagChip key={tg.id} tag={tg} onRemove={() => onChange(value.filter((id) => id !== tg.id))} />)}
      <span className="tag-input">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder={chosen.length ? t('+ tag') : t('Add a tag…')} maxLength={40}
          aria-label={t('Add a tag')} />
        {text && (
          <ul className="tag-options" role="listbox">
            {options.map((tg) => (
              <li key={tg.id}><button type="button" onMouseDown={(e) => { e.preventDefault(); onChange([...value, tg.id]); setText(''); }}><TagChip tag={tg} /></button></li>
            ))}
            {!catalog.some((tg) => tg.name.toLowerCase() === query) && (
              <li><button type="button" onMouseDown={(e) => { e.preventDefault(); void add(); }}>{t('Create tag "{name}"', { name: text.trim() })}</button></li>
            )}
          </ul>
        )}
      </span>
      {error && <span className="error small">{error}</span>}
    </div>
  );
}
