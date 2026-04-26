import path from 'node:path';
import { BrowserWindow, screen } from 'electron';
import log from 'electron-log';
import type { CaptureResult } from './capture';
import type { SnapRecord } from './database';
import { updateSnap } from './database';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

// Map window ID → snap ID for state persistence
const snapWindows = new Map<number, { win: BrowserWindow; snapId: string }>();

// Called after a snap window closes so the tray can refresh
let onSnapWindowClosed: (() => void) | null = null;

export function setOnSnapWindowClosed(callback: () => void): void {
  onSnapWindowClosed = callback;
}

/**
 * Calculate window position near the capture area.
 * The cursor is at the bottom-right of the drag selection, so position
 * the window at (cursor - windowSize) to align with where the content was.
 */
function calculatePosition(
  cursorX: number,
  cursorY: number,
  windowWidth: number,
  windowHeight: number,
): { x: number; y: number } {
  let x = cursorX - windowWidth;
  let y = cursorY - windowHeight;

  const display = screen.getDisplayNearestPoint({ x: cursorX, y: cursorY });
  const { workArea } = display;

  // Clamp to screen bounds
  if (x + windowWidth > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - windowWidth;
  }
  if (y + windowHeight > workArea.y + workArea.height) {
    y = workArea.y + workArea.height - windowHeight;
  }
  if (x < workArea.x) {
    x = workArea.x;
  }
  if (y < workArea.y) {
    y = workArea.y;
  }

  return { x, y };
}

function computeWindowSize(
  width: number,
  height: number,
  scaleFactor: number,
): { winWidth: number; winHeight: number } {
  const maxDim = 800;
  let winWidth = Math.round(width / scaleFactor);
  let winHeight = Math.round(height / scaleFactor);
  if (winWidth > maxDim || winHeight > maxDim) {
    const scale = maxDim / Math.max(winWidth, winHeight);
    winWidth = Math.round(winWidth * scale);
    winHeight = Math.round(winHeight * scale);
  }
  return { winWidth, winHeight };
}

function createWindow(
  snapId: string,
  filePath: string,
  winWidth: number,
  winHeight: number,
  x: number,
  y: number,
  opacity: number,
  hasShadow: boolean,
): BrowserWindow {
  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow,
    resizable: true,
    skipTaskbar: true,
    opacity,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setAspectRatio(winWidth / winHeight);

  const params = new URLSearchParams({ filePath, snapId });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(
      `${process.env.ELECTRON_RENDERER_URL}/snap/index.html?${params}`,
    );
  } else {
    win.loadFile(path.join(__dirname, 'snap', 'index.html'), {
      search: params.toString(),
    });
  }

  snapWindows.set(win.id, { win, snapId });

  // Save state in 'close' (before destroy) so getPosition() etc. still work
  win.on('close', () => {
    const [posX, posY] = win.getPosition();
    updateSnap(snapId, {
      posX,
      posY,
      opacity: win.getOpacity(),
      hasShadow: win.hasShadow() ? 1 : 0,
      isOpen: 0,
    });
  });

  win.on('closed', () => {
    snapWindows.delete(win.id);
    onSnapWindowClosed?.();
  });

  return win;
}

/**
 * Creates a new floating snap window from a fresh capture.
 */
export function createSnapWindow(capture: CaptureResult): BrowserWindow {
  const display = screen.getDisplayNearestPoint({
    x: capture.cursorX,
    y: capture.cursorY,
  });
  const scaleFactor = display.scaleFactor || 1;
  const { winWidth, winHeight } = computeWindowSize(
    capture.width,
    capture.height,
    scaleFactor,
  );

  const { x, y } = calculatePosition(
    capture.cursorX,
    capture.cursorY,
    winWidth,
    winHeight,
  );

  const win = createWindow(
    capture.id,
    capture.filePath,
    winWidth,
    winHeight,
    x,
    y,
    1.0,
    true,
  );

  log.info(`Snap window created: ${winWidth}x${winHeight} at (${x}, ${y})`);
  return win;
}

/**
 * Reopens a snap from the library at its last known position.
 */
export function reopenSnapWindow(snap: SnapRecord): BrowserWindow {
  // Check if already open
  for (const [, entry] of snapWindows) {
    if (entry.snapId === snap.id && !entry.win.isDestroyed()) {
      entry.win.focus();
      return entry.win;
    }
  }

  const display = screen.getPrimaryDisplay();
  const scaleFactor = display.scaleFactor || 1;
  const { winWidth, winHeight } = computeWindowSize(
    snap.width,
    snap.height,
    scaleFactor,
  );

  const x = snap.posX ?? Math.round(display.workArea.width / 2 - winWidth / 2);
  const y =
    snap.posY ?? Math.round(display.workArea.height / 2 - winHeight / 2);

  const win = createWindow(
    snap.id,
    snap.filePath,
    winWidth,
    winHeight,
    x,
    y,
    snap.opacity,
    snap.hasShadow === 1,
  );

  updateSnap(snap.id, { isOpen: 1 });
  log.info(`Snap window reopened: ${snap.id} at (${x}, ${y})`);
  return win;
}

export function closeSnapWindow(windowId: number): void {
  const entry = snapWindows.get(windowId);
  if (entry && !entry.win.isDestroyed()) {
    entry.win.close();
  }
}

export function getSnapIdForWindow(windowId: number): string | undefined {
  return snapWindows.get(windowId)?.snapId;
}

export function getSnapWindows(): Map<
  number,
  { win: BrowserWindow; snapId: string }
> {
  return snapWindows;
}
