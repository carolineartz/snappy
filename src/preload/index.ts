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
    copy: (filePath: string) => ipcRenderer.send(EVENTS.SNAP_COPY, filePath),
    copyComposite: (dataUrl: string) =>
      ipcRenderer.send(EVENTS.SNAP_COPY_COMPOSITE, dataUrl),
    toggleShadow: () => ipcRenderer.send(EVENTS.SNAP_TOGGLE_SHADOW),
    readImage: (filePath: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_READ_IMAGE, filePath) as Promise<string>,

    // Annotations
    saveAnnotations: (snapId: string, json: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_SAVE_ANNOTATIONS, snapId, json),
    getAnnotations: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_GET_ANNOTATIONS, snapId) as Promise<
        string | null
      >,
    duplicate: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_DUPLICATE, snapId),
    regenerateThumbnail: (snapId: string, dataUrl: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_REGENERATE_THUMBNAIL, snapId, dataUrl),
  },
  library: {
    getSnaps: () => ipcRenderer.invoke(EVENTS.LIBRARY_GET_SNAPS),
    openSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_OPEN_SNAP, snapId),
    deleteSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_DELETE_SNAP, snapId),
    readThumbnail: (thumbPath: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_READ_THUMBNAIL, thumbPath) as Promise<
        string | null
      >,
    onSnapsUpdated: (callback: () => void) => {
      ipcRenderer.on(EVENTS.SNAPS_UPDATED, callback);
    },
  },
};

contextBridge.exposeInMainWorld('snappy', snappyAPI);

export type SnappyAPI = typeof snappyAPI;
