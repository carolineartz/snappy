import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  HexColor,
  Tag,
  TagWithUsageCount,
} from '../../../shared/tag-colors';
import { getTagColorStyles } from '../../../shared/tag-colors';
import type { SearchChip } from './LibraryApp';
import { SearchAutocomplete } from './SearchAutocomplete';

interface SearchBarProps {
  chips: SearchChip[];
  text: string;
  onTextChange: (t: string) => void;
  onAddChip: (c: SearchChip) => void;
  onRemoveChip: (c: SearchChip) => void;
  allTags: TagWithUsageCount[];
  sourceApps: Map<string, number>;
  getTagRecord: (name: string) => Tag | undefined;
}

export interface SearchBarHandle {
  focus(): void;
}

const TRIGGER_RE = /\b(tag|app):(\S*)$/;
const MAX_OPTIONS = 10;

export type TriggerType = 'tag' | 'app';

export interface AutocompleteOption {
  value: string;
  count?: number;
  color?: HexColor | null;
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
  function SearchBar(
    {
      chips,
      text,
      onTextChange,
      onAddChip,
      onRemoveChip,
      allTags,
      sourceApps,
      getTagRecord,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          inputRef.current?.focus();
          inputRef.current?.select();
        },
      }),
      [],
    );

    // Detect trigger (tag:/app:...) at end of text. `name:` is handled by the
    // library filter directly — no popover, results filter live.
    const trigger = useMemo(() => {
      const match = text.match(TRIGGER_RE);
      if (!match) return null;
      return {
        type: match[1] as TriggerType,
        query: match[2],
        fullMatch: match[0],
      };
    }, [text]);

    const options = useMemo<AutocompleteOption[]>(() => {
      if (!trigger) return [];
      const q = trigger.query.toLowerCase();
      if (trigger.type === 'tag') {
        const assignedTags = new Set(
          chips.filter((c) => c.type === 'tag').map((c) => c.value),
        );
        return allTags
          .filter(
            (t) =>
              !assignedTags.has(t.name) && t.name.toLowerCase().includes(q),
          )
          .slice(0, MAX_OPTIONS)
          .map((t) => ({ value: t.name, count: t.usageCount, color: t.color }));
      }
      // app
      const assignedApps = new Set(
        chips.filter((c) => c.type === 'app').map((c) => c.value),
      );
      return [...sourceApps.entries()]
        .filter(
          ([name]) => !assignedApps.has(name) && name.toLowerCase().includes(q),
        )
        .slice(0, MAX_OPTIONS)
        .map(([value, count]) => ({ value, count }));
    }, [trigger, allTags, sourceApps, chips]);

    // Clamp active index when options shrink
    useEffect(() => {
      setActiveIdx((i) => (i >= options.length ? 0 : i));
    }, [options.length]);

    const popoverOpen = isFocused && trigger !== null && options.length > 0;

    const commitChip = (value: string) => {
      if (!trigger) return;
      const base = text.slice(0, text.length - trigger.fullMatch.length);
      onTextChange(base);
      onAddChip({ type: trigger.type, value });
      inputRef.current?.focus();
    };

    const stripTrigger = () => {
      if (!trigger) return;
      const base = text.slice(0, text.length - trigger.fullMatch.length);
      onTextChange(base);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (popoverOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIdx((i) => (i + 1) % options.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIdx((i) => (i - 1 + options.length) % options.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const opt = options[activeIdx];
          if (opt) commitChip(opt.value);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          stripTrigger();
          inputRef.current?.focus();
          return;
        }
      }
      if (e.key === 'Backspace') {
        // Controlled inputs in Electron can skip firing onChange after
        // Cmd/Option+Backspace (and also when a selection covers the
        // whole field — common after our auto-focus + select()), leaving
        // React state out of sync with the DOM. Apply the deletion in JS
        // using the DOM's live value so state stays correct.
        const input = e.currentTarget;
        const liveValue = input.value;
        const selStart = input.selectionStart ?? liveValue.length;
        const selEnd = input.selectionEnd ?? selStart;

        if (e.metaKey) {
          // Cmd+Backspace: delete from start of line to selection end.
          e.preventDefault();
          onTextChange(liveValue.slice(selEnd));
          return;
        }
        if (e.altKey) {
          // Option+Backspace: delete the previous word (plus selection).
          e.preventDefault();
          const before = liveValue.slice(0, selEnd);
          const after = liveValue.slice(selEnd);
          const match = before.match(/\S+\s*$|\s+$/);
          const wordStart = match ? before.length - match[0].length : 0;
          onTextChange(before.slice(0, wordStart) + after);
          return;
        }
        if (liveValue === '' && chips.length > 0 && selStart === 0) {
          e.preventDefault();
          onRemoveChip(chips[chips.length - 1]);
        }
      }
    };

    return (
      <div className="relative w-full max-w-md">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper forwards click to input */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: wrapper forwards click to input */}
        <div
          onClick={() => inputRef.current?.focus()}
          className={`flex min-h-[26px] flex-wrap items-center gap-1 rounded-md border px-2 py-0.5 transition-colors ${
            isFocused
              ? 'border-blue-400 bg-white dark:border-blue-500 dark:bg-white/10'
              : 'border-transparent bg-black/[0.04] dark:border-transparent dark:bg-white/5'
          }`}
        >
          {chips.map((chip) => (
            <SearchChipPill
              key={`${chip.type}:${chip.value}`}
              chip={chip}
              getTagRecord={getTagRecord}
              onRemove={() => onRemoveChip(chip)}
            />
          ))}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              chips.length === 0 ? 'Search — or name: text: tag: app:…' : ''
            }
            className="min-w-[80px] flex-1 bg-transparent py-0.5 text-[12px] text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
        </div>
        {popoverOpen && (
          <SearchAutocomplete
            triggerType={trigger.type}
            options={options}
            activeIdx={activeIdx}
            onHover={setActiveIdx}
            onSelect={commitChip}
          />
        )}
      </div>
    );
  },
);

function SearchChipPill({
  chip,
  getTagRecord,
  onRemove,
}: {
  chip: SearchChip;
  getTagRecord: (name: string) => Tag | undefined;
  onRemove: () => void;
}) {
  let leading: React.ReactNode;
  if (chip.type === 'tag') {
    const record = getTagRecord(chip.value);
    const dotColor = record?.color
      ? getTagColorStyles(record.color).dotColor
      : '#9ca3af';
    leading = (
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
    );
  } else {
    leading = <AppIconInline appName={chip.value} />;
  }

  return (
    <span className="flex items-center gap-1 rounded bg-neutral-200/70 py-0.5 pr-0.5 pl-1.5 text-[11px] text-neutral-700 dark:bg-white/10 dark:text-neutral-200">
      {leading}
      <span>{chip.value}</span>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="flex h-3.5 w-3.5 items-center justify-center rounded text-neutral-500 hover:bg-neutral-300 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100"
        aria-label={`Remove ${chip.value}`}
      >
        ×
      </button>
    </span>
  );
}

function AppIconInline({ appName }: { appName: string }) {
  const [iconSrc, setIconSrc] = useState<string | null>(null);

  useEffect(() => {
    if (appName && appName !== 'Other') {
      window.snap.library.getAppIcon(appName).then(setIconSrc);
    }
  }, [appName]);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        className="h-3 w-3 flex-shrink-0"
        draggable={false}
      />
    );
  }

  return (
    <span className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded bg-neutral-300 text-[7px] text-neutral-600">
      ?
    </span>
  );
}
