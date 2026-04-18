/**
 * IPC event names, prefixed with 'snappy:' to avoid collisions.
 */
export const EVENTS = {
  // App lifecycle
  APP_QUIT: 'snappy:quit',
  APP_VERSION: 'snappy:version',

  // Window management
  WINDOW_SHOW: 'snappy:window-show',
  WINDOW_HIDE: 'snappy:window-hide',

  // Snap window
  SNAP_CLOSE: 'snappy:snap-close',
  SNAP_MOVE: 'snappy:snap-move',
  SNAP_SET_OPACITY: 'snappy:snap-set-opacity',
  SNAP_COPY: 'snappy:snap-copy',
  SNAP_COPY_COMPOSITE: 'snappy:snap-copy-composite',
  SNAP_TOGGLE_SHADOW: 'snappy:snap-toggle-shadow',
  SNAP_READ_IMAGE: 'snappy:snap-read-image',

  // Annotations — renderer → main
  SNAP_SAVE_ANNOTATIONS: 'snappy:snap-save-annotations',
  SNAP_GET_ANNOTATIONS: 'snappy:snap-get-annotations',
  SNAP_REGENERATE_THUMBNAIL: 'snappy:snap-regenerate-thumb',

  // Snap management
  SNAP_DUPLICATE: 'snappy:snap-duplicate',

  // Context menu popup window
  MENU_OPEN: 'snappy:menu-open',
  MENU_DISMISS: 'snappy:menu-dismiss',
  MENU_ACTION: 'snappy:menu-action',
  MENU_STATE_UPDATE: 'snappy:menu-state-update',

  // Browser window
  BROWSER_OPEN: 'snappy:browser-open',

  // App icons
  GET_APP_ICON: 'snappy:get-app-icon',

  // Library
  LIBRARY_RENAME_SNAP: 'snappy:library-rename-snap',
  LIBRARY_GET_SNAPS: 'snappy:library-get-snaps',
  LIBRARY_OPEN_SNAP: 'snappy:library-open-snap',
  LIBRARY_DELETE_SNAP: 'snappy:library-delete-snap',
  LIBRARY_READ_THUMBNAIL: 'snappy:library-read-thumbnail',
  SNAPS_UPDATED: 'snappy:snaps-updated',
} as const;
