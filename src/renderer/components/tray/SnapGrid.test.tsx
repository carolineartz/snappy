import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SnapItem } from '../../types';
import { SnapGrid } from './SnapGrid';

function makeSnap(overrides: Partial<SnapItem> = {}): SnapItem {
  return {
    id: 'snap-1',
    name: null,
    thumbPath: '/path/to/thumb.png',
    sourceApp: 'Safari',
    isOpen: 0,
    createdAt: new Date().toISOString(),
    filePath: '/path/to/snap.png',
    width: 800,
    height: 600,
    annotations: null,
    thumbnailUpdatedAt: null,
    ocrText: null,
    ...overrides,
  };
}

describe('SnapGrid', () => {
  it('renders a grid item for each snap', async () => {
    const snaps = [
      makeSnap({ id: 'snap-1' }),
      makeSnap({ id: 'snap-2' }),
      makeSnap({ id: 'snap-3' }),
    ];

    const { container } = render(
      <SnapGrid snaps={snaps} onOpen={vi.fn()} onDelete={vi.fn()} />,
    );

    // Wait for thumbnails to load then check count
    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(3);
    });
  });

  it('renders nothing when snaps array is empty', () => {
    const { container } = render(
      <SnapGrid snaps={[]} onOpen={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(container.querySelectorAll('[class*="group"]')).toHaveLength(0);
  });
});
