import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

beforeEach(() => {
  Object.defineProperty(window, 'snappy', {
    value: {
      app: {
        quit: vi.fn(),
        version: vi.fn().mockResolvedValue('0.1.0'),
        hideWindow: vi.fn(),
      },
      snap: {
        close: vi.fn(),
        move: vi.fn(),
        setOpacity: vi.fn(),
        copy: vi.fn(),
        copyComposite: vi.fn(),
        toggleShadow: vi.fn(),
        readImage: vi.fn().mockResolvedValue('data:image/png;base64,fake'),
        saveAnnotations: vi.fn().mockResolvedValue(undefined),
        getAnnotations: vi.fn().mockResolvedValue(null),
        duplicate: vi.fn().mockResolvedValue(undefined),
        regenerateThumbnail: vi.fn().mockResolvedValue(undefined),
        openMenu: vi.fn(),
        onMenuAction: vi.fn(),
      },
      menu: {
        dismiss: vi.fn(),
        action: vi.fn(),
      },
      library: {
        getSnaps: vi.fn().mockResolvedValue([]),
        openSnap: vi.fn().mockResolvedValue(undefined),
        deleteSnap: vi.fn().mockResolvedValue(undefined),
        renameSnap: vi.fn().mockResolvedValue(undefined),
        readThumbnail: vi.fn().mockResolvedValue('data:image/png;base64,thumb'),
        onSnapsUpdated: vi.fn(),
        openBrowserWindow: vi.fn(),
        getAppIcon: vi.fn().mockResolvedValue(null),
      },
    },
    writable: true,
    configurable: true,
  });
});
