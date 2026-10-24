// Everything the desktop UI can ask for. Runs in Electron's main process and
// validates every input: project ids must exist, paths stay inside the project
// folder, choices come from fixed lists. It reuses the shared core — no QA
// logic lives here; the AI tools do the QA work following the skills.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, isAbsolute, join, relative, sep } from 'node:path';
import {
  ACTIVITIES, LANGUAGES, TOOLS, agentFiles, agentMarkdown, buildPrompt, createProject, detectTools, installedAgents, installedSkills, isActivity, isTool, isUsable, linkedFolder, listProjects,
  listRuns, listSkills, openRuns, projectAgentsDir, projectRepository, projectSkillsDir, projectSummary, projectsDir, skillFolders, skillStatus, slugify, windowsSafePrompt, type ToolKey,
} from '../scripts/lib/core.ts';
import { CATEGORIES, MAX_PAGE, installSkill, searchSkills } from './skill-registry.ts';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';
import { readableInputs, docxToMarkdown } from '../scripts/lib/docx.ts';
import { markdownToHtml } from '../scripts/lib/markdown.mjs';
import { cleanPrompt, type LaunchResult } from './launcher.ts';
import { isEditable, isOpenable, PathError, resolveInside } from './fs-guard.ts';
import { duplicateAgent, isUsableAgent, libraryDir, listAgents, listCategories, parseAgent, validateAgent, type Agent } from '../scripts/lib/agents.ts';

export class ServiceError extends Error {}

export interface Deps {
  launch: (tool: ToolKey, prompt: string, root: string) => LaunchResult;
  openFolder: (folder: string) => void;
  openPath: (file: string) => void;
  pickFolder?: () => Promise<string | null>; // native folder dialog; the UI never sends paths
  home?: string; // user folder for skills and agents for all projects (tests point it elsewhere)
  fetch?: typeof fetch;
  trash?: (path: string) => Promise<void>; // removing skills/agents moves them to the trash (tests delete)
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
  project: string; activity: string; tool: string; files: string[]; note: string; language: string; run?: string; agent?: string;
}

export interface AgentInfo extends Omit<Agent, 'body'> { usable: boolean }

// "Create agent" in Skills & agents: a Claude Code subagent closed to the skills chosen for it.
export interface ScopeAgentRequest { name: string; description: string; skills: string[]; scope: string }

const TEXT_LIMIT = 2 * 1024 * 1024;
const AGENT_TEXT_LIMIT = 8000;
const IMAGE_LIMIT = 10 * 1024 * 1024;
const MAX_TREE_ENTRIES = 5000;
const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const TEXT_TYPES = new Set(['.txt', '.log', '.csv', '.xml', '.yaml', '.yml', '.html', '.htm', '.feature', '.ts', '.js']);
const TOP_ORDER = ['context', 'inbox', 'runs', 'proposed-updates.md', 'activity-log.md', 'project.json', 'README.md', 'temporary'];

const posix = (p: string): string => p.split(sep).join('/');
const isWithin = (dir: string, p: string): boolean => { const r = relative(dir, p); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
const stamp = (): string => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15); // YYYYMMDD-HHMMSS (UTC)

