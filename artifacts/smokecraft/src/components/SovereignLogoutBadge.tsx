/**
 * SovereignLogoutBadge — guest identity pill with Sovereign Purge logout.
 *
 * Renders the existing initials + publicId chip.
 * On tap → a Smoked Titanium floating "LOGOUT" pill surfaces below via portal.
 * Confirming LOGOUT executes:
 *   1. purgeSessions()  — wipes all craft session data (CraftExperienceContext)
 *   2. clearGuest()     — clears guest profile + mentor from sessionStorage
 *   3. navigate("/")    — returns to the root portal (4-tile hub)
 *
 * Touch-optimized: 44px min targets, no hover dependency, portal so it's
 * always above all stacking contexts.
 */

import { useState, useRef, useEffect } from "react";
import { createPortal }                from "react-dom";
import { motion, AnimatePresence }     from "framer-motion";
import { useLocation }                 from "wouter";
import { useGuestProfile }            from "@/contexts/GuestProfileContext";
import { useCraftExperience }          from "@/contexts/CraftExperienceContext";
import type { GuestProfile }           from "@/contexts/GuestProfileContext";

// ── Design tokens — Smoked Titanium palette ────────────────────────────────
const TITANIUM_BG     = "rgba(32,30,28,0.92)";
const TITANIUM_BORDER = "rgba(155,163,178,0.35)";
const TITANIUM_TEXT   = "#9BA3B2";
const DANGER_TEXT     = "#EF4444";
const CREAM           = "rgba(240,232,212,0.88)";

interface SovereignLogoutBadgeProps {
  guestProfile: GuestProfile;
  accent:       string;
}

