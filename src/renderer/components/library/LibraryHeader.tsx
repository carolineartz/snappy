import { GridIcon, SortIcon } from '../icons';
import type { SortDirection } from './LibraryApp';
import { ZOOM_MAX, ZOOM_MIN } from './LibraryApp';

interface LibraryHeaderProps {
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  snapCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function LibraryHeader({
  sortDirection,
  onSortDirectionChange,
  snapCount,
  zoom,
  onZoomChange,
}: LibraryHeaderProps) {
  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-1.5">
      <span className="text-xs text-neutral-400">
        {snapCount} snap{snapCount !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-3">
        {/* Zoom slider */}
        <div className="flex items-center gap-1.5 text-neutral-400">
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
          className="flex h-7 items-center gap-1 rounded px-2 text-[12px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <SortIcon direction={sortDirection} />
          <span>Date</span>
        </button>
      </div>
    </div>
  );
}
