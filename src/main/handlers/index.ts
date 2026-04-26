import type { BrowserWindow } from 'electron';
import { registerAnnotationHandlers } from './annotations';
import { registerAppHandlers } from './app';
import { registerLibraryHandlers } from './library';
import { registerMenuHandlers } from './menu';
import { registerSnapHandlers } from './snap';

export function registerAllHandlers(
  win: BrowserWindow,
  notifyTrayUpdated: () => void,
): void {
  registerAppHandlers(win);
  registerSnapHandlers();
  registerAnnotationHandlers(notifyTrayUpdated);
  registerLibraryHandlers(notifyTrayUpdated);
  registerMenuHandlers();
}
