// Runs inside the NEW terminal window opened by the desktop app (Windows): reads
// the launch request from a UTF-8 JSON file and starts the AI tool with the
// prompt as a real Unicode argument. This avoids cmd.exe decoding batch files
// in the legacy code page, which corrupted accents (ç, ã, é...).
//
// Usage (internal): <node or Electron as Node> run-tool <request.json>

import { readFileSync, realpathSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { which } from '../scripts/lib/core.ts';

interface LaunchFile { command: string; args: string[]; cwd: string; title: string }

// Quoting for cmd.exe when the tool is a .cmd/.bat shim: inside "..." the
// metacharacters & | < > ^ are literal; " and % are neutralized.
export const cmdQuote = (a: string): string => `"${a.replace(/"/g, "'").replace(/%/g, ' percent')}"`;

function waitForKey(message: string): void {
  console.error(`\n${message}\nPress Enter to close this window.`);
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
}

function main(): void {
  const file = process.argv[2];
  const req = JSON.parse(readFileSync(file, 'utf8')) as LaunchFile;
  rmSync(file, { force: true }); // contains the prompt; no need to keep it
  process.title = req.title;
  process.stdout.write(`\x1b]0;${req.title}\x07`);

  const path = which(req.command);
  if (!path) { waitForKey(`"${req.command}" was not found. Is it installed?`); return; }

  // Native executables get the arguments as-is; shims go through cmd.exe,
  // which converts arguments with the console code page — switch this
  // window's console to UTF-8 first so accents survive.
  const isShim = /\.(cmd|bat)$/i.test(path);
  if (isShim) spawnSync('chcp.com', ['65001'], { stdio: 'ignore' });
  const child = isShim
    ? spawn(`${req.command} ${req.args.map(cmdQuote).join(' ')}`, { cwd: req.cwd, stdio: 'inherit', shell: true })
    : spawn(path, req.args, { cwd: req.cwd, stdio: 'inherit' });
  child.on('error', (e) => waitForKey(`Could not start ${req.command}: ${e.message}`));
  child.on('exit', (code) => process.exit(code ?? 0));
}

const invokedDirectly = (() => {
  try { return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url; } catch { return false; }
})();
if (invokedDirectly) main();
