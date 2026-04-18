import type Konva from 'konva';
import type React from 'react';
import { forwardRef, useCallback, useRef } from 'react';
import { Arrow, Ellipse, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type {
  Annotation,
  AnnotationTool,
  ArrowAnnotation,
  EllipseAnnotation,
  FreehandAnnotation,
  RectAnnotation,
} from '../../../shared/annotation-types';

interface AnnotationLayerProps {
  width: number;
  height: number;
  annotations: Annotation[];
  drawingAnnotation: Annotation | null;
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  onStartDrawing: (annotation: Annotation) => void;
  onUpdateDrawing: (annotation: Annotation) => void;
  onFinishDrawing: () => void;
  onRemoveAnnotation: (id: string) => void;
  onTextClick: (x: number, y: number) => void;
}

function renderAnnotation(
  annotation: Annotation,
  eraserMode = false,
): React.ReactNode {
  // Wider hit area for eraser
  const hitProps = eraserMode ? { hitStrokeWidth: 12 } : {};

  switch (annotation.tool) {
    case 'rect':
      return (
        <Rect
          key={annotation.id}
          id={annotation.id}
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          {...hitProps}
        />
      );
    case 'ellipse':
      return (
        <Ellipse
          key={annotation.id}
          id={annotation.id}
          x={annotation.x}
          y={annotation.y}
          radiusX={annotation.radiusX}
          radiusY={annotation.radiusY}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          {...hitProps}
        />
      );
    case 'freehand':
      return (
        <Line
          key={annotation.id}
          id={annotation.id}
          points={annotation.points}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.5}
          {...hitProps}
        />
      );
    case 'arrow':
      return (
        <Arrow
          key={annotation.id}
          id={annotation.id}
          points={[...annotation.points]}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          fill={annotation.color}
          pointerLength={annotation.strokeWidth * 3}
          pointerWidth={annotation.strokeWidth * 3}
          {...hitProps}
        />
      );
    case 'text':
      return (
        <Text
          key={annotation.id}
          id={annotation.id}
          x={annotation.x}
          y={annotation.y}
          text={annotation.text}
          fontSize={annotation.fontSize}
          fill={annotation.color}
          {...hitProps}
        />
      );
    default:
      return null;
  }
}

export const AnnotationLayer = forwardRef<Konva.Stage, AnnotationLayerProps>(
  function AnnotationLayer(
    {
      width,
      height,
      annotations,
      drawingAnnotation,
      activeTool,
      activeColor,
      activeStrokeWidth,
      onStartDrawing,
      onUpdateDrawing,
      onFinishDrawing,
      onRemoveAnnotation,
      onTextClick,
    },
    ref,
  ) {
    // Track drag origin for shapes that need corner-based drawing (ellipse)
    const dragOrigin = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === 'pointer') return;

        if (activeTool === 'eraser') {
          const target = e.target;
          const id = target.id();
          if (id) onRemoveAnnotation(id);
          return;
        }

        if (activeTool === 'text') {
          const stage = e.target.getStage();
          const pos = stage?.getPointerPosition();
          if (pos) onTextClick(pos.x, pos.y);
          return;
        }

        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos) return;

        dragOrigin.current = { x: pos.x, y: pos.y };
        const id = crypto.randomUUID();

        if (activeTool === 'freehand') {
          const annotation: FreehandAnnotation = {
            id,
            tool: 'freehand',
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            points: [pos.x, pos.y],
          };
          onStartDrawing(annotation);
        } else if (activeTool === 'rect') {
          const annotation: RectAnnotation = {
            id,
            tool: 'rect',
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
          };
          onStartDrawing(annotation);
        } else if (activeTool === 'ellipse') {
          const annotation: EllipseAnnotation = {
            id,
            tool: 'ellipse',
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            x: pos.x,
            y: pos.y,
            radiusX: 0,
            radiusY: 0,
          };
          onStartDrawing(annotation);
        } else if (activeTool === 'arrow') {
          const annotation: ArrowAnnotation = {
            id,
            tool: 'arrow',
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            points: [pos.x, pos.y, pos.x, pos.y],
          };
          onStartDrawing(annotation);
        }
      },
      [
        activeTool,
        activeColor,
        activeStrokeWidth,
        onStartDrawing,
        onRemoveAnnotation,
        onTextClick,
      ],
    );

    const handleMouseMove = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!drawingAnnotation) return;

        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos) return;

        if (drawingAnnotation.tool === 'freehand') {
          onUpdateDrawing({
            ...drawingAnnotation,
            points: [...drawingAnnotation.points, pos.x, pos.y],
          });
        } else if (drawingAnnotation.tool === 'rect') {
          onUpdateDrawing({
            ...drawingAnnotation,
            width: pos.x - drawingAnnotation.x,
            height: pos.y - drawingAnnotation.y,
          });
        } else if (drawingAnnotation.tool === 'ellipse') {
          // Use dragOrigin (corner) to compute center + radii
          const ox = dragOrigin.current.x;
          const oy = dragOrigin.current.y;
          const radiusX = Math.abs(pos.x - ox) / 2;
          const radiusY = Math.abs(pos.y - oy) / 2;
          onUpdateDrawing({
            ...drawingAnnotation,
            x: (ox + pos.x) / 2,
            y: (oy + pos.y) / 2,
            radiusX,
            radiusY,
          });
        } else if (drawingAnnotation.tool === 'arrow') {
          onUpdateDrawing({
            ...drawingAnnotation,
            points: [
              drawingAnnotation.points[0],
              drawingAnnotation.points[1],
              pos.x,
              pos.y,
            ],
          });
        }
      },
      [drawingAnnotation, onUpdateDrawing],
    );

    const handleMouseUp = useCallback(() => {
      if (drawingAnnotation) {
        onFinishDrawing();
      }
    }, [drawingAnnotation, onFinishDrawing]);

    const getCursor = (): string => {
      switch (activeTool) {
        case 'pointer':
          return 'default';
        case 'eraser':
          return 'not-allowed';
        case 'text':
          return 'text';
        default:
          return 'crosshair';
      }
    };

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          pointerEvents: activeTool === 'pointer' ? 'none' : 'auto',
          cursor: getCursor(),
        }}
      >
        <Stage
          ref={ref}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {annotations.map((a) =>
              renderAnnotation(a, activeTool === 'eraser'),
            )}
            {drawingAnnotation && renderAnnotation(drawingAnnotation)}
          </Layer>
        </Stage>
      </div>
    );
  },
);
