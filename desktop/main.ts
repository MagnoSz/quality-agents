// Electron main process of the Quality Agents desktop app. Opens one window,
// exposes the service to the UI through a single validated IPC channel, and
// watches the open project folder so files written by the AI tools appear live.

import { app, BrowserWindow, ipcMain, Menu, session, shell, type IpcMainInvokeEvent } from 'electron';
import { existsSync, watch, writeFileSync, type FSWatcher } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from '../scripts/lib/repo.mjs';
import { listProjects, projectsDir } from '../scripts/lib/core.ts';
import { createService, ServiceError, type Service } from './service.ts';
import { launchTool, openFolder } from './launcher.ts';

const DIST = dirname(fileURLToPath(import.meta.url)); // app/dist-electron
const UI = join(DIST, '..', 'dist'); // app/dist, inside the app (not the framework folder)
const ICON = join(UI, 'icon.png');
// The tool runner must be a real file on disk: in the installer it is unpacked from app.asar.
process.env.QA_RUN_TOOL = join(DIST, 'run-tool.mjs').replace(`app.asar${sep}`, `app.asar.unpacked${sep}`);

const service = createService(ROOT, {
  launch: launchTool,
  openFolder,
  openPath: (file) => { void shell.openPath(file); },
});
const METHODS = new Set(Object.keys(service));

let win: BrowserWindow | null = null;
let watcher: FSWatcher | null = null;

// Only our own UI (loaded from app/dist) may call the service.
function trusted(event: IpcMainInvokeEvent): boolean {
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
  // QA_OPEN_PROJECT opens a project directly (used by checks and shortcuts).
  const project = process.env.QA_OPEN_PROJECT;
  void win.loadFile(join(UI, 'index.html'), project ? { query: { project } } : undefined);

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
  win.on('closed', () => { win = null; watcher?.close(); watcher = null; });
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

    ipcMain.handle('qa:call', (event, method: unknown, args: unknown) => {
      if (!trusted(event)) return { ok: false, error: 'Untrusted caller.' };
      if (typeof method !== 'string' || !METHODS.has(method)) return { ok: false, error: 'Unknown action.' };
      try {
        const fn = service[method as keyof Service] as (...a: unknown[]) => unknown;
        return { ok: true, value: fn(...(Array.isArray(args) ? args : [])) };
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

    ipcMain.handle('qa:open-link', (event, url: unknown) => {
      if (trusted(event) && typeof url === 'string' && /^https?:\/\//.test(url)) void shell.openExternal(url);
    });

    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
