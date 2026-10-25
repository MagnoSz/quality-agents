// Creates workspace/projects/<project-id>/ from templates/project-context/.
// Usage: npm run new-project -- <project-id> ["Display name"] [--blank]
// --blank leaves the QA context files out; the project-context skill plans them with the user.

import { SLUG } from './lib/repo.mjs';
import { createProject } from './lib/core.ts';

const args = process.argv.slice(2);
const blank = args.includes('--blank');
const [id, displayName] = args.filter((a) => a !== '--blank');
if (!id || !SLUG.test(id)) {
  console.error('Usage: npm run new-project -- <project-id> ["Display name"] [--blank]  (id: lowercase letters, digits, hyphens)');
  process.exit(1);
}
try {
  createProject(id, displayName || id, undefined, blank ? 'blank' : 'qa');
} catch (e) {
  console.error(`${e.message} Nothing changed.`);
  process.exit(1);
}
console.log(`Created workspace/projects/${id}/. The project-context skill will complete it through ${blank ? 'a planning interview' : 'onboarding'}.`);
