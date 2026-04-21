import { useEffect, useMemo, useState } from 'react';
import type { TagWithUsageCount } from '../../../shared/tag-colors';
import { getTagColorStyles } from '../../../shared/tag-colors';
import { FilterSectionTitle } from './FilterSectionTitle';
import type { TimeFilter } from './LibraryApp';

interface FilterPanelProps {
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  sourceApps: Map<string, number>;
  appChips: string[];
  onToggleApp: (app: string) => void;
  allTags: TagWithUsageCount[];
  tagChips: string[];
  onToggleTag: (tag: string) => void;
  totalCount: number;
  hasActiveChips: boolean;
  onClearChips: () => void;
}

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All Snaps' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

/** Approximate row height in px, used to compute how many items fit in half the sidebar */
const ROW_HEIGHT = 26;

function AppIcon({ appName }: { appName: string }) {
  const [iconSrc, setIconSrc] = useState<string | null>(null);

  useEffect(() => {
    if (appName && appName !== 'Other') {
      window.snappy.library.getAppIcon(appName).then(setIconSrc);
    }
  }, [appName]);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        className="h-4 w-4 flex-shrink-0"
        draggable={false}
      />
    );
  }

  return (
    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-neutral-300 text-[8px] text-neutral-600">
      ?
    </span>
  );
}

interface FilterRowProps {
  leading?: React.ReactNode;
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}

function FilterRow({
  leading,
  label,
  count,
  selected,
  onClick,
}: FilterRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[13px] transition-colors ${
        selected
          ? 'bg-blue-500 text-white'
          : 'text-neutral-700 hover:bg-neutral-200/60'
      }`}
    >
      {leading}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span
          className={`text-[11px] ${selected ? 'text-blue-100' : 'text-neutral-400'}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterPanel({
  timeFilter,
  onTimeFilterChange,
  sourceApps,
  appChips,
  onToggleApp,
  allTags,
  tagChips,
  onToggleTag,
  totalCount,
  hasActiveChips,
  onClearChips,
}: FilterPanelProps) {
  const appChipsSet = useMemo(() => new Set(appChips), [appChips]);
  const tagChipsSet = useMemo(() => new Set(tagChips), [tagChips]);
  const [appsSearch, setAppsSearch] = useState('');
  const [tagsSearch, setTagsSearch] = useState('');
  const [appsSearchOpen, setAppsSearchOpen] = useState(false);
  const [tagsSearchOpen, setTagsSearchOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<
    'apps' | 'tags' | null
  >(null);

  // Measure the apps+tags region to compute how many items fit in "half"
  const [availableHeight, setAvailableHeight] = useState(0);
  const scrollRegionRef = (node: HTMLDivElement | null) => {
    if (!node) return;
    const h = node.getBoundingClientRect().height;
    if (h !== availableHeight) setAvailableHeight(h);
  };

  const filteredApps = useMemo(() => {
    const entries = [...sourceApps.entries()];
    if (!appsSearch.trim()) return entries;
    const q = appsSearch.trim().toLowerCase();
    return entries.filter(([name]) => name.toLowerCase().includes(q));
  }, [sourceApps, appsSearch]);

  const filteredTags = useMemo(() => {
    if (!tagsSearch.trim()) return allTags;
    const q = tagsSearch.trim().toLowerCase();
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, tagsSearch]);

  // Approximate rows that fit in half the available height (minus title/search space)
  const halfRows = Math.max(
    1,
    Math.floor((availableHeight / 2 - 40) / ROW_HEIGHT),
  );

  const appsOverflows = filteredApps.length > halfRows;
  const tagsOverflows = filteredTags.length > halfRows;

  const isAppsExpanded = expandedSection === 'apps';
  const isTagsExpanded = expandedSection === 'tags';

  const visibleApps = isAppsExpanded
    ? filteredApps
    : appsOverflows
      ? filteredApps.slice(0, halfRows - 1)
      : filteredApps;

  const visibleTags = isTagsExpanded
    ? filteredTags
    : tagsOverflows
      ? filteredTags.slice(0, halfRows - 1)
      : filteredTags;

  return (
    <div className="flex w-52 flex-shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/80 pt-2">
      {/* Recent filters — fixed at top */}
      <div className="flex-shrink-0 px-3 pb-2">
        <h3 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Recent
        </h3>
        <ul>
          {TIME_FILTERS.map(({ value, label }) => (
            <li key={value}>
              <FilterRow
                label={label}
                count={value === 'all' ? totalCount : undefined}
                selected={timeFilter === value && !hasActiveChips}
                onClick={() => {
                  onTimeFilterChange(value);
                  if (value === 'all' && hasActiveChips) onClearChips();
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-3 border-t border-neutral-200" />

      {/* Apps + Tags — shared scroll region, sections size to content */}
      <div ref={scrollRegionRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* Applications */}
        <div className="px-3 pt-2">
          <FilterSectionTitle
            label="Applications"
            searchValue={appsSearch}
            onSearchChange={setAppsSearch}
            searchOpen={appsSearchOpen}
            onToggleSearch={() => setAppsSearchOpen((v) => !v)}
          />
          <ul className="mt-1">
            {visibleApps.map(([appName, count]) => (
              <li key={appName}>
                <FilterRow
                  leading={<AppIcon appName={appName} />}
                  label={appName}
                  count={count}
                  selected={appChipsSet.has(appName)}
                  onClick={() => onToggleApp(appName)}
                />
              </li>
            ))}
            {appsOverflows && (
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(isAppsExpanded ? null : 'apps')
                  }
                  className="w-full px-2 py-1 text-left text-[11px] text-blue-600 hover:underline"
                >
                  {isAppsExpanded
                    ? 'Show less'
                    : `Show ${filteredApps.length - visibleApps.length} more…`}
                </button>
              </li>
            )}
            {filteredApps.length === 0 && appsSearch && (
              <li className="px-2 py-1 text-[11px] text-neutral-400 italic">
                No matches
              </li>
            )}
          </ul>
        </div>

        <div className="mx-3 mt-2 border-t border-neutral-200" />

        {/* Tags */}
        <div className="px-3 pt-2 pb-2">
          <FilterSectionTitle
            label="Tags"
            searchValue={tagsSearch}
            onSearchChange={setTagsSearch}
            searchOpen={tagsSearchOpen}
            onToggleSearch={() => setTagsSearchOpen((v) => !v)}
          />
          <ul className="mt-1">
            {allTags.length === 0 && !tagsSearch ? (
              <li className="px-2 py-1 text-[11px] text-neutral-300 italic">
                No tags yet
              </li>
            ) : (
              <>
                {visibleTags.map((tag) => {
                  const dotColor = tag.color
                    ? getTagColorStyles(tag.color).dotColor
                    : '#9ca3af';
                  return (
                    <li key={tag.name}>
                      <FilterRow
                        leading={
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                        }
                        label={tag.name}
                        count={tag.usageCount}
                        selected={tagChipsSet.has(tag.name)}
                        onClick={() => onToggleTag(tag.name)}
                      />
                    </li>
                  );
                })}
                {tagsOverflows && (
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSection(isTagsExpanded ? null : 'tags')
                      }
                      className="w-full px-2 py-1 text-left text-[11px] text-blue-600 hover:underline"
                    >
                      {isTagsExpanded
                        ? 'Show less'
                        : `Show ${filteredTags.length - visibleTags.length} more…`}
                    </button>
                  </li>
                )}
                {filteredTags.length === 0 && tagsSearch && (
                  <li className="px-2 py-1 text-[11px] text-neutral-400 italic">
                    No matches
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
