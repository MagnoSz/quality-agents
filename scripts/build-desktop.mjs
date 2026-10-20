// Builds the desktop app: the UI with Vite (app/dist) and the Electron main
// process, preload bridge and tool runner with esbuild (app/dist-electron).
// Usage: npm run app:build

import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/repo.mjs';

const out = join(ROOT, 'app', 'dist-electron');
rmSync(out, { recursive: true, force: true });

await viteBuild({ configFile: join(ROOT, 'app', 'vite.config.ts'), logLevel: 'warn' });

const common = { bundle: true, platform: 'node', target: 'node22', sourcemap: false, logLevel: 'warning', external: ['electron'] };
await esbuild({ ...common, entryPoints: [join(ROOT, 'desktop', 'main.ts')], outfile: join(out, 'main.mjs'), format: 'esm' });
await esbuild({ ...common, entryPoints: [join(ROOT, 'desktop', 'preload.ts')], outfile: join(out, 'preload.cjs'), format: 'cjs' });
await esbuild({ ...common, entryPoints: [join(ROOT, 'desktop', 'run-tool.ts')], outfile: join(out, 'run-tool.mjs'), format: 'esm' });

console.log('Desktop app built: app/dist (UI) and app/dist-electron (main process).');
