import { app, globalShortcut } from 'electron';
import log from 'electron-log';
import { notifyBrowserUpdated } from './browser-window';
import { closeDatabase, initDatabase } from './database';
import { createMenubar } from './lifecycle';
import { backfillVision } from './vision';

// Guard against EIO/EPIPE errors on stdout/stderr
const STREAM_ERROR_CODES = new Set(['EIO', 'EPIPE', 'EBADF']);
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (!STREAM_ERROR_CODES.has(err.code ?? '')) throw err;
});
process.stderr.on('error', (err: NodeJS.ErrnoException) => {
  if (!STREAM_ERROR_CODES.has(err.code ?? '')) throw err;
});

// Disable console transport in packaged builds — file transport still works
if (app.isPackaged) {
  log.transports.console.level = false;
}
log.initialize();

app.whenReady().then(() => {
  initDatabase();
  createMenubar();
  backfillVision(notifyBrowserUpdated).catch((err) =>
    log.warn(`Vision backfill error: ${err}`),
  );
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  closeDatabase();
});

app.on('window-all-closed', () => {});
