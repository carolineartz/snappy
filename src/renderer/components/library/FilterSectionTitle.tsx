import { useEffect, useRef } from 'react';
import { SearchIcon } from '../icons';

interface FilterSectionTitleProps {
  label: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
}

export function FilterSectionTitle({
  label,
  searchValue,
  onSearchChange,
  searchOpen,
  onToggleSearch,
}: FilterSectionTitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <div>
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </h3>
        <button
          type="button"
          onClick={onToggleSearch}
          title={`Search ${label.toLowerCase()}`}
          className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
            searchOpen || searchValue
              ? 'text-neutral-600'
              : 'text-neutral-300 hover:text-neutral-500'
          }`}
        >
          <SearchIcon />
        </button>
      </div>
      {searchOpen && (
        <div className="px-2 pt-1">
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onBlur={() => {
              // Only collapse if empty
              if (!searchValue) onToggleSearch();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onSearchChange('');
                onToggleSearch();
              }
            }}
            placeholder={`Filter ${label.toLowerCase()}...`}
            className="w-full rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 outline-none focus:border-blue-400"
          />
        </div>
      )}
    </div>
  );
}
