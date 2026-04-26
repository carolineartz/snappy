import path from 'node:path';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

let menuWindow: BrowserWindow | null = null;
// Maps menu window → parent snap window for action forwarding
let parentSnapWindowId: number | null = null;

const MENU_WIDTH = 300;
const MENU_HEIGHT = 340;

export interface MenuOpenParams {
  screenX: number;
  screenY: number;
  parentWinId: number;
  activeTool: string;
  activeColor: string;
  activeStrokeWidth: number;
  hasShadow: boolean;
  hasAnnotations: boolean;
}

export function getParentSnapWindowId(): number | null {
  return parentSnapWindowId;
}

export function openMenuWindow(params: MenuOpenParams): BrowserWindow {
  // Close any existing menu
  closeMenuWindow();

  parentSnapWindowId = params.parentWinId;

  const win = new BrowserWindow({
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
    x: params.screenX,
    y: params.screenY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: true,
    resizable: false,
    skipTaskbar: true,
    focusable: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const queryParams = new URLSearchParams({
    tool: params.activeTool,
    color: params.activeColor,
    stroke: String(params.activeStrokeWidth),
    hasShadow: params.hasShadow ? '1' : '0',
    hasAnnotations: params.hasAnnotations ? '1' : '0',
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(
      `${process.env.ELECTRON_RENDERER_URL}/menu/index.html?${queryParams}`,
    );
  } else {
    win.loadFile(path.join(__dirname, 'menu', 'index.html'), {
      search: queryParams.toString(),
    });
  }

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    menuWindow = null;
    parentSnapWindowId = null;
  });

  menuWindow = win;
  log.info(`Menu window opened at (${params.screenX}, ${params.screenY})`);
  return win;
}

export function closeMenuWindow(): void {
  if (menuWindow && !menuWindow.isDestroyed()) {
    menuWindow.close();
  }
  menuWindow = null;
  parentSnapWindowId = null;
}

export function getMenuWindow(): BrowserWindow | null {
  return menuWindow;
}
