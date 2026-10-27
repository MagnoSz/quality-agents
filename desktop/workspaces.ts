// Workspaces, like Obsidian's vaults: each one is a folder with its own projects/,
// tags.json, document style and agent library. <root>/workspace is the default one;
// new ones go to <root>/workspaces/<name> or to a folder the user picks. The list
// (and the last one opened) is kept in <root>/workspaces/workspaces.json.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { slugify } from '../scripts/lib/core.ts';

export interface WorkspaceEntry { id: string; name: string; path: string }
export interface WorkspaceInfo extends WorkspaceEntry { isDefault: boolean; missing: boolean; projects: number }
interface Registry { active?: string; defaultName?: string; list: WorkspaceEntry[] }

export const DEFAULT_WORKSPACE = 'default';
export const workspacesHome = (root: string) => join(root, 'workspaces');
const registryFile = (root: string) => join(workspacesHome(root), 'workspaces.json');
const norm = (p: string) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));
const same = (a: string, b: string) => norm(a) === norm(b);

function read(root: string): Registry {
  try {
    const data = JSON.parse(readFileSync(registryFile(root), 'utf8')) as Partial<Registry>;
    const list = Array.isArray(data.list) ? data.list.filter((w): w is WorkspaceEntry =>
      typeof w?.id === 'string' && typeof w.name === 'string' && typeof w.path === 'string' && w.id !== DEFAULT_WORKSPACE) : [];
    return { active: typeof data.active === 'string' ? data.active : undefined, defaultName: typeof data.defaultName === 'string' ? data.defaultName : undefined, list };
  } catch { return { list: [] }; }
}

function write(root: string, reg: Registry): void {
  mkdirSync(workspacesHome(root), { recursive: true });
  writeFileSync(registryFile(root), `${JSON.stringify(reg, null, 2)}\n`);
}

const projectCount = (dir: string): number => {
  const projects = join(dir, 'projects');
  return existsSync(projects) ? readdirSync(projects).filter((d) => existsSync(join(projects, d, 'project.json'))).length : 0;
};

export function listWorkspaces(root: string): WorkspaceInfo[] {
  const reg = read(root);
  const all: WorkspaceEntry[] = [{ id: DEFAULT_WORKSPACE, name: reg.defaultName || 'Workspace', path: join(root, 'workspace') }, ...reg.list];
  return all.map((w) => ({ ...w, isDefault: w.id === DEFAULT_WORKSPACE, missing: !existsSync(w.path), projects: existsSync(w.path) ? projectCount(w.path) : 0 }));
}

export function findWorkspace(root: string, id: unknown): WorkspaceInfo {
  const w = listWorkspaces(root).find((x) => x.id === id);
  if (!w) throw new Error('Unknown workspace.');
  return w;
}

// The workspace opened last, if it still exists; otherwise the default one.
export function activeWorkspace(root: string): WorkspaceInfo {
  const all = listWorkspaces(root);
  const active = read(root).active;
  return all.find((w) => w.id === active && !w.missing) ?? all[0];
}

export function setActiveWorkspace(root: string, id: string): WorkspaceInfo {
  const w = findWorkspace(root, id);
  if (w.missing) throw new Error(`The folder of this workspace is gone: ${w.path}`);
  mkdirSync(join(w.path, 'projects'), { recursive: true });
  write(root, { ...read(root), active: w.id });
  return w;
}

const prepare = (dir: string) => { for (const sub of ['projects', 'temporary']) mkdirSync(join(dir, sub), { recursive: true }); };

function register(root: string, name: string, path: string): WorkspaceInfo {
  const reg = read(root);
  const base = slugify(name) || 'workspace';
  let id = base;
  for (let i = 2; id === DEFAULT_WORKSPACE || reg.list.some((w) => w.id === id); i++) id = `${base}-${i}`;
  write(root, { ...reg, list: [...reg.list, { id, name, path: resolve(path) }] });
  return findWorkspace(root, id);
}

// A new, empty workspace named `name`, as a folder inside `parent` (default <root>/workspaces).
export function createWorkspace(root: string, name: string, parent?: string): WorkspaceInfo {
  const display = name.trim().slice(0, 60);
  const folder = slugify(display);
  if (!folder) throw new Error('Use letters or numbers in the name.');
  const dir = join(parent ?? workspacesHome(root), folder);
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`The folder ${dir} already exists and is not empty. Open it as a workspace instead.`);
  if (listWorkspaces(root).some((w) => same(w.path, dir))) throw new Error('This folder is already a workspace.');
  prepare(dir);
  return register(root, display, dir);
}

// An existing folder opened as a workspace (projects/ is created inside it when missing).
export function addWorkspaceFolder(root: string, folder: string): WorkspaceInfo {
  if (!existsSync(folder) || !statSync(folder).isDirectory()) throw new Error('Choose a folder.');
  if (same(folder, root)) throw new Error('This is the Moki folder itself. Choose another folder.');
  const known = listWorkspaces(root).find((w) => same(w.path, folder));
  if (known) return known;
  prepare(folder);
  return register(root, basename(resolve(folder)) || 'Workspace', folder);
}

export function renameWorkspace(root: string, id: string, name: string): WorkspaceInfo {
  const display = name.trim().slice(0, 60);
  if (!display) throw new Error('Give the workspace a name.');
  findWorkspace(root, id);
  const reg = read(root);
  write(root, id === DEFAULT_WORKSPACE ? { ...reg, defaultName: display } : { ...reg, list: reg.list.map((w) => (w.id === id ? { ...w, name: display } : w)) });
  return findWorkspace(root, id);
}

// Tools and helper commands started by the app look for projects in the active workspace.
export function setWorkspaceEnv(root: string, dir: string): void {
  if (resolve(dir) === resolve(root, 'workspace')) delete process.env.QA_WORKSPACE; else process.env.QA_WORKSPACE = dir;
}

// Removes the workspace from the list. Its folder and files stay where they are.
export function forgetWorkspace(root: string, id: string): void {
  if (id === DEFAULT_WORKSPACE) throw new Error('The default workspace cannot be removed from the list.');
  findWorkspace(root, id);
  const reg = read(root);
  write(root, { ...reg, active: reg.active === id ? undefined : reg.active, list: reg.list.filter((w) => w.id !== id) });
}
