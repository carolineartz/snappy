import { GridIcon, SortIcon } from '../icons';
import type { SortDirection } from './LibraryApp';
import { ZOOM_MAX, ZOOM_MIN } from './LibraryApp';

interface LibraryHeaderProps {
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  snapCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  search?: React.ReactNode;
}

export function LibraryHeader({
  sortDirection,
  onSortDirectionChange,
  snapCount,
  zoom,
  onZoomChange,
  search,
}: LibraryHeaderProps) {
  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 backdrop-blur-xl backdrop-saturate-150">
      <span className="flex-shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {snapCount} snap{snapCount !== 1 ? 's' : ''}
      </span>

      <div className="min-w-0 flex-1">{search}</div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {/* Zoom slider */}
        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-500">
          <GridIcon small />
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={10}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-blue-500"
            title={`Zoom: ${zoom}px`}
          />
          <GridIcon />
        </div>

        {/* Sort direction toggle */}
        <button
          type="button"
          onClick={toggleDirection}
          title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-neutral-600 transition-colors hover:bg-black/5 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
        >
          <SortIcon direction={sortDirection} />
          <span>Date</span>
        </button>
      </div>
    </div>
  );
}
