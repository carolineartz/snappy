// SVG icons — decorative, inside titled buttons
const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const PointerIcon = () => (
  <svg {...iconProps}>
    <path d="M3 2 L3 12 L6 9 L8 13 L10 12 L8 8 L12 8 Z" />
  </svg>
);

export const PencilIcon = () => (
  <svg {...iconProps}>
    <path d="M10 2 L14 6 L6 14 L2 14 L2 10 Z" />
    <path d="M9 3 L13 7" />
  </svg>
);

export const TextIcon = () => (
  <svg {...iconProps}>
    <path d="M3 3 L13 3" />
    <path d="M8 3 L8 13" />
  </svg>
);

export const RectIcon = () => (
  <svg {...iconProps}>
    <rect x="2.5" y="3" width="11" height="10" rx="0.5" />
  </svg>
);

export const EllipseIcon = () => (
  <svg {...iconProps}>
    <ellipse cx="8" cy="8" rx="5.5" ry="5" />
  </svg>
);

export const ArrowIcon = () => (
  <svg {...iconProps}>
    <path d="M2 14 L14 2" />
    <path d="M8 2 L14 2 L14 8" />
  </svg>
);

export const EraserIcon = () => (
  <svg {...iconProps}>
    <path d="M2 11 L6 15 L14 7 L10 3 Z" />
    <path d="M6 15 L14 15" />
    <path d="M6 7 L10 11" />
  </svg>
);

export const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M2 4 L14 4" />
    <path d="M6 4 L6 2 L10 2 L10 4" />
    <path d="M4 4 L4 14 L12 14 L12 4" />
    <path d="M6.5 7 L6.5 12" />
    <path d="M9.5 7 L9.5 12" />
  </svg>
);

export const CopyIcon = () => (
  <svg {...iconProps}>
    <rect x="5" y="5" width="9" height="9" rx="1" />
    <path d="M11 5 L11 3 C11 2.5 10.5 2 10 2 L3 2 C2.5 2 2 2.5 2 3 L2 10 C2 10.5 2.5 11 3 11 L5 11" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M4 4 L12 12" />
    <path d="M12 4 L4 12" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M3 8 L7 12 L13 4" />
  </svg>
);

export const SortIcon = ({ direction }: { direction: 'desc' | 'asc' }) => (
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

export const GridIcon = ({ small }: { small?: boolean }) => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    {small ? (
      <>
        <rect x="2" y="2" width="4" height="4" rx="0.5" />
        <rect x="10" y="2" width="4" height="4" rx="0.5" />
        <rect x="2" y="10" width="4" height="4" rx="0.5" />
        <rect x="10" y="10" width="4" height="4" rx="0.5" />
      </>
    ) : (
      <>
        <rect x="2" y="2" width="12" height="12" rx="1" />
      </>
    )}
  </svg>
);
