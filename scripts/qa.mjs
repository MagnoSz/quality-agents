#!/usr/bin/env node
// Quality Agents terminal assistant: pick a project, an activity and input
// files, then open the AI tool the QA already uses with the request ready.
// It has no AI of its own and calls no API: it only prepares files and a prompt.
//
// Interactive:      qa            (after `npm link`)  or  npm run qa
// Non-interactive:  qa --project <id> --activity <key> [--file <path>]... [--note "<text>"]
//                      [--run <run-id>] [--tool <key>] [--lang <language>]
// Activities: review, tests, review-then-tests, failure, context, resume
// Tools: claude, codex, cursor-agent, gemini, cursor, chat, print

import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, SLUG, readJson } from './lib/repo.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { createUI, CancelError, c } from './lib/tui.mjs';

const PROJECTS = join(ROOT, 'workspace', 'projects');
const PREFS = join(ROOT, 'workspace', '.qa-preferences.json');
const LAST_PROMPT = join(ROOT, 'workspace', 'temporary', 'last-prompt.txt');

export const ACTIVITIES = {
  review: { label: 'Review user stories', hint: 'ambiguities, gaps, interview, matrix, report', skill: 'requirements-review', needsFiles: true },
  tests: { label: 'Design tests', hint: 'scenario mapping, then test cases', skill: 'test-design', needsFiles: true },
  'review-then-tests': { label: 'Review, then design tests', hint: 'workflow with approval in between', skill: 'qa-orchestrator', needsFiles: true },
  failure: { label: 'Failure pre-analysis', hint: 'from your description and the log', skill: 'failure-analysis', needsFiles: false },
  context: { label: 'Project context', hint: 'onboarding, questions, updates', skill: 'project-context', needsFiles: false },
  automation: { label: 'Automation', skill: 'automation', needsFiles: false },
  resume: { label: 'Resume a run', skill: 'qa-orchestrator', needsFiles: false },
};

export const TOOLS = {
  claude: { label: 'Claude Code', command: 'claude', args: (p) => [p] },
  codex: { label: 'OpenAI Codex CLI', command: 'codex', args: (p) => [p] },
  'cursor-agent': { label: 'Cursor Agent CLI', command: 'cursor-agent', args: (p) => [p] },
  gemini: { label: 'Gemini CLI', command: 'gemini', args: (p) => ['-i', p] },
  cursor: { label: 'Cursor editor', hint: 'opens the folder, request copied to clipboard', command: 'cursor', args: () => [ROOT], clipboard: true },
  chat: { label: 'ChatGPT / claude.ai / Gemini web', hint: 'request copied, files listed', chat: true },
  print: { label: 'Just show the request', print: true },
};

const LANGUAGES = ['English', 'Portuguese (pt-BR)', 'Spanish'];

// ---------------------------------------------------------------- helpers

export function skillStatus(skill, root = ROOT) {
  const file = join(root, 'skills', skill, 'SKILL.md');
  if (!existsSync(file)) return 'missing';
  return parseFrontmatter(readFileSync(file, 'utf8')).data?.metadata?.status ?? 'unknown';
}

export const isUsable = (skill, root = ROOT) => ['stable', 'draft'].includes(skillStatus(skill, root));

export function listProjects(root = ROOT) {
  const dir = join(root, 'workspace', 'projects');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => existsSync(join(dir, d, 'project.json'))).sort();
}

