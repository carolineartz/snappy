import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import type { SnapItem } from '../../types';
import { FilterPanel } from './FilterPanel';
import { LibraryGrid } from './LibraryGrid';
import { LibraryHeader } from './LibraryHeader';
import { SearchBar } from './SearchBar';

export type TimeFilter = 'all' | '24h' | '7d' | '30d';
export type SortDirection = 'desc' | 'asc';

export type SearchChip =
  | { type: 'app'; value: string }
  | { type: 'tag'; value: string };

export const ZOOM_MIN = 120;
export const ZOOM_MAX = 500;
export const ZOOM_DEFAULT = 180;
const ZOOM_STORAGE_KEY = 'snappy:browser-zoom';

function filterByTime(snaps: SnapItem[], filter: TimeFilter): SnapItem[] {
  if (filter === 'all') return snaps;

  const now = Date.now();
  const cutoffs: Record<Exclude<TimeFilter, 'all'>, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const cutoff = now - cutoffs[filter];
  return snaps.filter((s) => new Date(s.createdAt).getTime() >= cutoff);
}

export function LibraryApp() {
  const [snaps, setSnaps] = useState<SnapItem[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [chips, setChips] = useState<SearchChip[]>([]);
  const [searchText, setSearchText] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [allTags, setAllTags] = useState<TagWithUsageCount[]>([]);
  const [snapTags, setSnapTags] = useState<Map<string, string[]>>(new Map());
  const [zoom, setZoom] = useState<number>(() => {
    const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return ZOOM_DEFAULT;
  });

  const handleZoomChange = useCallback((value: number) => {
    setZoom(value);
    localStorage.setItem(ZOOM_STORAGE_KEY, String(value));
  }, []);

  const loadSnaps = useCallback(async () => {
    const data = (await window.snappy.library.getSnaps()) as SnapItem[];
    setSnaps(data);
  }, []);

  const loadTags = useCallback(async () => {
    const tags = await window.snappy.library.getAllTags();
    setAllTags(tags);

    // Load per-snap tags
    const data = (await window.snappy.library.getSnaps()) as SnapItem[];
    const tagMap = new Map<string, string[]>();
    await Promise.all(
      data.map(async (snap) => {
        const t = await window.snappy.library.getTagsForSnap(snap.id);
        if (t.length > 0) tagMap.set(snap.id, t);
      }),
    );
    setSnapTags(tagMap);
  }, []);

  useEffect(() => {
    loadSnaps();
    loadTags();
    window.snappy.library.onSnapsUpdated(() => {
      loadSnaps();
      loadTags();
    });
  }, [loadSnaps, loadTags]);

  // Lookup map: tag name → Tag record with color metadata
  const tagRecordMap = useMemo(
    () => new Map<string, Tag>(allTags.map((t) => [t.name, t])),
    [allTags],
  );
  const getTagRecord = useCallback(
    (tag: string) => tagRecordMap.get(tag),
    [tagRecordMap],
  );

  // Derive source apps with counts from the full snap list
  const sourceApps = useMemo(() => {
    const map = new Map<string, number>();
    for (const snap of snaps) {
      const app = snap.sourceApp || 'Other';
      map.set(app, (map.get(app) || 0) + 1);
    }
    // Sort alphabetically
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [snaps]);

  const appChipValues = useMemo(
    () =>
      chips
        .filter(
          (c): c is Extract<SearchChip, { type: 'app' }> => c.type === 'app',
        )
        .map((c) => c.value),
    [chips],
  );
  const tagChipValues = useMemo(
    () =>
      chips
        .filter(
          (c): c is Extract<SearchChip, { type: 'tag' }> => c.type === 'tag',
        )
        .map((c) => c.value),
    [chips],
  );

  const toggleChip = useCallback((chip: SearchChip) => {
    setChips((prev) => {
      const idx = prev.findIndex(
        (c) => c.type === chip.type && c.value === chip.value,
      );
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, chip];
    });
  }, []);

  const removeChip = useCallback((chip: SearchChip) => {
    setChips((prev) =>
      prev.filter((c) => !(c.type === chip.type && c.value === chip.value)),
    );
  }, []);

  // Apply filters and sort
  // Chip semantics: OR within a type, AND across types.
  const filteredSnaps = useMemo(() => {
    let result = filterByTime(snaps, timeFilter);

    if (appChipValues.length > 0) {
      result = result.filter((s) =>
        appChipValues.includes(s.sourceApp || 'Other'),
      );
    }

    if (tagChipValues.length > 0) {
      result = result.filter((s) => {
        const snapTagList = snapTags.get(s.id) ?? [];
        return tagChipValues.some((t) => snapTagList.includes(t));
      });
    }

    const textQuery = searchText.trim().toLowerCase();
    if (textQuery) {
      result = result.filter((s) =>
        (s.name ?? '').toLowerCase().includes(textQuery),
      );
    }

    const sorted = [...result].sort((a, b) => {
      const cmp =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [
    snaps,
    timeFilter,
    appChipValues,
    tagChipValues,
    searchText,
    snapTags,
    sortDirection,
  ]);

  const handleOpen = useCallback(
    async (snapId: string) => {
      await window.snappy.library.openSnap(snapId);
      loadSnaps();
    },
    [loadSnaps],
  );

  const handleDelete = useCallback(
    async (snapId: string) => {
      await window.snappy.library.deleteSnap(snapId);
      loadSnaps();
    },
    [loadSnaps],
  );

  const handleDuplicate = useCallback(
    async (snapId: string) => {
      await window.snappy.snap.duplicate(snapId);
      loadSnaps();
    },
    [loadSnaps],
  );

  return (
    <div className="flex h-screen bg-white text-neutral-800">
      {/* Sidebar */}
      <FilterPanel
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        sourceApps={sourceApps}
        appChips={appChipValues}
        onToggleApp={(name) => toggleChip({ type: 'app', value: name })}
        allTags={allTags}
        tagChips={tagChipValues}
        onToggleTag={(name) => toggleChip({ type: 'tag', value: name })}
        totalCount={snaps.length}
        hasActiveChips={chips.length > 0}
        onClearChips={() => setChips([])}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <LibraryHeader
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          snapCount={filteredSnaps.length}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          search={
            <SearchBar
              chips={chips}
              text={searchText}
              onTextChange={setSearchText}
              onAddChip={toggleChip}
              onRemoveChip={removeChip}
              allTags={allTags}
              sourceApps={sourceApps}
              getTagRecord={getTagRecord}
            />
          }
        />
        <main className="flex-1 overflow-y-auto">
          {filteredSnaps.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-neutral-400">No snaps match your filters</p>
            </div>
          ) : (
            <LibraryGrid
              snaps={filteredSnaps}
              zoom={zoom}
              snapTags={snapTags}
              allTags={allTags}
              getTagRecord={getTagRecord}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onTagsChanged={loadTags}
            />
          )}
        </main>
      </div>
    </div>
  );
}
