import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Re-apply window.snappy mocks before each test since restoreMocks resets them
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
        toggleShadow: vi.fn(),
        showContextMenu: vi.fn(),
        readImage: vi.fn().mockResolvedValue('data:image/png;base64,fake'),
      },
      library: {
        getSnaps: vi.fn().mockResolvedValue([]),
        openSnap: vi.fn().mockResolvedValue(undefined),
        deleteSnap: vi.fn().mockResolvedValue(undefined),
        readThumbnail: vi.fn().mockResolvedValue('data:image/png;base64,thumb'),
        onSnapsUpdated: vi.fn(),
      },
    },
    writable: true,
    configurable: true,
  });
});
