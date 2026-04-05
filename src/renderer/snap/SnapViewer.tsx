import { useEffect, useState } from 'react';

export function SnapViewer() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filePath = params.get('filePath');
    if (filePath) {
      window.snappy.snap.readImage(filePath).then(setImgSrc);
    }
  }, []);

  const handleDoubleClick = () => {
    window.snappy.snap.close();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: snap window drag target
    <div
      className="h-screen w-screen overflow-hidden"
      onDoubleClick={handleDoubleClick}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
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
