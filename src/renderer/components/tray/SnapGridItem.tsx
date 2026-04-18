import { useEffect, useState } from 'react';
import type { SnapItem } from '../../types';

interface SnapGridItemProps {
  snap: SnapItem;
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function SnapGridItem({ snap, onOpen, onDelete }: SnapGridItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);

  useEffect(() => {
    window.snappy.library.readThumbnail(snap.thumbPath).then((src) => {
      setThumbSrc(src);
    });
  }, [snap.thumbPath, snap.thumbnailUpdatedAt]);

  const handleDoubleClick = () => {
    onOpen(snap.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onDelete(snap.id);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: grid item with double-click to open
    <div
      className="group relative cursor-default overflow-hidden rounded-sm bg-neutral-100 shadow-sm ring-1 ring-neutral-200/60"
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}
      </div>

      {/* Green dot for open snaps */}
      {snap.isOpen === 1 && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
      )}

      {/* Hover overlay with info */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1.5 transition-transform duration-150 group-hover:translate-y-0">
        <p className="truncate text-[10px] font-medium text-white">
          {snap.sourceApp || 'Other'}
        </p>
        <p className="text-[9px] text-neutral-400">
          {formatTime(snap.createdAt)}
        </p>
      </div>
    </div>
  );
}
