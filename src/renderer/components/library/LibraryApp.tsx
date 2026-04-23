import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import type { SnapItem } from '../../types';
import { FilterPanel } from './FilterPanel';
import { LibraryGrid } from './LibraryGrid';
import { LibraryHeader } from './LibraryHeader';
import { SearchBar, type SearchBarHandle } from './SearchBar';

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

  const searchBarRef = useRef<SearchBarHandle>(null);

  // Auto-focus the search bar when the library opens.
  useEffect(() => {
    searchBarRef.current?.focus();
  }, []);

  // Window-level shortcuts: Cmd+L focuses search, Esc clears or closes.
  // Reads state via refs so we always see the latest values, not the ones
  // captured when the listener was attached.
  const latestStateRef = useRef({ chips, searchText });
  useEffect(() => {
    latestStateRef.current = { chips, searchText };
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'l'
      ) {
        e.preventDefault();
        searchBarRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        // A child may have already handled Esc (e.g. closing an autocomplete
        // popover); let that take precedence.
        if (e.defaultPrevented) return;
        const { chips: latestChips, searchText: latestText } =
          latestStateRef.current;
        if (latestChips.length > 0 || latestText.length > 0) {
          e.preventDefault();
          setChips([]);
          setSearchText('');
          searchBarRef.current?.focus();
        } else {
          window.close();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
  // Parse keyword triggers out of the free-text search:
  //   name:<q>  -> filter snap.name only
  //   text:<q>  -> filter OCR text only
  // The remaining tokens (after stripping all known keyword: fragments) are
  // matched against snap.name + OCR + classification labels AND fed to
  // MobileCLIP for semantic similarity. Uncommitted tag:/app: fragments are
  // stripped so partially-typed triggers don't leak into the free-text match.
  const parsedSearch = useMemo(() => {
    const nameMatch = searchText.match(/\bname:(\S+)/i);
    const textMatch = searchText.match(/\btext:(\S+)/i);
    const nameQuery = nameMatch ? nameMatch[1].toLowerCase() : null;
    const ocrOnlyQuery = textMatch ? textMatch[1].toLowerCase() : null;
    const freeText = searchText
      .replace(/\b(?:name|tag|app|text):\S*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return { nameQuery, ocrOnlyQuery, freeText };
  }, [searchText]);

  // CLIP semantic search: debounce the free-text query, send to the main
  // process, cache scored snap IDs for the filter pipeline to consume.
  // Uses a token counter so in-flight requests that are superseded (or
  // outlive an input clear) don't overwrite current state.
  const [clipScores, setClipScores] = useState<Map<string, number>>(new Map());
  const clipTokenRef = useRef(0);
  useEffect(() => {
    const q = parsedSearch.freeText;
    if (!q || q.length < 3) {
      clipTokenRef.current += 1;
      setClipScores((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    const token = ++clipTokenRef.current;
    const t = setTimeout(() => {
      window.snappy.library.searchByText(q, 0.2).then((results) => {
        if (token !== clipTokenRef.current) return;
        setClipScores(new Map(results.map((r) => [r.snapId, r.score])));
      });
    }, 250);
    return () => clearTimeout(t);
  }, [parsedSearch.freeText]);

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

    if (parsedSearch.nameQuery) {
      const q = parsedSearch.nameQuery;
      result = result.filter((s) => (s.name ?? '').toLowerCase().includes(q));
    }

    if (parsedSearch.ocrOnlyQuery) {
      const q = parsedSearch.ocrOnlyQuery;
      result = result.filter((s) =>
        (s.ocrText ?? '').toLowerCase().includes(q),
      );
    }

    // Track CLIP-based relevance so we can re-rank below.
    const scoreBySnap = new Map<string, number>();
    if (parsedSearch.freeText) {
      const q = parsedSearch.freeText;
      result = result.filter((s) => {
        const name = (s.name ?? '').toLowerCase();
        const ocr = (s.ocrText ?? '').toLowerCase();
        const labels = (s.classificationLabels ?? '').toLowerCase();
        const substringHit =
          name.includes(q) || ocr.includes(q) || labels.includes(q);
        const clipScore = clipScores.get(s.id);
        if (substringHit) {
          scoreBySnap.set(s.id, 1 + (clipScore ?? 0));
          return true;
        }
        if (clipScore !== undefined) {
          scoreBySnap.set(s.id, clipScore);
          return true;
        }
        return false;
      });
    }

    const sorted = [...result].sort((a, b) => {
      if (parsedSearch.freeText) {
        const da = scoreBySnap.get(a.id) ?? 0;
        const db = scoreBySnap.get(b.id) ?? 0;
        if (db !== da) return db - da;
      }
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
    parsedSearch,
    snapTags,
    sortDirection,
    clipScores,
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
              ref={searchBarRef}
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