function LogoutPill({
  anchorRect,
  onConfirm,
  onDismiss,
}: {
  anchorRect: DOMRect;
  onConfirm:  () => void;
  onDismiss:  () => void;
}) {
  const pillTop  = anchorRect.bottom + 8;
  const pillLeft = anchorRect.right - 180;   // right-align to badge

  // Dismiss on outside tap
  useEffect(() => {
    const handler = (e: TouchEvent | MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-logout-pill]")) onDismiss();
    };
    setTimeout(() => {
      window.addEventListener("touchstart", handler, { passive: true });
      window.addEventListener("mousedown", handler);
    }, 50);
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("mousedown", handler);
    };
  }, [onDismiss]);

  return createPortal(
    <motion.div
      data-logout-pill
      initial={{ opacity: 0, y: -8, scale: 0.93 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -6, scale: 0.93 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position:             "fixed",
        top:                  pillTop,
        left:                 Math.max(12, pillLeft),
        zIndex:               2147483647,
        background:           TITANIUM_BG,
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border:               `1px solid ${TITANIUM_BORDER}`,
        borderRadius:         12,
        padding:              "6px 6px",
        display:              "flex",
        flexDirection:        "column",
        gap:                  4,
        minWidth:             180,
        boxShadow:            "0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(155,163,178,0.08) inset",
      }}
    >
      {/* Identity header */}
      <div style={{
        padding:       "6px 10px 8px",
        borderBottom:  `1px solid ${TITANIUM_BORDER}`,
        fontSize:      9,
        color:         TITANIUM_TEXT,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontFamily:    "'Space Mono', monospace",
      }}>
        SESSION ACTIVE
      </div>

      {/* Logout action */}
      <motion.button
        data-logout-pill
        whileTap={{ scale: 0.95 }}
        onClick={onConfirm}
        onTouchEnd={(e) => { e.preventDefault(); onConfirm(); }}
        style={{
          display:              "flex",
          alignItems:           "center",
          gap:                  8,
          padding:              "10px 12px",
          borderRadius:         8,
          border:               "none",
          background:           "rgba(239,68,68,0.08)",
          cursor:               "pointer",
          width:                "100%",
          textAlign:            "left",
          minHeight:            44,
          touchAction:          "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Power icon */}
        <div style={{
          width:          28,
          height:         28,
          borderRadius:   "50%",
          background:     "rgba(239,68,68,0.12)",
          border:         "1px solid rgba(239,68,68,0.28)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v4.5M3 2.8A4.5 4.5 0 1 0 9 2.8" stroke={DANGER_TEXT} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: DANGER_TEXT, letterSpacing: "0.08em" }}>
            LOGOUT
          </div>
          <div style={{ fontSize: 8.5, color: TITANIUM_TEXT, marginTop: 1, letterSpacing: "0.06em" }}>
            Sovereign Purge · Return to Portal
          </div>
        </div>
      </motion.button>

      {/* Cancel */}
      <motion.button
        data-logout-pill
        whileTap={{ scale: 0.96 }}
        onClick={onDismiss}
        onTouchEnd={(e) => { e.preventDefault(); onDismiss(); }}
        style={{
          padding:              "8px 12px",
          borderRadius:         8,
          border:               "none",
          background:           "transparent",
          cursor:               "pointer",
          fontSize:             10,
          color:                TITANIUM_TEXT,
          letterSpacing:        "0.1em",
          textTransform:        "uppercase",
          fontFamily:           "'Space Mono', monospace",
          minHeight:            40,
          touchAction:          "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        Cancel
      </motion.button>
    </motion.div>,
    document.body,
  );
}

export function SovereignLogoutBadge({ guestProfile, accent }: SovereignLogoutBadgeProps) {
  const [open, setOpen]         = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [rect, setRect]         = useState<DOMRect | null>(null);
  const badgeRef                = useRef<HTMLButtonElement>(null);
  const [, navigate]            = useLocation();
  const { clearGuest }          = useGuestProfile();
  const { purgeSessions }       = useCraftExperience();

  useEffect(() => { setMounted(true); }, []);

  function handleBadgePress(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    if (badgeRef.current) setRect(badgeRef.current.getBoundingClientRect());
    setOpen(v => !v);
  }

  function handleLogout() {
    setOpen(false);
    // Brief delay so the pill can animate out before nav
    setTimeout(() => {
      purgeSessions();
      clearGuest();
      navigate("/");
    }, 120);
  }

  return (
    <>
      <motion.button
        ref={badgeRef}
        whileTap={{ scale: 0.93 }}
        onClick={handleBadgePress}
        onTouchEnd={handleBadgePress}
        style={{
          display:              "flex",
          alignItems:           "center",
          gap:                  7,
          background:           open ? "rgba(155,163,178,0.12)" : "rgba(0,0,0,0.50)",
          border:               `1px solid ${open ? TITANIUM_BORDER : `${accent}40`}`,
          borderRadius:         10,
          padding:              "8px 14px",
          backdropFilter:       "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          cursor:               "pointer",
          minHeight:            44,
          touchAction:          "manipulation",
          WebkitTapHighlightColor: "transparent",
          transition:           "background 0.15s, border-color 0.15s",
        }}
      >
        {/* Initials circle */}
        <div style={{
          width:          20,
          height:         20,
          borderRadius:   "50%",
          background:     open ? "rgba(155,163,178,0.18)" : `${accent}20`,
          border:         `1px solid ${open ? TITANIUM_BORDER : `${accent}50`}`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       9,
          color:          open ? TITANIUM_TEXT : accent,
          fontWeight:     700,
          transition:     "all 0.15s",
        }}>
          {guestProfile.firstName[0].toUpperCase()}
        </div>

        {/* Public ID */}
        <span style={{
          fontSize:      10,
          color:         open ? CREAM : `${accent}90`,
          letterSpacing: "0.08em",
          fontVariantNumeric: "tabular-nums",
          transition:    "color 0.15s",
        }}>
          {guestProfile.publicId}
        </span>

        {/* Chevron indicator */}
        <svg
          width="8" height="8" viewBox="0 0 8 8"
          style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M1 2.5L4 5.5L7 2.5" stroke={open ? TITANIUM_TEXT : `${accent}60`} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        </svg>
      </motion.button>

      {mounted && (
        <AnimatePresence>
          {open && rect && (
            <LogoutPill
              key="logout-pill"
              anchorRect={rect}
              onConfirm={handleLogout}
              onDismiss={() => setOpen(false)}
            />
          )}
        </AnimatePresence>
      )}
    </>
  );
}
