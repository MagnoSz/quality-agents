// Bridge between the UI and the main process. The UI gets only these four
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
});
