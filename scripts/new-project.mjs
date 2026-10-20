// Creates workspace/projects/<project-id>/ from templates/project-context/.
// Usage: npm run new-project -- <project-id> ["Display name"]

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SLUG } from './lib/repo.mjs';

const [id, displayName] = process.argv.slice(2);
if (!id || !SLUG.test(id)) {
  console.error('Usage: npm run new-project -- <project-id> ["Display name"]  (id: lowercase letters, digits, hyphens)');
  process.exit(1);
}
const target = join(ROOT, 'workspace', 'projects', id);
if (existsSync(target)) {
  console.error(`workspace/projects/${id} already exists; nothing changed.`);
  process.exit(1);
}
cpSync(join(ROOT, 'templates', 'project-context'), target, { recursive: true });
// Stored as gitignore.txt in the template so it does not affect this repository.
renameSync(join(target, 'gitignore.txt'), join(target, '.gitignore'));
for (const dir of ['inbox', 'runs', 'temporary']) mkdirSync(join(target, dir), { recursive: true });

const projectFile = join(target, 'project.json');
const project = JSON.parse(readFileSync(projectFile, 'utf8'));
project.project = id;
project.name = displayName || id;
writeFileSync(projectFile, `${JSON.stringify(project, null, 2)}\n`);
console.log(`Created workspace/projects/${id}/. The project-context skill will complete it through onboarding.`);
