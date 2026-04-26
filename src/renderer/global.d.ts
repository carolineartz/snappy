import type { SnapAPI } from '../preload/index';

declare global {
  interface Window {
    snap: SnapAPI;
  }
}
