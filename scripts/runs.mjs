// Lists projects and their runs, validating each state.json.
// Usage: npm run runs [-- <project-id> [<run-id>]]

import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, workspaceDir } from './lib/repo.mjs';
import { validateSchema } from './lib/schema.mjs';

const projectsDir = join(workspaceDir(), 'projects'); // QA_WORKSPACE selects another workspace
const schema = readJson(join(ROOT, 'schemas', 'execution-state.schema.json'));
const [onlyProject, onlyRun] = process.argv.slice(2);
const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory()).sort() : []);

const projects = dirs(projectsDir).filter((p) => !onlyProject || p === onlyProject);
if (!projects.length) {
  console.log(onlyProject ? `Project "${onlyProject}" not found in workspace/projects/.` : 'No projects in workspace/projects/.');
  process.exit(onlyProject ? 1 : 0);
}

let invalid = 0;
for (const project of projects) {
  const runs = dirs(join(projectsDir, project, 'runs')).filter((r) => !onlyRun || r === onlyRun);
  console.log(`${project}  (${runs.length} run${runs.length === 1 ? '' : 's'})`);
  for (const id of runs) {
    const file = join(projectsDir, project, 'runs', id, 'state.json');
    if (!existsSync(file)) { console.log(`  ${id}  [no state.json]`); invalid++; continue; }
    let state;
    try { state = readJson(file); } catch (e) { console.log(`  ${id}  [invalid JSON: ${e.message}]`); invalid++; continue; }
    const errors = validateSchema(schema, state);
    if (state.id !== id) errors.push(`id "${state.id}" does not match folder name`);
    if (state.project !== project) errors.push(`project "${state.project}" does not match project folder "${project}" (isolation)`);
    const prefix = `workspace/projects/${project}/`;
    for (const a of state.artifacts || []) {
      if (a.startsWith('workspace/') && !a.startsWith(prefix)) errors.push(`artifact "${a}" is outside this project (isolation)`);
    }
    console.log(`  ${id}  status=${state.status}  step=${state.currentStep || '-'}  pending=${(state.pending || []).length}  approvals=${(state.approvals || []).length}`);
    errors.forEach((e) => console.log(`      ! ${e}`));
    if (errors.length) invalid++;
  }
}
process.exit(invalid ? 1 : 0);
