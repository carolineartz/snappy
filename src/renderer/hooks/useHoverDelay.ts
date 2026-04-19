import { useCallback, useEffect, useRef, useState } from 'react';

interface HoverDelayOptions {
  /** ms to wait after enter before firing */
  openDelay?: number;
  /** ms to wait after leave before closing (allows moving to popover) */
  closeDelay?: number;
}

/**
 * Delayed-open hover state with grace period on close.
 * Useful for tooltips/popovers that should feel intentional.
 */
export function useHoverDelay({
  openDelay = 500,
  closeDelay = 150,
}: HoverDelayOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Cancel any pending close
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isOpen) return;
    if (openTimerRef.current !== null) return;

    openTimerRef.current = window.setTimeout(() => {
      setIsOpen(true);
      openTimerRef.current = null;
    }, openDelay);
  }, [openDelay, isOpen]);

  const handleMouseLeave = useCallback(() => {
    // Cancel pending open
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (!isOpen) return;

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, closeDelay);
  }, [closeDelay, isOpen]);

  const open = useCallback(() => {
    clearTimers();
    setIsOpen(true);
  }, [clearTimers]);

  const close = useCallback(() => {
    clearTimers();
    setIsOpen(false);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    isOpen,
    /** Attach to both the trigger AND the popover — entering either keeps it open */
    handleMouseEnter,
    handleMouseLeave,
    /** Programmatic open (e.g. from context menu click) */
    open,
    /** Programmatic close (e.g. Escape key) */
    close,
  };
}
