// The installed app carries a copy of the framework (skills, AGENTS.md,
// templates...) and keeps it in a normal folder the AI tools can open
// (Documents/Moki). On each new build it refreshes those framework
// files. It NEVER touches workspace/ or workspaces/ (projects, context and results).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARKER = '.qa-framework-build';
const PROTECTED = new Set(['workspace', 'workspaces']);

export function syncFramework(bundled: string, target: string, buildId: string): boolean {
  mkdirSync(target, { recursive: true });
  const marker = join(target, MARKER);
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === buildId) return false;

  for (const name of readdirSync(bundled)) {
    if (PROTECTED.has(name)) continue;
    rmSync(join(target, name), { recursive: true, force: true });
    cpSync(join(bundled, name), join(target, name), { recursive: true });
  }
  // workspace/: create what is missing, keep everything that exists.
  for (const dir of ['projects', 'temporary']) mkdirSync(join(target, 'workspace', dir), { recursive: true });
  const readme = join(bundled, 'workspace', 'README.md');
  if (existsSync(readme)) cpSync(readme, join(target, 'workspace', 'README.md'));

  writeFileSync(marker, `${buildId}\n`);
  return true;
}

// Where an installed copy keeps the framework: QA_ROOT, the folder of installs made
// before the rename, or <Documents>/Moki. The desktop app and the VS Code extension share it.
export function frameworkTarget(documents: string): string {
  const legacy = join(documents, 'Quality Agents');
  return process.env.QA_ROOT || (existsSync(legacy) ? legacy : join(documents, 'Moki'));
}
