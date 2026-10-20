// Opens AI tools for the desktop app. Terminal tools (claude, codex, gemini,
// cursor-agent) start in a NEW terminal window; editors open the framework
// folder. Only tools from the fixed TOOLS list can be started, and user text
// only ever travels as the prompt argument.
//
// Windows: the request goes to a UTF-8 JSON file read by desktop/run-tool.ts in
// the new window (batch files would corrupt accents). macOS/Linux: a small
// bash script (bash reads UTF-8) opened in the terminal app.

import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { TOOLS, copyToClipboard, which, type ToolKey } from '../scripts/lib/core.ts';

export interface LaunchResult { opened: boolean; message: string; copied?: boolean }

export type Launcher = (tool: ToolKey, prompt: string, root: string) => LaunchResult;
export type FolderOpener = (folder: string) => void;

// Inside the desktop app, main.ts points QA_RUN_TOOL to the bundled run-tool and
// runs it with Electron's own Node (ELECTRON_RUN_AS_NODE). In Node it is the .ts file.
const runToolPath = (): string => process.env.QA_RUN_TOOL || join(dirname(fileURLToPath(import.meta.url)), 'run-tool.ts');

// Prompts are one line of plain text; control characters and line breaks are removed.
export const cleanPrompt = (prompt: string): string => prompt.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();

// macOS/Linux launcher script. Single quotes, with embedded single quotes
// closed and escaped, so the shell never interprets user text. Pure, for testing.
export function scriptFor(command: string, args: string[], root: string, title: string): string {
  const q = (a: string): string => `'${cleanPrompt(a).replace(/'/g, `'\\''`)}'`;
  return ['#!/bin/bash', `printf '\\033]0;%s\\007' ${q(title)}`, `cd ${q(root)} || exit 1`, `${command} ${args.map(q).join(' ')}`, ''].join('\n');
}

// Windows: `start` opens a new console running node + run-tool with the JSON
// file. Only paths and a fixed title appear on this command line. Pure, for testing.
export function windowsStartArgs(nodePath: string, runTool: string, requestFile: string, title: string): string {
  const q = (s: string): string => `"${s.replace(/"/g, '')}"`;
  return `/d /s /c "start ${q(title)} ${q(nodePath)} ${q(runTool)} ${q(requestFile)}"`;
}

function detached(cmd: string, args: string[], options: { shell?: boolean; windowsVerbatimArguments?: boolean; env?: NodeJS.ProcessEnv } = {}): void {
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', ...options });
  child.on('error', () => { /* reported by the caller's availability check */ });
  child.unref();
}

const LINUX_TERMINALS: [string, string[]][] = [
  ['x-terminal-emulator', ['-e']], ['gnome-terminal', ['--']], ['konsole', ['-e']], ['xfce4-terminal', ['-x']], ['xterm', ['-e']],
];

export const launchTool: Launcher = (tool, prompt, root) => {
  const t = TOOLS[tool];
  if (!t.command || !t.args) throw new Error(`${t.label} is not started from the app.`);
  if (!which(t.command)) return { opened: false, message: `${t.label} is not installed on this computer (command "${t.command}" not found).` };

  if (t.clipboard) {
    const copied = copyToClipboard(prompt);
    if (process.platform === 'win32') detached(`${t.command} "${root}"`, [], { shell: true });
    else detached(t.command, [root]);
    return {
      opened: true,
      copied,
      message: `${t.label} is opening the Quality Agents folder. ${copied ? 'The request is in your clipboard — paste it in the AI chat.' : 'Copy the request below into the AI chat.'}`,
    };
  }

  const dir = join(root, 'workspace', 'temporary');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = `Quality Agents - ${t.label}`;
  const args = t.args(cleanPrompt(prompt));

  if (process.platform === 'win32') {
    const file = join(dir, `open-${tool}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ command: t.command, args, cwd: root, title }), 'utf8');
    detached('cmd.exe', [windowsStartArgs(process.execPath, runToolPath(), file, title)], {
      windowsVerbatimArguments: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });
  } else if (process.platform === 'darwin') {
    const file = join(dir, `open-${tool}-${stamp}.command`);
    writeFileSync(file, scriptFor(t.command, args, root, title));
    chmodSync(file, 0o755);
    detached('open', [file]);
  } else {
    const file = join(dir, `open-${tool}-${stamp}.sh`);
    writeFileSync(file, scriptFor(t.command, args, root, title));
    chmodSync(file, 0o755);
    const terminal = LINUX_TERMINALS.find(([cmd]) => which(cmd));
    if (!terminal) return { opened: false, message: `No terminal program found. Open a terminal and run: bash "${file}"` };
    detached(terminal[0], [...terminal[1], 'bash', file]);
  }
  return { opened: true, message: `${t.label} is opening in a new terminal window, already in the Quality Agents folder with your request.` };
};

// Opens a folder in the system file manager (Explorer, Finder, ...).
export const openFolder: FolderOpener = (folder) => {
  if (process.platform === 'win32') spawnSync('explorer.exe', [folder]); // explorer returns 1 even on success
  else detached(process.platform === 'darwin' ? 'open' : 'xdg-open', [folder]);
};
