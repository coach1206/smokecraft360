/**
 * UniversalBackButton — persistent frosted glass pill nav anchor.
 *
 * Renders on every route except the root portal (/).
 * Label:
 *   "← Portal"  on /craft-hub  (one level from home)
 *   "← Back"    everywhere else (mid-experience or admin modules)
 *
 * Style: bright white text · dark frosted glass pill · white border
 * Position: top-left, z-index 90001 (above UniversalTouchAnchors)
 * Touch: stops propagation so it doesn't trigger the gesture anchors.
 */

import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const PORTAL_PATHS = new Set(["/craft-hub"]);
const HOME         = "/";

function getLabel(path: string): "Portal" | "Back" {
  return PORTAL_PATHS.has(path) ? "Portal" : "Back";
}

function getTarget(path: string): string | null {
  if (PORTAL_PATHS.has(path)) return HOME;
  return null;   // use history.back()
}

export function UniversalBackButton() {
  const [location, navigate] = useLocation();

  if (location === HOME) return null;

  const label  = getLabel(location);
  const target = getTarget(location);

  function handlePress(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    if (target) {
      navigate(target);
    } else {
      window.history.back();
    }
  }

  return (
    <AnimatePresence>
      <motion.button
        key="universal-back"
        initial={{ opacity: 0, x: -12, scale: 0.9 }}
        animate={{ opacity: 1, x: 0,   scale: 1    }}
        exit={{    opacity: 0, x: -12, scale: 0.9  }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={handlePress}
        onTouchEnd={handlePress}
        style={{
          position:        "fixed",
          top:             20,
          left:            20,
          zIndex:          90001,
          display:         "flex",
          alignItems:      "center",
          gap:             6,
          padding:         "9px 18px 9px 14px",
          borderRadius:    999,
          border:          "1.5px solid rgba(255,255,255,0.72)",
          background:      "rgba(16,14,12,0.72)",
          backdropFilter:  "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color:           "#FFFFFF",
          fontFamily:      "'Space Mono', monospace",
          fontSize:        11,
          fontWeight:      700,
          letterSpacing:   "0.12em",
          lineHeight:      1,
          cursor:          "pointer",
          userSelect:      "none",
          WebkitTapHighlightColor: "transparent",
          touchAction:     "manipulation",
          whiteSpace:      "nowrap",
          boxShadow:       "0 2px 16px rgba(0,0,0,0.55)",
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1, marginTop: -1 }}>←</span>
        <span>{label.toUpperCase()}</span>
      </motion.button>
    </AnimatePresence>
  );
}
