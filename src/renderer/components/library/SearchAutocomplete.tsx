import { useEffect, useRef, useState } from 'react';
import type { HexColor } from '../../../shared/tag-colors';
import { getTagColorStyles } from '../../../shared/tag-colors';
import type { AutocompleteOption, TriggerType } from './SearchBar';

interface SearchAutocompleteProps {
  triggerType: TriggerType;
  options: AutocompleteOption[];
  activeIdx: number;
  onHover: (idx: number) => void;
  onSelect: (value: string) => void;
}

const SECTION_LABEL: Record<TriggerType, string> = {
  tag: 'Tags',
  app: 'Applications',
};

export function SearchAutocomplete({
  triggerType,
  options,
  activeIdx,
  onHover,
  onSelect,
}: SearchAutocompleteProps) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-full max-w-xs overflow-hidden rounded-md border border-neutral-200 bg-white shadow-xl">
      <div className="border-neutral-100 border-b px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        {SECTION_LABEL[triggerType]}
      </div>
      <ul className="max-h-64 overflow-y-auto py-1">
        {options.map((opt, i) => {
          const active = i === activeIdx;
          return (
            <li key={opt.value}>
              <button
                type="button"
                onMouseEnter={() => onHover(i)}
                onMouseDown={(e) => {
                  // Prevent input blur before click commits
                  e.preventDefault();
                  onSelect(opt.value);
                }}
                className={`flex w-full items-center gap-2 px-2 py-1 text-left text-[12px] ${
                  active
                    ? 'bg-blue-500 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {triggerType === 'tag' && <TagDot color={opt.color ?? null} />}
                {triggerType === 'app' && <AppIconSmall appName={opt.value} />}
                <span className="flex-1 truncate">{opt.value}</span>
                {opt.count !== undefined && (
                  <span
                    className={`text-[10px] ${active ? 'text-blue-100' : 'text-neutral-400'}`}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TagDot({ color }: { color: HexColor | null }) {
  const dotColor = color ? getTagColorStyles(color).dotColor : '#9ca3af';
  return (
    <span
      className="h-2 w-2 flex-shrink-0 rounded-full"
      style={{ backgroundColor: dotColor }}
    />
  );
}

function AppIconSmall({ appName }: { appName: string }) {
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (appName && appName !== 'Other') {
      window.snap.library.getAppIcon(appName).then((src) => {
        if (!cancelledRef.current) setIconSrc(src);
      });
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [appName]);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        className="h-3.5 w-3.5 flex-shrink-0"
        draggable={false}
      />
    );
  }

  return (
    <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded bg-neutral-300 text-[7px] text-neutral-600">
      ?
    </span>
  );
}