// What a folder may hold as AI tool settings; the ones that exist are backed up when it is linked.
const AI_CONFIG = ['.claude', '.agents', '.codex', '.gemini', '.cursor', 'CLAUDE.md', 'AGENTS.md', 'GEMINI.md'];
// ponytail: skips only node_modules and .claude/worktrees (full repo copies); other bulky folders are copied too.
const backupFilter = (src: string): boolean => basename(src) !== 'node_modules' && !/[\\/]\.claude[\\/]worktrees$/.test(src);

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

  const findAgent = (name: unknown): Agent => {
    const agent = listAgents(root).find((a) => a.name === name);
    if (!agent) throw new ServiceError('Unknown agent.');
    return agent;
  };

  // The user's agent file, always resolved inside the library folder.
  const customFile = (agent: Agent): string => inside(libraryDir(root), `${agent.category}/${agent.name}.md`);

  // Agents a project may use: the "agents" list in project.json, or every usable agent when absent.
  const enabledAgents = (project: string): string[] => {
    const data = JSON.parse(readFileSync(join(projectDir(project), 'project.json'), 'utf8')) as { agents?: unknown };
    const usable = listAgents(root).filter(isUsableAgent).map((a) => a.name);
    return Array.isArray(data.agents) ? usable.filter((n) => (data.agents as unknown[]).includes(n)) : usable;
  };

  // Copies the folder's AI settings to workspace/projects/<id>/backups/<kind>-<date>/; undefined when it has none.
  function backupAiConfig(project: string, folder: string, kind: string, names = AI_CONFIG): string | undefined {
    const found = names.filter((n) => existsSync(join(folder, n)));
    if (!found.length) return undefined;
    const base = join(projectDir(project), 'backups', `${kind}-${stamp()}`);
    let dir = base;
    for (let n = 2; existsSync(dir); n++) dir = `${base}-${n}`;
    mkdirSync(dir, { recursive: true });
    for (const n of found) cpSync(join(folder, n), join(dir, n), { recursive: true, filter: backupFilter });
    return dir;
  }

  // Skills and agents for all projects live in the user folder: Claude Code's, and .agents for Codex/Gemini/Cursor.
  const home = deps.home ?? homedir();
  const globalSkillDirs = [join(home, '.claude', 'skills'), join(home, '.agents', 'skills')];
  const globalAgentsDir = join(home, '.claude', 'agents');
  const trash = deps.trash ?? (async (p: string) => rmSync(p, { recursive: true, force: true }));
  const doFetch = deps.fetch ?? fetch;

  // Quality Agents' own skills that can run (draft or stable), for project and repository agents.
  const frameworkSkills = () => listSkills(root).filter((s) => isUsable(s.name, root)).map(({ name, description }) => ({ name, description }));

  const describe = (file: string): string => {
    try { return String((parseFrontmatter(readFileSync(file, 'utf8')).data as { description?: unknown } | null)?.description ?? ''); } catch { return ''; }
  };
  // Names are only accepted from these listings.
  const globalSkill = (name: unknown) => {
    const folders = globalSkillDirs.filter((d) => skillFolders(d).includes(String(name))).map((d) => join(d, String(name)));
    if (!folders.length) throw new ServiceError('This skill is not installed for all projects.');
    return folders;
  };
  const globalAgent = (name: unknown): string => {
    if (!agentFiles(globalAgentsDir).includes(String(name))) throw new ServiceError('This agent is not installed for all projects.');
    return join(globalAgentsDir, `${String(name)}.md`);
  };

  // Global skills the project links by name (project.json linkedSkills); skills no longer installed are left out.
  const linkedGlobalSkills = (project: string) => projectSummary(project, root).linkedSkills.flatMap((name) => {
    const base = globalSkillDirs.find((dir) => skillFolders(dir).includes(name));
    return base ? [{ name, path: join(base, name, 'SKILL.md') }] : [];
  });

  // Skill and agent folders of each install scope. `label` is how agents name the skills folder:
  // relative to the framework root for a project (where AI tools start), absolute for global.
  // A project with a linked folder keeps them in that folder's .claude (only that repository uses them).
  const scopeFolders = (project: string, scope: unknown) => {
    if (scope === 'project') {
      projectDir(project);
      const skills = projectSkillsDir(project, root);
      const agents = projectAgentsDir(project, root);
      return { skills: [skills.dir], agents: agents.dir, label: skills.label, agentsLabel: agents.label };
    }
    if (scope === 'global') return { skills: globalSkillDirs, agents: globalAgentsDir, label: globalSkillDirs[0], agentsLabel: globalAgentsDir };
    throw new ServiceError('Choose where: this project or all projects.');
  };

  // Linking authorizes nothing: every write to a linked folder's .claude needs the user's confirmation for that action (allow),
  // and writeAllowed: false always refuses. Returns the linked folder ('' when the scope is not a linked project).
  const linkedWrite = (project: string, scope: unknown, allow: unknown, what: 'install' | 'agent' | 'remove'): string => {
    const linked = scope === 'project' ? linkedFolder(project, root) : null;
    const repo = linked?.path ?? '';
    if (linked?.writeBlocked) throw new ServiceError(`project.json does not allow writing to the linked folder ${repo} (writeAllowed: false).`);
    const verb = { install: 'Installing', agent: 'Creating the agent', remove: 'Removing' }[what];
    if (linked && allow !== true) throw new ServiceError(`${verb} changes ${repo}/.claude. Confirm the ${what === 'remove' ? 'removal' : what} to allow it.`);
    if (repo && !existsSync(repo)) throw new ServiceError(`The linked folder was not found: ${repo}. Link it again.`);
    return repo;
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

    // ---------------------------------------------------------- agents

    categories: () => listCategories(root),

    agents: (): AgentInfo[] => listAgents(root).map(({ body: _body, ...a }) => ({ ...a, usable: isUsableAgent({ ...a, body: '' }) })),

    agent: (name: string) => {
      const agent = findAgent(name);
      return { ...agent, usable: isUsableAgent(agent), text: readFileSync(join(root, agent.path), 'utf8'), html: markdownToHtml(agent.body) };
    },

    duplicateAgent: (name: string) => {
      findAgent(name);
      const copy = duplicateAgent(name, root);
      return { ...copy, usable: isUsableAgent(copy) };
    },

    // Only the user's own agents can be edited; the text is validated like a built-in agent.
    saveAgent: (name: string, text: unknown) => {
      const agent = findAgent(name);
      if (agent.source !== 'custom') throw new ServiceError('Built-in agents cannot be edited. Duplicate it to customize.');
      if (typeof text !== 'string' || text.length > 200_000) throw new ServiceError('Invalid content.');
      const { agent: parsed, errors } = parseAgent(text, 'custom', agent.path);
      const problems = parsed
        ? [...errors, ...validateAgent(parsed, { skills: listSkills(root).map((s) => s.name), categories: [], fileName: agent.name, folder: agent.category })]
        : errors;
      if (problems.length) throw new ServiceError(`Not saved: ${problems.join('; ')}`);
      writeFileSync(customFile(agent), text.replace(/\r\n/g, '\n'), 'utf8');
      return true;
    },

    deleteAgent: (name: string) => {
      const agent = findAgent(name);
      if (agent.source !== 'custom') throw new ServiceError('Built-in agents cannot be deleted.');
      rmSync(customFile(agent));
      return true;
    },

    projectAgents: (project: string) => enabledAgents(project),

    setProjectAgents: (project: string, names: unknown) => {
      const file = join(projectDir(project), 'project.json');
      const usable = new Set(listAgents(root).filter(isUsableAgent).map((a) => a.name));
      const list = Array.isArray(names) ? [...new Set(names.map(String))] : [];
      const unknown = list.filter((n) => !usable.has(n));
      if (unknown.length) throw new ServiceError(`Unknown or unavailable agents: ${unknown.join(', ')}`);
      const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      writeFileSync(file, `${JSON.stringify({ ...data, agents: list }, null, 2)}\n`);
      return enabledAgents(project);
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

    // "Choose my folder": links a folder of this machine (chosen in the native dialog) to the project.
    // Only project.json changes and the folder's AI settings are backed up; the folder itself is not touched.
    linkRepository: async (project: string) => {
      const file = join(projectDir(project), 'project.json');
      if (!deps.pickFolder) throw new ServiceError('Choosing a folder is not available here.');
      const picked = await deps.pickFolder();
      if (!picked) return null;
      if (!existsSync(picked) || !statSync(picked).isDirectory()) throw new ServiceError('Folder not found.');
      const folder = realpathSync(picked);
      if (folder === realpathSync(homedir())) throw new ServiceError('Choose a project folder, not your whole user folder.');
      if (isWithin(realpathSync(root), folder) || isWithin(folder, realpathSync(root))) throw new ServiceError('Choose a folder outside Quality Agents.');
      const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      const repos = (Array.isArray(data.repositories) ? data.repositories : []) as Record<string, unknown>[];
      for (const r of repos) delete r.linkedFolder;
      const same = repos.find((r) => r.localPath === folder);
      if (same) same.linkedFolder = true;
      else repos.unshift({ name: basename(folder), localPath: folder, purpose: 'Linked from the desktop app', linkedFolder: true });
      const backup = backupAiConfig(project, folder, 'link');
      writeFileSync(file, `${JSON.stringify({ ...data, repositories: repos }, null, 2)}\n`);
      return { ...projectSummary(project, root), backup };
    },

    openLinkedFolder: (project: string) => {
      projectDir(project);
      const repo = projectRepository(project, root);
      if (!repo) throw new ServiceError('No folder is linked to this project.');
      if (!existsSync(repo) || !statSync(repo).isDirectory()) throw new ServiceError(`The linked folder was not found: ${repo}`);
      deps.openFolder(repo);
      return true;
    },

    openExternal: (project: string, rel: string) => {
      const file = inside(projectDir(project), rel);
      if (!existsSync(file) || !statSync(file).isFile()) throw new ServiceError('File not found.');
      if (!isOpenable(file)) throw new ServiceError('This type of file is not opened from the app.');
      deps.openPath(file);
      return true;
    },

    // ---------------------------------------------------------- installed skills and agents (Skills & agents dialog)

    // Skill registry (SkillMD). Free text and/or one category from the fixed list.
    searchSkills: (query: unknown, category: unknown = '', page: unknown = 1) => {
      const q = cleanPrompt(String(query ?? '')).slice(0, 200);
      const cat = String(category ?? '');
      if (cat && !CATEGORIES.includes(cat)) throw new ServiceError('Unknown category.');
      if (!q && !cat) throw new ServiceError('Type what you need or choose a category.');
      if (!Number.isInteger(page) || (page as number) < 1 || (page as number) > MAX_PAGE) throw new ServiceError('Invalid page.');
      return searchSkills(q, cat, page as number, doFetch);
    },

    installedSkills: (project: string) => {
      projectDir(project);
      return { project: installedSkills(project, root), global: [...new Set(globalSkillDirs.flatMap(skillFolders))] };
    },

    // For a linked folder, its current .claude is copied to backups/claude-<date>/.claude once the download is verified, before anything is written.
    installSkill: (project: string, slug: unknown, scope: unknown, allowClaudeWrite: unknown = false) => {
      const targets = scopeFolders(project, scope).skills;
      const repo = linkedWrite(project, scope, allowClaudeWrite, 'install');
      let backup: string | undefined;
      return installSkill(String(slug ?? ''), targets, doFetch, () => {
        if (repo) backup = backupAiConfig(project, repo, 'claude', ['.claude']);
      }).then((result) => ({ ...result, backup }));
    },

    // Agents may only use skills already installed in their own scope's folder.
    // Project (repository) agents may also use Quality Agents' own usable skills (skills/ in the framework).
    scopeAgents: (project: string, scope: unknown) => {
      const f = scopeFolders(project, scope);
      const installed = [...new Set(f.skills.flatMap(skillFolders))].sort();
      const builtin = scope === 'project' ? frameworkSkills().filter((s) => !installed.includes(s.name)) : [];
      return { skills: installed, builtin, agents: agentFiles(f.agents), folder: f.label, agentsFolder: f.agentsLabel };
    },

    // For a linked folder the agent goes to <folder>/.claude/agents, only after the user confirms (allowClaudeWrite), with a backup first.
    createScopeAgent: (project: string, req: ScopeAgentRequest, allowClaudeWrite: unknown = false) => {
      const f = scopeFolders(project, req?.scope);
      const repo = linkedWrite(project, req?.scope, allowClaudeWrite, 'agent');
      const name = slugify(String(req?.name ?? ''));
      if (!name) throw new ServiceError('Give the agent a name (letters or numbers).');
      const description = String(req?.description ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
      if (!description) throw new ServiceError('Describe what the agent does.');
      if (description.length > AGENT_TEXT_LIMIT) throw new ServiceError(`Keep the description under ${AGENT_TEXT_LIMIT} characters.`);
      const wanted = Array.isArray(req?.skills) ? [...new Set(req.skills.map(String))] : [];
      if (!wanted.length) throw new ServiceError('Choose at least one skill.');
      // A repository agent runs outside the framework, so it gets absolute paths to the framework's skills.
      const builtin = req.scope === 'project' ? frameworkSkills().map((s) => s.name) : [];
      const skills = wanted.map((n) => {
        const base = f.skills.find((dir) => skillFolders(dir).includes(n));
        if (base) return { name: n, path: req.scope === 'project' ? `${f.label}/${n}/SKILL.md` : join(base, n, 'SKILL.md') };
        if (builtin.includes(n)) return { name: n, path: repo ? `${posix(root)}/skills/${n}/SKILL.md` : `skills/${n}/SKILL.md`, builtin: true };
        throw new ServiceError(`"${n}" is not installed in ${f.label}. Install it first in Find skills.`);
      });
      if (existsSync(join(f.agents, `${name}.md`))) throw new ServiceError(`An agent named "${name}" already exists here.`); // name is a slug
      const backup = repo ? backupAiConfig(project, repo, 'claude', ['.claude']) : undefined;
      mkdirSync(f.agents, { recursive: true });
      const file = inside(f.agents, `${name}.md`);
      const framework = skills.some((s) => 'builtin' in s) ? { root: repo ? posix(root) : '.', project } : undefined;
      writeFileSync(file, agentMarkdown({ name, description, skills: skills.map(({ name: n, path }) => ({ name: n, path })), framework }), 'utf8');
      return { name, file, backup };
    },

    // "This repository" tab: skills and agents installed only for this project (its linked folder's .claude, or the project folder).
    projectItems: (project: string) => {
      projectDir(project);
      const s = projectSkillsDir(project, root);
      const a = projectAgentsDir(project, root);
      return {
        skillsFolder: s.label, agentsFolder: a.label,
        skills: skillFolders(s.dir).map((name) => ({ name, description: describe(join(s.dir, name, 'SKILL.md')) })),
        agents: agentFiles(a.dir).map((name) => ({ name, description: describe(join(a.dir, `${name}.md`)) })),
      };
    },

    // Removing from a linked folder needs the user's confirmation (allowClaudeWrite) and backs up its .claude first.
    removeProjectItem: async (project: string, kind: unknown, name: unknown, allowClaudeWrite: unknown = false) => {
      projectDir(project);
      const skills = projectSkillsDir(project, root).dir;
      const agents = projectAgentsDir(project, root).dir;
      const n = String(name);
      if (kind !== 'skill' && kind !== 'agent') throw new ServiceError('Unknown kind.');
      const target = kind === 'skill' ? skillFolders(skills).includes(n) && join(skills, n) : agentFiles(agents).includes(n) && join(agents, `${n}.md`);
      if (!target) throw new ServiceError(`This ${kind} is not installed in this project.`);
      const repo = linkedWrite(project, 'project', allowClaudeWrite, 'remove');
      const backup = repo ? backupAiConfig(project, repo, 'claude', ['.claude']) : undefined;
      await trash(target);
      return { backup };
    },

    // "Global" tab and the start screen: skills and agents for all projects, in the user's folder.
    globalItems: () => {
      const projects = listProjects(root).map((id) => projectSummary(id, root));
      return {
        skills: [...new Set(globalSkillDirs.flatMap(skillFolders))].sort().map((name) => {
          const folders = globalSkill(name);
          return { name, description: describe(join(folders[0], 'SKILL.md')), folders, linkedBy: projects.filter((p) => p.linkedSkills.includes(name)).map((p) => p.name) };
        }),
        agents: agentFiles(globalAgentsDir).map((name) => ({ name, description: describe(join(globalAgentsDir, `${name}.md`)), file: join(globalAgentsDir, `${name}.md`) })),
      };
    },

    // "Set up the project": its goal and the global skills it uses, by reference (nothing is copied).
    // Writes only project.json; only skills installed globally can be linked.
    setupProject: (project: string, req: { description?: unknown; linkedSkills?: unknown }) => {
      const file = join(projectDir(project), 'project.json');
      const description = cleanPrompt(String(req?.description ?? '')).slice(0, 2000);
      const wanted = Array.isArray(req?.linkedSkills) ? [...new Set(req.linkedSkills.map(String))] : [];
      const global = new Set(globalSkillDirs.flatMap(skillFolders));
      const missing = wanted.filter((n) => !global.has(n));
      if (missing.length) throw new ServiceError(`Not installed for all projects: ${missing.join(', ')}`);
      const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      writeFileSync(file, `${JSON.stringify({ ...data, description, linkedSkills: wanted.sort() }, null, 2)}\n`);
      return projectSummary(project, root);
    },

    openGlobal: (kind: unknown, name: unknown) => {
      if (kind === 'skill') deps.openFolder(globalSkill(name)[0]);
      else if (kind === 'agent') deps.openPath(globalAgent(name));
      else throw new ServiceError('Unknown kind.');
      return true;
    },

    // A skill is removed from every global folder it is in (~/.claude/skills and ~/.agents/skills).
    removeGlobal: async (kind: unknown, name: unknown) => {
      const targets = kind === 'skill' ? globalSkill(name) : kind === 'agent' ? [globalAgent(name)] : null;
      if (!targets) throw new ServiceError('Unknown kind.');
      for (const t of targets) await trash(t);
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
      let agent: { name: string; path: string } | undefined;
      if (req.agent) {
        const chosen = findAgent(String(req.agent));
        if (!isUsableAgent(chosen)) throw new ServiceError(`The ${chosen.name} agent is not available yet.`);
        if (!enabledAgents(project).includes(chosen.name)) throw new ServiceError(`The ${chosen.name} agent is not enabled in this project.`);
        agent = { name: chosen.name, path: chosen.path };
      }
      const prompt = buildPrompt({ project, activity, files: readableInputs(files, root), note, run, language, agent, repository: projectRepository(project, root),
        skills: installedSkills(project, root), agents: installedAgents(project, root),
        description: cleanPrompt(projectSummary(project, root).description).slice(0, 2000), globalSkills: linkedGlobalSkills(project) });
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
