import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import type { SnapItem } from '../../types';
import { FilterPanel } from './FilterPanel';
import { LibraryGrid } from './LibraryGrid';
import { LibraryHeader } from './LibraryHeader';
import { SearchBar, type SearchBarHandle } from './SearchBar';
import { SnapPreviewOverlay } from './SnapPreviewOverlay';

export type TimeFilter = 'all' | '24h' | '7d' | '30d';
export type SortDirection = 'desc' | 'asc';

export type SearchChip =
  | { type: 'app'; value: string }
  | { type: 'tag'; value: string };

export const ZOOM_MIN = 120;
export const ZOOM_MAX = 500;
export const ZOOM_DEFAULT = 180;
const ZOOM_STORAGE_KEY = 'snappy:browser-zoom';

function dateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

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
  const gridScrollRef = useRef<HTMLElement>(null);

  // Selection state (Finder-style): selectedIds is the current selection,
  // anchorId is the pivot point for Shift+click range selection and also
  // drives the visual "focused" outline distinct from additional members.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  // Finder-style Quick Look preview: Space toggles it; arrow keys still
  // change the anchor so the preview follows whatever's selected.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Auto-focus the search bar when the library opens.
  useEffect(() => {
    searchBarRef.current?.focus();
  }, []);

  // Scroll the grid back to the top whenever the active filter changes so
  // clearing a search doesn't leave the viewport pinned to wherever it was
  // in the filtered subset.
  const filterSignature = `${searchText}|${chips
    .map((c) => `${c.type}:${c.value}`)
    .join(',')}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only fire on filter change
  useEffect(() => {
    gridScrollRef.current?.scrollTo({ top: 0 });
  }, [filterSignature]);

  // Window-level shortcuts: Cmd+L focuses search, Esc clears or closes.
  // Reads state via refs so we always see the latest values, not the ones
  // captured when the listener was attached.
  // Holds the most recent values the keyboard handler needs — populated by
  // the effect below so we don't depend on stale closures (and so this ref
  // can be declared before the state it mirrors).
  const latestStateRef = useRef<{
    chips: SearchChip[];
    searchText: string;
    selectedIds: Set<string>;
    anchorId: string | null;
    isPreviewOpen: boolean;
    filteredSnaps: SnapItem[];
    handleDeleteSelected: () => void | Promise<void>;
  }>({
    chips: [],
    searchText: '',
    selectedIds: new Set(),
    anchorId: null,
    isPreviewOpen: false,
    filteredSnaps: [],
    handleDeleteSelected: () => {},
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
      // Space toggles the Quick Look preview when the grid is focused.
      if (e.key === ' ' || e.code === 'Space') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement) return;
        e.preventDefault();
        setIsPreviewOpen((open) => {
          if (open) return false;
          return latestStateRef.current.anchorId !== null;
        });
        return;
      }
      // Cmd+A: select all visible snaps (unless a text field is focused).
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'a'
      ) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement) return;
        e.preventDefault();
        const ids = latestStateRef.current.filteredSnaps.map((s) => s.id);
        setSelectedIds(new Set(ids));
        setAnchorId(ids[0] ?? null);
        return;
      }
      // Arrow navigation over the grid. Ignored while a text field has focus.
      if (e.key.startsWith('Arrow')) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement) return;
        const ids = latestStateRef.current.filteredSnaps.map((s) => s.id);
        if (ids.length === 0) return;
        const current = latestStateRef.current.anchorId ?? ids[0];
        const idx = ids.indexOf(current);
        const fromIdx = idx === -1 ? 0 : idx;

        let nextIdx = fromIdx;
        const snaps = latestStateRef.current.filteredSnaps;
        if (e.key === 'ArrowLeft') nextIdx = Math.max(0, fromIdx - 1);
        else if (e.key === 'ArrowRight')
          nextIdx = Math.min(ids.length - 1, fromIdx + 1);
        else if (e.key === 'ArrowUp') {
          // Jump to the first snap of the previous day (the group above on
          // screen). filteredSnaps is already sorted newest → oldest.
          const currentKey = dateKey(snaps[fromIdx].createdAt);
          let boundary = -1;
          for (let i = fromIdx - 1; i >= 0; i--) {
            if (dateKey(snaps[i].createdAt) !== currentKey) {
              boundary = i;
              break;
            }
          }
          if (boundary === -1) {
            // Already in the top-most group; stay put.
            return;
          }
          // Walk back to the first snap of that earlier day.
          const targetKey = dateKey(snaps[boundary].createdAt);
          let firstOfDay = boundary;
          while (
            firstOfDay > 0 &&
            dateKey(snaps[firstOfDay - 1].createdAt) === targetKey
          ) {
            firstOfDay -= 1;
          }
          nextIdx = firstOfDay;
        } else if (e.key === 'ArrowDown') {
          // Jump to the first snap of the next day below.
          const currentKey = dateKey(snaps[fromIdx].createdAt);
          let target = -1;
          for (let i = fromIdx + 1; i < snaps.length; i++) {
            if (dateKey(snaps[i].createdAt) !== currentKey) {
              target = i;
              break;
            }
          }
          if (target === -1) return; // No later group.
          nextIdx = target;
        }
        if (nextIdx === fromIdx && idx !== -1) return;

        e.preventDefault();
        const nextId = ids[nextIdx];
        if (e.shiftKey && latestStateRef.current.anchorId) {
          const anchorIdx = ids.indexOf(latestStateRef.current.anchorId);
          const [lo, hi] =
            anchorIdx <= nextIdx ? [anchorIdx, nextIdx] : [nextIdx, anchorIdx];
          setSelectedIds(new Set(ids.slice(lo, hi + 1)));
        } else {
          setSelectedIds(new Set([nextId]));
          setAnchorId(nextId);
        }
        // Scroll the newly-focused snap into view.
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>(
            `[data-snap-id="${CSS.escape(nextId)}"]`,
          );
          el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
        return;
      }
      // Enter opens the anchored snap.
      if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement) return;
        const anchor = latestStateRef.current.anchorId;
        if (anchor) {
          e.preventDefault();
          window.snappy.library.openSnap(anchor);
        }
        return;
      }
      // Backspace (not Cmd/Ctrl): delete selected when grid is the focus,
      // not when the search input is focused.
      if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement) return;
        if (latestStateRef.current.selectedIds.size > 0) {
          e.preventDefault();
          latestStateRef.current.handleDeleteSelected();
        }
        return;
      }
      if (e.key === 'Escape') {
        // A child may have already handled Esc (e.g. closing an autocomplete
        // popover); let that take precedence.
        if (e.defaultPrevented) return;
        // Close the preview first, before any other Esc behavior.
        if (latestStateRef.current.isPreviewOpen) {
          e.preventDefault();
          setIsPreviewOpen(false);
          return;
        }
        if (latestStateRef.current.selectedIds.size > 0) {
          e.preventDefault();
          setSelectedIds(new Set());
          setAnchorId(null);
          return;
        }
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

  // Sidebar click semantics: single-select by default — replaces all chips
  // of the same type with this one. Shift+click toggles additively (used
  // when the user actually wants to combine, e.g. "Chrome AND Safari").
  // Clicking the sole selected item in a group deselects it.
  const selectChipFromSidebar = useCallback(
    (chip: SearchChip, additive: boolean) => {
      if (additive) {
        toggleChip(chip);
        return;
      }
      setChips((prev) => {
        const others = prev.filter((c) => c.type !== chip.type);
        const sameType = prev.filter((c) => c.type === chip.type);
        const alreadySoloSelected =
          sameType.length === 1 && sameType[0].value === chip.value;
        if (alreadySoloSelected) return others;
        return [...others, chip];
      });
    },
    [toggleChip],
  );

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

    // Defensive dedupe — if anything upstream ever hands us the same snap
    // twice, the grid would render duplicate date groups. PK guarantees
    // IPC doesn't do this today, but cheap insurance.
    const seenIds = new Set<string>();
    const deduped = result.filter((s) =>
      seenIds.has(s.id) ? false : (seenIds.add(s.id), true),
    );

    const sorted = deduped.sort((a, b) => {
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
      setSelectedIds((prev) => {
        if (!prev.has(snapId)) return prev;
        const next = new Set(prev);
        next.delete(snapId);
        return next;
      });
      loadSnaps();
    },
    [loadSnaps],
  );

  // Finder-style selection. `modifiers` carries Shift / Meta / Ctrl so the
  // handler can do range vs toggle vs single-select.
  const handleSelect = useCallback(
    (
      snapId: string,
      modifiers: { shift: boolean; meta: boolean; ctrl: boolean },
    ) => {
      const ids = filteredSnaps.map((s) => s.id);

      if (modifiers.shift && anchorId) {
        const start = ids.indexOf(anchorId);
        const end = ids.indexOf(snapId);
        if (start === -1 || end === -1) {
          setSelectedIds(new Set([snapId]));
          setAnchorId(snapId);
          return;
        }
        const [lo, hi] = start <= end ? [start, end] : [end, start];
        setSelectedIds(new Set(ids.slice(lo, hi + 1)));
        return;
      }

      if (modifiers.meta || modifiers.ctrl) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(snapId)) next.delete(snapId);
          else next.add(snapId);
          return next;
        });
        setAnchorId(snapId);
        return;
      }

      setSelectedIds(new Set([snapId]));
      setAnchorId(snapId);
    },
    [filteredSnaps, anchorId],
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await Promise.all(
      [...selectedIds].map((id) => window.snappy.library.deleteSnap(id)),
    );
    setSelectedIds(new Set());
    setAnchorId(null);
    loadSnaps();
  }, [selectedIds, loadSnaps]);

  const handleDuplicate = useCallback(
    async (snapId: string) => {
      await window.snappy.snap.duplicate(snapId);
      loadSnaps();
    },
    [loadSnaps],
  );

  useEffect(() => {
    latestStateRef.current = {
      chips,
      searchText,
      selectedIds,
      anchorId,
      isPreviewOpen,
      filteredSnaps,
      handleDeleteSelected,
    };
  });

  return (
    <div className=" flex h-screen flex-col bg-transparent text-neutral-950 dark:text-neutral-100">
      {/* Draggable title bar strip — vertical space for the macOS traffic
          lights with hiddenInset; the whole strip is a drag region so the
          window can be moved by grabbing any empty pixel at the top. */}
      {/* biome-ignore lint/a11y/useSemanticElements: decorative drag region */}
      <div
        className="h-[38px] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <div
        className="flex min-h-0 flex-1


      "
      >
        {/* Sidebar */}
        <FilterPanel
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          sourceApps={sourceApps}
          appChips={appChipValues}
          onSelectApp={(name, additive) =>
            selectChipFromSidebar({ type: 'app', value: name }, additive)
          }
          allTags={allTags}
          tagChips={tagChipValues}
          onSelectTag={(name, additive) =>
            selectChipFromSidebar({ type: 'tag', value: name }, additive)
          }
          totalCount={snaps.length}
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
          <main ref={gridScrollRef} className="flex-1 overflow-y-auto">
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
                selectedIds={selectedIds}
                anchorId={anchorId}
                onSelect={handleSelect}
                onOpen={handleOpen}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onTagsChanged={loadTags}
              />
            )}
          </main>
        </div>
      </div>

      {isPreviewOpen &&
        anchorId &&
        (() => {
          const snap = filteredSnaps.find((s) => s.id === anchorId);
          if (!snap) return null;
          return (
            <SnapPreviewOverlay
              snap={snap}
              onDismiss={() => setIsPreviewOpen(false)}
              onOpen={(id) => {
                setIsPreviewOpen(false);
                handleOpen(id);
              }}
            />
          );
        })()}
    </div>
  );
}
