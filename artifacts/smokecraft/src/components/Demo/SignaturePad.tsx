/**
 * SignaturePad — touch- and mouse-driven signature canvas.
 *
 * Captures pointer strokes (mouse + touch + pen via Pointer Events), draws a
 * smooth black ink line, and exposes:
 *   - `onChange(dataUrl, isEmpty)` fired after each stroke
 *   - `clear()` imperative reset via ref
 *
 * Output is a base64 PNG dataURL ready to POST to /api/nda/demo-sign.
 * Internally tracks whether ANY ink has been laid down so callers can disable
 * submit until the user has actually drawn something.
 */

import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback,
} from "react";

export interface SignaturePadHandle {
  clear: () => void;
  getDataUrl: () => string | null;
  isEmpty: () => boolean;
}

interface Props {
  width?:  number;
  height?: number;
  onChange?: (dataUrl: string | null, isEmpty: boolean) => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { width = 560, height = 200, onChange }, ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    const c = canvasRef.current;
    if (!c) return null;
    return c.getContext("2d");
  }, []);

  // Reset + paint white background when canvas mounts / size changes.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    // Hi-DPI handling: scale backing store by devicePixelRatio for crisp ink.
    const dpr = window.devicePixelRatio || 1;
    c.width  = width  * dpr;
    c.height = height * dpr;
    c.style.width  = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle   = "#1A1A1B";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth   = 2.4;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, [width, height, getCtx]);

  const pos = (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent) => {
    const ctx = getCtx(); if (!ctx) return;
    drawingRef.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvasRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = getCtx(); if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (empty) setEmpty(false);
    e.preventDefault();
  };

  const end = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? null;
    onChange?.(dataUrl, empty);
    e.preventDefault();
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      const c = canvasRef.current; if (!c) return;
      const ctx = getCtx(); if (!ctx) return;
      ctx.fillStyle = "#1A1A1B";
      ctx.fillRect(0, 0, width, height);
      setEmpty(true);
      onChange?.(null, true);
    },
    getDataUrl: () => empty ? null : (canvasRef.current?.toDataURL("image/png") ?? null),
    isEmpty:    () => empty,
  }), [empty, width, height, getCtx, onChange]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="signature-pad"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      style={{
        background:   "#1A1A1B",
        borderRadius: 8,
        border:       "1px solid rgba(212,139,0,0.4)",
        cursor:       "crosshair",
        touchAction:  "none", // CRITICAL: prevent the browser eating touch as scroll/zoom
        display:      "block",
        maxWidth:     "100%",
      }}
    />
  );
});
