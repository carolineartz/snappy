import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { ipcMain } from 'electron';
import { EVENTS } from '../../shared/events';
import { openBrowserWindow } from '../browser-window';
import {
  addTagToSnap,
  deleteSnap,
  getAllSnaps,
  getAllTagsWithUsageCount,
  getSnap,
  getTagNamesForSnap,
  removeTagFromSnap,
  updateSnap,
} from '../database';
import {
  closeSnapWindow,
  getSnapWindows,
  reopenSnapWindow,
} from '../snap-window';
import { deleteSnapFiles, findIcnsPath, handleDuplicate } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- no types available
const icns = require('electron-icns-ex');

const appIconCache = new Map<string, string | null>();

export function registerLibraryHandlers(notifyTrayUpdated: () => void): void {
  // Duplicate
  ipcMain.handle(EVENTS.SNAP_DUPLICATE, (_event, snapId: string) => {
    handleDuplicate(snapId);
  });

  // Library queries
  ipcMain.handle(EVENTS.LIBRARY_GET_SNAPS, () => {
    return getAllSnaps();
  });

  ipcMain.handle(
    EVENTS.LIBRARY_RENAME_SNAP,
    (_event, snapId: string, name: string | null) => {
      updateSnap(snapId, { name: name || null });
      notifyTrayUpdated();
    },
  );

  // Tag handlers
  ipcMain.handle(EVENTS.TAG_ADD, (_event, snapId: string, tag: string) => {
    addTagToSnap(snapId, tag.trim());
    notifyTrayUpdated();
  });

  ipcMain.handle(EVENTS.TAG_REMOVE, (_event, snapId: string, tag: string) => {
    removeTagFromSnap(snapId, tag);
    notifyTrayUpdated();
  });

  ipcMain.handle(EVENTS.TAG_GET_FOR_SNAP, (_event, snapId: string) => {
    return getTagNamesForSnap(snapId);
  });

  ipcMain.handle(EVENTS.TAG_GET_ALL, () => {
    return getAllTagsWithUsageCount();
  });

  // Open / delete
  ipcMain.handle(EVENTS.LIBRARY_OPEN_SNAP, (_event, snapId: string) => {
    const snap = getSnap(snapId);
    if (snap) {
      reopenSnapWindow(snap);
      updateSnap(snapId, { isOpen: 1 });
    }
  });

  ipcMain.handle(EVENTS.LIBRARY_DELETE_SNAP, (_event, snapId: string) => {
    const snap = getSnap(snapId);
    if (snap) {
      for (const [winId, entry] of getSnapWindows()) {
        if (entry.snapId === snapId) {
          closeSnapWindow(winId);
          break;
        }
      }
      deleteSnapFiles(snap.filePath, snap.thumbPath);
      deleteSnap(snapId);
    }
  });

  ipcMain.handle(EVENTS.LIBRARY_READ_THUMBNAIL, (_event, thumbPath: string) => {
    if (!fs.existsSync(thumbPath)) return null;
    const buffer = fs.readFileSync(thumbPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });

  // Browser window
  ipcMain.on(EVENTS.BROWSER_OPEN, () => {
    openBrowserWindow();
  });

  // App icon retrieval — reads .icns files directly since
  // app.getFileIcon doesn't return proper icons on macOS
  ipcMain.handle(EVENTS.GET_APP_ICON, (_event, appName: string) => {
    if (appIconCache.has(appName)) return appIconCache.get(appName);

    try {
      const appPath = execSync(
        `osascript -e 'POSIX path of (path to application "${appName}")'`,
        { encoding: 'utf-8', timeout: 3000 },
      ).trim();

      if (!appPath) {
        appIconCache.set(appName, null);
        return null;
      }

      const iconPath = findIcnsPath(appPath);
      if (!iconPath) {
        appIconCache.set(appName, null);
        return null;
      }

      const dataUrl = icns.parseIcnsToBase64Sync(iconPath) as string;
      appIconCache.set(appName, dataUrl);
      return dataUrl;
    } catch {
      appIconCache.set(appName, null);
      return null;
    }
  });
}
