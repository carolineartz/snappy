export const APP_NAME = 'Snappy';

export const TRAY_ICON_SIZE = 22;

export const WINDOW_CONFIG = {
  width: 400,
  height: 500,
  minWidth: 300,
  minHeight: 400,
} as const;

export const BROWSER_WINDOW_CONFIG = {
  width: 1100,
  height: 700,
  minWidth: 800,
  minHeight: 500,
} as const;

export const CAPTURE_SHORTCUT = 'CommandOrControl+Shift+2';
export const OPEN_LIBRARY_SHORTCUT = 'CommandOrControl+Shift+L';

export const SNAPS_DIR_NAME = 'snaps';

// Generate thumbnails at 2x for Retina clarity
export const TRAY_THUMBNAIL_SIZE = 200;
export const THUMBNAIL_SCALE_FACTOR = 2.0;
export const BROWSER_THUMBNAIL_SIZE = 350;
export const THUMBNAIL_SIZE =
  BROWSER_THUMBNAIL_SIZE > TRAY_THUMBNAIL_SIZE
    ? BROWSER_THUMBNAIL_SIZE
    : TRAY_THUMBNAIL_SIZE;
// export const THUMBNAIL_HEIGHT = 200;
