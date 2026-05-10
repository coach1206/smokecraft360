/**
 * useStealthTrigger
 * Detects a sustained-press (HOLD_MS) on the hidden trigger zone.
 * Returns `progress` 0–1 during the hold, and fires `onActivate` on completion.
 * Also fires `onCancel` if the pointer leaves the zone or is lifted early.
 */
import { useRef, useCallback, useEffect, useState } from "react";

export const HOLD_MS = 3000;

interface Options {
  onActivate: () => void;
  onCancel?: () => void;
}

export function useStealthTrigger({ onActivate, onCancel }: Options) {
  const [progress, setProgress]   = useState(0);
  const [holding, setHolding]     = useState(false);
  const startRef   = useRef<number | null>(null);
  const rafRef     = useRef<number | null>(null);
  const zoneRef    = useRef<HTMLDivElement | null>(null);

  const cancel = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setHolding(false);
    setProgress(0);
    onCancel?.();
  }, [onCancel]);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const p = Math.min(elapsed / HOLD_MS, 1);
    setProgress(p);
    if (p >= 1) {
      setHolding(false);
      setProgress(0);
      onActivate();
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [onActivate]);

  const handlePointerDown = useCallback(() => {
    startRef.current = Date.now();
    setHolding(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handlePointerUp   = useCallback(() => { if (startRef.current) cancel(); }, [cancel]);
  const handlePointerLeave = useCallback(() => { if (startRef.current) cancel(); }, [cancel]);

  // Prevent context menu on long-press (iOS)
  const handleContextMenu = useCallback((e: Event) => { e.preventDefault(); }, []);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    zone.addEventListener("pointerdown",  handlePointerDown,  { passive: true });
    zone.addEventListener("pointerup",    handlePointerUp,    { passive: true });
    zone.addEventListener("pointercancel",handlePointerUp,    { passive: true });
    zone.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    zone.addEventListener("contextmenu",  handleContextMenu);
    return () => {
      zone.removeEventListener("pointerdown",  handlePointerDown);
      zone.removeEventListener("pointerup",    handlePointerUp);
      zone.removeEventListener("pointercancel",handlePointerUp);
      zone.removeEventListener("pointerleave", handlePointerLeave);
      zone.removeEventListener("contextmenu",  handleContextMenu);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handlePointerDown, handlePointerUp, handlePointerLeave, handleContextMenu]);

  return { zoneRef, progress, holding };
}
