// Entry point of the desktop app. When installed (packaged), it prepares the
// framework folder in Documents/Quality Agents and points QA_ROOT to it before
// the rest of the app loads. From a cloned repository it uses the repository.

import { app } from 'electron';
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
}

// main.mjs is a separate built file next to this one; it must load after QA_ROOT is set.
const mainEntry = './main.mjs';
await import(mainEntry);
