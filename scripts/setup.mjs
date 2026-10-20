// One-time local setup after cloning:
//  - enables the pre-commit hook (artifact + secret checks)
//  - creates the local workspace/ folders (ignored by Git)
// Usage: npm run setup

import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, git } from './lib/repo.mjs';

for (const dir of ['projects', 'temporary']) {
  mkdirSync(join(ROOT, 'workspace', dir), { recursive: true });
}
console.log('Workspace folders ready under workspace/ (ignored by Git).');

if (existsSync(join(ROOT, '.git'))) {
  git(['config', 'core.hooksPath', '.githooks']);
  try { chmodSync(join(ROOT, '.githooks', 'pre-commit'), 0o755); } catch { /* not needed on Windows */ }
  console.log('Pre-commit hook enabled (core.hooksPath=.githooks).');
} else {
  console.log('Not a Git clone; skipped hook setup.');
}
