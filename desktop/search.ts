// Search in the active workspace (the magnifier on the icon rail): projects by
// name and description, and the text files of every project by name and
// content, optionally limited to some tags.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileTags, listProjects, projectSummary, projectsDir, type ProjectSummary } from '../scripts/lib/core.ts';

export interface FileHit { project: string; projectName: string; path: string; snippet: string; line: number; tags: string[] }
export interface SearchResult { projects: ProjectSummary[]; files: FileHit[]; truncated: boolean }

const TEXT = new Set(['.md', '.txt', '.json', '.csv', '.log', '.yaml', '.yml', '.xml']);
const SKIP = new Set(['node_modules', '.git', 'backups', 'temporary']); // .extracted/ is kept: the text of Word files
const FILE_LIMIT = 1_000_000; // bytes read per file
const HIT_LIMIT = 200;

function walk(base: string, rel = ''): string[] {
  const dir = join(base, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().flatMap((name) => {
    const path = rel ? `${rel}/${name}` : name;
    const full = join(base, path);
    let st;
    try { st = statSync(full); } catch { return []; }
    if (st.isDirectory()) return SKIP.has(name) || (name.startsWith('.') && name !== '.extracted') ? [] : walk(base, path);
    return TEXT.has(extname(name).toLowerCase()) && st.size <= FILE_LIMIT ? [path] : [];
  });
}

// The line with the first match, cut around it.
function snippet(text: string, q: string): { snippet: string; line: number } {
  const lower = text.toLowerCase();
  const at = lower.indexOf(q);
  if (at < 0) return { snippet: text.split('\n').find((l) => l.trim())?.trim().slice(0, 140) ?? '', line: 0 };
  const line = text.slice(0, at).split('\n').length;
  const start = text.lastIndexOf('\n', at) + 1;
  const end = text.indexOf('\n', at);
  const full = text.slice(start, end < 0 ? undefined : end).trim();
  const pos = full.toLowerCase().indexOf(q);
  const from = Math.max(0, pos - 60);
  return { snippet: `${from > 0 ? '…' : ''}${full.slice(from, pos + q.length + 80)}${pos + q.length + 80 < full.length ? '…' : ''}`, line };
}

export function searchWorkspace(root: string, query: string, tags: string[] = []): SearchResult {
  const q = query.trim().toLowerCase().slice(0, 200);
  const result: SearchResult = { projects: [], files: [], truncated: false };
  if (!q && !tags.length) return result;
  const hasTags = (ids: string[]) => tags.every((t) => ids.includes(t));
  for (const id of listProjects(root)) {
    const p = projectSummary(id, root);
    const projectTagged = tags.length > 0 && hasTags(p.tags);
    if ((!tags.length || projectTagged) && (!q || `${p.name}\n${p.description}\n${p.id}`.toLowerCase().includes(q))) result.projects.push(p);
    const marks = fileTags(id, root);
    const dir = join(projectsDir(root), id);
    for (const path of walk(dir)) {
      if (result.files.length >= HIT_LIMIT) { result.truncated = true; break; }
      const own = marks[path] ?? [];
      // With tags: the files tagged with them, or every file of a project tagged with them.
      if (tags.length && !hasTags(own) && !projectTagged) continue;
      if (!q) {
        if (!hasTags(own)) continue; // tags only: the files tagged themselves, not a whole project
        result.files.push({ project: id, projectName: p.name, path, tags: own, ...snippet('', '') });
        continue;
      }
      let text = '';
      try { text = readFileSync(join(dir, ...path.split('/')), 'utf8'); } catch { continue; }
      const inName = path.toLowerCase().includes(q);
      if (!inName && !text.toLowerCase().includes(q)) continue;
      result.files.push({ project: id, projectName: p.name, path, tags: own, ...snippet(text, q) });
    }
  }
  return result;
}
