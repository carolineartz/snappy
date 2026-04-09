import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { SnapItem } from '../types';

function makeSnap(overrides: Partial<SnapItem> = {}): SnapItem {
  return {
    id: 'snap-1',
    thumbPath: '/path/to/thumb.png',
    sourceApp: 'Safari',
    isOpen: 0,
    createdAt: new Date().toISOString(),
    thumbnailUpdatedAt: null,
    ...overrides,
  };
}

/** Wait for at least one thumbnail img to appear */
async function waitForThumbnail(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelector('img')).toBeInTheDocument();
  });
}

describe('App', () => {
  it('renders the header', () => {
    render(<App />);
    expect(screen.getByText('Snappy')).toBeInTheDocument();
  });

  it('shows empty state when no snaps', async () => {
    render(<App />);
    expect(await screen.findByText('No snaps yet')).toBeInTheDocument();
    expect(
      screen.getByText('Press ⌘⇧2 to take a screenshot'),
    ).toBeInTheDocument();
  });

  it('shows snap count as singular when 1 snap', async () => {
    vi.mocked(window.snappy.library.getSnaps).mockResolvedValueOnce([
      makeSnap(),
    ]);
    render(<App />);
    expect(await screen.findByText('1 snap')).toBeInTheDocument();
  });

  it('shows pluralized snap count when multiple snaps', async () => {
    vi.mocked(window.snappy.library.getSnaps).mockResolvedValueOnce([
      makeSnap({ id: 'snap-1' }),
      makeSnap({ id: 'snap-2' }),
    ]);
    render(<App />);
    expect(await screen.findByText('2 snaps')).toBeInTheDocument();
  });

  it('renders the snap grid when snaps exist', async () => {
    vi.mocked(window.snappy.library.getSnaps).mockResolvedValueOnce([
      makeSnap(),
    ]);
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText('No snaps yet')).not.toBeInTheDocument();
    });
  });

  it('registers onSnapsUpdated listener on mount', () => {
    render(<App />);
    expect(window.snappy.library.onSnapsUpdated).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('opens a snap and reloads the list', async () => {
    const snaps = [makeSnap()];
    vi.mocked(window.snappy.library.getSnaps)
      .mockResolvedValueOnce(snaps)
      .mockResolvedValueOnce(snaps);

    const user = userEvent.setup();
    const { container } = render(<App />);

    await waitForThumbnail(container);
    const gridItem = container.querySelector('[class*="group"]')!;
    await user.dblClick(gridItem);

    await waitFor(() => {
      expect(window.snappy.library.openSnap).toHaveBeenCalledWith('snap-1');
    });
  });

  it('deletes a snap and reloads the list', async () => {
    const snaps = [makeSnap()];
    vi.mocked(window.snappy.library.getSnaps)
      .mockResolvedValueOnce(snaps)
      .mockResolvedValueOnce([]);

    const user = userEvent.setup();
    const { container } = render(<App />);

    await waitForThumbnail(container);
    const gridItem = container.querySelector('[class*="group"]')!;
    await user.pointer({ keys: '[MouseRight]', target: gridItem });

    await waitFor(() => {
      expect(window.snappy.library.deleteSnap).toHaveBeenCalledWith('snap-1');
    });
  });
});
