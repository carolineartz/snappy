import { useReducer } from 'react';
import type { Annotation, AnnotationTool } from '../../shared/annotation-types';
import {
  DEFAULT_COLOR,
  DEFAULT_STROKE_WIDTH,
} from '../../shared/annotation-types';

interface AnnotationState {
  annotations: Annotation[];
  history: Annotation[][]; // past states for undo
  future: Annotation[][]; // undone states for redo
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  drawingAnnotation: Annotation | null;
}

type AnnotationAction =
  | { type: 'SET_TOOL'; tool: AnnotationTool }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_STROKE'; width: number }
  | { type: 'START_DRAWING'; annotation: Annotation }
  | { type: 'UPDATE_DRAWING'; annotation: Annotation }
  | { type: 'FINISH_DRAWING' }
  | { type: 'REMOVE'; id: string }
  | { type: 'LOAD'; annotations: Annotation[] }
  | { type: 'CLEAR' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const initialState: AnnotationState = {
  annotations: [],
  history: [],
  future: [],
  activeTool: 'pointer',
  activeColor: DEFAULT_COLOR,
  activeStrokeWidth: DEFAULT_STROKE_WIDTH,
  drawingAnnotation: null,
};

/** Push current annotations onto history, clear future (new action breaks redo chain) */
function pushHistory(state: AnnotationState): {
  history: Annotation[][];
  future: Annotation[][];
} {
  return {
    history: [...state.history, state.annotations],
    future: [],
  };
}

function reducer(
  state: AnnotationState,
  action: AnnotationAction,
): AnnotationState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };
    case 'SET_COLOR':
      return { ...state, activeColor: action.color };
    case 'SET_STROKE':
      return { ...state, activeStrokeWidth: action.width };
    case 'START_DRAWING':
      return { ...state, drawingAnnotation: action.annotation };
    case 'UPDATE_DRAWING':
      return { ...state, drawingAnnotation: action.annotation };
    case 'FINISH_DRAWING':
      if (!state.drawingAnnotation) return state;
      return {
        ...state,
        ...pushHistory(state),
        annotations: [...state.annotations, state.drawingAnnotation],
        drawingAnnotation: null,
      };
    case 'REMOVE':
      return {
        ...state,
        ...pushHistory(state),
        annotations: state.annotations.filter((a) => a.id !== action.id),
      };
    case 'LOAD':
      return {
        ...state,
        annotations: action.annotations,
        history: [],
        future: [],
      };
    case 'CLEAR':
      return {
        ...state,
        ...pushHistory(state),
        annotations: [],
        drawingAnnotation: null,
      };
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return {
        ...state,
        annotations: previous,
        history: state.history.slice(0, -1),
        future: [state.annotations, ...state.future],
        drawingAnnotation: null,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        annotations: next,
        history: [...state.history, state.annotations],
        future: state.future.slice(1),
        drawingAnnotation: null,
      };
    }
    default:
      return state;
  }
}

export function useAnnotations() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    ...state,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
    setTool: (tool: AnnotationTool) => dispatch({ type: 'SET_TOOL', tool }),
    setColor: (color: string) => dispatch({ type: 'SET_COLOR', color }),
    setStrokeWidth: (width: number) => dispatch({ type: 'SET_STROKE', width }),
    startDrawing: (annotation: Annotation) =>
      dispatch({ type: 'START_DRAWING', annotation }),
    updateDrawing: (annotation: Annotation) =>
      dispatch({ type: 'UPDATE_DRAWING', annotation }),
    finishDrawing: () => dispatch({ type: 'FINISH_DRAWING' }),
    removeAnnotation: (id: string) => dispatch({ type: 'REMOVE', id }),
    loadAnnotations: (annotations: Annotation[]) =>
      dispatch({ type: 'LOAD', annotations }),
    clearAll: () => dispatch({ type: 'CLEAR' }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
  };
}
