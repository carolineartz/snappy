import { contextBridge, ipcRenderer } from 'electron';
import type { AnnotationTool } from '../shared/annotation-types';
import { EVENTS } from '../shared/events';

interface MenuOpenParams {
  screenX: number;
  screenY: number;
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  hasShadow: boolean;
  hasAnnotations: boolean;
}

interface MenuActionPayload {
  type:
    | 'setTool'
    | 'setColor'
    | 'setStroke'
    | 'copy'
    | 'toggleShadow'
    | 'close'
    | 'delete'
    | 'duplicate'
    | 'revert';
  value?: unknown;
}

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

    // Context menu popup
    openMenu: (params: MenuOpenParams) =>
      ipcRenderer.send(EVENTS.MENU_OPEN, params),
    onMenuAction: (callback: (payload: MenuActionPayload) => void) => {
      ipcRenderer.on(EVENTS.MENU_ACTION, (_e, payload: MenuActionPayload) =>
        callback(payload),
      );
    },
  },
  menu: {
    dismiss: () => ipcRenderer.send(EVENTS.MENU_DISMISS),
    action: (type: MenuActionPayload['type'], value?: unknown) =>
      ipcRenderer.send(EVENTS.MENU_ACTION, { type, value }),
  },
  library: {
    getSnaps: () => ipcRenderer.invoke(EVENTS.LIBRARY_GET_SNAPS),
    openSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_OPEN_SNAP, snapId),
    deleteSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_DELETE_SNAP, snapId),
    renameSnap: (snapId: string, name: string | null) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_RENAME_SNAP, snapId, name),
    readThumbnail: (thumbPath: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_READ_THUMBNAIL, thumbPath) as Promise<
        string | null
      >,
    onSnapsUpdated: (callback: () => void) => {
      ipcRenderer.on(EVENTS.SNAPS_UPDATED, callback);
    },
    openBrowserWindow: () => ipcRenderer.send(EVENTS.BROWSER_OPEN),
    addTag: (snapId: string, tag: string) =>
      ipcRenderer.invoke(EVENTS.TAG_ADD, snapId, tag),
    removeTag: (snapId: string, tag: string) =>
      ipcRenderer.invoke(EVENTS.TAG_REMOVE, snapId, tag),
    getTagsForSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.TAG_GET_FOR_SNAP, snapId) as Promise<string[]>,
    getAllTags: () =>
      ipcRenderer.invoke(EVENTS.TAG_GET_ALL) as Promise<
        { tag: string; count: number }[]
      >,
    getAppIcon: (appName: string) =>
      ipcRenderer.invoke(EVENTS.GET_APP_ICON, appName) as Promise<
        string | null
      >,
  },
};

contextBridge.exposeInMainWorld('snappy', snappyAPI);

export type SnappyAPI = typeof snappyAPI;
