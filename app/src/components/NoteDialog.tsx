// A project note (Markdown in notes/), opened and edited in a popup that can be
// dragged by its header, with a formatting bar and a reading view like .md tabs.
// path null = a new note: it asks for a title, which becomes the file name.

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { api } from '../api';
import { t } from '../i18n';
import { IconEdit, IconEye, IconX } from './Icons';

interface Props { project: string; path: string | null; onClose: () => void }

export function NoteDialog({ project, path, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [html, setHtml] = useState('');
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from the centered position
  const editor = useRef<HTMLTextAreaElement>(null);
  const dirty = text !== saved || (!path && Boolean(title.trim()));

  useEffect(() => {
    if (!path) return;
    api.readFile(project, path)
      .then((c) => { const t = c.kind === 'markdown' || c.kind === 'text' ? c.text : ''; setText(t); setSaved(t); })
      .catch((e: Error) => setError(e.message));
  }, [project, path]);

  useEffect(() => { if (mode === 'preview') api.renderMarkdown(text).then(setHtml).catch((e: Error) => setError(e.message)); }, [mode, text]);

  const close = () => { if (!dirty || window.confirm(t('Discard the unsaved changes in this note?'))) onClose(); };

  const save = () => {
    setSaving(true); setError('');
    (path ? api.writeFile(project, path, text) : api.createNote(project, title, text))
      .then(onClose)
      .catch((e: Error) => { setError(e.message); setSaving(false); });
  };

  // Replaces text[from, to) through the browser, so Ctrl+Z undoes the formatting.
  const replace = (from: number, to: number, value: string, selFrom: number, selTo: number) => {
    const el = editor.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(from, to);
    document.execCommand('insertText', false, value);
    el.setSelectionRange(selFrom, selTo);
  };

  // **bold**, *italic*: wraps the selection, or removes the marks when already there.
  const wrap = (mark: string) => {
    const el = editor.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const n = mark.length;
    if (text.slice(s - n, s) === mark && text.slice(e, e + n) === mark) replace(s - n, e + n, text.slice(s, e), s - n, e - n);
    else replace(s, e, mark + text.slice(s, e) + mark, s + n, e + n);
  };

  // Applies fn to every line the selection touches (headings, lists).
  const lines = (fn: (line: string) => string) => {
    const el = editor.current;
    if (!el) return;
    const from = text.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const end = text.indexOf('\n', el.selectionEnd);
    const to = end === -1 ? text.length : end;
    const block = text.slice(from, to).split('\n').map(fn).join('\n');
    replace(from, to, block, from, from + block.length);
  };
  const heading = (level: number) => {
    const mark = `${'#'.repeat(level)} `;
    lines((l) => { const bare = l.replace(/^#{1,6} /, ''); return l === mark + bare ? bare : mark + bare; });
  };
  const list = () => lines((l) => (l.startsWith('- ') ? l.slice(2) : `- ${l}`));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') { e.preventDefault(); if (!saving && dirty) save(); }
      if (key === 'e') { e.preventDefault(); setMode((m) => (m === 'edit' ? 'preview' : 'edit')); }
      if (mode === 'edit' && key === 'b') { e.preventDefault(); wrap('**'); }
      if (mode === 'edit' && key === 'i') { e.preventDefault(); wrap('*'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Dragging by the header; the pointer is kept inside the window so the header never gets lost.
  const startDrag = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const start = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const move = (m: MouseEvent) => setPos({
      x: Math.min(Math.max(m.clientX, 0), window.innerWidth) - start.x,
      y: Math.min(Math.max(m.clientY, 0), window.innerHeight) - start.y,
    });
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  };

  const tool = (label: string, title: string, run: () => void, style?: object) => (
    <button type="button" className="icon-btn" title={title} style={style} disabled={mode !== 'edit'} onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</button>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-title" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
        <header className="modal-head" onMouseDown={startDrag} title={t('Drag to move')}>
          <h2 id="note-title">{path ? path.split('/').pop()?.replace(/\.md$/, '') : t('New note')}</h2>
          <button type="button" className="icon-btn" onClick={close} title={t('Close (Esc)')}><IconX size={18} /></button>
        </header>
        <div className="note-tools" role="toolbar" aria-label={t('Formatting')}>
          {tool('B', t('Bold (Ctrl+B)'), () => wrap('**'), { fontWeight: 700 })}
          {tool('I', t('Italic (Ctrl+I)'), () => wrap('*'), { fontStyle: 'italic' })}
          {tool('S', t('Strikethrough'), () => wrap('~~'), { textDecoration: 'line-through' })}
          <span className="sep" />
          {tool('H1', t('Large title'), () => heading(1))}
          {tool('H2', t('Medium title'), () => heading(2))}
          {tool('H3', t('Small title'), () => heading(3))}
          <span className="sep" />
          {tool('•', t('List'), list)}
          <span className="statusbar-spacer" />
          {mode === 'edit'
            ? <button type="button" className="icon-btn" onClick={() => setMode('preview')} title={t('Reading view (Ctrl+E)')}><IconEye size={17} /></button>
            : <button type="button" className="icon-btn" onClick={() => setMode('edit')} title={t('Edit (Ctrl+E)')}><IconEdit size={17} /></button>}
        </div>
        <div className="modal-body">
          {error && <div className="result warn" role="status"><p className="result-title">{error}</p></div>}
          {!path && (
            <label className="field">
              <span className="label">{t('Title')}</span>
              <input value={title} maxLength={60} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder={t('e.g. Test ideas')} />
            </label>
          )}
          {mode === 'edit'
            ? <textarea ref={editor} className="note-editor" spellCheck autoFocus={Boolean(path)} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Write your note (Markdown)')} />
            // HTML comes from the main process renderer, which escapes all markup from the note.
            : <div className="markdown note-preview" dangerouslySetInnerHTML={{ __html: html }} />}
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={close}>{t('Cancel')}</button>
          <button type="button" className="btn" onClick={save} disabled={saving || !dirty}>{saving ? t('Saving…') : t('Save')}</button>
        </footer>
      </div>
    </div>
  );
}