export function openRuns(project, root = ROOT) {
  const dir = join(root, 'workspace', 'projects', project, 'runs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((id) => existsSync(join(dir, id, 'state.json')))
    .map((id) => {
      try { return { id, ...readJson(join(dir, id, 'state.json')) }; } catch { return { id, status: 'unreadable' }; }
    })
    .filter((s) => !['completed', 'cancelled'].includes(s.status))
    .sort((a, b) => b.id.localeCompare(a.id));
}

// Accepts paths typed or dragged into the terminal ("quoted", 'quoted', escaped spaces).
export function cleanPath(raw) {
  let p = raw.trim();
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) p = p.slice(1, -1);
  if (process.platform !== 'win32') p = p.replace(/\\ /g, ' ');
  if (p.startsWith('~')) p = join(process.env.HOME || process.env.USERPROFILE || '', p.slice(1));
  // Git Bash style /c/Users/... on Windows
  if (process.platform === 'win32' && /^\/[a-zA-Z]\//.test(p)) p = `${p[1]}:${p.slice(2)}`;
  return resolve(p);
}

// Copies a file into the project inbox without overwriting; returns repo-relative path.
export function copyToInbox(project, source, root = ROOT) {
  const inbox = join(root, 'workspace', 'projects', project, 'inbox');
  mkdirSync(inbox, { recursive: true });
  if (resolve(source).startsWith(resolve(inbox))) return `workspace/projects/${project}/inbox/${basename(source)}`;
  const ext = extname(source);
  const stem = basename(source, ext);
  let name = basename(source);
  for (let i = 1; existsSync(join(inbox, name)); i++) name = `${stem}-${i}${ext}`;
  copyFileSync(source, join(inbox, name));
  return `workspace/projects/${project}/inbox/${name}`;
}

export function buildPrompt({ project, activity, files = [], note = '', run = '', language = 'English' }) {
  const list = files.length ? files.join(', ') : '';
  const parts = [`Follow AGENTS.md. Project: ${project}.`];
  switch (activity) {
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
      throw new Error(`Unknown activity "${activity}"`);
  }
  if (note.trim()) parts.push(`Additional instructions: ${note.trim().replace(/([^.!?])$/, '$1.')}`);
  parts.push(`Talk to me in ${language}.`);
  return parts.join(' ');
}

function which(command) {
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [command], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split(/\r?\n/).find(Boolean) || null;
  } catch { return null; }
}

export function detectTools() {
  return Object.fromEntries(Object.entries(TOOLS).map(([key, t]) => [key, t.command ? Boolean(which(t.command)) : true]));
}

