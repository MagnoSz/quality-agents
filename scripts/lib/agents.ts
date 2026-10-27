// Agents: a role + instructions + the skills it uses + the access it asks for,
// organized by category. Built-in agents live in agents/<category>/<name>.md
// (versioned framework); the user's own agents live in
// workspace/library/agents/<category>/<name>.md (never versioned here).

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SLUG, readJson, workspaceDir } from './repo.mjs';
import { parseFrontmatter } from './frontmatter.mjs';

export const ACCESS_LEVELS = ['read-only', 'project-write', 'repository-write'] as const;
export const AGENT_SECTIONS = ['Role', 'When to use', 'How to work', 'Boundaries'];
const AGENT_KEYS = ['name', 'description', 'category', 'skills', 'access', 'metadata'];
const STATUS_PREFIX: Record<string, string> = { stable: '', draft: '', 'pending-migration': '[PENDING MIGRATION]', planned: '[PLANNED]' };

export interface Agent {
  name: string;
  description: string;
  category: string;
  skills: string[];
  access: string;
  version: string;
  status: string;
  basedOn: string;
  source: 'builtin' | 'custom';
  path: string; // relative to the framework root, "/" separators
  body: string;
}

export interface Category { id: string; label: string; description: string; source: 'builtin' | 'custom' }

export const builtinDir = (root = ROOT): string => join(root, 'agents');
export const libraryDir = (root = ROOT): string => join(workspaceDir(root), 'library', 'agents');

const list = (v: unknown): string[] => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const titleCase = (slug: string): string => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function parseAgent(text: string, source: Agent['source'], path: string): { agent: Agent | null; errors: string[] } {
  const { data, body, errors } = parseFrontmatter(text) as { data: Record<string, unknown> | null; body: string; errors: string[] };
  if (!data) return { agent: null, errors };
  const meta = (typeof data.metadata === 'object' && data.metadata ? data.metadata : {}) as Record<string, string>;
  const agent: Agent = {
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    category: String(data.category ?? ''),
    skills: list(data.skills),
    access: String(data.access ?? ''),
    version: String(meta.version ?? ''),
    status: String(meta.status ?? ''),
    basedOn: String(meta.basedOn ?? ''),
    source,
    path,
    body,
  };
  for (const key of Object.keys(data)) if (!AGENT_KEYS.includes(key)) errors.push(`unknown key "${key}"`);
  return { agent, errors };
}

