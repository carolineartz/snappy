import fs from 'node:fs';
import path from 'node:path';
import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
} from 'electron';
import log from 'electron-log';
import { menubar } from 'menubar';
import { APP_NAME, CAPTURE_SHORTCUT, WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';
import { captureScreen } from './capture';
import {
  closeDatabase,
  deleteSnap,
  getAllSnaps,
  getSnap,
  initDatabase,
  insertSnap,
  updateSnap,
} from './database';
import {
  closeSnapWindow,
  createSnapWindow,
  getSnapIdForWindow,
  getSnapWindows,
  reopenSnapWindow,
} from './snap-window';

log.initialize();

const isDev = !!process.env.VITE_DEV_SERVER_URL;

function createTrayIcon(): Electron.NativeImage {
  const projectRoot = path.resolve(__dirname, '..');
  const iconPath = path.join(projectRoot, 'assets', 'tray-icon.png');

  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    log.warn(`Tray icon not found at ${iconPath}, using fallback`);
    const size = 22;
    const canvas = Buffer.alloc(size * size * 4, 0);

    for (let y = 4; y < 18; y++) {
      for (let x = 3; x < 19; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx + 3] = 200;
      }
    }
    for (let y = 8; y < 14; y++) {
      for (let x = 7; x < 15; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx + 3] = 0;
      }
    }

    icon = nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size,
    });
  }

  icon.setTemplateImage(true);
  return icon;
}

function createMenubar() {
  const icon = createTrayIcon();

  const mb = menubar({
    icon,
    tooltip: APP_NAME,
    preloadWindow: true,
    browserWindow: {
      ...WINDOW_CONFIG,
      show: false,
      skipTaskbar: true,
      alwaysOnTop: true, // Prevents menubar lib's auto-hide on blur
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

  mb.on('after-create-window', () => {
    if (isDev) {
      mb.window?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Custom tray hide logic:
  // - Interacting with snaps never hides the tray
  // - Only hides when focus goes to a non-app window
  mb.on('focus-lost', () => {
    const focusedWin = BrowserWindow.getFocusedWindow();
    const isSnapWindow =
      focusedWin &&
      Array.from(getSnapWindows().values()).some(
        (entry) => entry.win.id === focusedWin.id,
      );

    if (!isSnapWindow) {
      mb.hideWindow();
    }
  });

  mb.on('after-show', () => {
    mb.window?.webContents.send(EVENTS.SNAPS_UPDATED);
  });

  // Notify menubar renderer to refresh when it becomes visible
  mb.on('after-show', () => {
    mb.window?.webContents.send(EVENTS.SNAPS_UPDATED);
  });

  // IPC handlers — App
  ipcMain.handle(EVENTS.APP_VERSION, () => app.getVersion());
  ipcMain.on(EVENTS.APP_QUIT, () => app.quit());
  ipcMain.on(EVENTS.WINDOW_HIDE, () => mb.hideWindow());

  // IPC handlers — Snap window
  ipcMain.on(EVENTS.SNAP_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      closeSnapWindow(win.id);
    }
  });

  ipcMain.on(EVENTS.SNAP_MOVE, (event, dx: number, dy: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + dx), Math.round(y + dy));
    }
  });

  ipcMain.on(EVENTS.SNAP_SET_OPACITY, (event, opacity: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setOpacity(Math.max(0.05, Math.min(1, opacity)));
    }
  });

  ipcMain.on(EVENTS.SNAP_TOGGLE_SHADOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setHasShadow(!win.hasShadow());
    }
  });

  ipcMain.on(EVENTS.SNAP_CONTEXT_MENU, (event, filePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;

    const snapId = getSnapIdForWindow(win.id);
    const hasShadow = win.hasShadow();
    const menu = Menu.buildFromTemplate([
      {
        label: 'Copy Image',
        accelerator: 'CmdOrCtrl+C',
        click: () => {
          const image = nativeImage.createFromPath(filePath);
          if (!image.isEmpty()) {
            clipboard.writeImage(image);
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Pixel Perfect Mode',
        type: 'checkbox',
        checked: !hasShadow,
        click: () => {
          win.setHasShadow(!hasShadow);
        },
      },
      { type: 'separator' },
      {
        label: 'Close',
        click: () => {
          closeSnapWindow(win.id);
        },
      },
      {
        label: 'Delete',
        click: () => {
          closeSnapWindow(win.id);
          if (snapId) {
            const snap = getSnap(snapId);
            if (snap) {
              deleteSnapFiles(snap.filePath, snap.thumbPath);
              deleteSnap(snapId);
            }
          }
        },
      },
    ]);

    menu.popup({ window: win });
  });

  ipcMain.on(EVENTS.SNAP_COPY, (_event, filePath: string) => {
    const image = nativeImage.createFromPath(filePath);
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      log.info(`Snap copied to clipboard: ${filePath}`);
    }
  });

  ipcMain.handle(EVENTS.SNAP_READ_IMAGE, (_event, filePath: string) => {
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });

  // IPC handlers — Library
  ipcMain.handle(EVENTS.LIBRARY_GET_SNAPS, () => {
    return getAllSnaps();
  });

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
      // Close window if open
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
}

function deleteSnapFiles(filePath: string, thumbPath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  } catch (err) {
    log.warn('Failed to delete snap files:', err);
  }
}

function registerGlobalShortcut() {
  const registered = globalShortcut.register(CAPTURE_SHORTCUT, async () => {
    log.info('Capture shortcut triggered');
    const result = await captureScreen();
    if (result) {
      // Save to database
      insertSnap({
        id: result.id,
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
      });

      createSnapWindow(result);
    }
  });

  if (!registered) {
    log.error(`Failed to register global shortcut: ${CAPTURE_SHORTCUT}`);
  } else {
    log.info(`Global shortcut registered: ${CAPTURE_SHORTCUT}`);
  }
}

app.whenReady().then(() => {
  initDatabase();
  createMenubar();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  closeDatabase();
});

// Don't quit when all windows are closed — menubar keeps the app alive
app.on('window-all-closed', () => {});
