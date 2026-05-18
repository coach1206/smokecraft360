/**
 * UniversalBackButton — persistent frosted glass pill nav anchor.
 *
 * Renders via ReactDOM.createPortal directly to document.body so it sits
 * ABOVE every Framer Motion stacking context (position:fixed inside a
 * motion.div parent creates a new containing block, trapping z-index).
 *
 * Label:
 *   "← PORTAL"  on /craft-hub  (one step from home)
 *   "← BACK"    everywhere else (experience, admin, reveal, etc.)
 *
 * Hidden on / (root portal — nowhere to go back to).
 */

import { useEffect, useState } from "react";
import { createPortal }        from "react-dom";
import { useLocation }         from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const HOME         = "/craft-hub";
// Pages where the back button is hidden (they ARE home)
const HIDE_PATHS   = new Set(["/craft-hub", "/"]);

function getLabel(_path: string): string {
  return "← BACK";
}

function getTarget(_path: string): string | null {
  return HOME;
}

function BackPill({ location, navigate }: { location: string; navigate: (to: string) => void }) {
  const label  = getLabel(location);
  const target = getTarget(location);

  function handlePress(e: React.PointerEvent) {
    e.stopPropagation();
    if (target) navigate(target);
    else        window.history.back();
  }

  return (
    <AnimatePresence>
      {!HIDE_PATHS.has(location) && (
        <motion.button
          key="universal-back"
          initial={{ opacity: 0, x: -14, scale: 0.88 }}
          animate={{ opacity: 1, x: 0,   scale: 1    }}
          exit={{    opacity: 0, x: -14, scale: 0.88 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onPointerDown={handlePress}
          style={{
            position:             "fixed",
            top:                  18,
            left:                 18,
            zIndex:               2147483647,          // INT32_MAX — always on top
            display:              "flex",
            alignItems:           "center",
            gap:                  6,
            padding:              "9px 18px 9px 13px",
            borderRadius:         999,
            border:               "1.5px solid rgba(255,255,255,0.75)",
            background:           "rgba(10,8,6,0.78)",
            backdropFilter:       "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            color:                "#FFFFFF",
            fontFamily:           "'Space Mono', monospace",
            fontSize:             11,
            fontWeight:           700,
            letterSpacing:        "0.13em",
            lineHeight:           1,
            cursor:               "pointer",
            userSelect:           "none",
            WebkitTapHighlightColor: "transparent",
            touchAction:          "manipulation",
            whiteSpace:           "nowrap",
            boxShadow:            "0 2px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset",
            outline:              "none",
          }}
        >
          {label}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function UniversalBackButton() {
  const [location, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return createPortal(
    <BackPill location={location} navigate={navigate} />,
    document.body,
  );
}
