import { app, type BrowserWindow, ipcMain } from 'electron';
import { EVENTS } from '../../shared/events';

export function registerAppHandlers(win: BrowserWindow): void {
  ipcMain.handle(EVENTS.APP_VERSION, () => app.getVersion());
  ipcMain.on(EVENTS.APP_QUIT, () => app.quit());
  ipcMain.on(EVENTS.WINDOW_HIDE, () => win.hide());
}
