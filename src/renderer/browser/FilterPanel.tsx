import { useEffect, useState } from 'react';
import type { TimeFilter } from './BrowserApp';

interface FilterPanelProps {
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  sourceApps: Map<string, number>;
  selectedApp: string | null;
  onSelectedAppChange: (app: string | null) => void;
  allTags: { tag: string; count: number }[];
  selectedTag: string | null;
  onSelectedTagChange: (tag: string | null) => void;
  totalCount: number;
}

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All Snaps' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

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

export function FilterPanel({
  timeFilter,
  onTimeFilterChange,
  sourceApps,
  selectedApp,
  onSelectedAppChange,
  allTags,
  selectedTag,
  onSelectedTagChange,
  totalCount,
}: FilterPanelProps) {
  return (
    <div className="flex w-52 flex-shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/80 pt-2">
      {/* Recent filters */}
      <div className="px-3 pb-2">
        <h3 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Recent
        </h3>
        <ul>
          {TIME_FILTERS.map(({ value, label }) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => {
                  onTimeFilterChange(value);
                  onSelectedAppChange(null);
                }}
                className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-[13px] transition-colors ${
                  timeFilter === value && selectedApp === null
                    ? 'bg-blue-500 text-white'
                    : 'text-neutral-700 hover:bg-neutral-200/60'
                }`}
              >
                <span>{label}</span>
                {value === 'all' && (
                  <span
                    className={`text-[11px] ${timeFilter === 'all' && selectedApp === null ? 'text-blue-100' : 'text-neutral-400'}`}
                  >
                    {totalCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-3 border-t border-neutral-200" />

      {/* App filters */}
      <div className="flex-1 overflow-y-auto px-3 pt-2">
        <h3 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Applications
        </h3>
        <ul>
          {[...sourceApps.entries()].map(([appName, count]) => (
            <li key={appName}>
              <button
                type="button"
                onClick={() =>
                  onSelectedAppChange(selectedApp === appName ? null : appName)
                }
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[13px] transition-colors ${
                  selectedApp === appName
                    ? 'bg-blue-500 text-white'
                    : 'text-neutral-700 hover:bg-neutral-200/60'
                }`}
              >
                <AppIcon appName={appName} />
                <span className="flex-1 truncate">{appName}</span>
                <span
                  className={`text-[11px] ${selectedApp === appName ? 'text-blue-100' : 'text-neutral-400'}`}
                >
                  {count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-3 border-t border-neutral-200" />

      {/* Tags */}
      <div className="px-3 py-2">
        <h3 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Tags
        </h3>
        {allTags.length === 0 ? (
          <p className="px-2 py-1 text-[11px] text-neutral-300 italic">
            No tags yet
          </p>
        ) : (
          <ul>
            {allTags.map(({ tag, count }) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() =>
                    onSelectedTagChange(selectedTag === tag ? null : tag)
                  }
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-[13px] transition-colors ${
                    selectedTag === tag
                      ? 'bg-blue-500 text-white'
                      : 'text-neutral-700 hover:bg-neutral-200/60'
                  }`}
                >
                  <span className="truncate">{tag}</span>
                  <span
                    className={`text-[11px] ${selectedTag === tag ? 'text-blue-100' : 'text-neutral-400'}`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
