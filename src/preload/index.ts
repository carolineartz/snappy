import { contextBridge, ipcRenderer } from 'electron';
import { EVENTS } from '../shared/events';

const snappyAPI = {
  app: {
    quit: () => ipcRenderer.send(EVENTS.APP_QUIT),
    version: () => ipcRenderer.invoke(EVENTS.APP_VERSION) as Promise<string>,
    hideWindow: () => ipcRenderer.send(EVENTS.WINDOW_HIDE),
  },
  snap: {
    close: () => ipcRenderer.send(EVENTS.SNAP_CLOSE),
    move: (dx: number, dy: number) =>
      ipcRenderer.send(EVENTS.SNAP_MOVE, dx, dy),
    setOpacity: (opacity: number) =>
      ipcRenderer.send(EVENTS.SNAP_SET_OPACITY, opacity),
    readImage: (filePath: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_READ_IMAGE, filePath) as Promise<string>,
  },
};

contextBridge.exposeInMainWorld('snappy', snappyAPI);

export type SnappyAPI = typeof snappyAPI;
