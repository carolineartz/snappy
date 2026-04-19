import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import type { SnapItem } from '../../types';
import { LibraryGridItem } from './LibraryGridItem';

interface LibraryGridProps {
  snaps: SnapItem[];
  zoom: number;
  snapTags: Map<string, string[]>;
  allTags: TagWithUsageCount[];
  getTagRecord: (tag: string) => Tag | undefined;
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

/** Group snaps by date, preserving the original order */
function groupByDate(
  snaps: SnapItem[],
): { date: string; label: string; snaps: SnapItem[] }[] {
  const groups: { date: string; label: string; snaps: SnapItem[] }[] = [];
  let currentKey = '';

  for (const snap of snaps) {
    const key = getDateKey(snap.createdAt);
    if (key !== currentKey) {
      currentKey = key;
      groups.push({
        date: key,
        label: formatDateSeparator(snap.createdAt),
        snaps: [],
      });
    }
    groups[groups.length - 1].snaps.push(snap);
  }

  return groups;
}

export function LibraryGrid({
  snaps,
  zoom,
  snapTags,
  allTags,
  getTagRecord,
  onOpen,
  onDelete,
  onDuplicate,
  onTagsChanged,
}: LibraryGridProps) {
  const groups = groupByDate(snaps);

  return (
    <div className="p-4">
      {groups.map((group) => (
        <div key={group.date} className="mb-6">
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
