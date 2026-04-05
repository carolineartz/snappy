import path from 'node:path';
import { app, ipcMain, nativeImage } from 'electron';
import log from 'electron-log';
import { menubar } from 'menubar';
import { APP_NAME, WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';

log.initialize();

const isMac = process.platform === 'darwin';
const isDev = !!process.env.VITE_DEV_SERVER_URL;

function createTrayIcon(): Electron.NativeImage {
  // In dev, assets are at project root; in production, relative to build/
  const projectRoot = isDev
    ? path.resolve(__dirname, '..')
    : path.resolve(__dirname, '..');
  const iconPath = path.join(projectRoot, 'assets', 'tray-icon.png');

  let icon = nativeImage.createFromPath(iconPath);

  // If icon failed to load, create a simple programmatic icon
  if (icon.isEmpty()) {
    log.warn(`Tray icon not found at ${iconPath}, using fallback`);
    // Create a 22x22 icon with a simple camera shape
    const size = 22;
    const canvas = Buffer.alloc(size * size * 4, 0);

    // Draw a filled square as a simple placeholder
    for (let y = 4; y < 18; y++) {
      for (let x = 3; x < 19; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx] = 0; // R
        canvas[idx + 1] = 0; // G
        canvas[idx + 2] = 0; // B
        canvas[idx + 3] = 200; // A
      }
    }

    // Cut out center for a "viewfinder" look
    for (let y = 8; y < 14; y++) {
      for (let x = 7; x < 15; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx + 3] = 0; // transparent center
      }
    }

    icon = nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size,
    });
  }

  if (isMac) {
    icon.setTemplateImage(true);
  }

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

    if (isMac) {
      app.dock?.hide();
    }
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
}

app.whenReady().then(createMenubar);

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
