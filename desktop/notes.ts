// Notes opened on their own: a window of the desktop app (desktop/main.ts) or an
// editor tab of the VS Code extension (ide/vscode/host.ts). Which requests are
// valid, which note a window shows, and the page parameters the UI reads (app/src/App.tsx).

import { listProjects } from '../scripts/lib/core.ts';

export interface NoteRequest { project: string | null; path: string | null; loose: string | null; theme: 'light' | 'dark' }

// Only notes/<file>.md of a listed project, or a loose note by id ('new' for a new one).
export function parseNoteRequest(raw: unknown, root: string): NoteRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const project = typeof r.project === 'string' && r.project ? r.project : null;
  const path = typeof r.path === 'string' && r.path ? r.path : null;
  const loose = typeof r.loose === 'string' && r.loose ? r.loose : null;
  if (project && !listProjects(root).includes(project)) return null;
  if (path && !/^notes\/[^/]+\.md$/.test(path)) return null;
  if (loose && loose !== 'new' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loose)) return null;
  if (path && !project) return null;
  if (project && loose) return null;
  if (!project && !loose) return null;
  return { project, path, loose, theme: r.theme === 'light' ? 'light' : 'dark' };
}

// The same note opens in the same window; '' for a new note, which always gets its own.
export const noteKey = (n: NoteRequest): string =>
  n.loose && n.loose !== 'new' ? `loose:${n.loose}` : n.project && n.path ? `file:${n.project}:${n.path}` : '';

export function noteQuery(n: NoteRequest): Record<string, string> {
  const query: Record<string, string> = { view: 'note' };
  if (n.project) query.project = n.project;
  if (n.path) query.path = n.path;
  if (n.loose) query.loose = n.loose;
  return query;
}
