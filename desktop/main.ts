// Electron main process of the Quality Agents desktop app. Opens one window,
// exposes the service to the UI through a single validated IPC channel, runs
// the embedded terminals, and watches the open project folder so files written
// by the AI tools appear live.

import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { existsSync, watch, writeFileSync, type FSWatcher } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from '../scripts/lib/repo.mjs';
import { TOOLS, isTool, listProjects, projectsDir } from '../scripts/lib/core.ts';
import { createService, ServiceError, type Service } from './service.ts';
import { launchInTerminal, launchTool, openFolder } from './launcher.ts';
import { createTerminals, shellSpec } from './terminals.ts';

const DIST = dirname(fileURLToPath(import.meta.url)); // app/dist-electron
const UI = join(DIST, '..', 'dist'); // app/dist, inside the app (not the framework folder)
const ICON = join(UI, 'icon.png');
// The tool runner must be a real file on disk: in the installer it is unpacked from app.asar.
process.env.QA_RUN_TOOL = join(DIST, 'run-tool.mjs').replace(`app.asar${sep}`, `app.asar.unpacked${sep}`);

const terminals = createTerminals((channel, id, payload) => win?.webContents.send(channel, id, payload));

const service = createService(ROOT, {
  // Terminal tools open in a tab of the app; editors, or no node-pty, use the external launcher.
  launch: (tool, prompt, root) => (terminals.available() && !TOOLS[tool].clipboard
    ? launchInTerminal(tool, prompt, root, terminals.prepare) : launchTool(tool, prompt, root)),
  openFolder,
  openPath: (file) => { void shell.openPath(file); },
  trash: (path) => shell.trashItem(path),
  pickFolder: async () => {
    if (!win) return null;
    const r = await dialog.showOpenDialog(win, { title: 'Link a folder to this project', properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0] ?? null;
  },
});
const METHODS = new Set(Object.keys(service));

let win: BrowserWindow | null = null;
let watcher: FSWatcher | null = null;

// Only our own UI (loaded from app/dist) may call the service.
function trusted(event: IpcMainInvokeEvent | IpcMainEvent): boolean {
  return Boolean(event.senderFrame?.url.startsWith('file://')) && event.sender === win?.webContents;
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Quality Agents',
    icon: existsSync(ICON) ? ICON : undefined,
    backgroundColor: "#1c1b19",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(DIST, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
    },
  });
  win.once('ready-to-show', () => win?.show());
  // QA_OPEN_PROJECT opens a project directly, QA_OPEN_VIEW=library|launch the agent library or the launch wizard (used by checks and shortcuts).
  const query: Record<string, string> = {};
  if (process.env.QA_OPEN_PROJECT) query.project = process.env.QA_OPEN_PROJECT;
  if (['library', 'launch'].includes(process.env.QA_OPEN_VIEW ?? '')) query.view = process.env.QA_OPEN_VIEW as string;
  void win.loadFile(join(UI, 'index.html'), { query });

  // Visual check for development: QA_SCREENSHOT=<file.png> saves the window and quits.
  const shot = process.env.QA_SCREENSHOT;
  if (shot) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        void win?.webContents.capturePage().then((image) => {
          writeFileSync(shot, image.toPNG());
          app.quit();
        });
      }, Number(process.env.QA_SCREENSHOT_DELAY ?? 1500));
    });
  }

  // The UI never navigates away or opens windows; web links go to the browser.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => { win = null; watcher?.close(); watcher = null; terminals.killAll(); });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setName('Quality Agents');
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, done) => done(false));

    ipcMain.handle('qa:call', async (event, method: unknown, args: unknown) => {
      if (!trusted(event)) return { ok: false, error: 'Untrusted caller.' };
      if (typeof method !== 'string' || !METHODS.has(method)) return { ok: false, error: 'Unknown action.' };
      try {
        const fn = service[method as keyof Service] as (...a: unknown[]) => unknown;
        return { ok: true, value: await fn(...(Array.isArray(args) ? args : [])) };
      } catch (e) {
        const message = e instanceof ServiceError || e instanceof Error ? e.message : String(e);
        return { ok: false, error: message };
      }
    });

    // Watch one project at a time; changes are debounced and sent to the UI.
    ipcMain.handle('qa:watch', (event, project: unknown) => {
      if (!trusted(event)) return false;
      watcher?.close();
      watcher = null;
      if (typeof project !== 'string' || !listProjects(ROOT).includes(project)) return false;
      let timer: NodeJS.Timeout | null = null;
      try {
        watcher = watch(join(projectsDir(ROOT), project), { recursive: true }, () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => win?.webContents.send('qa:changed', project), 400);
        });
      } catch { return false; }
      return true;
    });

    // Embedded terminals: the UI only refers to terminals prepared here, by id.
    const isSize = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 1000;
    // New terminal tab: the user's shell (tool '') or a terminal AI tool started without a request.
    ipcMain.handle('qa:term-new', (event, tool: unknown) => {
      if (!trusted(event)) return { error: 'Untrusted caller.' };
      if (!terminals.available()) return { error: 'Terminals inside the app are not available on this computer (node-pty is not installed).' };
      if (tool === '') return { terminal: { id: terminals.prepare(shellSpec(ROOT)), title: 'Terminal' } };
      if (typeof tool !== 'string' || !isTool(tool) || !TOOLS[tool].command || TOOLS[tool].clipboard) return { error: 'Unknown tool.' };
      const r = launchInTerminal(tool, '', ROOT, terminals.prepare);
      return r.terminal ? { terminal: r.terminal } : { error: r.message };
    });
    ipcMain.handle('qa:term-start', (event, id: unknown, cols: unknown, rows: unknown) => {
      if (!trusted(event) || typeof id !== 'string' || !isSize(cols) || !isSize(rows)) return 'Invalid terminal.';
      return terminals.start(id, cols, rows);
    });
    ipcMain.on('qa:term-input', (event, id: unknown, data: unknown) => {
      if (trusted(event) && typeof id === 'string' && typeof data === 'string' && data.length <= 1_000_000) terminals.write(id, data);
    });
    ipcMain.on('qa:term-resize', (event, id: unknown, cols: unknown, rows: unknown) => {
      if (trusted(event) && typeof id === 'string' && isSize(cols) && isSize(rows)) terminals.resize(id, cols, rows);
    });
    ipcMain.on('qa:term-kill', (event, id: unknown) => { if (trusted(event) && typeof id === 'string') terminals.kill(id); });

    ipcMain.handle('qa:open-link', (event, url: unknown) => {
      if (trusted(event) && typeof url === 'string' && /^https?:\/\//.test(url)) void shell.openExternal(url);
    });

    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
  // Programs in the terminal tabs never outlive the app, also when it is stopped by a signal.
  app.on('will-quit', () => terminals.killAll());
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(signal, () => app.quit());
}
