import { useEffect, useState } from 'react';
import type { AnnotationTool } from '../../shared/annotation-types';
import { ContextMenu } from '../snap/ContextMenu';

interface MenuState {
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  hasShadow: boolean;
  hasAnnotations: boolean;
}

export function MenuApp() {
  const [state, setState] = useState<MenuState | null>(null);

  useEffect(() => {
    // Initial state via URL params
    const params = new URLSearchParams(window.location.search);
    const initial: MenuState = {
      activeTool: (params.get('tool') ?? 'pointer') as AnnotationTool,
      activeColor: params.get('color') ?? '#ef4444',
      activeStrokeWidth: Number.parseInt(params.get('stroke') ?? '2', 10),
      hasShadow: params.get('hasShadow') !== '0',
      hasAnnotations: params.get('hasAnnotations') === '1',
    };
    setState(initial);

    // Dismiss on blur (click outside)
    const onBlur = () => window.snappy.menu.dismiss();
    window.addEventListener('blur', onBlur);

    // Dismiss on Escape
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.snappy.menu.dismiss();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!state) return null;

  const update = (partial: Partial<MenuState>) =>
    setState((s) => (s ? { ...s, ...partial } : s));

  return (
    <div className="fixed inset-0 bg-transparent">
      <ContextMenu
        x={4}
        y={4}
        activeTool={state.activeTool}
        activeColor={state.activeColor}
        activeStrokeWidth={state.activeStrokeWidth}
        hasShadow={state.hasShadow}
        hasAnnotations={state.hasAnnotations}
        onSetTool={(tool) => {
          update({ activeTool: tool });
          window.snappy.menu.action('setTool', tool);
        }}
        onSetColor={(color) => {
          update({ activeColor: color });
          window.snappy.menu.action('setColor', color);
        }}
        onSetStroke={(width) => {
          update({ activeStrokeWidth: width });
          window.snappy.menu.action('setStroke', width);
        }}
        onCopy={() => window.snappy.menu.action('copy')}
        onToggleShadow={() => {
          update({ hasShadow: !state.hasShadow });
          window.snappy.menu.action('toggleShadow');
        }}
        onClose={() => window.snappy.menu.action('close')}
        onDelete={() => window.snappy.menu.action('delete')}
        onDuplicate={() => window.snappy.menu.action('duplicate')}
        onRevert={() => window.snappy.menu.action('revert')}
        onDismiss={() => window.snappy.menu.dismiss()}
      />
    </div>
  );
}
