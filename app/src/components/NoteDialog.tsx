// A project note (Markdown in notes/), opened and edited in a popup that can be
// dragged by its header, with a formatting bar and a reading view like .md tabs.
// path null = a new note: it asks for a title, which becomes the file name.
//
// Tools: bold, italic, strikethrough, titles, bulleted / numbered / check lists (Enter
// continues them), quote, code, link (Ctrl+K), table, divider, images (paste, drop or
// the button; stored inside the note), @ to mention a file of the project, a draft kept
// while typing, and "Use with the AI" to start an activity with the note as input.

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { api, type ActivityInfo, type Tag, type ToolInfo, type TreeNode } from '../api';
import { conversationLanguage, t } from '../i18n';
import { recall, remember } from '../prefs';
import { looseNotes, noteTitle, removeLooseNote, saveLooseNote, touchNote } from '../side-menu';
import { ActivityCatalog } from './ActivityCatalog';
import { CatIcon } from './CatIcon';
import { ACTIVITY_CAT } from '../icons/cats';
import { FileIcon } from '../icons';
import { IconChevron, IconCode, IconEdit, IconEye, IconLink, IconPlay, IconTerminal, IconX } from './Icons';
import { ToolCatalog } from './ToolCatalog';
import { TagPicker } from './TagPicker';

interface Props {
  project: string | null; // null: a loose note, which can be sent to a project from here
  path: string | null;
  looseId?: string | null;
  projects?: { id: string; name: string }[];
  floating?: boolean; // its own window: the header drags the window, past the main app
  onClose: () => void;
}

interface Draft { title: string; text: string; at: number }

const QUICK = ['terminal', 'editor'];
const IMAGE_MAX = 1200; // px, longest side, before the image goes into the note
const draftKey = (project: string | null, path: string | null, looseId: string | null) =>
  project ? `qa-note-draft:${project}:${path ?? 'new'}` : `qa-note-draft:loose:${looseId ?? 'new'}`;
const readDraft = (key: string): Draft | null => {
  try { const d = JSON.parse(recall(key) ?? 'null') as Draft | null; return d && typeof d.text === 'string' ? d : null; } catch { return null; }
};
const dropDraft = (key: string) => { try { window.localStorage.removeItem(key); } catch { /* optional */ } };
const words = (text: string) => (text.replace(/!\[[^\]]*\]\(data:[^)]*\)/g, ' ').match(/[\p{L}\p{N}]+/gu) ?? []).length;
const clock = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const toolName = (tool: ToolInfo) => t(tool.label).replace(/ \(.*\)$/, '');

// Every file of the project tree, for @ mentions.
const flatten = (nodes: TreeNode[]): string[] => nodes.flatMap((n) => (n.type === 'dir' ? flatten(n.children ?? []) : [n.path]));

// Images go into the note itself (a data: URL, which the reading view shows), scaled down first.
function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, IMAGE_MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // Photos become JPEG (small); screenshots and transparent images stay PNG unless very large.
      const png = file.type === 'image/jpeg' ? '' : canvas.toDataURL('image/png');
      resolve(png && png.length < 900_000 ? png : canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('This image could not be read.'))); };
    img.src = url;
  });
}

