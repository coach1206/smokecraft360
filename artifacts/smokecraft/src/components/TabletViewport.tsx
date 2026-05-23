/**
 * TabletViewport — Hardware-optimized landscape scale matrix.
 *
 * Applies CSS `zoom` to document.documentElement so the entire app
 * scales uniformly to fill 16:9 / 16:10 tablet glass without breaking
 * `position: fixed` overlays (unlike `transform: scale` on a wrapper).
 *
 * Design canvas: 1280 × 800 (16:10 landscape — covers iPad landscape,
 * Android tablets, and kiosk touchscreen displays).
 *
 * Scale = min(viewportWidth / 1280, viewportHeight / 800)
 * Clamped to [0.55, 1.25] so it never shrinks to unusable on small windows
 * or zooms in too far on 4K monitors.
 */

import { useEffect } from "react";

const DESIGN_W = 1920;
const DESIGN_H = 1080;
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.25;

function computeScale(): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.min(vw / DESIGN_W, vh / DESIGN_H);
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

function applyScale(): void {
  const scale = computeScale();
  const root = document.documentElement;
  root.style.setProperty("--tablet-scale", String(scale));
}

export function useTabletViewport(): void {
  useEffect(() => {
    applyScale();
    const observer = new ResizeObserver(applyScale);
    observer.observe(document.documentElement);
    window.addEventListener("orientationchange", applyScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", applyScale);
    };
  }, []);
}

export default function TabletViewport(): null {
  useTabletViewport();
  return null;
}
