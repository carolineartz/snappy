import { execFile, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app, nativeImage, screen } from 'electron';
import log from 'electron-log';
import { SNAPS_DIR_NAME, THUMBNAIL_WIDTH } from '../shared/constants';

export interface CaptureResult {
  id: string;
  filePath: string;
  thumbPath: string;
  sourceApp: string | null;
  width: number;
  height: number;
  cursorX: number;
  cursorY: number;
  createdAt: string;
}

function getSnapsDir(): string {
  const dir = path.join(app.getPath('userData'), SNAPS_DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getThumbsDir(): string {
  const dir = path.join(app.getPath('userData'), SNAPS_DIR_NAME, 'thumbs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Get the name of the frontmost application via osascript.
 */
function getFrontmostApp(): string | null {
  try {
    const result = execSync(
      'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'',
      { encoding: 'utf-8', timeout: 2000 },
    );
    return result.trim() || null;
  } catch {
    log.warn('Could not detect frontmost app');
    return null;
  }
}

/**
 * Generate a thumbnail with the largest dimension at THUMBNAIL_WIDTH.
 * This ensures both wide and tall screenshots stay sharp.
 */
function generateThumbnail(imagePath: string, thumbPath: string): void {
  const image = nativeImage.createFromPath(imagePath);
  const size = image.getSize();

  let thumbWidth: number;
  let thumbHeight: number;

  if (size.width >= size.height) {
    thumbWidth = THUMBNAIL_WIDTH;
    thumbHeight = Math.round((THUMBNAIL_WIDTH / size.width) * size.height);
  } else {
    thumbHeight = THUMBNAIL_WIDTH;
    thumbWidth = Math.round((THUMBNAIL_WIDTH / size.height) * size.width);
  }

  const thumb = image.resize({ width: thumbWidth, height: thumbHeight });
  fs.writeFileSync(thumbPath, thumb.toPNG());
}

/**
 * Triggers macOS interactive screen capture (Cmd+Shift+2 style crosshair).
 * Returns full capture metadata on success, null if user cancelled.
 */
export function captureScreen(): Promise<CaptureResult | null> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const filename = `${id}.png`;
    const filePath = path.join(getSnapsDir(), filename);
    const thumbPath = path.join(getThumbsDir(), filename);

    // Detect the frontmost app before screencapture steals focus
    const sourceApp = getFrontmostApp();

    // -i  = interactive (region selection)
    // -x  = no screenshot sound
    // -r  = don't add shadow to window captures
    execFile('screencapture', ['-i', '-x', '-r', filePath], (error) => {
      if (error) {
        log.info('Screen capture cancelled by user');
        resolve(null);
        return;
      }

      if (!fs.existsSync(filePath)) {
        log.warn('Screen capture file not found after capture');
        resolve(null);
        return;
      }

      // Get image dimensions
      const image = nativeImage.createFromPath(filePath);
      const size = image.getSize();

      // Generate thumbnail
      generateThumbnail(filePath, thumbPath);

      // Grab cursor position
      const cursorPoint = screen.getCursorScreenPoint();

      log.info(
        `Screen captured: ${filePath} (${size.width}x${size.height}) from ${sourceApp}`,
      );
      resolve({
        id,
        filePath,
        thumbPath,
        sourceApp,
        width: size.width,
        height: size.height,
        cursorX: cursorPoint.x,
        cursorY: cursorPoint.y,
        createdAt: new Date().toISOString(),
      });
    });
  });
}
