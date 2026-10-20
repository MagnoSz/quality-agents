// Everything the desktop UI can ask for. Runs in Electron's main process and
// validates every input: project ids must exist, paths stay inside the project
// folder, choices come from fixed lists. It reuses the shared core — no QA
// logic lives here; the AI tools do the QA work following the skills.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import {
  ACTIVITIES, LANGUAGES, TOOLS, buildPrompt, createProject, detectTools, isActivity, isTool, isUsable, listProjects,
  listRuns, listSkills, openRuns, projectSummary, projectsDir, skillStatus, slugify, windowsSafePrompt, type ToolKey,
} from '../scripts/lib/core.ts';
import { readableInputs, docxToMarkdown } from '../scripts/lib/docx.ts';
import { markdownToHtml } from '../scripts/lib/markdown.mjs';
import { cleanPrompt, type LaunchResult } from './launcher.ts';
import { isEditable, isOpenable, PathError, resolveInside } from './fs-guard.ts';

export class ServiceError extends Error {}

export interface Deps {
  launch: (tool: ToolKey, prompt: string, root: string) => LaunchResult;
  openFolder: (folder: string) => void;
  openPath: (file: string) => void;
}

export interface TreeNode {
  name: string;
  path: string; // relative to the project folder, with "/" separators
  type: 'dir' | 'file';
  size?: number;
  children?: TreeNode[];
  run?: { status: string; skill: string; currentStep: string };
}

export type FileContent =
  | { kind: 'markdown'; path: string; text: string; html: string; editable: boolean }
  | { kind: 'text'; path: string; text: string; editable: boolean }
  | { kind: 'json'; path: string; text: string }
  | { kind: 'docx'; path: string; html: string }
  | { kind: 'image'; path: string; dataUrl: string }
  | { kind: 'binary'; path: string; size: number; openable: boolean; reason?: string };

export interface LaunchRequest {
  project: string; activity: string; tool: string; files: string[]; note: string; language: string; run?: string;
}

const TEXT_LIMIT = 2 * 1024 * 1024;
const IMAGE_LIMIT = 10 * 1024 * 1024;
const MAX_TREE_ENTRIES = 5000;
const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const TEXT_TYPES = new Set(['.txt', '.log', '.csv', '.xml', '.yaml', '.yml', '.html', '.htm', '.feature', '.ts', '.js']);
const TOP_ORDER = ['context', 'inbox', 'runs', 'proposed-updates.md', 'activity-log.md', 'project.json', 'README.md', 'temporary'];

const posix = (p: string): string => p.split(sep).join('/');

