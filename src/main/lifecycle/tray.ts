import path from 'node:path';
import { app, BrowserWindow, globalShortcut } from 'electron';
import log from 'electron-log';
import { menubar } from 'menubar';
import {
  APP_NAME,
  CAPTURE_SHORTCUT,
  OPEN_LIBRARY_SHORTCUT,
  WINDOW_CONFIG,
} from '../../shared/constants';
import { EVENTS } from '../../shared/events';
import { notifyBrowserUpdated, openBrowserWindow } from '../browser-window';
import { captureScreen } from '../capture';
import { createTrayIcon } from '../config';
import { insertSnap } from '../database';
import { registerAllHandlers } from '../handlers';
import { getMenuWindow } from '../menu-window';
import {
  createSnapWindow,
  getSnapWindows,
  setOnSnapWindowClosed,
} from '../snap-window';
import { runVisionForSnap } from '../vision';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

let notifyTrayUpdated: () => void = () => {};

export function getNotifyTrayUpdated(): () => void {
  return notifyTrayUpdated;
}

export function registerGlobalShortcut(): void {
  const registered = globalShortcut.register(CAPTURE_SHORTCUT, async () => {
    log.info('Capture shortcut triggered');
    const result = await captureScreen();
    if (result) {
      insertSnap({
        id: result.id,
        name: null,
        filePath: result.filePath,
        thumbPath: result.thumbPath,
        sourceApp: result.sourceApp,
        width: result.width,
        height: result.height,
        posX: null,
        posY: null,
        opacity: 1.0,
        hasShadow: 1,
        isOpen: 1,
        createdAt: result.createdAt,
        annotations: null,
        thumbnailUpdatedAt: result.createdAt,
        ocrText: null,
        classificationLabels: null,
        visualEmbedding: null,
      });

      createSnapWindow(result);
      notifyTrayUpdated();

      // Fire-and-forget vision pipeline — OCR + classification + CLIP.
      runVisionForSnap(result.id, result.filePath)
        .then(() => notifyTrayUpdated())
        .catch((err) => log.warn(`Vision failed for ${result.id}: ${err}`));
    }
  });

  if (!registered) {
    log.error(`Failed to register global shortcut: ${CAPTURE_SHORTCUT}`);
  } else {
    log.info(`Global shortcut registered: ${CAPTURE_SHORTCUT}`);
  }

  const libraryRegistered = globalShortcut.register(
    OPEN_LIBRARY_SHORTCUT,
    () => {
      log.info('Open-library shortcut triggered');
      openBrowserWindow();
    },
  );

  if (!libraryRegistered) {
    log.error(`Failed to register global shortcut: ${OPEN_LIBRARY_SHORTCUT}`);
  } else {
    log.info(`Global shortcut registered: ${OPEN_LIBRARY_SHORTCUT}`);
  }
}

export function createMenubar(): void {
  const icon = createTrayIcon();

  const mb = menubar({
    icon,
    tooltip: APP_NAME,
    preloadWindow: true,
    browserWindow: {
      ...WINDOW_CONFIG,
      show: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    },
    index: isDev
      ? process.env.VITE_DEV_SERVER_URL
      : `file://${path.join(__dirname, 'index.html')}`,
  });

  mb.on('ready', () => {
    log.info(`${APP_NAME} is ready`);
    app.dock?.hide();
    registerGlobalShortcut();
  });

  // Tray refresh
  notifyTrayUpdated = () => {
    mb.window?.webContents.send(EVENTS.SNAPS_UPDATED);
    notifyBrowserUpdated();
  };

  setOnSnapWindowClosed(notifyTrayUpdated);

  // Custom tray hide logic — tray stays open when interacting with
  // floating snaps or the annotation menu, but CLOSES when focus goes
  // to the library browser window (or anything outside the app).
  function isSnapWindow(win: BrowserWindow | null): boolean {
    if (!win) return false;
    if (win.id === mb.window?.id) return true;
    if (win.id === getMenuWindow()?.id) return true;
    return Array.from(getSnapWindows().values()).some(
      (entry) => entry.win.id === win.id,
    );
  }

  function hideTrayIfFocusLeft(): void {
    setTimeout(() => {
      const focused = BrowserWindow.getFocusedWindow();
      if (!isSnapWindow(focused) && mb.window?.isVisible()) {
        mb.hideWindow();
      }
    }, 50);
  }

  mb.on('focus-lost', hideTrayIfFocusLeft);

  app.on('browser-window-blur', () => {
    if (mb.window?.isVisible()) {
      hideTrayIfFocusLeft();
    }
  });

  mb.on('after-show', notifyTrayUpdated);

  // Register all IPC handlers, passing the notifyTrayUpdated callback
  registerAllHandlers(mb, notifyTrayUpdated);
}
