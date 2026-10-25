// One-time local setup after cloning (and after updating with git pull):
//  - installs the development dependencies and builds the desktop app
//  - enables the pre-commit hook (artifact + secret checks)
//  - creates the local workspace/ folders (ignored by Git)
// Usage: npm run setup

import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, git } from './lib/repo.mjs';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`Node.js ${process.versions.node} is too old. Install Node.js 22.18 or newer (LTS) from https://nodejs.org`);
  process.exit(1);
}

function npm(args, label) {
  console.log(`${label}...`);
  const r = spawnSync('npm', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`Failed: npm ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
}

npm(['install', '--no-audit', '--no-fund'], 'Installing dependencies');
npm(['run', 'app:build', '--silent'], 'Building the desktop app');

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
console.log('\nDone. Start Moki with:  npm run qa   (or just  qa  after npm link)');
