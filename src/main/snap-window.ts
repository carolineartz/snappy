import path from 'node:path';
import { BrowserWindow, nativeImage, screen } from 'electron';
import log from 'electron-log';
import type { CaptureResult } from './capture';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

// Track all open snap windows
const snapWindows = new Map<number, BrowserWindow>();

/**
 * Get the image dimensions using nativeImage.
 */
function getImageDimensions(filePath: string): {
  width: number;
  height: number;
} {
  const image = nativeImage.createFromPath(filePath);
  const size = image.getSize();
  return { width: size.width, height: size.height };
}

/**
 * Calculate window position near the cursor, keeping it on screen.
 */
function calculatePosition(
  cursorX: number,
  cursorY: number,
  windowWidth: number,
  windowHeight: number,
): { x: number; y: number } {
  const offset = 20;
  let x = cursorX + offset;
  let y = cursorY + offset;

  const display = screen.getDisplayNearestPoint({ x: cursorX, y: cursorY });
  const { workArea } = display;

  if (x + windowWidth > workArea.x + workArea.width) {
    x = cursorX - windowWidth - offset;
  }
  if (y + windowHeight > workArea.y + workArea.height) {
    y = cursorY - windowHeight - offset;
  }
  if (x < workArea.x) {
    x = workArea.x;
  }
  if (y < workArea.y) {
    y = workArea.y;
  }

  return { x, y };
}

/**
 * Creates a new floating snap window displaying the captured screenshot.
 */
export function createSnapWindow(capture: CaptureResult): BrowserWindow {
  const { width, height } = getImageDimensions(capture.filePath);

  // screencapture on Retina gives 2x pixel dimensions — convert to points
  const display = screen.getDisplayNearestPoint({
    x: capture.cursorX,
    y: capture.cursorY,
  });
  const scaleFactor = display.scaleFactor || 1;

  const maxDim = 800;
  let winWidth = Math.round(width / scaleFactor);
  let winHeight = Math.round(height / scaleFactor);
  if (winWidth > maxDim || winHeight > maxDim) {
    const scale = maxDim / Math.max(winWidth, winHeight);
    winWidth = Math.round(winWidth * scale);
    winHeight = Math.round(winHeight * scale);
  }

  const { x, y } = calculatePosition(
    capture.cursorX,
    capture.cursorY,
    winWidth,
    winHeight,
  );

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: true,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setAspectRatio(winWidth / winHeight);

  // Pass file path as query param — renderer uses IPC to read the image data
  const params = new URLSearchParams({ filePath: capture.filePath });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}snap/index.html?${params}`);
  } else {
    win.loadFile(path.join(__dirname, 'snap', 'index.html'), {
      search: params.toString(),
    });
  }

  // Track window
  snapWindows.set(win.id, win);
  win.on('closed', () => {
    snapWindows.delete(win.id);
  });

  log.info(`Snap window created: ${winWidth}x${winHeight} at (${x}, ${y})`);

  return win;
}

export function closeSnapWindow(windowId: number): void {
  const win = snapWindows.get(windowId);
  if (win && !win.isDestroyed()) {
    win.close();
  }
}

export function getSnapWindows(): Map<number, BrowserWindow> {
  return snapWindows;
}
