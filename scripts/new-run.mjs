// Creates a run folder inside a project, with an initial state.json, and logs
// it in the project's activity-log.md (see core/persistence-protocol.md).
// Usage: npm run new-run -- --project <project-id> (--skill <name> | --workflow <id>) --slug <short-slug>

import { mkdirSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SLUG, listSkillDirs, parseArgs, nowStamp } from './lib/repo.mjs';

const args = parseArgs(process.argv.slice(2));
const fail = (msg) => { console.error(msg); process.exit(1); };
const kind = args.skill ? 'skill' : args.workflow ? 'workflow' : null;
if (!kind || !args.project || !args.slug) {
  fail('Usage: npm run new-run -- --project <project-id> (--skill <name> | --workflow <id>) --slug <short-slug>');
}
const name = args[kind];
if (kind === 'skill' && !listSkillDirs().includes(name)) fail(`Unknown skill "${name}". Available: ${listSkillDirs().join(', ')}`);
if (kind === 'workflow' && !existsSync(join(ROOT, 'skills', 'qa-orchestrator', 'references', 'workflows', `${name}.md`))) {
  fail(`Unknown workflow "${name}".`);
}
for (const [label, value] of [['project', args.project], ['slug', args.slug]]) {
  if (!SLUG.test(value)) fail(`--${label} must be lowercase letters, digits and hyphens`);
}
const projectDir = join(ROOT, 'workspace', 'projects', args.project);
if (!existsSync(join(projectDir, 'project.json'))) {
  fail(`Project "${args.project}" does not exist. Create it first: npm run new-project -- ${args.project}`);
}

const id = `${nowStamp()}-${name}-${args.slug}`;
const runDir = join(projectDir, 'runs', id);
if (existsSync(runDir)) fail(`Run ${id} already exists.`);
for (const sub of ['inputs', 'outputs', 'evidence', 'logs']) mkdirSync(join(runDir, sub), { recursive: true });

const now = new Date().toISOString();
const state = {
  schemaVersion: '1',
  id,
  project: args.project,
  [kind]: name,
  createdAt: now,
  updatedAt: now,
  status: 'in-progress',
  currentStep: '',
  completedSteps: [],
  pending: [],
  approvals: [],
  inputs: [],
  results: [],
  artifacts: [],
};
writeFileSync(join(runDir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
appendFileSync(join(projectDir, 'activity-log.md'), `| ${now.slice(0, 10)} | ${kind}: ${name} | ${id} | in-progress |\n`);
console.log(`Created workspace/projects/${args.project}/runs/${id}/`);
