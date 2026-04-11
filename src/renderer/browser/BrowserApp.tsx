import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SnapItem } from '../types';
import { BrowserGrid } from './BrowserGrid';
import { BrowserHeader } from './BrowserHeader';
import { FilterPanel } from './FilterPanel';

export type TimeFilter = 'all' | '24h' | '7d' | '30d';
export type SortDirection = 'desc' | 'asc';

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

export function BrowserApp() {
  const [snaps, setSnaps] = useState<SnapItem[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const loadSnaps = useCallback(async () => {
    const data = (await window.snappy.library.getSnaps()) as SnapItem[];
    setSnaps(data);
  }, []);

  useEffect(() => {
    loadSnaps();
    window.snappy.library.onSnapsUpdated(loadSnaps);
  }, [loadSnaps]);

  // Derive source apps with counts from the full snap list
  const sourceApps = useMemo(() => {
    const map = new Map<string, number>();
    for (const snap of snaps) {
      const app = snap.sourceApp || 'Unknown';
      map.set(app, (map.get(app) || 0) + 1);
    }
    // Sort alphabetically
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [snaps]);

  // Apply filters and sort
  const filteredSnaps = useMemo(() => {
    let result = filterByTime(snaps, timeFilter);

    if (selectedApp) {
      result = result.filter((s) => (s.sourceApp || 'Unknown') === selectedApp);
    }

    // Sort by createdAt
    const sorted = [...result].sort((a, b) => {
      const cmp =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [snaps, timeFilter, selectedApp, sortDirection]);

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
        selectedApp={selectedApp}
        onSelectedAppChange={setSelectedApp}
        totalCount={snaps.length}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <BrowserHeader
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          snapCount={filteredSnaps.length}
        />
        <main className="flex-1 overflow-y-auto">
          {filteredSnaps.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-neutral-400">No snaps match your filters</p>
            </div>
          ) : (
            <BrowserGrid
              snaps={filteredSnaps}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
