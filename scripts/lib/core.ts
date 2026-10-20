// Shared core used by the `qa` launcher, the terminal menu and the local web
// server: projects, runs, skills, AI tool detection and request building.
// It never executes skills itself — the AI tools do, following AGENTS.md.

import { existsSync, readdirSync, statSync, copyFileSync, cpSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';
import { execFileSync, spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { ROOT, SLUG, readJson } from './repo.mjs';
import { parseFrontmatter } from './frontmatter.mjs';

export type ActivityKey = 'open' | 'review' | 'tests' | 'review-then-tests' | 'failure' | 'context' | 'automation' | 'resume';
export type ToolKey = 'claude' | 'codex' | 'cursor-agent' | 'gemini' | 'cursor' | 'vscode' | 'chat' | 'print';

export interface Activity { label: string; hint?: string; skill: string; needsFiles: boolean }
export interface Tool {
  label: string;
  hint?: string;
  command?: string;
  args?: (prompt: string) => string[];
  clipboard?: boolean;
  chat?: boolean;
  print?: boolean;
}

export const ACTIVITIES: Record<ActivityKey, Activity> = {
  open: { label: 'Just open the project', hint: 'loads the context and asks what you need', skill: 'project-context', needsFiles: false },
  review: { label: 'Review user stories', hint: 'ambiguities, gaps, interview, matrix, report', skill: 'requirements-review', needsFiles: true },
  tests: { label: 'Design tests', hint: 'scenario mapping, then test cases', skill: 'test-design', needsFiles: true },
  'review-then-tests': { label: 'Review, then design tests', hint: 'workflow with approval in between', skill: 'qa-orchestrator', needsFiles: true },
  failure: { label: 'Failure pre-analysis', hint: 'from your description and the log', skill: 'failure-analysis', needsFiles: false },
  context: { label: 'Project context', hint: 'onboarding, questions, updates', skill: 'project-context', needsFiles: false },
  automation: { label: 'Automation', skill: 'automation', needsFiles: false },
  resume: { label: 'Resume a run', skill: 'qa-orchestrator', needsFiles: false },
};

export const TOOLS: Record<ToolKey, Tool> = {
  claude: { label: 'Claude Code', command: 'claude', args: (p) => [p] },
  codex: { label: 'OpenAI Codex CLI', command: 'codex', args: (p) => [p] },
  'cursor-agent': { label: 'Cursor Agent CLI', command: 'cursor-agent', args: (p) => [p] },
  gemini: { label: 'Gemini CLI', command: 'gemini', args: (p) => ['-i', p] },
  cursor: { label: 'Cursor editor', hint: 'opens the folder, request copied to clipboard', command: 'cursor', args: () => [ROOT], clipboard: true },
  vscode: { label: 'VS Code (Claude Code / Codex extensions)', hint: 'opens the folder, request copied to clipboard', command: 'code', args: () => [ROOT], clipboard: true },
  chat: { label: 'ChatGPT / claude.ai / Gemini web', hint: 'request copied, files listed', chat: true },
  print: { label: 'Just show the request', print: true },
};

export const LANGUAGES = ['English', 'Portuguese (pt-BR)', 'Spanish'];

export const isActivity = (v: string): v is ActivityKey => v in ACTIVITIES;
export const isTool = (v: string): v is ToolKey => v in TOOLS;

// ---------------------------------------------------------------- skills

export interface SkillInfo { name: string; status: string; description: string }

interface Frontmatter { description?: string; metadata?: { status?: string } }
const frontmatter = (file: string): Frontmatter => (parseFrontmatter(readFileSync(file, 'utf8')).data ?? {}) as Frontmatter;

export function skillStatus(skill: string, root = ROOT): string {
  const file = join(root, 'skills', skill, 'SKILL.md');
  if (!existsSync(file)) return 'missing';
  return frontmatter(file).metadata?.status ?? 'unknown';
}

export const isUsable = (skill: string, root = ROOT): boolean => ['stable', 'draft'].includes(skillStatus(skill, root));

export function listSkills(root = ROOT): SkillInfo[] {
  const dir = join(root, 'skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => existsSync(join(dir, d, 'SKILL.md')))
    .sort()
    .map((name) => {
      const data = frontmatter(join(dir, name, 'SKILL.md'));
      return { name, status: data.metadata?.status ?? 'unknown', description: String(data.description ?? '') };
    });
}

// ---------------------------------------------------------------- projects and runs

export interface RunState {
  id: string;
  status: string;
  currentStep?: string;
  skill?: string;
  workflow?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  onboardingStatus: string;
  deliverableLanguage: string;
  runs: number;
  openRuns: number;
}

export const projectsDir = (root = ROOT): string => join(root, 'workspace', 'projects');

export function listProjects(root = ROOT): string[] {
  const dir = projectsDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => existsSync(join(dir, d, 'project.json'))).sort();
}

export function listRuns(project: string, root = ROOT): RunState[] {
  const dir = join(projectsDir(root), project, 'runs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((id) => existsSync(join(dir, id, 'state.json')))
    .map((id): RunState => {
      try { return { ...(readJson(join(dir, id, 'state.json')) as object), id } as RunState; } catch { return { id, status: 'unreadable' }; }
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

export const openRuns = (project: string, root = ROOT): RunState[] =>
  listRuns(project, root).filter((s) => !['completed', 'cancelled'].includes(s.status));

export function projectSummary(id: string, root = ROOT): ProjectSummary {
  let data: Record<string, unknown> = {};
  try { data = readJson(join(projectsDir(root), id, 'project.json')) as Record<string, unknown>; } catch { /* listed but unreadable */ }
  const runs = listRuns(id, root);
  return {
    id,
    name: String(data.name || id),
    description: String(data.description || ''),
    onboardingStatus: String(data.onboardingStatus || 'unknown'),
    deliverableLanguage: String(data.deliverableLanguage || 'en (default)'),
    runs: runs.length,
    openRuns: runs.filter((r) => !['completed', 'cancelled'].includes(r.status)).length,
  };
}

// Creates workspace/projects/<id>/ from templates/project-context/ (same result as npm run new-project).
export function createProject(id: string, name: string, root = ROOT): ProjectSummary {
  if (!SLUG.test(id)) throw new Error('Project id: use lowercase letters, digits and single hyphens.');
  const target = join(projectsDir(root), id);
  if (existsSync(target)) throw new Error(`Project "${id}" already exists.`);
  cpSync(join(root, 'templates', 'project-context'), target, { recursive: true });
  renameSync(join(target, 'gitignore.txt'), join(target, '.gitignore'));
  for (const dir of ['inbox', 'runs', 'temporary']) mkdirSync(join(target, dir), { recursive: true });
  const file = join(target, 'project.json');
  const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  writeFileSync(file, `${JSON.stringify({ ...data, project: id, name: name.trim() || id }, null, 2)}\n`);
  return projectSummary(id, root);
}

export const slugify = (name: string): string => name.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// ---------------------------------------------------------------- files

// Accepts paths typed or dragged into a terminal ("quoted", 'quoted', escaped spaces).
export function cleanPath(raw: string): string {
  let p = raw.trim();
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) p = p.slice(1, -1);
  if (process.platform !== 'win32') p = p.replace(/\\ /g, ' ');
  if (p.startsWith('~')) p = join(process.env.HOME || process.env.USERPROFILE || '', p.slice(1));
  // Git Bash style /c/Users/... on Windows
  if (process.platform === 'win32' && /^\/[a-zA-Z]\//.test(p)) p = `${p[1]}:${p.slice(2)}`;
  return resolve(p);
}

export const isFile = (p: string): boolean => existsSync(p) && statSync(p).isFile();

// Copies a file into the project inbox without overwriting; returns repo-relative path.
export function copyToInbox(project: string, source: string, root = ROOT): string {
  const inbox = join(projectsDir(root), project, 'inbox');
  mkdirSync(inbox, { recursive: true });
  if (resolve(source).startsWith(resolve(inbox))) return `workspace/projects/${project}/inbox/${basename(source)}`;
  const ext = extname(source);
  const stem = basename(source, ext);
  let name = basename(source);
  for (let i = 1; existsSync(join(inbox, name)); i++) name = `${stem}-${i}${ext}`;
  copyFileSync(source, join(inbox, name));
  return `workspace/projects/${project}/inbox/${name}`;
}

// ---------------------------------------------------------------- requests

export interface Request {
  project: string;
  activity: ActivityKey;
  files?: string[];
  note?: string;
  run?: string;
  language?: string;
}

export function buildPrompt({ project, activity, files = [], note = '', run = '', language = 'English' }: Request): string {
  const list = files.length ? files.join(', ') : '';
  const parts = [`Follow AGENTS.md. Project: ${project}.`];
  switch (activity) {
    case 'open':
      parts.push('Use the project-context skill to load this project\'s context, summarize in a few lines what is known and what is missing, and ask me what I need.');
      if (list) parts.push(`Files available for this session: ${list}.`);
      break;
    case 'review':
      parts.push(`Use the requirements-review skill to review the user stories in: ${list}.`);
      break;
    case 'tests':
      parts.push(`Use the test-design skill to map the test scenarios for: ${list}.`);
      break;
    case 'review-then-tests':
      parts.push(`Use the qa-orchestrator with the requirements-to-tests workflow: review the user stories in ${list} and, once the review is approved, map the test scenarios.`);
      break;
    case 'failure':
      parts.push(list
        ? `Use the failure-analysis skill with the input in: ${list}.`
        : 'Use the failure-analysis skill. I will paste the filled input template next.');
      break;
    case 'context':
      parts.push('Use the project-context skill: load the project context, show what is known and what is missing, and continue the onboarding if needed.');
      if (list) parts.push(`Documents to use: ${list}.`);
      break;
    case 'automation':
      parts.push(`Use the automation skill.${list ? ` Inputs: ${list}.` : ''}`);
      break;
    case 'resume':
      parts.push(`Resume run ${run}: read workspace/projects/${project}/runs/${run}/state.json first, summarize where we stopped and continue from the current step.`);
      break;
    default:
      throw new Error(`Unknown activity "${String(activity)}"`);
  }
  if (note.trim()) parts.push(`Additional instructions: ${note.trim().replace(/([^.!?])$/, '$1.')}`);
  parts.push(`Talk to me in ${language}.`);
  return parts.join(' ');
}

// ---------------------------------------------------------------- AI tools

export function which(command: string): string | null {
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [command], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split(/\r?\n/).find(Boolean) || null;
  } catch { return null; }
}

export function detectTools(): Record<ToolKey, boolean> {
  return Object.fromEntries(Object.entries(TOOLS).map(([key, t]) => [key, t.command ? Boolean(which(t.command)) : true])) as Record<ToolKey, boolean>;
}

export function copyToClipboard(text: string): boolean {
  const attempts: [string, string[]][] = process.platform === 'win32' ? [['clip', []]]
    : process.platform === 'darwin' ? [['pbcopy', []]]
      : [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]];
  // clip.exe reads UTF-16LE (with BOM) correctly; other tools take UTF-8.
  const input = process.platform === 'win32' ? Buffer.from(`﻿${text}`, 'utf16le') : Buffer.from(text, 'utf8');
  for (const [cmd, args] of attempts) {
    const r = spawnSync(cmd, args, { input });
    if (r.status === 0) return true;
  }
  return false;
}

// On Windows, tools installed as .cmd shims receive their arguments through
// cmd.exe, which corrupts non-ASCII text (ç, ã, é...). In that case the full
// request is written to a UTF-8 file inside the project and the tool gets a
// short ASCII instruction to read it. Elsewhere the prompt is passed as-is.
export function windowsSafePrompt(prompt: string, project: string, root = ROOT, platform: string = process.platform): string {
  if (platform !== 'win32' || /^[\x20-\x7e]*$/.test(prompt)) return prompt;
  const dir = join(projectsDir(root), project, 'temporary');
  mkdirSync(dir, { recursive: true });
  const name = `request-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
  writeFileSync(join(dir, name), `${prompt}\n`, 'utf8');
  return `Follow AGENTS.md. Project: ${project}. Your request is in the file workspace/projects/${project}/temporary/${name} (UTF-8 text). Read it and follow it exactly.`;
}

// Windows shells (.cmd shims) need the prompt as a single quoted argument.
export function launchTool(tool: ToolKey, prompt: string, cwd = ROOT): ChildProcess {
  const t = TOOLS[tool];
  if (!t.command || !t.args) throw new Error(`${t.label} cannot be launched from the terminal.`);
  const args = t.args(prompt);
  if (process.platform === 'win32') {
    const quoted = args.map((a) => `"${String(a).replace(/"/g, "'").replace(/%/g, ' percent')}"`).join(' ');
    return spawn(`${t.command} ${quoted}`, { cwd, stdio: 'inherit', shell: true });
  }
  return spawn(t.command, args, { cwd, stdio: 'inherit' });
}

// ---------------------------------------------------------------- preferences

const prefsFile = (root = ROOT): string => join(root, 'workspace', '.qa-preferences.json');

export interface Prefs { project?: string; language?: string; tool?: string }

export function loadPrefs(root = ROOT): Prefs {
  try { return JSON.parse(readFileSync(prefsFile(root), 'utf8')) as Prefs; } catch { return {}; }
}

export function savePrefs(prefs: Prefs, root = ROOT): void {
  try { mkdirSync(join(root, 'workspace'), { recursive: true }); writeFileSync(prefsFile(root), JSON.stringify(prefs, null, 2)); } catch { /* optional */ }
}
