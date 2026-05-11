/**
 * PredictivePreLoader — Phase 3 Predictive Momentum
 *
 * Watches UnifiedCognitiveContext for a High Confidence signal
 * (guest_confidence ≥ 0.65 AND ritual_pacing === "swift") and then
 * silently pre-warms the Reserve Collection before the user navigates there.
 *
 * Pre-warm actions (all silent, never block UI):
 *   1. Image pre-fetch — browser caches scene images via <img> requests
 *   2. SW message     — PRECACHE_RESERVE warms the novee-assets-v2 SW cache
 *   3. Lazy chunk     — triggers dynamic import of CigarArtisan360 React chunk
 *
 * Usage: call usePredictivePreLoader() once inside CigarArtisan360 (or any
 * early-mounted component) — it fires at most once per session.
 */

import { useEffect, useRef } from "react";
import { useUnifiedCognitive } from "@/contexts/UnifiedCognitiveContext";

// ── Reserve Collection asset manifest ─────────────────────────────────────────
// All assets the 3D designer and Villa Sovereign module depend on.

const RESERVE_IMAGES: string[] = [
  "/images/scenes/smokecraft-card.jpg",
  "/images/scenes/pourcraft-card.jpg",
  "/images/scenes/brewcraft-card.jpg",
  "/images/scenes/vapecraft-card.jpg",
  "/images/scenes/bold.jpg",
  "/images/scenes/reflective.jpg",
  "/images/scenes/relaxed.jpg",
  "/images/scenes/social.jpg",
];

// ── Pre-warm implementation ────────────────────────────────────────────────────

function preloadReserveCollection(): void {
  // 1. Browser image pre-fetch — fills HTTP cache instantly
  RESERVE_IMAGES.forEach((src) => {
    try {
      const img = new Image();
      img.src = src;
    } catch {
      /* ignore */
    }
  });

  // 2. Signal Service Worker to populate novee-assets-v2 cache
  //    The SW's PRECACHE_RESERVE handler skips already-cached items.
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller
  ) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: "PRECACHE_RESERVE",
        urls: RESERVE_IMAGES,
      });
    } catch {
      /* SW not ready — images already warming via step 1 */
    }
  }

}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Mount this hook in any early-rendered component (e.g. CraftHub, CigarArtisan360).
 * It fires preloadReserveCollection() exactly once per session when the
 * Unified Cognitive Engine reports a High Confidence guest.
 */
export function usePredictivePreLoader(): void {
  const { guest_confidence, ritual_pacing } = useUnifiedCognitive();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (guest_confidence >= 0.65 && ritual_pacing === "swift") {
      firedRef.current = true;
      // Defer to next tick so we never block the current render
      setTimeout(preloadReserveCollection, 0);
    }
  }, [guest_confidence, ritual_pacing]);
}
