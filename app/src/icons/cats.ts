// The cat library: illustrations of Moki's cat (app/public/cats/<id>.png, 128px, transparent).
// Used for activities and for skills, built-in or created by the user, who can pick
// any of them. Labels are English source texts, translated with t() when shown.

import { recall, remember } from '../prefs';

export interface Cat { id: string; label: string }

export const CATS: Cat[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'run', label: 'Run' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'database', label: 'Database' },
  { id: 'puzzle', label: 'Puzzle piece' },
  { id: 'robot', label: 'Robot' },
  { id: 'folder', label: 'Folder' },
  { id: 'document', label: 'Document' },
  { id: 'writing', label: 'Writing' },
  { id: 'json', label: 'JSON' },
  { id: 'open-book', label: 'Open book' },
  { id: 'list', label: 'List' },
  { id: 'magnifier', label: 'Magnifier' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'shield', label: 'Shield' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'flow', label: 'Flow' },
  { id: 'gear', label: 'Gear' },
  { id: 'plug', label: 'Plug' },
  { id: 'server', label: 'Server' },
  { id: 'ruler', label: 'Ruler' },
  { id: 'running', label: 'Running' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'download', label: 'Download' },
  { id: 'upload', label: 'Upload' },
  { id: 'folder-eye', label: 'Folder view' },
  { id: 'doc-search', label: 'Document search' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'report', label: 'Report' },
  { id: 'flask', label: 'Experiment' },
  { id: 'pencil', label: 'Pencil' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'json-file', label: 'JSON file' },
  { id: 'word', label: 'Word document' },
  { id: 'sheet', label: 'Spreadsheet' },
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'Image' },
  { id: 'text', label: 'Text' },
  { id: 'code', label: 'Code' },
  { id: 'web', label: 'Web page' },
  { id: 'chart', label: 'Chart' },
  { id: 'map', label: 'Map' },
  { id: 'chat', label: 'Chat' },
  { id: 'idea', label: 'Idea' },
  { id: 'warning', label: 'Warning' },
  { id: 'success', label: 'Success' },
  { id: 'error', label: 'Error' },
  { id: 'question', label: 'Question' },
  { id: 'star', label: 'Star' },
];

const IDS = new Set(CATS.map((c) => c.id));
export const isCat = (id: string | null | undefined): id is string => Boolean(id && IDS.has(id));
export const catSrc = (id: string): string => `./cats/${isCat(id) ? id : 'puzzle'}.png`;

// Each activity of the side panel, and each skill that comes with Moki, has its cat.
export const ACTIVITY_CAT: Record<string, string> = {
  open: 'folder', review: 'doc-search', tests: 'checklist', 'review-then-tests': 'flow', failure: 'warning',
  evidence: 'report', context: 'reading', setup: 'gear', plan: 'map', automation: 'laptop', resume: 'run',
};
const BUILTIN_SKILL_CAT: Record<string, string> = {
  'project-context': 'reading', 'requirements-review': 'doc-search', 'test-design': 'checklist', 'qa-orchestrator': 'flow',
  'failure-analysis': 'warning', automation: 'laptop', documentation: 'writing', 'smoke-test': 'running',
};
export const DEFAULT_SKILL_CAT = 'puzzle';

// Skill names as installed (lowercase, hyphens), so a choice made before the AI writes the skill still matches.
export const skillKey = (name: string): string => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// The user's choices are kept on this computer (UI preference), by skill name.
const KEY = 'qa-skill-cats';
const choices = (): Record<string, string> => {
  try { const v = JSON.parse(recall(KEY) ?? '{}') as unknown; return v && typeof v === 'object' ? v as Record<string, string> : {}; } catch { return {}; }
};
export function skillCat(name: string): string {
  const key = skillKey(name);
  const chosen = choices()[key];
  return isCat(chosen) ? chosen : BUILTIN_SKILL_CAT[key] ?? DEFAULT_SKILL_CAT;
}
export function setSkillCat(name: string, cat: string): void {
  const key = skillKey(name);
  if (!key || !isCat(cat)) return;
  remember(KEY, JSON.stringify({ ...choices(), [key]: cat }));
}
