import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SnapItem } from '../../types';
import { SnapGridItem } from './SnapGridItem';

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
    classificationLabels: null,
    ...overrides,
  };
}

/** Wait for the thumbnail img to appear (alt="" makes it presentational, so findByRole won't work) */
async function waitForThumbnail(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelector('img')).toBeInTheDocument();
  });
  return container.querySelector('img')!;
}

describe('SnapGridItem', () => {
  it('loads and displays the thumbnail', async () => {
    const { container } = render(
      <SnapGridItem snap={makeSnap()} onOpen={vi.fn()} onDelete={vi.fn()} />,
    );

    const img = await waitForThumbnail(container);
    expect(img).toHaveAttribute('src', 'data:image/png;base64,thumb');
    expect(window.snap.library.readThumbnail).toHaveBeenCalledWith(
      '/path/to/thumb.png',
    );
  });

  it('shows placeholder before thumbnail loads', () => {
    vi.mocked(window.snap.library.readThumbnail).mockReturnValueOnce(
      new Promise(() => {}),
    );

    const { container } = render(
      <SnapGridItem snap={makeSnap()} onOpen={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-neutral-200')).toBeInTheDocument();
  });

  it('shows green dot when snap is open', async () => {
    const { container } = render(
      <SnapGridItem
        snap={makeSnap({ isOpen: 1 })}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitForThumbnail(container);
    expect(container.querySelector('.bg-green-400')).toBeInTheDocument();
  });

  it('does not show green dot when snap is closed', async () => {
    const { container } = render(
      <SnapGridItem
        snap={makeSnap({ isOpen: 0 })}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitForThumbnail(container);
    expect(container.querySelector('.bg-green-400')).not.toBeInTheDocument();
  });

  it('displays the source app name', async () => {
    const { container } = render(
      <SnapGridItem
        snap={makeSnap({ sourceApp: 'Figma' })}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitForThumbnail(container);
    expect(screen.getByText('Figma')).toBeInTheDocument();
  });

  it('shows "Unknown" when sourceApp is null', async () => {
    const { container } = render(
      <SnapGridItem
        snap={makeSnap({ sourceApp: null })}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitForThumbnail(container);
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  describe('formatTime', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows "Just now" for times less than a minute ago', async () => {
      const { container } = render(
        <SnapGridItem
          snap={makeSnap({ createdAt: '2026-04-08T11:59:30Z' })}
          onOpen={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      await waitForThumbnail(container);
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes ago', async () => {
      const { container } = render(
        <SnapGridItem
          snap={makeSnap({ createdAt: '2026-04-08T11:45:00Z' })}
          onOpen={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      await waitForThumbnail(container);
      expect(screen.getByText('15m ago')).toBeInTheDocument();
    });

    it('shows hours ago', async () => {
      const { container } = render(
        <SnapGridItem
          snap={makeSnap({ createdAt: '2026-04-08T09:00:00Z' })}
          onOpen={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      await waitForThumbnail(container);
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('shows days ago', async () => {
      const { container } = render(
        <SnapGridItem
          snap={makeSnap({ createdAt: '2026-04-06T12:00:00Z' })}
          onOpen={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      await waitForThumbnail(container);
      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('shows formatted date for older snaps', async () => {
      const { container } = render(
        <SnapGridItem
          snap={makeSnap({ createdAt: '2026-03-01T12:00:00Z' })}
          onOpen={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      await waitForThumbnail(container);
      expect(screen.getByText('Mar 1')).toBeInTheDocument();
    });
  });

  it('calls onOpen with snap id on double click', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <SnapGridItem snap={makeSnap()} onOpen={onOpen} onDelete={vi.fn()} />,
    );

    await waitForThumbnail(container);
    const gridItem = container.querySelector('[class*="group"]')!;
    await user.dblClick(gridItem);

    expect(onOpen).toHaveBeenCalledWith('snap-1');
  });

  it('calls onDelete with snap id on right click', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <SnapGridItem snap={makeSnap()} onOpen={vi.fn()} onDelete={onDelete} />,
    );

    await waitForThumbnail(container);
    const gridItem = container.querySelector('[class*="group"]')!;
    await user.pointer({ keys: '[MouseRight]', target: gridItem });

    expect(onDelete).toHaveBeenCalledWith('snap-1');
  });
});
