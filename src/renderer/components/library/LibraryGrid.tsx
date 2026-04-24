import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import type { SnapItem } from '../../types';
import { LibraryGridItem } from './LibraryGridItem';

interface LibraryGridProps {
  snaps: SnapItem[];
  zoom: number;
  snapTags: Map<string, string[]>;
  allTags: TagWithUsageCount[];
  getTagRecord: (tag: string) => Tag | undefined;
  selectedIds: Set<string>;
  anchorId: string | null;
  onSelect: (
    snapId: string,
    modifiers: { shift: boolean; meta: boolean; ctrl: boolean },
  ) => void;
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
  onDuplicate: (snapId: string) => void;
  onTagsChanged: () => void;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const snapDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - snapDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Group snaps by date. Consolidates regardless of input order — one group
 * per calendar day, ordered newest → oldest. Within each group, snaps keep
 * the order they arrived in (which is already the ranking the caller
 * computed).
 */
function groupByDate(
  snaps: SnapItem[],
): { date: string; label: string; snaps: SnapItem[] }[] {
  const byKey = new Map<
    string,
    { date: string; label: string; snaps: SnapItem[]; ts: number }
  >();

  for (const snap of snaps) {
    const key = getDateKey(snap.createdAt);
    let group = byKey.get(key);
    if (!group) {
      const d = new Date(snap.createdAt);
      group = {
        date: key,
        label: formatDateSeparator(snap.createdAt),
        snaps: [],
        ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      };
      byKey.set(key, group);
    }
    group.snaps.push(snap);
  }

  return [...byKey.values()].sort((a, b) => b.ts - a.ts);
}

export function LibraryGrid({
  snaps,
  zoom,
  snapTags,
  allTags,
  getTagRecord,
  selectedIds,
  anchorId,
  onSelect,
  onOpen,
  onDelete,
  onDuplicate,
  onTagsChanged,
}: LibraryGridProps) {
  const groups = groupByDate(snaps);

  return (
    <div className="p-4">
      {groups.map((group) => (
        <div
          key={group.date}
          className="mb-5 rounded-2xl bg-white/30 p-4 ring-1 ring-black/5 dark:bg-neutral-900/20 dark:ring-white/5"
        >
          {/* Date separator */}
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {group.label}
          </h2>

          {/* Uniform grid slots, auto-fill based on zoom */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`,
            }}
          >
            {group.snaps.map((snap) => (
              <LibraryGridItem
                key={snap.id}
                snap={snap}
                size={zoom}
                tags={snapTags.get(snap.id) || []}
                allTags={allTags}
                getTagRecord={getTagRecord}
                selected={selectedIds.has(snap.id)}
                isAnchor={anchorId === snap.id}
                onSelect={onSelect}
                onOpen={onOpen}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onTagsChanged={onTagsChanged}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
