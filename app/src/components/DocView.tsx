import type { MouseEvent } from 'react';
import type { FileContent } from '../api';
import { IconEdit, IconExternal, IconEye, IconFile } from './Icons';

interface Props {
  content: FileContent;
  mode: 'preview' | 'edit';
  draft: string;
  dirty: boolean;
  saving: boolean;
  onDraft: (text: string) => void;
  onMode: (mode: 'preview' | 'edit') => void;
  onSave: () => void;
  onOpenExternal: () => void;
  onLink: (href: string) => void;
}

const formatSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export function DocView({ content, mode, draft, dirty, saving, onDraft, onMode, onSave, onOpenExternal, onLink }: Props) {
  const editable = (content.kind === 'markdown' || content.kind === 'text') && content.editable;
  const crumbs = content.path.split('/');

  // Links inside rendered Markdown never navigate the window.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href') ?? '';
    if (href) onLink(href);
  };

  return (
    <div className="doc">
      <div className="doc-bar">
        <div className="crumbs">
          {crumbs.map((c, i) => <span key={`${c}-${i}`} className={i === crumbs.length - 1 ? 'crumb-last' : ''}>{c}</span>)}
        </div>
        <div className="doc-actions">
          {editable && mode === 'preview' && content.kind === 'markdown' && (
            <button type="button" className="icon-btn" onClick={() => onMode('edit')} title="Edit (Ctrl+E)"><IconEdit size={17} /></button>
          )}
          {editable && mode === 'edit' && content.kind === 'markdown' && (
            <button type="button" className="icon-btn" onClick={() => onMode('preview')} title="Reading view (Ctrl+E)"><IconEye size={17} /></button>
          )}
          {editable && (dirty || saving) && (
            <button type="button" className="btn btn-sm" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          )}
          <button type="button" className="icon-btn" onClick={onOpenExternal} title="Open with the default program"><IconExternal size={17} /></button>
        </div>
      </div>

      <div className="doc-body">
        {content.kind === 'markdown' && mode === 'preview' && (
          // HTML comes from the main process renderer, which escapes all markup from the file.
          <div className="markdown" onClick={onClick} dangerouslySetInnerHTML={{ __html: content.html }} />
        )}
        {(content.kind === 'markdown' || content.kind === 'text') && (mode === 'edit' || content.kind === 'text') && (
          content.editable
            ? <textarea className="editor" spellCheck value={draft} onChange={(e) => onDraft(e.target.value)} />
            : <pre className="plain">{content.text}</pre>
        )}
        {content.kind === 'json' && <pre className="plain code-view">{content.text}</pre>}
        {content.kind === 'docx' && (
          <>
            <p className="notice-bar">Word document — text preview. Open it with Word to see images and formatting.</p>
            <div className="markdown" onClick={onClick} dangerouslySetInnerHTML={{ __html: content.html }} />
          </>
        )}
        {content.kind === 'image' && <div className="image-view"><img src={content.dataUrl} alt={content.path} /></div>}
        {content.kind === 'binary' && (
          <div className="binary-view">
            <IconFile size={40} />
            <strong>{crumbs[crumbs.length - 1]}</strong>
            <span className="muted small">{formatSize(content.size)}{content.reason ? ` · ${content.reason}` : ''}</span>
            {content.openable
              ? <button type="button" className="btn" onClick={onOpenExternal}><IconExternal size={16} /> Open with the default program</button>
              : <span className="muted small">This type of file is not opened from Quality Agents.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
