import type { Tag } from '../../../shared/tag-colors';
import { getTagColorStyles } from '../../../shared/tag-colors';

interface TagItemProps {
  tag: string;
  getTagRecord: (tag: string) => Tag | undefined;
  selected?: boolean;
  onClick?: () => void;
}

export function TagItem({
  tag,
  getTagRecord,
  selected,
  onClick,
}: TagItemProps) {
  const tagRecord = getTagRecord(tag);
  const styles = tagRecord?.color ? getTagColorStyles(tagRecord.color) : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium transition-all ${
        selected ? '' : 'hover:opacity-85'
      }`}
      style={{
        backgroundColor: styles?.pillBackground ?? '#EFF6FF',
        color: styles?.pillText ?? '#2563EB',
        border: `1px solid ${styles?.pillBorder ?? '#BFDBFE'}`,
        boxShadow: selected
          ? `0 0 0 2px ${styles?.pillText ?? '#2563EB'}`
          : undefined,
      }}
    >
      {tag}
    </button>
  );
}
