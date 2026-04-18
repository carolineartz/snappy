import { useEffect, useRef, useState } from 'react';
import type { SnapItem } from '../types';

interface BrowserGridItemProps {
  snap: SnapItem;
  size: number;
  tags: string[];
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
  onDuplicate: (snapId: string) => void;
  onTagsChanged: () => void;
}

function displayName(snap: SnapItem): string {
  if (snap.name) return snap.name;
  return snap.sourceApp || 'Other';
}

export function BrowserGridItem({
  snap,
  size,
  tags,
  onOpen,
  onDelete,
  onDuplicate,
  onTagsChanged,
}: BrowserGridItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagValue, setTagValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    window.snappy.library.readThumbnail(snap.thumbPath).then((src) => {
      if (!cancelled) setThumbSrc(src);
    });
    window.snappy.snap.readImage(snap.filePath).then((src) => {
      if (!cancelled) setFullSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [snap.filePath, snap.thumbPath, snap.thumbnailUpdatedAt]);

  const hasAnnotations =
    snap.annotations !== null &&
    snap.annotations !== '[]' &&
    snap.annotations !== '';

  const handleDoubleClick = () => onOpen(snap.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    setRenameValue(snap.name || '');
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.select(), 0);
  };

  const commitRename = () => {
    const trimmed = renameValue.trim();
    window.snappy.library.renameSnap(snap.id, trimmed || null);
    setIsRenaming(false);
  };

  const startAddTag = () => {
    setTagValue('');
    setIsAddingTag(true);
    setTimeout(() => tagRef.current?.focus(), 0);
  };

  const commitTag = () => {
    const trimmed = tagValue.trim();
    if (trimmed) {
      window.snappy.library.addTag(snap.id, trimmed);
      onTagsChanged();
    }
    setIsAddingTag(false);
    setTagValue('');
  };

  const removeTag = (tag: string) => {
    window.snappy.library.removeTag(snap.id, tag);
    onTagsChanged();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F2' && !isRenaming) {
      e.preventDefault();
      startRename();
    }
  };

  const imgSrc = fullSrc ?? thumbSrc;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: grid item with interactions */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: need focus for F2 rename */}
      <div
        className="group relative flex cursor-default flex-col overflow-hidden rounded outline-none"
        style={{ width: size }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Image container */}
        <div
          className="flex items-center justify-center bg-neutral-100 ring-1 ring-black/[0.06]"
          style={{ width: size, height: size }}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt=""
              className="max-h-full max-w-full object-contain"
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
        </div>

        {/* Label + tags below thumbnail */}
        <div className="px-0.5 py-1">
          {isRenaming ? (
            <input
              ref={renameRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setIsRenaming(false);
                e.stopPropagation();
              }}
              className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-center text-[11px] text-neutral-800 outline-none"
              placeholder={snap.sourceApp || 'Untitled'}
            />
          ) : (
            <p
              className="truncate text-center text-[11px] text-neutral-500"
              title={displayName(snap)}
            >
              {displayName(snap)}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0 text-[9px] text-blue-600"
                >
                  {tag}
                  <button
                    type="button"
                    className="ml-0.5 text-blue-400 hover:text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Inline tag input */}
          {isAddingTag && (
            <input
              ref={tagRef}
              type="text"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              onBlur={commitTag}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTag();
                if (e.key === 'Escape') {
                  setIsAddingTag(false);
                  setTagValue('');
                }
                e.stopPropagation();
              }}
              className="mt-0.5 w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-center text-[10px] text-neutral-800 outline-none"
              placeholder="tag name"
            />
          )}
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
              label="Rename"
              onClick={() => {
                setContextMenu(null);
                startRename();
              }}
            />
            <ContextMenuItem
              label="Add Tag..."
              onClick={() => {
                setContextMenu(null);
                startAddTag();
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
