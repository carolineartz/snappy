import { useEffect, useRef, useState } from 'react';

export function SnapViewer() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const opacity = useRef(1);
  const isDragging = useRef(false);
  const isClosing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filePath = params.get('filePath');
    if (filePath) {
      window.snappy.snap.readImage(filePath).then(setImgSrc);
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || isClosing.current) return;
    isDragging.current = true;
    dragStart.current = { x: e.screenX, y: e.screenY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.screenX - dragStart.current.x;
    const dy = e.screenY - dragStart.current.y;
    dragStart.current = { x: e.screenX, y: e.screenY };
    window.snappy.snap.move(dx, dy);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Scroll down = more transparent, scroll up = more opaque
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    opacity.current = Math.max(0.05, Math.min(1, opacity.current + delta));
    window.snappy.snap.setOpacity(opacity.current);
  };

  const handleDoubleClick = () => {
    isClosing.current = true;
    isDragging.current = false;
    window.snappy.snap.close();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: snap window with manual drag
    <div
      className="h-screen w-screen select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt="Screenshot"
          className="pointer-events-none block h-full w-full"
          draggable={false}
        />
      )}
    </div>
  );
}
