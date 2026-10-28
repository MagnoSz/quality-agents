// Embedded terminals of the desktop app (same model as Orca): each terminal tab
// in the UI is a real pseudo-terminal (node-pty) owned by this process, drawn in
// the window with xterm.js. Only commands prepared here can start — the AI tools
// of the fixed TOOLS list (desktop/launcher.ts) or the user's shell — and the UI
// can only start, type into, resize and close them by id.

import { createRequire } from 'node:module';

export interface TermSpec { file: string; args: string[]; cwd: string; env?: NodeJS.ProcessEnv }

// The part of node-pty used here (it is an optional dependency, so its types may be absent).
interface IPty {
  pid: number;
  onData(listener: (data: string) => void): unknown;
  onExit(listener: (e: { exitCode: number }) => void): unknown;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}
interface PtyModule {
  spawn(file: string, args: string[], options: { name: string; cols: number; rows: number; cwd: string; env: NodeJS.ProcessEnv }): IPty;
}
let pty: PtyModule | null | undefined;

// node-pty is native; when it is not built for this machine the app falls back
// to opening the tools in external terminal windows.
export function loadPty(): PtyModule | null {
  if (pty === undefined) {
    try { pty = createRequire(import.meta.url)('node-pty') as PtyModule; } catch { pty = null; }
  }
  return pty;
}

// The user's own shell, for the "New terminal" tab.
export const shellSpec = (cwd: string): TermSpec => process.platform === 'win32'
  ? { file: 'powershell.exe', args: ['-NoLogo'], cwd }
  : { file: process.env.SHELL || '/bin/bash', args: [], cwd };

export function createTerminals(send: (channel: 'qa:term-data' | 'qa:term-exit', id: string, payload: string | number) => void) {
  const prepared = new Map<string, TermSpec>();
  const running = new Map<string, IPty>();
  const projectOf = new Map<string, string>(); // project whose tab runs the terminal, for the status bar
  let next = 0;

  const kill = (id: string): void => {
    prepared.delete(id);
    projectOf.delete(id);
    const proc = running.get(id);
    running.delete(id);
    try { proc?.kill(); } catch { /* already gone */ }
  };

  return {
    available: (): boolean => Boolean(loadPty()),

    prepare(spec: TermSpec): string {
      const id = `t${++next}`;
      prepared.set(id, spec);
      return id;
    },

    // Starts a prepared terminal with the size of its tab. Returns an error message or ''.
    start(id: string, cols: number, rows: number, project = ''): string {
      const spec = prepared.get(id);
      const p = loadPty();
      if (!spec || !p) return 'This terminal can no longer be started.';
      prepared.delete(id);
      try {
        const proc = p.spawn(spec.file, spec.args, { name: 'xterm-256color', cols, rows, cwd: spec.cwd, env: spec.env ?? process.env });
        running.set(id, proc);
        projectOf.set(id, project);
        proc.onData((data) => send('qa:term-data', id, data));
        proc.onExit(({ exitCode }) => { if (running.get(id) === proc) { running.delete(id); projectOf.delete(id); } send('qa:term-exit', id, exitCode); });
        return '';
      } catch (e) {
        return `Could not start ${spec.file}: ${e instanceof Error ? e.message : String(e)}`;
      }
    },

    write: (id: string, data: string): void => { running.get(id)?.write(data); },
    resize: (id: string, cols: number, rows: number): void => { try { running.get(id)?.resize(cols, rows); } catch { /* exited */ } },
    kill,
    list: (): { id: string; pid: number; project: string }[] => [...running].map(([id, proc]) => ({ id, pid: proc.pid, project: projectOf.get(id) ?? '' })),
    killAll: (): void => { for (const id of [...prepared.keys(), ...running.keys()]) kill(id); },
  };
}

export type Terminals = ReturnType<typeof createTerminals>;