// Validation shared by the framework validator and the app's editor.
export function validateAgent(agent: Agent, ctx: { skills: string[]; categories: string[]; fileName: string; folder: string }): string[] {
  const errors: string[] = [];
  if (!SLUG.test(agent.name) || agent.name.length > 64) errors.push(`invalid name "${agent.name}" (lowercase letters, digits, single hyphens)`);
  if (agent.name !== ctx.fileName) errors.push(`name "${agent.name}" must match the file name "${ctx.fileName}"`);
  if (!agent.description || agent.description.length > 1024) errors.push('description is required (max 1024 characters)');
  if (!SLUG.test(agent.category)) errors.push(`invalid category "${agent.category}"`);
  else if (agent.category !== ctx.folder) errors.push(`category "${agent.category}" must match its folder "${ctx.folder}"`);
  if (agent.source === 'builtin' && !ctx.categories.includes(agent.category)) errors.push(`category "${agent.category}" is not defined in agents/categories.json`);
  if (!agent.skills.length) errors.push('list at least one skill');
  for (const s of agent.skills) if (!ctx.skills.includes(s)) errors.push(`unknown skill "${s}"`);
  if (!(ACCESS_LEVELS as readonly string[]).includes(agent.access)) errors.push(`access must be one of ${ACCESS_LEVELS.join(', ')}`);
  if (!/^\d+\.\d+\.\d+$/.test(agent.version)) errors.push('metadata.version must be semver (e.g. "1.0.0")');
  if (!(agent.status in STATUS_PREFIX)) errors.push(`metadata.status must be one of ${Object.keys(STATUS_PREFIX).join(', ')}`);
  else if (STATUS_PREFIX[agent.status] && !agent.description.startsWith(STATUS_PREFIX[agent.status])) {
    errors.push(`description of a "${agent.status}" agent must start with ${STATUS_PREFIX[agent.status]}`);
  }
  const headings = [...agent.body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  for (const s of AGENT_SECTIONS) if (!headings.includes(s)) errors.push(`missing section "## ${s}"`);
  return errors;
}

function readAgents(dir: string, source: Agent['source'], root: string): Agent[] {
  if (!existsSync(dir)) return [];
  const agents: Agent[] = [];
  for (const cat of readdirSync(dir).sort()) {
    const catDir = join(dir, cat);
    if (!statSync(catDir).isDirectory()) continue;
    for (const file of readdirSync(catDir).filter((f) => f.endsWith('.md')).sort()) {
      const rel = `${source === 'builtin' ? 'agents' : 'workspace/library/agents'}/${cat}/${file}`;
      const { agent } = parseAgent(readFileSync(join(catDir, file), 'utf8'), source, rel);
      if (agent) agents.push(agent);
    }
  }
  return agents;
}

export function listAgents(root = ROOT): Agent[] {
  const builtin = readAgents(builtinDir(root), 'builtin', root);
  const names = new Set(builtin.map((a) => a.name));
  // A custom agent can never shadow a built-in one.
  const custom = readAgents(libraryDir(root), 'custom', root).filter((a) => !names.has(a.name));
  return [...builtin, ...custom];
}

export function listCategories(root = ROOT): Category[] {
  const builtinFile = join(builtinDir(root), 'categories.json');
  const builtin = existsSync(builtinFile) ? readJson(builtinFile) as Record<string, { label: string; description?: string }> : {};
  const cats: Category[] = Object.entries(builtin).map(([id, c]) => ({ id, label: c.label, description: c.description ?? '', source: 'builtin' }));
  const known = new Set(cats.map((c) => c.id));
  for (const a of listAgents(root)) {
    if (!known.has(a.category)) { known.add(a.category); cats.push({ id: a.category, label: titleCase(a.category), description: '', source: 'custom' }); }
  }
  return cats;
}

export const isUsableAgent = (a: Agent): boolean => ['stable', 'draft'].includes(a.status);

// Copies an agent into the user's library for customization; the original never changes.
export function duplicateAgent(name: string, root = ROOT): Agent {
  const source = listAgents(root).find((a) => a.name === name);
  if (!source) throw new Error(`Unknown agent "${name}".`);
  const taken = new Set(listAgents(root).map((a) => a.name));
  let newName = `${source.name}-custom`;
  for (let i = 2; taken.has(newName); i++) newName = `${source.name}-custom-${i}`;
  const text = readFileSync(join(root, source.path), 'utf8').replace(/\r\n/g, '\n');
  const end = text.indexOf('\n---', 4);
  let front = text.slice(0, end).replace(/^name: .*$/m, `name: ${newName}`);
  front = /^ {2}basedOn: .*$/m.test(front) ? front.replace(/^ {2}basedOn: .*$/m, `  basedOn: ${source.name}`)
    : front.replace(/^metadata:$/m, `metadata:\n  basedOn: ${source.name}`);
  const body = text.slice(end).replace(/^# (.+)$/m, '# $1 (custom)');
  const dir = join(libraryDir(root), source.category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${newName}.md`), front + body);
  return listAgents(root).find((a) => a.name === newName) as Agent;
}

// Claude Code subagent generated from an agent (portable: no app needed).
// Read-only agents lose the editing tools, like Claude Code's own Explore agent;
// the shell stays for read-only commands and their Boundaries forbid writing with it.
export function claudeSubagent(agent: Agent): string {
  const description = agent.description.replace(/^\[[A-Z ]+\]\s*/, '').replace(/\n/g, ' ');
  const skills = agent.skills.map((s) => `- \`${s}\`: read and follow \`.claude/skills/${s}/SKILL.md\``).join('\n');
  const tools = agent.access === 'read-only' ? 'disallowedTools: Edit, Write, NotebookEdit\n' : '';
  return `---\nname: ${agent.name}\ndescription: ${JSON.stringify(description)}\n${tools}---\n${agent.body.trimEnd()}\n\n## Skills\n\n${skills}\n`;
}