export function createService(root: string, deps: Deps) {
  const projectDir = (id: unknown): string => {
    if (typeof id !== 'string' || !listProjects(root).includes(id)) throw new ServiceError('Unknown project.');
    return join(projectsDir(root), id);
  };

  const inside = (dir: string, rel: unknown): string => {
    try { return resolveInside(dir, String(rel ?? '')); } catch (e) {
      if (e instanceof PathError) throw new ServiceError(e.message);
      throw e;
    }
  };

  function inboxFiles(dir: string) {
    const inbox = join(dir, 'inbox');
    if (!existsSync(inbox)) return [];
    return readdirSync(inbox)
      .filter((name) => !name.startsWith('.'))
      .map((name) => ({ name, st: statSync(join(inbox, name)) }))
      .filter(({ st }) => st.isFile())
      .map(({ name, st }) => ({ name, size: st.size, modified: st.mtime.toISOString() }))
      .sort((a, b) => b.modified.localeCompare(a.modified));
  }

  function tree(project: string): TreeNode[] {
    const base = projectDir(project);
    const runs = new Map(listRuns(project, root).map((r) => [r.id, r]));
    let count = 0;
    const walk = (dir: string, depth: number): TreeNode[] => {
      const entries = readdirSync(dir, { withFileTypes: true })
        .filter((e) => !e.name.startsWith('.'))
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
      const nodes: TreeNode[] = [];
      for (const e of entries) {
        if (++count > MAX_TREE_ENTRIES) break;
        const full = join(dir, e.name);
        const path = posix(relative(base, full));
        if (e.isDirectory()) {
          const node: TreeNode = { name: e.name, path, type: 'dir', children: depth < 8 ? walk(full, depth + 1) : [] };
          const run = path.startsWith('runs/') && path.split('/').length === 2 ? runs.get(e.name) : undefined;
          if (run) node.run = { status: run.status, skill: String(run.skill ?? run.workflow ?? ''), currentStep: String(run.currentStep ?? '') };
          nodes.push(node);
        } else if (e.isFile()) {
          nodes.push({ name: e.name, path, type: 'file', size: statSync(full).size });
        }
      }
      return nodes;
    };
    const top = walk(base, 0);
    const rank = (n: TreeNode): number => { const i = TOP_ORDER.indexOf(n.name); return i === -1 ? TOP_ORDER.length : i; };
    return top.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }

  function readFile(project: string, rel: string): FileContent {
    const file = inside(projectDir(project), rel);
    if (!existsSync(file) || !statSync(file).isFile()) throw new ServiceError('File not found.');
    const path = posix(String(rel));
    const ext = extname(file).toLowerCase();
    const size = statSync(file).size;
    if (ext === '.docx') {
      try { return { kind: 'docx', path, html: markdownToHtml(docxToMarkdown(readFileSync(file))) }; } catch {
        return { kind: 'binary', path, size, openable: true, reason: 'Could not read this Word file.' };
      }
    }
    if (IMAGE_TYPES[ext]) {
      if (size > IMAGE_LIMIT) return { kind: 'binary', path, size, openable: true, reason: 'Image too large to preview.' };
      return { kind: 'image', path, dataUrl: `data:${IMAGE_TYPES[ext]};base64,${readFileSync(file).toString('base64')}` };
    }
    const isText = ext === '.md' || ext === '.json' || TEXT_TYPES.has(ext);
    if (!isText) return { kind: 'binary', path, size, openable: isOpenable(file) };
    if (size > TEXT_LIMIT) return { kind: 'binary', path, size, openable: isOpenable(file), reason: 'File too large to preview.' };
    const text = readFileSync(file, 'utf8');
    if (ext === '.md') return { kind: 'markdown', path, text, html: markdownToHtml(text), editable: true };
    if (ext === '.json') {
      try { return { kind: 'json', path, text: JSON.stringify(JSON.parse(text), null, 2) }; } catch { return { kind: 'json', path, text }; }
    }
    return { kind: 'text', path, text, editable: isEditable(file) };
  }

  return {
    session: () => ({ version: (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version, platform: process.platform }),

    projects: () => listProjects(root).map((id) => projectSummary(id, root)),

    createProject: (name: unknown) => {
      const display = String(name ?? '').trim();
      if (!display) throw new ServiceError('Give the project a name.');
      const id = slugify(display);
      if (!id) throw new ServiceError('Use letters or numbers in the name.');
      try { return createProject(id, display, root); } catch (e) { throw new ServiceError(e instanceof Error ? e.message : String(e)); }
    },

    skills: () => listSkills(root),

    activities: () => ({
      activities: Object.entries(ACTIVITIES).map(([id, a]) => ({
        id, label: a.label, hint: a.hint ?? '', skill: a.skill, needsFiles: a.needsFiles,
        available: id === 'resume' || isUsable(a.skill, root), status: skillStatus(a.skill, root),
      })),
      languages: LANGUAGES,
    }),

    integrations: () => {
      const available = detectTools();
      return (Object.keys(TOOLS) as ToolKey[]).map((k) => ({
        id: k, label: TOOLS[k].label, hint: TOOLS[k].hint ?? '', command: TOOLS[k].command ?? '',
        kind: TOOLS[k].chat ? 'chat' : TOOLS[k].print ? 'print' : TOOLS[k].clipboard ? 'editor' : 'terminal',
        available: available[k],
      }));
    },

    tree: (project: string) => tree(project),

    readFile: (project: string, rel: string) => readFile(project, rel),

    writeFile: (project: string, rel: string, text: unknown) => {
      const file = inside(projectDir(project), rel);
      if (!isEditable(file)) throw new ServiceError('Only Markdown and text files can be edited here.');
      if (!existsSync(file)) throw new ServiceError('File not found.');
      if (typeof text !== 'string' || text.length > TEXT_LIMIT) throw new ServiceError('Invalid content.');
      writeFileSync(file, text, 'utf8');
      return readFile(project, rel);
    },

    run: (project: string, runId: string) => {
      projectDir(project);
      const run = listRuns(project, root).find((r) => r.id === runId);
      if (!run) throw new ServiceError('Unknown activity.');
      return run;
    },

    inbox: (project: string) => inboxFiles(projectDir(project)),

    openRuns: (project: string) => {
      projectDir(project);
      return openRuns(project, root).map((r) => ({ id: r.id, status: r.status, currentStep: r.currentStep ?? '' }));
    },

    openFolder: (project: string, rel = '') => {
      const dir = inside(projectDir(project), rel);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new ServiceError('Folder not found.');
      deps.openFolder(dir);
      return true;
    },

    openExternal: (project: string, rel: string) => {
      const file = inside(projectDir(project), rel);
      if (!existsSync(file) || !statSync(file).isFile()) throw new ServiceError('File not found.');
      if (!isOpenable(file)) throw new ServiceError('This type of file is not opened from the app.');
      deps.openPath(file);
      return true;
    },

    launch: (req: LaunchRequest) => {
      const project = typeof req?.project === 'string' && listProjects(root).includes(req.project) ? req.project : null;
      if (!project) throw new ServiceError('Unknown project.');
      const activity = String(req.activity ?? '');
      if (!isActivity(activity)) throw new ServiceError('Unknown activity.');
      if (activity !== 'resume' && !isUsable(ACTIVITIES[activity].skill, root)) throw new ServiceError(`The ${ACTIVITIES[activity].skill} skill is not available yet.`);
      const tool = String(req.tool ?? '');
      if (!isTool(tool)) throw new ServiceError('Unknown tool.');
      const language = LANGUAGES.includes(String(req.language)) ? String(req.language) : 'English';
      const note = cleanPrompt(String(req.note ?? '')).slice(0, 2000);
      const dir = projectDir(project);
      const available = new Set(inboxFiles(dir).map((f) => f.name));
      const names = Array.isArray(req.files) ? req.files.map(String) : [];
      const unknown = names.filter((n) => !available.has(n));
      if (unknown.length) throw new ServiceError(`Not in the project inbox: ${unknown.join(', ')}`);
      if (ACTIVITIES[activity].needsFiles && !names.length) throw new ServiceError('This activity needs at least one file from the inbox.');
      const files = names.map((n) => `workspace/projects/${project}/inbox/${n}`);
      let run = '';
      if (activity === 'resume') {
        run = String(req.run ?? '');
        if (!openRuns(project, root).some((r) => r.id === run)) throw new ServiceError('Choose an open activity to resume.');
      }
      const prompt = buildPrompt({ project, activity, files: readableInputs(files, root), note, run, language });
      const t = TOOLS[tool];
      if (t.print || t.chat) {
        const upload = t.chat ? [
          join(root, 'dist', 'chat', 'quality-agents-all.md'), join(dir, 'project.json'), join(dir, 'context', 'index.md'),
          ...(run ? [join(dir, 'runs', run, 'state.json')] : []), ...files.map((f) => join(root, f)),
        ] : [];
        return { opened: false, prompt, upload, bundleReady: existsSync(join(root, 'dist', 'chat', 'quality-agents-all.md')) };
      }
      const sent = t.clipboard ? prompt : windowsSafePrompt(prompt, project, root);
      return { ...deps.launch(tool, sent, root), prompt };
    },
  };
}

export type Service = ReturnType<typeof createService>;
