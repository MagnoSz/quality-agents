// What the start-screen sidebar remembers on this computer: which projects stay
// pinned, notes that were not sent to a project, and the project notes opened
// most recently.

import { recall, remember } from './prefs';

const PINS = 'qa-pinned-projects';
const NOTES = 'qa-recent-notes';
const LOOSE = 'qa-loose-notes';
const NOTE_LIMIT = 6;

export interface RecentNote { project: string; path: string; title: string; at: number }
export interface LooseNote { id: string; title: string; text: string; at: number }

const readList = (key: string): unknown[] => {
  try { const v = JSON.parse(recall(key) ?? ''); return Array.isArray(v) ? v : []; } catch { return []; }
};

export const pinnedIds = (): string[] => readList(PINS).filter((id): id is string => typeof id === 'string');

export const togglePin = (id: string): string[] => {
  const cur = pinnedIds();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
  remember(PINS, JSON.stringify(next));
  return next;
};

export const noteTitle = (path: string): string => (path.split('/').pop() ?? path).replace(/\.md$/, '').replace(/-/g, ' ');

export const looseNotes = (): LooseNote[] => readList(LOOSE).flatMap((item) => {
  if (!item || typeof item !== 'object') return [];
  const n = item as Partial<LooseNote>;
  if (typeof n.id !== 'string' || typeof n.title !== 'string') return [];
  return [{ id: n.id, title: n.title, text: typeof n.text === 'string' ? n.text : '', at: typeof n.at === 'number' ? n.at : 0 }];
});

// A note that stays on this computer until it is sent to a project. Same id updates the existing one.
export const saveLooseNote = (note: { id?: string | null; title: string; text: string }): LooseNote => {
  const saved: LooseNote = { id: note.id || crypto.randomUUID(), title: note.title.trim(), text: note.text, at: Date.now() };
  const next = [saved, ...looseNotes().filter((n) => n.id !== saved.id)];
  try { window.localStorage.setItem(LOOSE, JSON.stringify(next)); } catch { throw new Error('Could not save the note on this computer.'); }
  return saved;
};

export const removeLooseNote = (id: string): void => {
  remember(LOOSE, JSON.stringify(looseNotes().filter((n) => n.id !== id)));
};

export const recentNotes = (): RecentNote[] => readList(NOTES).flatMap((item) => {
  if (!item || typeof item !== 'object') return [];
  const n = item as Partial<RecentNote>;
  if (typeof n.project !== 'string' || typeof n.path !== 'string' || !n.path.startsWith('notes/')) return [];
  return [{ project: n.project, path: n.path, title: typeof n.title === 'string' && n.title ? n.title : noteTitle(n.path), at: typeof n.at === 'number' ? n.at : 0 }];
});

// Opening or saving a note moves it to the front. The same file is not listed twice.
export const touchNote = (project: string, path: string, title: string): void => {
  if (!path.startsWith('notes/')) return;
  const next = [{ project, path, title: title.trim() || noteTitle(path), at: Date.now() },
    ...recentNotes().filter((n) => !(n.project === project && n.path === path))].slice(0, NOTE_LIMIT);
  remember(NOTES, JSON.stringify(next));
};
