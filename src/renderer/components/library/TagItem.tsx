import { getTagColorStyles, TagSummary } from "../../../shared/tag-colors";


interface TagItemProps {
  tag: string;
  getTagRecord: (tag: string) => TagSummary | undefined;
  removeTag: (tag: string) => void;
}

export function TagItem({ tag, getTagRecord, removeTag }: TagItemProps) {
  const tagRecord = getTagRecord(tag);
  const styles = tagRecord?.color
    ? getTagColorStyles(tagRecord.color)
    : null;

  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0 text-[9px]"
      style={{
        backgroundColor: styles?.pillBackground ?? '#EFF6FF',
        color: styles?.pillText ?? '#2563EB',
        border: `1px solid ${styles?.pillBorder ?? '#BFDBFE'}`,
      }}
    >
      <span
        className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: styles?.dotColor ?? '#3B82F6' }}
      />
      {tag}
      <button
        type="button"
        className="ml-0.5 hover:opacity-80"
        style={{ color: styles?.pillText ?? '#2563EB' }}
        onClick={(e) => {
          e.stopPropagation();
          removeTag(tag);
        }}
      >
        ×
      </button>
    </span>
  );
}
