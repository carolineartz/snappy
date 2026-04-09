import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnapViewer } from '../snap/SnapViewer';

const TEST_FILE_PATH = '/test/image.png';

function setFilePath(path: string | null) {
  const search = path ? `?filePath=${encodeURIComponent(path)}` : '';
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
}

describe('SnapViewer', () => {
  beforeEach(() => {
    setFilePath(TEST_FILE_PATH);
  });

  afterEach(() => {
    setFilePath(null);
  });

  it('loads and displays the image from filePath query param', async () => {
    render(<SnapViewer />);

    const img = await screen.findByAltText('Screenshot');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,fake');
    expect(window.snappy.snap.readImage).toHaveBeenCalledWith(TEST_FILE_PATH);
  });

  it('does not load image when filePath is missing', () => {
    setFilePath(null);
    render(<SnapViewer />);

    expect(window.snappy.snap.readImage).not.toHaveBeenCalled();
    expect(screen.queryByAltText('Screenshot')).not.toBeInTheDocument();
  });

  it('copies image on Cmd+C', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');

    fireEvent.keyDown(window, { key: 'c', metaKey: true });

    expect(window.snappy.snap.copy).toHaveBeenCalledWith(TEST_FILE_PATH);
  });

  it('does not copy without meta key', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');

    fireEvent.keyDown(window, { key: 'c' });

    expect(window.snappy.snap.copy).not.toHaveBeenCalled();
  });

  it('toggles shadow on Cmd+P', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');

    fireEvent.keyDown(window, { key: 'p', metaKey: true });

    expect(window.snappy.snap.toggleShadow).toHaveBeenCalled();
  });

  it('closes on double click', async () => {
    const user = userEvent.setup();
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');

    const container = screen.getByAltText('Screenshot').parentElement!;
    await user.dblClick(container);

    expect(window.snappy.snap.close).toHaveBeenCalled();
  });

  it('shows context menu on right click', async () => {
    const user = userEvent.setup();
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');

    const container = screen.getByAltText('Screenshot').parentElement!;
    await user.pointer({ keys: '[MouseRight]', target: container });

    // Custom context menu should render with tool/color options
    expect(screen.getByText('Copy Image')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('adjusts opacity on wheel scroll down (more transparent)', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');
    const container = screen.getByAltText('Screenshot').parentElement!;

    await act(() => {
      fireEvent.wheel(container, { deltaY: 100 });
    });

    expect(window.snappy.snap.setOpacity).toHaveBeenCalledWith(0.95);
  });

  it('adjusts opacity on wheel scroll up (more opaque)', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');
    const container = screen.getByAltText('Screenshot').parentElement!;

    await act(() => {
      fireEvent.wheel(container, { deltaY: 100 });
      fireEvent.wheel(container, { deltaY: -100 });
    });

    expect(window.snappy.snap.setOpacity).toHaveBeenLastCalledWith(1);
  });

  it('clamps opacity to minimum 0.05', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');
    const container = screen.getByAltText('Screenshot').parentElement!;

    await act(() => {
      for (let i = 0; i < 25; i++) {
        fireEvent.wheel(container, { deltaY: 100 });
      }
    });

    const calls = vi.mocked(window.snappy.snap.setOpacity).mock.calls;
    const lastOpacity = calls[calls.length - 1][0];
    expect(lastOpacity).toBeCloseTo(0.05);
  });

  it('moves window on pointer drag', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');
    const container = screen.getByAltText('Screenshot').parentElement!;

    fireEvent.pointerDown(container, { button: 0, screenX: 100, screenY: 200 });
    fireEvent.pointerMove(container, { screenX: 110, screenY: 215 });
    fireEvent.pointerUp(container);

    expect(window.snappy.snap.move).toHaveBeenCalledWith(10, 15);
  });

  it('does not move on right-button drag', async () => {
    render(<SnapViewer />);
    await screen.findByAltText('Screenshot');
    const container = screen.getByAltText('Screenshot').parentElement!;

    fireEvent.pointerDown(container, { button: 2, screenX: 100, screenY: 200 });
    fireEvent.pointerMove(container, { screenX: 110, screenY: 215 });
    fireEvent.pointerUp(container);

    expect(window.snappy.snap.move).not.toHaveBeenCalled();
  });
});
