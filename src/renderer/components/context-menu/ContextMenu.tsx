import type { ReactNode } from 'react';
import type { AnnotationTool } from '../../../shared/annotation-types';
import {
  DEFAULT_COLORS,
  DEFAULT_STROKE_WIDTHS,
} from '../../../shared/annotation-types';
import {
  ArrowIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  EllipseIcon,
  EraserIcon,
  PencilIcon,
  PointerIcon,
  RectIcon,
  TextIcon,
  TrashIcon,
} from '../icons';

interface ContextMenuProps {
  x: number;
  y: number;
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  hasShadow: boolean;
  hasAnnotations: boolean;
  onSetTool: (tool: AnnotationTool) => void;
  onSetColor: (color: string) => void;
  onSetStroke: (width: number) => void;
  onCopy: () => void;
  onToggleShadow: () => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRevert: () => void;
  onDismiss: () => void;
}

const TOOLS: {
  tool: AnnotationTool;
  label: string;
  Icon: () => ReactNode;
}[] = [
  { tool: 'pointer', label: 'Pointer', Icon: PointerIcon },
  { tool: 'freehand', label: 'Draw', Icon: PencilIcon },
  { tool: 'text', label: 'Text', Icon: TextIcon },
  { tool: 'rect', label: 'Rectangle', Icon: RectIcon },
  { tool: 'ellipse', label: 'Ellipse', Icon: EllipseIcon },
  { tool: 'arrow', label: 'Arrow', Icon: ArrowIcon },
  { tool: 'eraser', label: 'Eraser', Icon: EraserIcon },
];

function ToolButton({
  Icon,
  label,
  isActive,
  onClick,
}: {
  Icon: () => ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        isActive
          ? 'bg-blue-500 text-white'
          : 'text-neutral-700 hover:bg-neutral-200'
      }`}
    >
      <Icon />
    </button>
  );
}

function ColorSwatch({
  color,
  isActive,
  onClick,
}: {
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={color}
      onClick={onClick}
      className={`h-5 w-5 rounded-sm border transition-transform ${
        isActive
          ? 'scale-110 border-blue-500 ring-1 ring-blue-500'
          : 'border-neutral-300 hover:scale-105'
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

function StrokeButton({
  width,
  isActive,
  onClick,
}: {
  width: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={`${width}px`}
      onClick={onClick}
      className={`flex h-6 w-8 items-center justify-center rounded transition-colors ${
        isActive ? 'bg-blue-100 ring-1 ring-blue-500' : 'hover:bg-neutral-200'
      }`}
    >
      <div
        className="rounded-full bg-neutral-700"
        style={{ width: 12 + width * 2, height: width }}
      />
    </button>
  );
}

function MenuItem({
  label,
  shortcut,
  Icon,
  disabled,
  danger,
  onClick,
}: {
  label: string;
  shortcut?: string;
  Icon?: () => ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
        disabled
          ? 'text-neutral-400'
          : danger
            ? 'text-red-600 hover:bg-red-500 hover:text-white'
            : 'text-neutral-700 hover:bg-blue-500 hover:text-white'
      }`}
    >
      {Icon && (
        <span className="flex h-4 w-4 items-center justify-center">
          <Icon />
        </span>
      )}
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="ml-4 text-[11px] text-neutral-400">{shortcut}</span>
      )}
    </button>
  );
}

function CheckMenuItem({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-blue-500 hover:text-white"
    >
      <span className="flex h-4 w-4 items-center justify-center">
        {checked ? <CheckIcon /> : null}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

export function ContextMenu({
  x,
  y,
  activeTool,
  activeColor,
  activeStrokeWidth,
  hasShadow,
  hasAnnotations,
  onSetTool,
  onSetColor,
  onSetStroke,
  onCopy,
  onToggleShadow,
  onClose,
  onDelete,
  onDuplicate,
  onRevert,
  onDismiss,
}: ContextMenuProps) {
  const handleAction = (action: () => void) => {
    action();
    onDismiss();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: context menu overlay
    // biome-ignore lint/a11y/useKeyWithClickEvents: dismiss backdrop, not keyboard interactive
    <div
      className="fixed inset-0 z-50"
      onClick={onDismiss}
      onContextMenu={(e) => {
        e.preventDefault();
        onDismiss();
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: menu panel */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation, not interactive */}
      <div
        className="absolute min-w-[200px] rounded-lg border border-neutral-200 bg-white/95 py-1 shadow-xl backdrop-blur-md"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {/* Tools row */}
        <div className="flex items-center gap-1 px-2 py-1.5">
          {TOOLS.map(({ tool, Icon, label }) => (
            <ToolButton
              key={tool}
              Icon={Icon}
              label={label}
              isActive={activeTool === tool}
              onClick={() => {
                onSetTool(tool);
                onDismiss();
              }}
            />
          ))}
        </div>

        <div className="mx-2 border-t border-neutral-200" />

        {/* Colors row */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          {DEFAULT_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              isActive={activeColor === color}
              onClick={() => onSetColor(color)}
            />
          ))}
        </div>

        <div className="mx-2 border-t border-neutral-200" />

        {/* Stroke widths row */}
        <div className="flex items-center gap-1 px-2 py-1.5">
          {DEFAULT_STROKE_WIDTHS.map((width) => (
            <StrokeButton
              key={width}
              width={width}
              isActive={activeStrokeWidth === width}
              onClick={() => onSetStroke(width)}
            />
          ))}
        </div>

        <div className="mx-2 border-t border-neutral-200" />

        {/* Menu items */}
        <div className="py-1">
          <MenuItem
            label="Duplicate Snap"
            onClick={() => handleAction(onDuplicate)}
          />
          <MenuItem
            label="Revert to Original"
            disabled={!hasAnnotations}
            onClick={() => handleAction(onRevert)}
          />
        </div>

        <div className="mx-2 border-t border-neutral-200" />

        <div className="py-1">
          <CheckMenuItem
            label="Pixel Perfect Mode"
            checked={!hasShadow}
            onClick={onToggleShadow}
          />
        </div>

        <div className="mx-2 border-t border-neutral-200" />

        <div className="py-1">
          <MenuItem
            label="Copy Image"
            shortcut="⌘C"
            Icon={CopyIcon}
            onClick={() => handleAction(onCopy)}
          />
          <MenuItem
            label="Close"
            Icon={CloseIcon}
            onClick={() => handleAction(onClose)}
          />
          <MenuItem
            label="Delete"
            Icon={TrashIcon}
            danger
            onClick={() => handleAction(onDelete)}
          />
        </div>
      </div>
    </div>
  );
}