function copyToClipboard(text) {
  const attempts = process.platform === 'win32' ? [['clip', []]]
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

// Windows shells (.cmd shims) need the prompt as a single quoted argument.
function launch(tool, prompt) {
  const t = TOOLS[tool];
  const args = t.args(prompt);
  if (process.platform === 'win32') {
    const quoted = args.map((a) => `"${String(a).replace(/"/g, "'").replace(/%/g, ' percent')}"`).join(' ');
    return spawn(`${t.command} ${quoted}`, { cwd: ROOT, stdio: 'inherit', shell: true });
  }
  return spawn(t.command, args, { cwd: ROOT, stdio: 'inherit' });
}

function loadPrefs() {
  try { return JSON.parse(readFileSync(PREFS, 'utf8')); } catch { return {}; }
}

function savePrefs(prefs) {
  try { mkdirSync(join(ROOT, 'workspace'), { recursive: true }); writeFileSync(PREFS, JSON.stringify(prefs, null, 2)); } catch { /* optional */ }
}

// ---------------------------------------------------------------- interactive

async function interactive(args, ui) {
  const prefs = loadPrefs();
  ui.intro('Quality Agents', 'Prepares your request and opens the AI tool you use. Your data stays in workspace/.');

  // Project
  let project = args.project;
  if (!project) {
    const projects = listProjects();
    project = await ui.select({
      message: 'Which project (system under test)?',
      options: [
        ...projects.map((p) => {
          const runs = openRuns(p).length;
          return { value: p, label: p, hint: runs ? `${runs} open run${runs > 1 ? 's' : ''}` : '' };
        }),
        { value: '__new', label: '+ New project' },
      ],
      initial: prefs.project,
    });
    if (project === '__new') {
      project = await ui.text({
        message: 'Project id',
        placeholder: 'lowercase, digits and hyphens, e.g. billing-portal',
        validate: (v) => (!SLUG.test(v) ? 'Use lowercase letters, digits and single hyphens.' : listProjects().includes(v) ? 'This project already exists.' : ''),
      });
      const name = await ui.text({ message: 'Display name', placeholder: project }) || project;
      execFileSync(process.execPath, [join(ROOT, 'scripts', 'new-project.mjs'), project, name], { stdio: 'ignore' });
      ui.success(`Created workspace/projects/${project}/`);
    }
  }

  // Activity
  const runs = openRuns(project);
  let activity = args.activity;
  if (!activity) {
    activity = await ui.select({
      message: 'What do you want to do?',
      options: Object.entries(ACTIVITIES).map(([key, a]) => ({
        value: key,
        label: a.label,
        hint: key === 'resume' ? `${runs.length} open` : a.hint,
        disabled: key === 'resume' ? (runs.length ? '' : 'no open runs')
          : isUsable(a.skill) ? '' : `not available yet: ${skillStatus(a.skill)}`,
      })),
    });
  }

  // Run or files
  let run = args.run || '';
  let files = [].concat(args.file || []).map((f) => copyToInbox(project, cleanPath(f)));
  if (activity === 'resume') {
    if (!run) {
      run = await ui.select({
        message: 'Which run?',
        options: runs.map((r) => ({ value: r.id, label: r.id, hint: `${r.status} · step ${r.currentStep || '-'}` })),
      });
    }
  } else if (!files.length) {
    const required = ACTIVITIES[activity].needsFiles;
    for (;;) {
      const n = files.length + 1;
      const raw = await ui.text({
        message: files.length ? `Another file? (${files.length} added)` : `Input file${required ? '' : ' (optional)'}`,
        placeholder: files.length || !required ? 'type or drag a path · Enter to continue' : 'type or drag a path',
        vanishIfEmpty: true,
        validate: (v) => {
          if (!v) return files.length || !required ? '' : 'This activity needs at least one file.';
          const p = cleanPath(v);
          return existsSync(p) && statSync(p).isFile() ? '' : `File not found: ${p}`;
        },
      });
      if (!raw) break;
      const rel = copyToInbox(project, cleanPath(raw));
      files.push(rel);
      ui.success(`File ${n} → ${rel}`);
    }
  }

  const note = args.note ?? await ui.text({ message: 'Anything else the AI should know?', placeholder: 'optional · Enter to skip' });

  const language = args.lang || await ui.select({
    message: 'Conversation language',
    options: LANGUAGES.map((l) => ({ value: l, label: l })),
    initial: prefs.language || 'English',
  });

  const available = detectTools();
  const tool = args.tool || await ui.select({
    message: 'Open with',
    options: Object.entries(TOOLS).map(([key, t]) => ({
      value: key, label: t.label, hint: t.hint, disabled: available[key] ? '' : 'not installed',
    })),
    initial: prefs.tool && available[prefs.tool] ? prefs.tool : undefined,
  });

  ui.note('Summary', [
    ['Project', project],
    ['Activity', ACTIVITIES[activity].label + (run ? ` · ${run}` : '')],
    ...(files.length ? files.map((f, i) => [i ? '' : 'Files', f]) : [['Files', c.dim('none')]]),
    ...(note ? [['Note', note]] : []),
    ['Language', language],
    ['Tool', TOOLS[tool].label],
  ]);

  if (!TOOLS[tool].print && !(await ui.confirm({ message: `Open ${TOOLS[tool].label} now?` }))) {
    ui.cancelled('Nothing was opened. Your files are already in the project inbox.');
    return 0;
  }

  savePrefs({ project, language, tool });
  ui.close();
  return deliver({ project, activity, files, note, run, language, tool }, ui);
}

// ---------------------------------------------------------------- delivery

const plainOut = {
  log: (l) => console.log(l), success: (l) => console.log(`✔ ${l}`), warn: (l) => console.log(`! ${l}`),
  outro: (l) => console.log(`${l}\n`),
};

async function deliver(request, out = plainOut) {
  const prompt = buildPrompt(request);
  mkdirSync(join(ROOT, 'workspace', 'temporary'), { recursive: true });
  writeFileSync(LAST_PROMPT, `${prompt}\n`);
  const tool = TOOLS[request.tool];
  if (!tool) throw new Error(`Unknown tool "${request.tool}". Options: ${Object.keys(TOOLS).join(', ')}`);

  out.log(c.dim('Request (also saved in workspace/temporary/last-prompt.txt):'));
  out.log(prompt);

  if (tool.print) { out.outro('Done.'); return 0; }

  if (tool.chat) {
    out.log('');
    if (copyToClipboard(prompt)) out.success('Request copied to the clipboard.');
    else out.warn('Copy the request above.');
    const bundle = join(ROOT, 'dist', 'chat', 'quality-agents-all.md');
    out.log('Upload these files to the chat (see adapters/chat/README.md):');
    out.log(existsSync(bundle) ? `  ${bundle}` : `  dist/chat/quality-agents-all.md ${c.yellow('(run npm run bundle first)')}`);
    out.log(`  ${join(PROJECTS, request.project, 'project.json')}`);
    out.log(`  ${join(PROJECTS, request.project, 'context', 'index.md')} + the context files it lists for this activity`);
    if (request.run) out.log(`  ${join(PROJECTS, request.project, 'runs', request.run, 'state.json')}`);
    request.files.forEach((f) => out.log(`  ${join(ROOT, f)}`));
    out.outro(`Save what the AI produces in ${join(PROJECTS, request.project, 'runs')}`);
    return 0;
  }

  if (tool.clipboard) {
    if (copyToClipboard(prompt)) out.success('Request copied to the clipboard — paste it in the agent chat.');
    else out.warn('Copy the request above into the agent chat.');
  }
  out.outro(`Opening ${c.bold(tool.label)} …`);
  const child = launch(request.tool, prompt);
  return new Promise((done) => {
    child.on('exit', (code) => done(code ?? 0));
    child.on('error', (e) => { console.error(`Could not start ${tool.command}: ${e.message}`); done(1); });
  });
}

// ---------------------------------------------------------------- entry

const FLAGS = new Set(['help', 'h', 'interactive', 'plain']);

function parseCli(argv) {
  const args = { ignored: [] };
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('-')) { args.ignored.push(argv[i]); continue; }
    const key = argv[i].replace(/^--?/, '');
    if (FLAGS.has(key)) { args[key === 'h' ? 'help' : key] = true; continue; }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for --${key}. Run qa --help.`);
    if (key === 'file') (args.file ??= []).push(value); else args[key] = value;
    i++;
  }
  return args;
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  if (args.help) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 10).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return 0;
  }
  if (args.ignored.length) console.log(c.dim(`(ignoring "${args.ignored.join(' ')}" — qa takes only --options; see qa --help)`));
  if (args.project && !listProjects().includes(args.project)) throw new Error(`Project "${args.project}" not found. Create it with: npm run new-project -- ${args.project}`);
  if (args.activity && !ACTIVITIES[args.activity]) throw new Error(`Unknown activity "${args.activity}". Options: ${Object.keys(ACTIVITIES).join(', ')}`);
  if (args.activity && args.activity !== 'resume' && !isUsable(ACTIVITIES[args.activity].skill)) {
    throw new Error(`The ${ACTIVITIES[args.activity].skill} skill is ${skillStatus(ACTIVITIES[args.activity].skill)} and cannot run yet.`);
  }
  if (args.tool && !TOOLS[args.tool]) throw new Error(`Unknown tool "${args.tool}". Options: ${Object.keys(TOOLS).join(', ')}`);
  for (const f of [].concat(args.file || [])) if (!existsSync(cleanPath(f))) throw new Error(`File not found: ${f}`);

  const complete = args.project && args.activity && args.tool && (args.activity !== 'resume' || args.run)
    && (!ACTIVITIES[args.activity].needsFiles || args.file);
  if (complete) {
    const files = [].concat(args.file || []).map((f) => copyToInbox(args.project, cleanPath(f)));
    return deliver({ project: args.project, activity: args.activity, files, note: args.note || '', run: args.run || '', language: args.lang || 'English', tool: args.tool });
  }
  if (!process.stdin.isTTY && !args.interactive) throw new Error('Missing options and no interactive terminal. Run qa --help.');

  const ui = createUI({ forcePlain: args.plain || !process.stdin.isTTY });
  try {
    return await interactive(args, ui);
  } catch (e) {
    if (e instanceof CancelError) { ui.cancelled(); return 130; }
    throw e;
  } finally {
    ui.close();
  }
}

// realpath: `npm link` runs this file through a symlink on macOS/Linux.
const invokedDirectly = (() => {
  try { return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url; } catch { return false; }
})();
if (invokedDirectly) {
  main().then((code) => process.exit(code ?? 0)).catch((e) => { console.error(`qa: ${e.message}`); process.exit(1); });
}
