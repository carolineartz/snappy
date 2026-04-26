/**
 * IPC event names, prefixed with 'snap:' to avoid collisions.
 */
export const EVENTS = {
  // App lifecycle
  APP_QUIT: 'snap:quit',
  APP_VERSION: 'snap:version',

  // Window management
  WINDOW_SHOW: 'snap:window-show',
  WINDOW_HIDE: 'snap:window-hide',

  // Snap window
  SNAP_CLOSE: 'snap:snap-close',
  SNAP_MOVE: 'snap:snap-move',
  SNAP_SET_OPACITY: 'snap:snap-set-opacity',
  SNAP_COPY: 'snap:snap-copy',
  SNAP_COPY_COMPOSITE: 'snap:snap-copy-composite',
  SNAP_TOGGLE_SHADOW: 'snap:snap-toggle-shadow',
  SNAP_READ_IMAGE: 'snap:snap-read-image',

  // Annotations — renderer → main
  SNAP_SAVE_ANNOTATIONS: 'snap:snap-save-annotations',
  SNAP_GET_ANNOTATIONS: 'snap:snap-get-annotations',
  SNAP_REGENERATE_THUMBNAIL: 'snap:snap-regenerate-thumb',

  // Snap management
  SNAP_DUPLICATE: 'snap:snap-duplicate',

  // Context menu popup window
  MENU_OPEN: 'snap:menu-open',
  MENU_DISMISS: 'snap:menu-dismiss',
  MENU_ACTION: 'snap:menu-action',
  MENU_STATE_UPDATE: 'snap:menu-state-update',

  // Browser window
  BROWSER_OPEN: 'snap:browser-open',

  // App icons
  GET_APP_ICON: 'snap:get-app-icon',

  // Tags
  TAG_ADD: 'snap:tag-add',
  TAG_REMOVE: 'snap:tag-remove',
  TAG_GET_FOR_SNAP: 'snap:tag-get-for-snap',
  TAG_GET_ALL: 'snap:tag-get-all',

  // Library
  LIBRARY_RENAME_SNAP: 'snap:library-rename-snap',
  LIBRARY_GET_SNAPS: 'snap:library-get-snaps',
  LIBRARY_OPEN_SNAP: 'snap:library-open-snap',
  LIBRARY_DELETE_SNAP: 'snap:library-delete-snap',
  LIBRARY_READ_THUMBNAIL: 'snap:library-read-thumbnail',
  LIBRARY_SEARCH_BY_TEXT: 'snap:library-search-by-text',
  SNAPS_UPDATED: 'snap:snaps-updated',
} as const;
