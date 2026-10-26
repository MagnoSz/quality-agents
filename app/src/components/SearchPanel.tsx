// The magnifier on the icon rail: searches the projects and the text files of the
// active workspace, by text and/or tags. It takes the place of the left list.

import { useEffect, useState, type ReactNode } from 'react';
import { api, type SearchResult, type Tag } from '../api';
import { t } from '../i18n';
import { FileIcon } from '../icons';
import { TagChip } from './TagPicker';
import { IconChevron, IconX } from './Icons';

interface Props {
  onOpenProject: (project: string) => void;
  onOpenFile: (project: string, path: string) => void;
  onClose: () => void;
}

const EMPTY: SearchResult = { projects: [], files: [], truncated: false };

// The match in bold.
function mark(text: string, q: string): ReactNode {
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return text;
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + q.length)}</mark>{text.slice(at + q.length)}</>;
}

export function SearchPanel({ onOpenProject, onOpenFile, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<Tag[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [result, setResult] = useState<SearchResult>(EMPTY);
  const [error, setError] = useState('');
  useEffect(() => { api.tags().then(setCatalog).catch(() => setCatalog([])); }, []);

  useEffect(() => {
    if (!query.trim() && !tags.length) { setResult(EMPTY); return; }
    const timer = window.setTimeout(() => {
      api.search(query, tags).then((r) => { setResult(r); setError(''); }).catch((e: Error) => setError(e.message));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, tags]);

  const q = query.trim();
  const searching = Boolean(q || tags.length);
  const toggle = (id: string) => setTags((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="search-panel" role="search">
      <div className="search-box">
        <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search projects and files…')}
          aria-label={t('Search projects and files')} onKeyDown={(e) => { if (e.key === 'Escape') { if (query) setQuery(''); else onClose(); } }} />
        <button type="button" className="icon-btn" onClick={onClose} title={t('Close the search')} aria-label={t('Close the search')}><IconX size={15} /></button>
      </div>
      {catalog.length > 0 && (
        <div className="search-tags" role="group" aria-label={t('Filter by tag')}>
          {catalog.map((tg) => (
            <button key={tg.id} type="button" className={tags.includes(tg.id) ? 'on' : ''} aria-pressed={tags.includes(tg.id)} onClick={() => toggle(tg.id)}>
              <TagChip tag={tg} />
            </button>
          ))}
        </div>
      )}
      <div className="search-results">
        {error && <p className="error small">{error}</p>}
        {!searching && <p className="muted small search-hint">{catalog.length ? t('Type to search, or choose tags to filter.') : t('Type to search the names and the text of the files.')}</p>}
        {searching && !result.projects.length && !result.files.length && !error && <p className="muted small search-hint">{t('Nothing found.')}</p>}
        {result.projects.length > 0 && <>
          <div className="home-list-head">{t('Projects')}</div>
          <ul>
            {result.projects.map((p) => (
              <li key={p.id}>
                <button type="button" className="home-project" onClick={() => onOpenProject(p.id)}>
                  <span className="home-project-name">{mark(p.name, q)}</span>
                  <IconChevron size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>}
        {result.files.length > 0 && <>
          <div className="home-list-head">{t('Files')}</div>
          <ul>
            {result.files.map((f) => (
              <li key={`${f.project}/${f.path}`}>
                <button type="button" className="search-hit" onClick={() => onOpenFile(f.project, f.path)} title={`${f.projectName} · ${f.path}`}>
                  <span className="search-hit-head"><FileIcon name={f.path} size={14} /><span className="search-hit-name">{mark(f.path.split('/').pop() ?? f.path, q)}</span></span>
                  <span className="search-hit-where">{f.projectName} · {f.path}</span>
                  {f.snippet && <span className="search-hit-snippet">{mark(f.snippet, q)}</span>}
                </button>
              </li>
            ))}
          </ul>
          {result.truncated && <p className="muted small search-hint">{t('Showing the first results. Refine the search to see others.')}</p>}
        </>}
      </div>
    </div>
  );
}
