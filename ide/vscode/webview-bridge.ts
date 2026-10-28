// window.qa inside the VS Code webview: the bridge desktop/preload.ts gives the
// desktop app, carried over postMessage to ide/vscode/host.ts. Loaded before the UI.

import type { Bridge } from '../../app/src/api';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const vscode = acquireVsCodeApi();
const replies = new Map<number, (value: unknown) => void>();
const changed = new Set<(project: string) => void>();
const notes = new Set<() => void>();
let next = 0;

addEventListener('message', (e: MessageEvent) => {
  const m = e.data as { id?: number; value?: unknown; event?: string; project?: string };
  if (typeof m.id === 'number') { replies.get(m.id)?.(m.value); replies.delete(m.id); }
  else if (m.event === 'changed') for (const cb of changed) cb(m.project ?? '');
  else if (m.event === 'notes-changed') for (const cb of notes) cb();
});

function request<T>(type: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve) => {
    const id = ++next;
    replies.set(id, resolve as (value: unknown) => void);
    vscode.postMessage({ id, type, args });
  });
}

function listen<T>(set: Set<T>, callback: T): () => void {
  set.add(callback);
  return () => { set.delete(callback); };
}

window.qa = {
  query: document.currentScript?.dataset.query ?? '',
  call: (method, ...args) => request<Awaited<ReturnType<Bridge['call']>>>('call', method, args),
  filePath: () => '', // a webview is not told where a dropped file is
  watch: (project) => request<boolean>('watch', project),
  onChanged: (callback) => listen(changed, callback),
  openLink: async (url) => { vscode.postMessage({ type: 'openLink', args: [url] }); },
  openNoteWindow: (target) => request<boolean>('openNoteWindow', target),
  notesChanged: () => { vscode.postMessage({ type: 'notesChanged' }); },
  onNotesChanged: (callback) => listen(notes, callback),
  noteMax: () => {},
} satisfies Bridge;
