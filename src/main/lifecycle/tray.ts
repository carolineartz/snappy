import path from 'node:path';
import { app, BrowserWindow, globalShortcut, Tray } from 'electron';
import log from 'electron-log';
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

const isDev = !!process.env.ELECTRON_RENDERER_URL;

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

export function createTrayApp(): void {
  const icon = createTrayIcon();

  const tray = new Tray(icon);
  tray.setToolTip(APP_NAME);

  const win = new BrowserWindow({
    ...WINDOW_CONFIG,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Position the window centered horizontally below the tray icon.
  function positionWindowUnderTray(): void {
    const trayBounds = tray.getBounds();
    const winBounds = win.getBounds();
    const x = Math.round(
      trayBounds.x + trayBounds.width / 2 - winBounds.width / 2,
    );
    const y = Math.round(trayBounds.y + trayBounds.height + 4);
    win.setPosition(x, y, false);
  }

  function showWindow(): void {
    positionWindowUnderTray();
    win.show();
    win.focus();
    notifyTrayUpdated();
  }

  function toggleWindow(): void {
    if (win.isVisible()) {
      win.hide();
    } else {
      showWindow();
    }
  }

  tray.on('click', toggleWindow);
  tray.on('right-click', toggleWindow);

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/index.html`);
  } else {
    win.loadFile(path.join(__dirname, 'index.html'));
  }

  log.info(`${APP_NAME} is ready`);
  app.dock?.hide();
  registerGlobalShortcut();

  notifyTrayUpdated = () => {
    win.webContents.send(EVENTS.SNAPS_UPDATED);
    notifyBrowserUpdated();
  };

  setOnSnapWindowClosed(notifyTrayUpdated);

  // Custom tray hide logic — tray stays open when interacting with
  // floating snaps or the annotation menu, but CLOSES when focus goes
  // to the library browser window (or anything outside the app).
  function isSnapWindow(focused: BrowserWindow | null): boolean {
    if (!focused) return false;
    if (focused.id === win.id) return true;
    if (focused.id === getMenuWindow()?.id) return true;
    return Array.from(getSnapWindows().values()).some(
      (entry) => entry.win.id === focused.id,
    );
  }

  function hideTrayIfFocusLeft(): void {
    setTimeout(() => {
      const focused = BrowserWindow.getFocusedWindow();
      if (!isSnapWindow(focused) && win.isVisible()) {
        win.hide();
      }
    }, 50);
  }

  win.on('blur', hideTrayIfFocusLeft);

  app.on('browser-window-blur', () => {
    if (win.isVisible()) {
      hideTrayIfFocusLeft();
    }
  });

  registerAllHandlers(win, notifyTrayUpdated);
}
