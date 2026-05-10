/**
 * RouteTransitionOverlay — Phase 1 Environmental Morphing
 *
 * Listens to every route change and renders a 1.2s amber/smoke cross-fade
 * that prevents hard page-cuts between modules.
 *
 * Intensity is scaled by atmospheric_delta from UnifiedCognitiveContext —
 * a MEDITATIVE → HIGH_ENERGY mood jump produces a stronger sweep than
 * navigating within the same energy band.
 *
 * Also fires playSovereignSweep() on each navigation for the Sonic Ignition
 * (Phase 2) cinematic "Sovereign Sweep" transition sound.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { playSovereignSweep } from "@/lib/audioEngine";
import { useUnifiedCognitive } from "@/contexts/UnifiedCognitiveContext";

export function RouteTransitionOverlay() {
  const [location]         = useLocation();
  const prevLocation       = useRef(location);
  const [active, setActive] = useState(false);
  const { atmospheric_delta } = useUnifiedCognitive();
  const deltaRef           = useRef(atmospheric_delta);

  // Keep delta ref fresh so the overlay reads the latest value at transition time
  useEffect(() => { deltaRef.current = atmospheric_delta; }, [atmospheric_delta]);

  useEffect(() => {
    if (location === prevLocation.current) return;
    prevLocation.current = location;

    setActive(true);
    playSovereignSweep();
    const t = setTimeout(() => setActive(false), 1200);
    return () => clearTimeout(t);
  }, [location]);

  // Peak opacity: base 0.12 + up to 0.28 extra from atmospheric_delta
  const peakOpacity = 0.12 + deltaRef.current * 0.28;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="route-transition"
          initial={{ opacity: peakOpacity }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         19998,
            pointerEvents:  "none",
            background:     "radial-gradient(ellipse at 50% 100%, rgba(212,175,55,0.22) 0%, rgba(10,9,8,0.80) 100%)",
            backdropFilter: "blur(1.5px)",
            willChange:     "opacity",
          }}
        />
      )}
    </AnimatePresence>
  );
}
