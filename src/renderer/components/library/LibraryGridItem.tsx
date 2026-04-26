import { useEffect, useRef, useState } from 'react';
import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import { getTagColorStyles } from '../../../shared/tag-colors';
import { useHoverDelay } from '../../hooks/useHoverDelay';
import type { SnapItem } from '../../types';
import { TagAssignPopover } from './TagAssignPopover';

interface LibraryGridItemProps {
  snap: SnapItem;
  size: number;
  tags: string[];
  allTags: TagWithUsageCount[];
  getTagRecord: (tag: string) => Tag | undefined;
  selected: boolean;
  isAnchor: boolean;
  onSelect: (
    snapId: string,
    modifiers: { shift: boolean; meta: boolean; ctrl: boolean },
  ) => void;
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
  onDuplicate: (snapId: string) => void;
  onTagsChanged: () => void;
}

const MAX_DOTS = 3;
const DOT_SIZE = 8;
const DOT_OVERLAP = 3;

function displayName(snap: SnapItem): string {
  if (snap.name) return snap.name;
  return snap.sourceApp || 'Other';
}

export function LibraryGridItem({
  snap,
  size,
  tags,
  allTags,
  getTagRecord,
  selected,
  isAnchor,
  onSelect,
  onOpen,
  onDelete,
  onDuplicate,
  onTagsChanged,
}: LibraryGridItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [popoverAutoFocus, setPopoverAutoFocus] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const popover = useHoverDelay({ openDelay: 500, closeDelay: 150 });

  useEffect(() => {
    let cancelled = false;
    window.snap.library.readThumbnail(snap.thumbPath).then((src) => {
      if (!cancelled) setThumbSrc(src);
    });
    window.snap.snap.readImage(snap.filePath).then((src) => {
      if (!cancelled) setFullSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [snap.filePath, snap.thumbPath, snap.thumbnailUpdatedAt]);

  // When popover opens, capture the anchor rect for positioning
  useEffect(() => {
    if (popover.isOpen && itemRef.current) {
      setAnchorRect(itemRef.current.getBoundingClientRect());
    }
  }, [popover.isOpen]);

  const hasAnnotations =
    snap.annotations !== null &&
    snap.annotations !== '[]' &&
    snap.annotations !== '';

  const handleClick = (e: React.MouseEvent) => {
    // Finder-style click: select this item. Modifier keys extend / toggle.
    onSelect(snap.id, {
      shift: e.shiftKey,
      meta: e.metaKey,
      ctrl: e.ctrlKey,
    });
  };

  const handleDoubleClick = () => onOpen(snap.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Right-click on an unselected item makes it the selection first, so
    // menu actions operate on the item the user targeted.
    if (!selected) {
      onSelect(snap.id, { shift: false, meta: false, ctrl: false });
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    setRenameValue(snap.name || '');
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.select(), 0);
  };

  const commitRename = () => {
    const trimmed = renameValue.trim();
    window.snap.library.renameSnap(snap.id, trimmed || null);
    setIsRenaming(false);
  };

  const openAssignPopover = () => {
    if (itemRef.current) {
      setAnchorRect(itemRef.current.getBoundingClientRect());
    }
    setPopoverAutoFocus(true);
    popover.open();
  };

  const handleAssignTag = (snapId: string, name: string) => {
    window.snap.library.addTag(snapId, name);
    onTagsChanged();
  };

  const handleUnassignTag = (snapId: string, name: string) => {
    window.snap.library.removeTag(snapId, name);
    onTagsChanged();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F2' && !isRenaming) {
      e.preventDefault();
      startRename();
    }
  };

  // Sorted tags for stable dot rendering
  const sortedTags = [...tags].sort();
  const visibleDots = sortedTags.slice(0, MAX_DOTS);

  const imgSrc = fullSrc ?? thumbSrc;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: grid item with interactions */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: need focus for F2 rename */}
      <div
        ref={itemRef}
        data-snap-id={snap.id}
        className={`group relative flex cursor-default flex-col overflow-hidden rounded outline-none ring-offset-2 transition-shadow `}
        style={{ width: size }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Image container */}
        <div
          className={`p-1 rounded-xl relative flex items-center justify-center ${selected
            ? isAnchor
              ? 'bg-[#E6E6E6]'
              : 'bg-[#E6E6E6]'
            : ''} dark:bg-neutral-800 dark:ring-white/10`}
          style={{ width: size, height: size }}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt=""
              className="max-h-full max-w-full object-contain rounded-xl"
              draggable={false}
            />
          ) : (
            <div className="h-full w-full bg-neutral-200 dark:bg-neutral-700" />
          )}

          {snap.isOpen === 1 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
          )}

          {hasAnnotations && (
            <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/80 text-[8px] text-white">
              ✏
            </span>
          )}
        </div>

        {/* Label row: dots absolute-positioned left; name centered in full width */}
        <div className="relative px-1.5 py-1">
          {visibleDots.length > 0 && (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover target for popover
            <div
              className="absolute top-1/2 left-1.5 flex -translate-y-1/2 items-center"
              style={{
                width:
                  DOT_SIZE +
                  (visibleDots.length - 1) * (DOT_SIZE - DOT_OVERLAP),
              }}
              onMouseEnter={popover.handleMouseEnter}
              onMouseLeave={popover.handleMouseLeave}
            >
              {visibleDots.map((tag, idx) => {
                const record = getTagRecord(tag);
                const color = record?.color
                  ? getTagColorStyles(record.color).dotColor
                  : '#9ca3af';
                return (
                  <span
                    key={tag}
                    className="h-2 w-2 flex-shrink-0 rounded-full ring-1 ring-white"
                    style={{
                      backgroundColor: color,
                      marginLeft: idx === 0 ? 0 : -DOT_OVERLAP,
                      zIndex: visibleDots.length - idx,
                    }}
                  />
                );
              })}
            </div>
          )}

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
              className="truncate text-center text-[11px] text-neutral-500 dark:text-neutral-400"
              title={displayName(snap)}
            >
              {displayName(snap)}
            </p>
          )}
        </div>
      </div>

      {/* Hover popover */}
      {popover.isOpen && anchorRect && (
        <TagAssignPopover
          snap={snap}
          assignedTags={sortedTags}
          allTags={allTags}
          getTagRecord={getTagRecord}
          anchorRect={anchorRect}
          autoFocusInput={popoverAutoFocus}
          onAssignTag={handleAssignTag}
          onUnassignTag={handleUnassignTag}
          onMouseEnter={popover.handleMouseEnter}
          onMouseLeave={popover.handleMouseLeave}
          onDismiss={() => {
            popover.close();
            setPopoverAutoFocus(false);
          }}
        />
      )}

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
            className="absolute min-w-[140px] rounded-lg border border-neutral-200 bg-white/95 py-1 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/95 dark:text-neutral-200"
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
                openAssignPopover();
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
          ? 'text-red-600 hover:bg-red-500 hover:text-white dark:text-red-400'
          : 'text-neutral-700 hover:bg-blue-500 hover:text-white dark:text-neutral-200'
      }`}
    >
      {label}
    </button>
  );
}