export function NoteDialog({ project, path, looseId = null, projects = [], floating = false, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const [destination, setDestination] = useState(''); // '' keeps the note loose
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [html, setHtml] = useState('');
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from the centered position
  const [loaded, setLoaded] = useState(!path && !looseId);
  const [draft, setDraft] = useState<Draft | null>(null); // an older unsaved draft found when opening
  const [draftAt, setDraftAt] = useState(0); // when the current draft was kept
  const [files, setFiles] = useState<string[]>([]); // project files, for @
  const [mention, setMention] = useState<{ start: number; query: string; index: number } | null>(null);
  const [ai, setAi] = useState(false);
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [activityId, setActivityId] = useState('');
  const [toolId, setToolId] = useState(() => recall('qa-tool') ?? '');
  const [catalog, setCatalog] = useState<'activity' | 'tool' | null>(null);
  const [launching, setLaunching] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [tagCatalog, setTagCatalog] = useState<Tag[]>([]);
  const [tags, setTags] = useState<string[]>([]); // a saved project note's tags (shared context)
  const editor = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const loose = project == null;
  const target = project ?? (destination || null); // the project the note belongs to (or is going to)
  const key = draftKey(project, path, looseId);
  const dirty = loose
    ? text !== saved || title !== savedTitle || destination !== ''
    : text !== saved || (!path && Boolean(title.trim()));

  useEffect(() => {
    if (!path || !project) return;
    touchNote(project, path, noteTitle(path));
    window.qa?.notesChanged();
    api.readFile(project, path)
      .then((c) => { const body = c.kind === 'markdown' || c.kind === 'text' ? c.text : ''; setText(body); setSaved(body); setLoaded(true); })
      .catch((e: Error) => setError(e.message));
  }, [project, path]);

  useEffect(() => {
    if (!loose || !looseId) return;
    const note = looseNotes().find((n) => n.id === looseId);
    if (!note) { setError(t('This note is no longer here.')); return; }
    setTitle(note.title); setSavedTitle(note.title); setText(note.text); setSaved(note.text); setLoaded(true);
  }, [loose, looseId]);

  // A draft left from last time (closed without saving) is offered once the note is loaded.
  useEffect(() => {
    if (!loaded) return;
    const d = readDraft(key);
    if (d && (d.text !== saved || (d.title && d.title !== savedTitle))) setDraft(d); else if (d) dropDraft(key);
  }, [loaded, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keeps a draft while typing, so closing the window does not lose the text.
  useEffect(() => {
    if (!loaded || draft) return;
    const timer = setTimeout(() => {
      if (!dirty) { dropDraft(key); setDraftAt(0); return; }
      const at = Date.now();
      remember(key, JSON.stringify({ title, text, at }));
      setDraftAt(at);
    }, 600);
    return () => clearTimeout(timer);
  }, [text, title, dirty, loaded, draft, key]);

  useEffect(() => {
    if (!path || !project) return;
    api.tags().then(setTagCatalog).catch(() => setTagCatalog([]));
    api.fileTags(project).then((all) => setTags(all[path] ?? [])).catch(() => setTags([]));
  }, [project, path]);
  const changeTags = (ids: string[]) => {
    if (!path || !project) return;
    api.setFileTags(project, path, ids).then(setTags).catch((e: Error) => setError(e.message));
  };

  useEffect(() => { if (mode === 'preview') api.renderMarkdown(text).then(setHtml).catch((e: Error) => setError(e.message)); }, [mode, text]);

  useEffect(() => {
    if (!target) { setFiles([]); return; }
    api.tree(target).then((nodes) => setFiles(flatten(nodes))).catch(() => setFiles([]));
  }, [target]);

  useEffect(() => {
    if (!ai) return;
    api.activities().then((r) => setActivities(r.activities)).catch(() => setActivities([]));
    api.integrations().then(setTools).catch(() => setTools([]));
  }, [ai]);

  const close = () => {
    if (dirty && !window.confirm(t('Discard the unsaved changes in this note?'))) return;
    dropDraft(key);
    onClose();
  };
  const savedAndClose = () => { dropDraft(key); window.qa?.notesChanged(); onClose(); };

  const save = () => {
    setSaving(true); setError('');
    if (project == null) {
      if (!title.trim()) { setError(t('Give the note a title.')); setSaving(false); return; }
      if (!destination) {
        try { saveLooseNote({ id: looseId, title, text }); savedAndClose(); } catch (e) { setError(e instanceof Error ? t(e.message) : String(e)); setSaving(false); }
        return;
      }
      api.createNote(destination, title, text)
        .then((savedPath) => { if (looseId) removeLooseNote(looseId); touchNote(destination, savedPath, title); savedAndClose(); })
        .catch((e: Error) => { setError(e.message); setSaving(false); });
      return;
    }
    const done = (savedPath: string) => { touchNote(project, savedPath, path ? noteTitle(path) : title); savedAndClose(); };
    (path ? api.writeFile(project, path, text).then(() => path) : api.createNote(project, title, text))
      .then(done)
      .catch((e: Error) => { setError(e.message); setSaving(false); });
  };

  // ---------- editing helpers (through the browser, so Ctrl+Z undoes them) ----------
  const replace = (from: number, to: number, value: string, selFrom: number, selTo: number) => {
    const el = editor.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(from, to);
    document.execCommand('insertText', false, value);
    el.setSelectionRange(selFrom, selTo);
  };
  const insert = (value: string, select?: [number, number]) => {
    const el = editor.current;
    if (!el) return;
    const s = el.selectionStart;
    replace(s, el.selectionEnd, value, select ? s + select[0] : s + value.length, select ? s + select[1] : s + value.length);
  };

  // **bold**, *italic*, `code`: wraps the selection, or removes the marks when already there.
  const wrap = (mark: string) => {
    const el = editor.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const n = mark.length;
    if (text.slice(s - n, s) === mark && text.slice(e, e + n) === mark) replace(s - n, e + n, text.slice(s, e), s - n, e - n);
    else replace(s, e, mark + text.slice(s, e) + mark, s + n, e + n);
  };

  // Applies fn to every line the selection touches (titles, lists, quotes).
  const lines = (fn: (line: string, i: number, all: string[]) => string) => {
    const el = editor.current;
    if (!el) return;
    const from = text.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const end = text.indexOf('\n', el.selectionEnd);
    const to = end === -1 ? text.length : end;
    const all = text.slice(from, to).split('\n');
    const block = all.map((l, i) => fn(l, i, all)).join('\n');
    replace(from, to, block, from, from + block.length);
  };
  const toggleLines = (test: RegExp, add: (i: number) => string) =>
    lines((l, _i, all) => (all.every((x) => test.test(x)) ? l.replace(test, '') : `${add(_i)}${l.replace(test, '')}`));
  const heading = (level: number) => {
    const mark = `${'#'.repeat(level)} `;
    lines((l) => { const bare = l.replace(/^#{1,6} /, ''); return l === mark + bare ? bare : mark + bare; });
  };
  const bullets = () => toggleLines(/^- (?!\[[ xX]\] )/, () => '- ');
  const numbers = () => toggleLines(/^\d+\. /, (i) => `${i + 1}. `);
  const checks = () => toggleLines(/^- \[[ xX]\] /, () => '- [ ] ');
  const quote = () => toggleLines(/^> /, () => '> ');
  const code = () => {
    const el = editor.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = text.slice(s, e);
    if (sel.includes('\n')) replace(s, e, `\`\`\`\n${sel}\n\`\`\``, s + 4, s + 4 + sel.length);
    else wrap('`');
  };
  const link = () => {
    const el = editor.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const label = text.slice(s, e);
    const url = 'https://';
    if (label) replace(s, e, `[${label}](${url})`, s + label.length + 3, s + label.length + 3 + url.length);
    else { const word = t('link text'); replace(s, e, `[${word}](${url})`, s + 1, s + 1 + word.length); }
  };
  const lineStart = () => { const el = editor.current; return !el || el.selectionStart === 0 || text[el.selectionStart - 1] === '\n'; };
  const table = () => {
    const cols = [t('Column 1'), t('Column 2'), t('Column 3')];
    const block = `${lineStart() ? '' : '\n'}| ${cols.join(' | ')} |\n| --- | --- | --- |\n|  |  |  |\n`;
    const first = block.indexOf(cols[0]);
    insert(block, [first, first + cols[0].length]);
  };
  const divider = () => insert(`${lineStart() ? '' : '\n'}\n---\n\n`);

  // ---------- images ----------
  const addImages = async (list: File[]) => {
    const images = list.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return false;
    setError('');
    try {
      for (const file of images) {
        const url = await imageToDataUrl(file);
        const name = (file.name || t('image')).replace(/\.[^.]+$/, '').replace(/[[\]]/g, '');
        insert(`${lineStart() ? '' : '\n'}![${name}](${url})\n`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    return true;
  };
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const list = Array.from(e.clipboardData.files);
    if (list.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); void addImages(list); }
  };
  const onDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    const list = Array.from(e.dataTransfer.files);
    if (list.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); e.stopPropagation(); void addImages(list); }
  };

  // ---------- @ mentions ----------
  const matches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return files.filter((f) => f.toLowerCase().includes(q)).slice(0, 8);
  }, [mention, files]);
  const findMention = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = before.match(/(^|[\s(])@([^\s@()[\]]*)$/);
    setMention(m ? { start: caret - m[2].length - 1, query: m[2], index: 0 } : null);
  };
  const pickMention = (file: string) => {
    const el = editor.current;
    if (!el || !mention) return;
    const name = file.split('/').pop() ?? file;
    const value = `[@${name}](${file})`;
    replace(mention.start, el.selectionStart, value, mention.start + value.length, mention.start + value.length);
    setMention(null);
  };

  // Enter continues a list; Enter on an empty item ends it. Arrows / Enter / Tab drive the @ list.
  const onEditorKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMention({ ...mention, index: (mention.index + 1) % matches.length }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMention({ ...mention, index: (mention.index - 1 + matches.length) % matches.length }); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(matches[mention.index]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setMention(null); return; }
    }
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;
    const caret = el.selectionStart;
    const from = text.lastIndexOf('\n', caret - 1) + 1;
    const line = text.slice(from, caret);
    const m = line.match(/^(\s*)(- \[[ xX]\] |[-*] |\d+\. |> )/);
    if (!m) return;
    e.preventDefault();
    if (line.trim() === m[2].trim()) { replace(from, caret, '', from, from); return; } // empty item: end the list
    const num = m[2].match(/^(\d+)\. $/);
    const next = num ? `${Number(num[1]) + 1}. ` : m[2].startsWith('- [') ? '- [ ] ' : m[2];
    insert(`\n${m[1]}${next}`);
  };

  // ---------- reading view: tick boxes and open @ mentions ----------
  const onPreviewClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    const item = el.closest('li');
    const box = item?.querySelector(':scope > input.task');
    if (box && !el.closest('a')) {
      const index = Array.from(e.currentTarget.querySelectorAll('input.task')).indexOf(box);
      let n = -1;
      const next = text.replace(/^(\s*[-*] )\[([ xX])\]/gm, (all, lead: string, mark: string) => (++n === index ? `${lead}[${mark === ' ' ? 'x' : ' '}]` : all));
      setText(next);
      return;
    }
    const a = el.closest('a');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href)) { void window.qa?.openLink(href); return; }
    if (target && files.includes(href)) window.qa?.openInMain?.(target, href);
  };

  // ---------- use the note with the AI ----------
  const choices = activities.filter((a) => a.id !== 'resume' && a.available);
  const activity = choices.find((a) => a.id === activityId);
  const quick = tools.filter((x) => x.available && QUICK.includes(x.kind));
  const tool = quick.find((x) => x.id === toolId) ?? quick[0];
  const startAi = async () => {
    if (!target || !activity || !tool) return;
    setLaunching(true); setAiMsg(''); setError('');
    remember('qa-tool', tool.id);
    try {
      // A saved project note goes as its path (any length); otherwise its text, on one line.
      let note: string;
      const base = `workspace/projects/${target}/`;
      if (project && path) {
        if (text !== saved) { await api.writeFile(project, path, text); setSaved(text); dropDraft(key); }
        note = t('Use my note {file} as input (read it first; the paths in it are relative to {base}).', { file: `${base}${path}`, base });
      } else {
        const body = text.replace(/!\[[^\]]*\]\(data:[^)]*\)/g, '[image]').replace(/\s+/g, ' ').trim();
        note = `${t('My note:')} ${title.trim() ? `${title.trim()} — ` : ''}${body}`.slice(0, 1990);
        if (body.length > 1900) setAiMsg(t('Only the start of the note was sent. Save it in the project to send all of it.'));
      }
      const r = await api.launch({ project: target, activity: activity.id, tool: tool.id, files: [], note, language: conversationLanguage() });
      if (r.terminal) {
        if (floating && window.qa?.showTerminal) { window.qa.showTerminal(target, r.terminal); setAiMsg(t('Opened in {tool}, in the Moki window.', { tool: toolName(tool) })); }
        else setAiMsg(t('Opened in {tool}.', { tool: toolName(tool) }));
      } else if (!r.opened) setError(r.message || t('Could not open the tool.'));
      else setAiMsg(r.copied ? t('Request copied. Paste it in the AI chat of {tool}.', { tool: toolName(tool) }) : (r.message || ''));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLaunching(false); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (catalog) return; close(); return; }
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); if (!saving && dirty) save(); }
      if (k === 'e') { e.preventDefault(); setMode((m) => (m === 'edit' ? 'preview' : 'edit')); }
      if (mode === 'edit' && k === 'b') { e.preventDefault(); wrap('**'); }
      if (mode === 'edit' && k === 'i') { e.preventDefault(); wrap('*'); }
      if (mode === 'edit' && k === 'k') { e.preventDefault(); link(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Inside the main window the dialog slides. As its own window, the header drags that window.
  const startDrag = (e: ReactMouseEvent) => {
    if (floating) return;
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

  const tool_ = (label: ReactNode, title: string, run: () => void, style?: object) => (
    <button type="button" className="icon-btn" title={title} aria-label={title} style={style} disabled={mode !== 'edit'} onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</button>
  );

  const dialog = (
      <div className="modal note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-title" style={floating ? undefined : { transform: `translate(${pos.x}px, ${pos.y}px)` }}>
        <header className="modal-head" onMouseDown={startDrag} onDoubleClick={() => { if (floating) window.qa?.noteMax(); }} title={t('Drag to move')}>
          <h2 id="note-title">{path ? path.split('/').pop()?.replace(/\.md$/, '') : (title.trim() || t('New note'))}</h2>
          <button type="button" className="icon-btn" onClick={close} title={t('Close (Esc)')}><IconX size={18} /></button>
        </header>
        <div className="note-tools" role="toolbar" aria-label={t('Formatting')}>
          {tool_('B', t('Bold (Ctrl+B)'), () => wrap('**'), { fontWeight: 700 })}
          {tool_('I', t('Italic (Ctrl+I)'), () => wrap('*'), { fontStyle: 'italic' })}
          {tool_('S', t('Strikethrough'), () => wrap('~~'), { textDecoration: 'line-through' })}
          <span className="sep" />
          {tool_('H1', t('Large title'), () => heading(1))}
          {tool_('H2', t('Medium title'), () => heading(2))}
          {tool_('H3', t('Small title'), () => heading(3))}
          <span className="sep" />
          {tool_('•', t('List'), bullets)}
          {tool_('1.', t('Numbered list'), numbers)}
          {tool_(<span className="note-check-glyph" aria-hidden="true">✓</span>, t('Checklist'), checks)}
          {tool_('❝', t('Quote'), quote)}
          <span className="sep" />
          {tool_(<IconCode size={15} />, t('Code'), code)}
          {tool_(<IconLink size={15} />, t('Link (Ctrl+K)'), link)}
          {tool_(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 10h17M3.5 14.5h17M9.5 10v9M15 10v9" /></svg>, t('Table'), table)}
          {tool_('—', t('Divider'), divider)}
          {tool_(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-5-5-9 8.5" /></svg>, t('Image (paste or drop it too)'), () => picker.current?.click())}
          {tool_('@', t('Mention a project file'), () => insert('@'))}
          <span className="statusbar-spacer" />
          <button type="button" className={`icon-btn note-ai-toggle${ai ? ' on' : ''}`} onClick={() => setAi((v) => !v)} aria-expanded={ai} title={t('Use this note with the AI')}>
            <IconPlay size={14} /> <span>{t('Use with the AI')}</span>
          </button>
          {mode === 'edit'
            ? <button type="button" className="icon-btn" onClick={() => setMode('preview')} title={t('Reading view (Ctrl+E)')}><IconEye size={17} /></button>
            : <button type="button" className="icon-btn" onClick={() => setMode('edit')} title={t('Edit (Ctrl+E)')}><IconEdit size={17} /></button>}
          <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => { void addImages(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        </div>

        {ai && (
          <div className="note-ai">
            {!target ? <p className="pp-hint">{t('Send the note to a project first (below), so the AI knows where to work.')}</p> : (
              <>
                <button type="button" className={`pp-pick${activity ? '' : ' empty'}`} onClick={() => setCatalog('activity')} aria-haspopup="dialog">
                  {activity && <CatIcon id={ACTIVITY_CAT[activity.id] ?? 'run'} size={24} />}
                  <span className="pp-pick-label">{activity ? t(activity.label) : t('Choose an activity')}</span>
                  <IconChevron size={14} />
                </button>
                <button type="button" className="pp-pick" onClick={() => setCatalog('tool')} disabled={!tool} aria-haspopup="dialog">
                  <span className="pp-pick-kind" aria-hidden="true">{tool?.kind === 'editor' ? <IconCode size={15} /> : <IconTerminal size={15} />}</span>
                  <span className="pp-pick-label">{tool ? toolName(tool) : t('No AI tool installed')}</span>
                  <IconChevron size={14} />
                </button>
                <button type="button" className="btn" disabled={launching || !activity || !tool} onClick={() => { void startAi(); }}>
                  <IconPlay size={14} /> {launching ? t('Starting…') : t('Start activity')}
                </button>
              </>
            )}
            {aiMsg && <p className="pp-msg note-ai-msg" role="status">{aiMsg}</p>}
          </div>
        )}

        <div className="modal-body">
          {error && <div className="result warn" role="status"><p className="result-title">{error}</p></div>}
          {draft && (
            <div className="result note-draft" role="status">
              <p className="result-title">{t('There is an unsaved draft of this note from {time}.', { time: clock(draft.at) })}</p>
              <div className="row-actions">
                <button type="button" className="btn btn-sm" onClick={() => { setText(draft.text); if (draft.title) setTitle(draft.title); setDraft(null); }}>{t('Restore the draft')}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { dropDraft(key); setDraft(null); }}>{t('Discard it')}</button>
              </div>
            </div>
          )}
          {(loose || !path) && (
            <label className="field">
              <span className="label">{t('Title')}</span>
              <input value={title} maxLength={60} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder={t('e.g. Test ideas')} />
            </label>
          )}
          {project && path && (
            <div className="field inline">
              <span className="label">{t('Tags')}</span>
              <TagPicker catalog={tagCatalog} value={tags} onChange={changeTags} onCatalog={setTagCatalog} compact />
            </div>
          )}
          {loose && projects.length > 0 && (
            <label className="field">
              <span className="label">{t('Send to a project')}</span>
              <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="">{t('Keep as a loose note')}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          {mode === 'edit' ? (
            <div className="note-editor-wrap">
              <textarea ref={editor} className="note-editor" spellCheck autoFocus={Boolean(path)} value={text}
                onChange={(e) => { setText(e.target.value); findMention(e.target.value, e.target.selectionStart); }}
                onKeyDown={onEditorKey} onClick={(e) => findMention(text, e.currentTarget.selectionStart)} onBlur={() => setTimeout(() => setMention(null), 150)}
                onPaste={onPaste} onDrop={onDrop}
                placeholder={t('Write your note (Markdown). Type @ to mention a project file; paste or drop images.')} />
              {mention && (
                <div className="note-mention" role="listbox" aria-label={t('Project files')}>
                  {!target ? <p className="muted small">{t('Send the note to a project to mention its files.')}</p>
                    : !matches.length ? <p className="muted small">{t('No file matches "{q}".', { q: mention.query })}</p>
                      : matches.map((f, i) => (
                        <button key={f} type="button" role="option" aria-selected={i === mention.index} className={i === mention.index ? 'on' : ''}
                          onMouseDown={(e) => { e.preventDefault(); pickMention(f); }}>
                          <FileIcon name={f} size={16} /><span className="note-mention-name">{f.split('/').pop()}</span><span className="note-mention-path">{f}</span>
                        </button>
                      ))}
                </div>
              )}
            </div>
          )
            // HTML comes from the main process renderer, which escapes all markup from the note.
            : <div className="markdown note-preview" onClick={onPreviewClick} dangerouslySetInnerHTML={{ __html: html }} />}
        </div>
        <footer className="modal-foot">
          <span className="note-status">
            {t('{n} words', { n: words(text) })}
            {draftAt > 0 && dirty && <> · {t('Draft kept at {time}', { time: clock(draftAt) })}</>}
          </span>
          <span className="statusbar-spacer" />
          <button type="button" className="btn btn-ghost" onClick={close}>{t('Cancel')}</button>
          <button type="button" className="btn" onClick={save} disabled={saving || !dirty}>{saving ? t('Saving…') : t('Save')}</button>
        </footer>
        {catalog === 'activity' && (
          <ActivityCatalog activities={activities} selected={activity?.id ?? ''} onPick={setActivityId} onClose={() => setCatalog(null)}
            blocked={(a) => (a.needsFiles ? t('Uses inbox files: start it from the project panel') : null)} />
        )}
        {catalog === 'tool' && (
          <ToolCatalog tools={tools.filter((x) => QUICK.includes(x.kind))} selected={tool?.id ?? ''} onPick={(id) => { setToolId(id); remember('qa-tool', id); }} onClose={() => setCatalog(null)} />
        )}
      </div>
  );
  if (floating) return dialog;
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>{dialog}</div>;
}
