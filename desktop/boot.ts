// Entry point of the desktop app. When installed (packaged), it prepares the
// framework folder in Documents/Quality Agents and points QA_ROOT to it before
// the rest of the app loads. From a cloned repository it uses the repository.

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncFramework } from './framework.ts';

if (app.isPackaged) {
  const here = dirname(fileURLToPath(import.meta.url));
  const target = process.env.QA_ROOT || join(app.getPath('documents'), 'Quality Agents');
  let buildId = app.getVersion();
  try { buildId = (JSON.parse(readFileSync(join(here, 'build-info.json'), 'utf8')) as { buildId: string }).buildId; } catch { /* use the version */ }
  syncFramework(join(process.resourcesPath, 'framework'), target, buildId);
  process.env.QA_ROOT = target;

  // Started from the app menu, macOS/Linux give the app a minimal PATH without
  // ~/.local/bin, nvm and similar, so AI tools would look missing. Use the login shell's PATH.
  if (process.platform !== 'win32') {
    try {
      const path = execFileSync(process.env.SHELL || '/bin/bash', ['-lc', 'printf %s "$PATH"'], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] });
      if (path) process.env.PATH = path;
    } catch { /* keep the inherited PATH */ }
  }
}

// main.mjs is a separate built file next to this one; it must load after QA_ROOT is set.
const mainEntry = './main.mjs';
await import(mainEntry);
