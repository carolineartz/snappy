import { useEffect, useRef, useState } from 'react';
import type { SnapItem } from '../../types';

interface SnapPreviewOverlayProps {
  snap: SnapItem;
  onDismiss: () => void;
  onOpen: (snapId: string) => void;
}

function formatCreatedAt(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SnapPreviewOverlay({
  snap,
  onDismiss,
  onOpen,
}: SnapPreviewOverlayProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    window.snap.snap.readImage(snap.filePath).then((src) => {
      if (!cancelledRef.current) setImgSrc(src);
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [snap.filePath]);

  const title = snap.name || snap.sourceApp || 'Untitled';

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard dismiss lives at the app level
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div className="mb-3 flex w-full max-w-[95%] items-center justify-between text-neutral-200">
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[13px] font-medium">{title}</span>
          <span className="ml-2 text-[11px] text-neutral-400">
            {formatCreatedAt(snap.createdAt)}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(snap.id);
          }}
          className="ml-3 rounded-md bg-white/10 px-3 py-1 text-[12px] text-neutral-100 hover:bg-white/20"
          title="Open as floating snap"
        >
          Open
        </button>
      </div>

      <div className="flex max-h-[85vh] w-full max-w-[95%] flex-1 items-center justify-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            draggable={false}
          />
        ) : (
          <div className="h-64 w-64 animate-pulse rounded-md bg-neutral-800" />
        )}
      </div>

      <p className="mt-3 text-[11px] text-neutral-400">
        Space or Esc to close · ← → to change
      </p>
    </div>
  );
}
