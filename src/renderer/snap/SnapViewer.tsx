import type Konva from 'konva';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Annotation, TextAnnotation } from '../../shared/annotation-types';
import { DEFAULT_FONT_SIZE } from '../../shared/annotation-types';
import { AnnotationLayer } from './AnnotationLayer';
import { useAnnotations } from './useAnnotations';

export function SnapViewer() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const isDragging = useRef(false);
  const isClosing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const opacity = useRef(1);

  // Text editing state
  const [textEditing, setTextEditing] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const params = new URLSearchParams(window.location.search);
  const filePath = useRef(params.get('filePath'));
  const snapId = useRef(params.get('snapId'));

  const ann = useAnnotations();
  const isDrawingTool = ann.activeTool !== 'pointer';

  // Load image
  useEffect(() => {
    if (filePath.current) {
      window.snappy.snap.readImage(filePath.current).then(setImgSrc);
    }
  }, []);

  // Track container size for Konva stage
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load annotations from DB
  useEffect(() => {
    if (snapId.current) {
      window.snappy.snap.getAnnotations(snapId.current).then((json) => {
        if (json) {
          try {
            ann.loadAnnotations(JSON.parse(json) as Annotation[]);
          } catch {
            // Invalid JSON — ignore
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for tool/color/stroke changes from context menu (main → renderer)
  useEffect(() => {
    window.snappy.snap.onSetTool(ann.setTool);
    window.snappy.snap.onSetColor(ann.setColor);
    window.snappy.snap.onSetStroke(ann.setStrokeWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Composite image + annotations for clipboard/thumbnail
  const getCompositeDataUrl = useCallback((): string | null => {
    const stage = stageRef.current;
    const imgEl = containerRef.current?.querySelector('img');
    if (!imgEl || !stage) return null;
    if (!dimensions.width || !dimensions.height) return null;
    if (!imgEl.naturalWidth || !imgEl.naturalHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / dimensions.width;
    const stageCanvas = stage.toCanvas({ pixelRatio: scaleX });
    ctx.drawImage(stageCanvas, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  }, [dimensions.width, dimensions.height]);

  // Auto-save and regenerate thumbnail whenever annotations change
  const annotationsJson = JSON.stringify(ann.annotations);
  const prevAnnotationsJson = useRef(annotationsJson);
  useEffect(() => {
    // Skip the initial render (loading from DB sets annotations too)
    if (annotationsJson === prevAnnotationsJson.current) return;
    prevAnnotationsJson.current = annotationsJson;

    if (snapId.current) {
      window.snappy.snap.saveAnnotations(snapId.current, annotationsJson);

      // Wait for Konva to render the updated annotations before capturing.
      // Two animation frames ensures the canvas has fully painted.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const dataUrl = getCompositeDataUrl();
          if (dataUrl && snapId.current) {
            window.snappy.snap.regenerateThumbnail(snapId.current, dataUrl);
          }
        });
      });
    }
  }, [annotationsJson, getCompositeDataUrl]);

  // Listen for revert (main sends SNAP_SAVE_ANNOTATIONS with null)
  useEffect(() => {
    const handler = (_event: unknown, data: string | null) => {
      if (data === null) {
        ann.clearAll();
      }
    };
    // @ts-expect-error — onSetTool pattern reuse; revert uses SNAP_SAVE_ANNOTATIONS channel
    window.snappy.snap.onSaveAnnotations?.(handler);
  }, [ann.clearAll]);

  const resetToPointer = useCallback(() => {
    ann.setTool('pointer');
  }, [ann]);

  const handleFinishDrawing = useCallback(() => {
    ann.finishDrawing();
    resetToPointer();
  }, [ann, resetToPointer]);

  const handleRemoveAnnotation = useCallback(
    (id: string) => {
      ann.removeAnnotation(id);
      resetToPointer();
    },
    [ann, resetToPointer],
  );

  // Text tool: click on stage → open textarea
  const handleTextClick = useCallback((x: number, y: number) => {
    setTextEditing({ x, y });
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (!textEditing || !textareaRef.current) return;
    const text = textareaRef.current.value.trim();
    if (text) {
      const annotation: TextAnnotation = {
        id: crypto.randomUUID(),
        tool: 'text',
        color: ann.activeColor,
        strokeWidth: ann.activeStrokeWidth,
        x: textEditing.x,
        y: textEditing.y,
        text,
        fontSize: DEFAULT_FONT_SIZE,
      };
      const updated = [...ann.annotations, annotation];
      ann.loadAnnotations(updated);
    }
    setTextEditing(null);
    resetToPointer();
  }, [textEditing, ann, resetToPointer]);

  const copySnapToClipboard = useCallback(() => {
    if (ann.annotations.length > 0) {
      const dataUrl = getCompositeDataUrl();
      if (dataUrl) {
        window.snappy.snap.copyComposite(dataUrl);
        return;
      }
    }
    // No annotations — copy original file
    if (filePath.current) {
      window.snappy.snap.copy(filePath.current);
    }
  }, [ann.annotations.length, getCompositeDataUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (textEditing) {
          setTextEditing(null);
        }
        resetToPointer();
      }
      if (e.metaKey && e.key === 'c') {
        copySnapToClipboard();
      }
      if (e.metaKey && e.key === 'p') {
        e.preventDefault();
        window.snappy.snap.toggleShadow();
      }
      if (e.metaKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        ann.undo();
      }
      if (e.metaKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        ann.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [textEditing, resetToPointer, copySnapToClipboard, ann]);

  // Drag handlers — only active when pointer tool is selected
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || isClosing.current || isDrawingTool) return;
    isDragging.current = true;
    dragStart.current = { x: e.screenX, y: e.screenY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.screenX - dragStart.current.x;
    const dy = e.screenY - dragStart.current.y;
    dragStart.current = { x: e.screenX, y: e.screenY };
    window.snappy.snap.move(dx, dy);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    opacity.current = Math.max(0.05, Math.min(1, opacity.current + delta));
    window.snappy.snap.setOpacity(opacity.current);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (filePath.current) {
      window.snappy.snap.showContextMenu(filePath.current);
    }
  };

  const handleDoubleClick = () => {
    isClosing.current = true;
    isDragging.current = false;
    window.snappy.snap.close();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: snap window with manual drag
    <div
      ref={containerRef}
      className="relative h-screen w-screen select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt="Screenshot"
          className="pointer-events-none block h-full w-full"
          draggable={false}
        />
      )}

      {dimensions.width > 0 && (
        <AnnotationLayer
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          annotations={ann.annotations}
          drawingAnnotation={ann.drawingAnnotation}
          activeTool={ann.activeTool}
          activeColor={ann.activeColor}
          activeStrokeWidth={ann.activeStrokeWidth}
          onStartDrawing={ann.startDrawing}
          onUpdateDrawing={ann.updateDrawing}
          onFinishDrawing={handleFinishDrawing}
          onRemoveAnnotation={handleRemoveAnnotation}
          onTextClick={handleTextClick}
        />
      )}

      {/* Text editing textarea overlay */}
      {textEditing && (
        <textarea
          ref={textareaRef}
          className="absolute border-none bg-transparent outline-none"
          style={{
            left: textEditing.x,
            top: textEditing.y,
            color: ann.activeColor,
            fontSize: DEFAULT_FONT_SIZE,
            fontFamily: 'sans-serif',
            resize: 'none',
            minWidth: 100,
            minHeight: 30,
          }}
          onBlur={handleTextSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              handleTextSubmit();
            }
            if (e.key === 'Escape') {
              setTextEditing(null);
            }
          }}
        />
      )}
    </div>
  );
}
