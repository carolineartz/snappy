import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { app } from 'electron';
import log from 'electron-log';
import { getSnapsMissingOcr, updateSnap } from './database';

const execFileAsync = promisify(execFile);

const OCR_TIMEOUT_MS = 15_000;
const OCR_MAX_BUFFER = 10 * 1024 * 1024;

function getOcrBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'snappy-ocr');
  }
  // In dev, main.js is at <project>/build/main.js → go up one, into build-native.
  return path.join(__dirname, '..', 'build-native', 'snappy-ocr');
}

async function extractText(imagePath: string): Promise<string> {
  const bin = getOcrBinaryPath();
  const { stdout } = await execFileAsync(bin, [imagePath], {
    timeout: OCR_TIMEOUT_MS,
    maxBuffer: OCR_MAX_BUFFER,
  });
  return stdout.trim();
}

/**
 * OCR a single snap and store the result. Stores empty string when the image
 * contains no text so we don't retry it on every backfill.
 */
export async function runOcrForSnap(
  snapId: string,
  filePath: string,
): Promise<void> {
  try {
    const text = await extractText(filePath);
    updateSnap(snapId, { ocrText: text });
    log.info(`OCR: ${snapId} → ${text.length} chars`);
  } catch (err) {
    log.warn(`OCR failed for ${snapId}: ${(err as Error).message}`);
  }
}

/**
 * OCR all snaps that don't yet have ocrText populated. Runs in the background
 * after app startup. Notifies the library browser after each snap completes
 * so search results update as text comes in.
 */
export async function backfillOcr(onProgress?: () => void): Promise<void> {
  const pending = getSnapsMissingOcr();
  if (pending.length === 0) return;
  log.info(`OCR backfill: ${pending.length} snaps pending`);

  for (const snap of pending) {
    await runOcrForSnap(snap.id, snap.filePath);
    onProgress?.();
  }

  log.info('OCR backfill complete');
}
