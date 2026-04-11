import { useEffect, useState } from 'react';
import type { SnapItem } from '../types';

interface BrowserGridItemProps {
  snap: SnapItem;
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
  onDuplicate: (snapId: string) => void;
}

const ROW_HEIGHT = 140;

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BrowserGridItem({
  snap,
  onOpen,
  onDelete,
  onDuplicate,
}: BrowserGridItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    window.snappy.library.readThumbnail(snap.thumbPath).then(setThumbSrc);
  }, [snap.thumbPath, snap.thumbnailUpdatedAt]);

  // Calculate width based on aspect ratio to maintain row height
  const aspectRatio = snap.width / snap.height;
  const itemWidth = Math.round(ROW_HEIGHT * aspectRatio);

  const hasAnnotations =
    snap.annotations !== null &&
    snap.annotations !== '[]' &&
    snap.annotations !== '';

  const handleDoubleClick = () => onOpen(snap.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: grid item with double-click */}
      <div
        className="group relative flex-shrink-0 cursor-default overflow-hidden rounded bg-neutral-100"
        style={{ width: itemWidth, height: ROW_HEIGHT }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Thumbnail */}
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

        {/* Green dot for open snaps */}
        {snap.isOpen === 1 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
        )}

        {/* Annotation indicator */}
        {hasAnnotations && (
          <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/80 text-[8px] text-white">
            ✏
          </span>
        )}

        {/* Hover overlay with metadata */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-1.5 transition-transform duration-150 group-hover:translate-y-0">
          <p className="truncate text-[11px] font-medium text-white">
            {snap.sourceApp || 'Unknown'}
          </p>
          <p className="text-[10px] text-neutral-300">
            {formatTime(snap.createdAt)} · {snap.width}×{snap.height}
          </p>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        // biome-ignore lint/a11y/noStaticElementInteractions: context menu backdrop
        // biome-ignore lint/a11y/useKeyWithClickEvents: dismiss backdrop
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: menu panel */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: menu panel */}
          <div
            className="absolute min-w-[140px] rounded-lg border border-neutral-200 bg-white/95 py-1 shadow-xl backdrop-blur-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem
              label="Open"
              onClick={() => {
                onOpen(snap.id);
                setContextMenu(null);
              }}
            />
            <ContextMenuItem
              label="Duplicate"
              onClick={() => {
                onDuplicate(snap.id);
                setContextMenu(null);
              }}
            />
            <div className="mx-2 my-1 border-t border-neutral-200" />
            <ContextMenuItem
              label="Delete"
              danger
              onClick={() => {
                onDelete(snap.id);
                setContextMenu(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function ContextMenuItem({
  label,
  danger,
  onClick,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full px-3 py-1 text-left text-[13px] transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-500 hover:text-white'
          : 'text-neutral-700 hover:bg-blue-500 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
