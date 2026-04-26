import path from 'node:path';
import { BrowserWindow } from 'electron';
import log from 'electron-log';
import { BROWSER_WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

let browserWindow: BrowserWindow | null = null;

export function openBrowserWindow(): BrowserWindow {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.focus();
    return browserWindow;
  }

  // macOS Tahoe / Liquid Glass-style library window.
  //
  // - `titleBarStyle: 'hiddenInset'` hides the title bar but keeps native
  //   traffic lights (with correct hover / fullscreen / disabled states
  //   and a built-in drag region across the top strip).
  // - `frame: false` + `transparent: true` + `backgroundColor: '#00000000'`
  //   let the renderer own the full window shape. The CSS on
  //   html.library-window draws our rounded / corner-smoothed clip.
  // - `vibrancy: 'sidebar'` + `visualEffectState: 'active'` paints real
  //   macOS sidebar material into the transparent regions, so the
  //   sidebar column reads as true glass. The main column blocks
  //   vibrancy with its own opaque background.
  // - `roundedCorners: true` lets AppKit clip the whole window (including
  //   vibrancy) into the system's default rounded shape. On macOS 26
  //   Tahoe this is the larger Liquid-Glass-style radius (~22px). We
  //   defer to AppKit instead of CSS so the vibrancy material gets
  //   clipped along with the renderer content; CSS `border-radius` can
  //   only clip the renderer, leaving vibrancy painting flat corners.
  const win = new BrowserWindow({
    ...BROWSER_WINDOW_CONFIG,
    title: 'Snap Library',
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    hasShadow: true,
    roundedCorners: true,
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/library/index.html`);
  } else {
    win.loadFile(path.join(__dirname, 'library', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    browserWindow = null;
  });

  browserWindow = win;
  log.info('Browser window opened');
  return win;
}

export function closeBrowserWindow(): void {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.close();
  }
  browserWindow = null;
}

export function getBrowserWindow(): BrowserWindow | null {
  return browserWindow;
}

export function notifyBrowserUpdated(): void {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.webContents.send(EVENTS.SNAPS_UPDATED);
  }
}
