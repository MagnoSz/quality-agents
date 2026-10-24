// Bridge between the UI and the main process. The UI gets only these
// functions; every call is validated again in main.ts / service.ts.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('qa', {
  call: (method: string, ...args: unknown[]) => ipcRenderer.invoke('qa:call', method, args),
  watch: (project: string) => ipcRenderer.invoke('qa:watch', project),
  onChanged: (callback: (project: string) => void) => {
    const listener = (_e: IpcRendererEvent, project: string) => callback(project);
    ipcRenderer.on('qa:changed', listener);
    return () => { ipcRenderer.removeListener('qa:changed', listener); };
  },
  openLink: (url: string) => ipcRenderer.invoke('qa:open-link', url),
  term: {
    create: (tool: string) => ipcRenderer.invoke('qa:term-new', tool),
    start: (id: string, cols: number, rows: number) => ipcRenderer.invoke('qa:term-start', id, cols, rows),
    input: (id: string, data: string) => ipcRenderer.send('qa:term-input', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send('qa:term-resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.send('qa:term-kill', id),
    on: (event: 'data' | 'exit', callback: (id: string, payload: string | number) => void) => {
      const listener = (_e: IpcRendererEvent, id: string, payload: string | number) => callback(id, payload);
      ipcRenderer.on(`qa:term-${event}`, listener);
      return () => { ipcRenderer.removeListener(`qa:term-${event}`, listener); };
    },
  },
});
