import fs from 'node:fs';
import path from 'node:path';
import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  nativeImage,
} from 'electron';
import log from 'electron-log';
import { menubar } from 'menubar';
import { APP_NAME, CAPTURE_SHORTCUT, WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';
import { captureScreen } from './capture';
import { closeSnapWindow, createSnapWindow } from './snap-window';

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

  // IPC handlers
  ipcMain.handle(EVENTS.APP_VERSION, () => app.getVersion());
  ipcMain.on(EVENTS.APP_QUIT, () => app.quit());
  ipcMain.on(EVENTS.WINDOW_HIDE, () => mb.hideWindow());

  // Snap IPC
  ipcMain.on(EVENTS.SNAP_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      closeSnapWindow(win.id);
    }
  });

  ipcMain.handle(EVENTS.SNAP_READ_IMAGE, (_event, filePath: string) => {
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });
}

function registerGlobalShortcut() {
  const registered = globalShortcut.register(CAPTURE_SHORTCUT, async () => {
    log.info('Capture shortcut triggered');
    const result = await captureScreen();
    if (result) {
      createSnapWindow(result);
    }
  });

  if (!registered) {
    log.error(`Failed to register global shortcut: ${CAPTURE_SHORTCUT}`);
  } else {
    log.info(`Global shortcut registered: ${CAPTURE_SHORTCUT}`);
  }
}

app.whenReady().then(createMenubar);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Don't quit when all windows are closed — menubar keeps the app alive
app.on('window-all-closed', () => {});
