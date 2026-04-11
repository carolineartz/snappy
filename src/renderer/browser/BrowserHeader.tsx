import type { SortDirection } from './BrowserApp';

interface BrowserHeaderProps {
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  snapCount: number;
}

const SortIcon = ({ direction }: { direction: SortDirection }) => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {direction === 'desc' ? (
      <>
        <path d="M8 3 L8 13" />
        <path d="M4 9 L8 13 L12 9" />
      </>
    ) : (
      <>
        <path d="M8 13 L8 3" />
        <path d="M4 7 L8 3 L12 7" />
      </>
    )}
  </svg>
);

export function BrowserHeader({
  sortDirection,
  onSortDirectionChange,
  snapCount,
}: BrowserHeaderProps) {
  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 pt-10">
      <span className="text-xs text-neutral-400">
        {snapCount} snap{snapCount !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-2">
        {/* Sort direction toggle */}
        <button
          type="button"
          onClick={toggleDirection}
          title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
          className="flex h-7 items-center gap-1 rounded px-2 text-[12px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <SortIcon direction={sortDirection} />
          <span>Date</span>
        </button>

        {/* Search placeholder — V2 */}
        {/* <input placeholder="Search..." /> */}
      </div>
    </div>
  );
}
