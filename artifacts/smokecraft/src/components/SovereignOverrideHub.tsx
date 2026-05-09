/**
 * SovereignOverrideHub — master staff bypass pill, fixed top-right.
 *
 * Idle:  Smoked Obsidian pill showing "◈ AXIOM OS" with Champagne Gold border.
 * Touch: Expands into a vertical command menu with three options:
 *
 *   OPERATIONAL INTELLIGENCE → triggers EEIS handoff overlay (triggerHandoff)
 *   SOVEREIGN CORE           → navigates to /admin-master (Level 0 access)
 *   SYSTEM PURGE             → purgeSessions + clearGuest + navigate("/")
 *
 * Mounted globally in SubPageProviders (App.tsx) alongside EeisOverlay so it
 * floats above every route without re-mounting.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal }   from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation }    from "wouter";
import { useHandoff }     from "@/contexts/HandoffContext";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { useCraftExperience } from "@/contexts/CraftExperienceContext";

// ── Design tokens ──────────────────────────────────────────────────────────
const OBSIDIAN   = "rgba(10,9,8,0.90)";
const GOLD_PILL  = "#D4AF37";
const AMBER      = "#D48B00";
const DANGER     = "#EF4444";
const BORDER     = "rgba(212,175,55,0.42)";
const MUTED      = "rgba(212,175,55,0.46)";
const FONT       = "'Space Mono', 'Courier New', monospace";

// ── Icons (inline SVG) ─────────────────────────────────────────────────────

function IconEeis() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke={AMBER} strokeWidth="1.2"/>
      <path d="M4.5 7h5M7 4.5v5" stroke={AMBER} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconCore() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="5" width="8" height="7" rx="1.2" stroke={GOLD_PILL} strokeWidth="1.2"/>
      <path d="M5 5V4a2 2 0 0 1 4 0v1" stroke={GOLD_PILL} strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="7" cy="8.5" r="1" fill={GOLD_PILL}/>
    </svg>
  );
}

function IconPurge() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5v5.5M4 3A5.5 5.5 0 1 0 10 3" stroke={DANGER} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="8" height="8" viewBox="0 0 8 8"
      style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M1.5 3L4 5.5L6.5 3" stroke={MUTED} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon:      React.ReactNode;
  label:     string;
  sub:       string;
  accent:    string;
  danger?:   boolean;
  onClick:   () => void;
}

function MenuItem({ icon, label, sub, accent, danger, onClick }: MenuItemProps) {
  return (
    <motion.button
      data-override-hub
      whileTap={{ scale: 0.96, backgroundColor: `${accent}14` }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        10,
        padding:    "11px 14px",
        borderRadius: 8,
        border:     "none",
        background: danger ? "rgba(239,68,68,0.06)" : "transparent",
        cursor:     "pointer",
        width:      "100%",
        textAlign:  "left",
        minHeight:  52,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Icon circle */}
      <div style={{
        width:    34,
        height:   34,
        borderRadius: "50%",
        background: `${accent}12`,
        border:   `1px solid ${accent}30`,
        display:  "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize:      10.5,
          fontWeight:    700,
          color:         accent,
          letterSpacing: "0.1em",
          fontFamily:    FONT,
          lineHeight:    1,
        }}>
          {label}
        </div>
        <div style={{
          fontSize:      8.5,
          color:         "rgba(212,175,55,0.40)",
          marginTop:     4,
          letterSpacing: "0.06em",
          fontFamily:    FONT,
        }}>
          {sub}
        </div>
      </div>

      {/* Right arrow */}
      <svg width="7" height="10" viewBox="0 0 7 10" fill="none">
        <path d="M1.5 1.5L5.5 5L1.5 8.5" stroke={`${accent}50`} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </motion.button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function SovereignOverrideHub() {
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const pillRef               = useRef<HTMLButtonElement>(null);
  const [pillRect, setPillRect] = useState<DOMRect | null>(null);

  const [, navigate]        = useLocation();
  const { triggerHandoff }  = useHandoff();
  const { clearGuest }      = useGuestProfile();
  const { purgeSessions }   = useCraftExperience();

  useEffect(() => { setMounted(true); }, []);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-override-hub]")) setOpen(false);
    };
    const t = setTimeout(() => {
      window.addEventListener("touchstart", handler, { passive: true });
      window.addEventListener("mousedown", handler);
    }, 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const handleOpen = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (pillRef.current) setPillRect(pillRef.current.getBoundingClientRect());
    setOpen(v => !v);
  }, []);

  // ── Action handlers ──────────────────────────────────────────────────────

  const handleEeis = useCallback(() => {
    setOpen(false);
    // Trigger ripple from screen center — EEIS overlay expands from there
    setTimeout(() => {
      triggerHandoff(window.innerWidth / 2, window.innerHeight / 2);
    }, 120);
  }, [triggerHandoff]);

  const handleSovereignCore = useCallback(() => {
    setOpen(false);
    setTimeout(() => navigate("/admin-master"), 100);
  }, [navigate]);

  const handlePurge = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      purgeSessions();
      clearGuest();
      navigate("/");
    }, 120);
  }, [purgeSessions, clearGuest, navigate]);

  // ── Menu portal ──────────────────────────────────────────────────────────
  const menuContent = pillRect && (
    <motion.div
      data-override-hub
      key="override-menu"
      initial={{ opacity: 0, y: -10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -8,  scale: 0.94 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position:             "fixed",
        top:                  pillRect.bottom + 8,
        right:                Math.max(12, window.innerWidth - pillRect.right),
        zIndex:               2147483646,
        background:           OBSIDIAN,
        backdropFilter:       "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border:               `1px solid ${BORDER}`,
        borderRadius:         14,
        padding:              "8px 6px",
        minWidth:             240,
        boxShadow:            `0 12px 48px rgba(0,0,0,0.80), 0 0 0 1px rgba(212,175,55,0.06) inset, 0 0 32px rgba(212,175,55,0.06)`,
      }}
    >
      {/* Header */}
      <div style={{
        padding:       "6px 14px 10px",
        borderBottom:  `1px solid ${BORDER}`,
        marginBottom:  4,
        fontSize:      8,
        color:         MUTED,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontFamily:    FONT,
        display:       "flex",
        alignItems:    "center",
        gap:           6,
      }}>
        <div style={{
          width:  5, height: 5, borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 6px #22c55e",
          animation: "hub-pulse 2s ease-in-out infinite",
        }} />
        SOVEREIGN PROTOCOL · ACTIVE
      </div>

      {/* Inject pulse keyframe once */}
      <style>{`
        @keyframes hub-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      <MenuItem
        icon={<IconEeis />}
        label="OPERATIONAL INTELLIGENCE"
        sub="EEIS Nervous System · Staff Telemetry"
        accent={AMBER}
        onClick={handleEeis}
      />
      <MenuItem
        icon={<IconCore />}
        label="SOVEREIGN CORE"
        sub="Level 0 Access · Kill-Switches · Provisioning"
        accent={GOLD_PILL}
        onClick={handleSovereignCore}
      />

      {/* Divider */}
      <div style={{ margin: "4px 14px", height: 1, background: BORDER }} />

      <MenuItem
        icon={<IconPurge />}
        label="SYSTEM PURGE"
        sub="Clear Session · Return to Boot Portal"
        accent={DANGER}
        danger
        onClick={handlePurge}
      />
    </motion.div>
  );

  return (
    <>
      {/* Pill trigger */}
      <motion.button
        ref={pillRef}
        data-override-hub
        whileTap={{ scale: 0.94 }}
        onClick={handleOpen}
        onTouchEnd={(e) => { e.preventDefault(); handleOpen(e); }}
        style={{
          position:             "fixed",
          top:                  12,
          right:                14,
          zIndex:               2147483645,
          display:              "flex",
          alignItems:           "center",
          gap:                  7,
          background:           open ? "rgba(212,175,55,0.10)" : OBSIDIAN,
          border:               `1px solid ${open ? GOLD_PILL : BORDER}`,
          borderRadius:         999,
          padding:              "9px 16px",
          backdropFilter:       "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          cursor:               "pointer",
          minHeight:            42,
          touchAction:          "manipulation",
          WebkitTapHighlightColor: "transparent",
          transition:           "background 0.15s, border-color 0.18s, box-shadow 0.18s",
          boxShadow:            open
            ? `0 0 20px rgba(212,175,55,0.20)`
            : "0 2px 12px rgba(0,0,0,0.55)",
        }}
      >
        {/* Status dot */}
        <div style={{
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   "#22c55e",
          boxShadow:    "0 0 7px #22c55e",
          flexShrink:   0,
          animation:    "hub-pulse 2s ease-in-out infinite",
        }} />

        {/* Label */}
        <span style={{
          fontSize:      9,
          fontWeight:    700,
          color:         open ? GOLD_PILL : MUTED,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily:    FONT,
          transition:    "color 0.15s",
          whiteSpace:    "nowrap",
        }}>
          ◈ AXIOM OS
        </span>

        <IconChevron open={open} />
      </motion.button>

      {/* Dropdown portal */}
      {mounted && (
        <AnimatePresence>
          {open && pillRect && createPortal(menuContent, document.body)}
        </AnimatePresence>
      )}
    </>
  );
}
