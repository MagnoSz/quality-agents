import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// The framework folder. Normally this repository; the installed desktop app sets
// QA_ROOT to its own copy (Documents/Moki) before loading anything.
export const ROOT = process.env.QA_ROOT ? resolve(process.env.QA_ROOT) : join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The active workspace: the folder with projects/, tags.json and the document style.
// Default <root>/workspace. The desktop app switches it (setWorkspaceDir); the helper
// commands it starts get QA_WORKSPACE.
const workspaces = new Map();

export function workspaceDir(root = ROOT) {
  const key = resolve(root);
  if (workspaces.has(key)) return workspaces.get(key);
  if (key === resolve(ROOT) && process.env.QA_WORKSPACE) return resolve(process.env.QA_WORKSPACE);
  return join(key, 'workspace');
}

export function setWorkspaceDir(root, dir) {
  if (dir) workspaces.set(resolve(root), resolve(dir)); else workspaces.delete(resolve(root));
}

// How requests and messages name the workspace: "workspace" for the default one,
// its absolute path (with "/") for any other.
export function workspaceLabel(root = ROOT) {
  const dir = workspaceDir(root);
  return resolve(dir) === resolve(root, 'workspace') ? 'workspace' : toPosix(dir);
}

// Generated mirrors read natively by AI tools (see docs/compatibility.md).
export const MIRRORS = ['.agents/skills', '.claude/skills'];

export function toPosix(p) {
  return p.split(sep).join('/');
}

export function listSkillDirs(root = ROOT) {
  const skillsDir = join(root, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((name) => statSync(join(skillsDir, name)).isDirectory())
    .sort();
}

export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

export function relPosix(from, to) {
  return toPosix(relative(from, to));
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function git(args, cwd = ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function nowStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
