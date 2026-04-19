import { useEffect, useMemo, useRef, useState } from 'react';
import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import { getTagColorStyles } from '../../../shared/tag-colors';
import type { SnapItem } from '../../types';
import { TagItem } from './TagItem';

interface TagAssignPopoverProps {
  snap: SnapItem;
  assignedTags: string[];
  allTags: TagWithUsageCount[];
  getTagRecord: (tag: string) => Tag | undefined;
  /** Positioning relative to the viewport (from getBoundingClientRect of the anchor) */
  anchorRect: DOMRect;
  autoFocusInput?: boolean;
  onAssignTag: (snapId: string, name: string) => void;
  onUnassignTag: (snapId: string, name: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDismiss: () => void;
}

const QUICK_LIST_LIMIT = 6;

export function TagAssignPopover({
  snap,
  assignedTags,
  allTags,
  getTagRecord,
  anchorRect,
  autoFocusInput,
  onAssignTag,
  onUnassignTag,
  onMouseEnter,
  onMouseLeave,
  onDismiss,
}: TagAssignPopoverProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocusInput) {
      inputRef.current?.focus();
    }
  }, [autoFocusInput]);

  // Unassigned tags list (sorted by usage desc)
  const unassigned = useMemo(() => {
    const assigned = new Set(assignedTags);
    return allTags
      .filter((t) => !assigned.has(t.name))
      .sort((a, b) => b.usageCount - a.usageCount);
  }, [allTags, assignedTags]);

  const visibleUnassigned = showAll
    ? unassigned
    : unassigned.slice(0, QUICK_LIST_LIMIT);

  const handleTogglePill = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleCommitInput = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAssignTag(snap.id, trimmed);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDismiss();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTag) {
      // If input is focused and empty, we already handle this below via the input's onKeyDown.
      // This handles Delete when a pill is selected and input isn't focused.
      if (document.activeElement !== inputRef.current) {
        e.preventDefault();
        onUnassignTag(snap.id, selectedTag);
        setSelectedTag(null);
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitInput();
      return;
    }
    if (e.key === 'Backspace' && inputValue === '') {
      if (selectedTag) {
        e.preventDefault();
        onUnassignTag(snap.id, selectedTag);
        setSelectedTag(null);
      } else if (assignedTags.length > 0) {
        // Select the last assigned pill
        setSelectedTag(assignedTags[assignedTags.length - 1]);
      }
    }
  };

  // Deselect pill when clicking elsewhere inside the popover
  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-tag-pill]')) return;
    if ((e.target as HTMLElement).closest('[data-tag-row]')) return;
    setSelectedTag(null);
  };

  // Positioning: just below the anchor, aligned to left, clamped to viewport
  const popoverStyle = useMemo(() => {
    const padding = 8;
    const width = 280;
    const maxHeight = Math.min(
      window.innerHeight - anchorRect.bottom - 16,
      400,
    );

    let left = anchorRect.left;
    if (left + width > window.innerWidth - padding) {
      left = window.innerWidth - width - padding;
    }
    if (left < padding) left = padding;

    return {
      position: 'fixed' as const,
      top: anchorRect.bottom + 6,
      left,
      width,
      maxHeight,
    };
  }, [anchorRect]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container
    // biome-ignore lint/a11y/useKeyWithClickEvents: popover container
    <div
      ref={containerRef}
      className="z-50 flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
      style={popoverStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={handleKeyDown}
      onClick={handleContainerClick}
    >
      {/* Title */}
      <div className="px-3 pt-3 pb-2 text-[12px] text-neutral-600">
        Assign tags to{' '}
        <span className="font-medium text-neutral-800">
          “{snap.name || snap.sourceApp || 'Untitled'}”
        </span>
      </div>

      {/* Assigned pills + input */}
      <div className="border-neutral-100 border-t border-b px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {assignedTags.map((tag) => (
            <span key={tag} data-tag-pill>
              <TagItem
                tag={tag}
                getTagRecord={getTagRecord}
                selected={selectedTag === tag}
                onClick={() => handleTogglePill(tag)}
              />
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleCommitInput}
            placeholder={assignedTags.length === 0 ? 'Add tag…' : ''}
            className="min-w-[80px] flex-1 bg-transparent text-[11px] text-neutral-800 outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Unassigned quick list */}
      <div className="flex-1 overflow-y-auto py-1">
        {visibleUnassigned.map((tag) => {
          const dotColor = tag.color
            ? getTagColorStyles(tag.color).dotColor
            : '#9ca3af';
          return (
            <button
              key={tag.name}
              type="button"
              data-tag-row
              onClick={() => onAssignTag(snap.id, tag.name)}
              className="flex w-full items-center gap-2 px-3 py-1 text-left text-[13px] text-neutral-700 hover:bg-neutral-100"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
              <span className="truncate">{tag.name}</span>
            </button>
          );
        })}
        {unassigned.length > QUICK_LIST_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex w-full items-center gap-2 px-3 py-1 text-left text-[12px] text-neutral-500 hover:bg-neutral-100"
          >
            <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full border border-neutral-300" />
            <span>
              {showAll
                ? 'Show Less'
                : `Show All (${unassigned.length - QUICK_LIST_LIMIT} more)…`}
            </span>
          </button>
        )}
        {unassigned.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-neutral-400 italic">
            No other tags
          </p>
        )}
      </div>
    </div>
  );
}
