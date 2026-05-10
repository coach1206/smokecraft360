/**
 * SovereignOverrideHub — master staff bypass pill, fixed top-right.
 *
 * Idle:  Smoked Obsidian pill showing "◈ NOVEE OS // SOVEREIGN" with Champagne Gold border.
 * Touch: Expands into a vertical command menu with five options:
 *
 *   EEIE INTEL    → triggers EEIS handoff overlay → /eeie-command
 *   GHOST CORE    → activateGhost() → /admin-master
 *   ── kill switches ──
 *   BLACKOUT      → toggleKillSwitch("session_blackout") — freeze the room instantly
 *   API LOCK      → toggleKillSwitch("api_disconnect")   — suspend AI calls globally
 *   ── danger ──
 *   SYSTEM PURGE  → purgeSessions + clearGuest → /portal (pristine Boot State)
 *
 * Phase 2: playPillClink() fires on every pill open.
 * Phase 4: BLACKOUT + API LOCK directly in the pill — no Admin Master needed.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal }      from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation }       from "wouter";
import { useHandoff }        from "@/contexts/HandoffContext";
import { useGuestProfile }   from "@/contexts/GuestProfileContext";
import { useCraftExperience } from "@/contexts/CraftExperienceContext";
import { useSuperAdmin }     from "@/contexts/SuperAdminContext";
import { playPillClink }     from "@/lib/audioEngine";
import { useUnifiedCognitive } from "@/contexts/UnifiedCognitiveContext";
import { TitanNervousSystem } from "@/lib/titanNervousSystem";

// ── Design tokens ──────────────────────────────────────────────────────────
const OBSIDIAN   = "rgba(10,9,8,0.92)";
const GOLD_PILL  = "#D4AF37";
const AMBER      = "#D48B00";
const DANGER     = "#EF4444";
const KILL_RED   = "#FF2D2D";
const KILL_AMBER = "#F59E0B";
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

function IconBlackout({ active }: { active: boolean }) {
  const c = active ? KILL_RED : "rgba(255,45,45,0.70)";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.2"/>
      <path d="M7 3v4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="7" cy="9.5" r="0.9" fill={c}/>
    </svg>
  );
}

function IconApiLock({ active }: { active: boolean }) {
  const c = active ? KILL_AMBER : "rgba(245,158,11,0.75)";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 6.5V5a3.5 3.5 0 0 1 7 0v1.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <rect x="2.5" y="6.5" width="9" height="6" rx="1.5" stroke={c} strokeWidth="1.2"/>
      <path d="M7 9v1.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
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
  active?:   boolean;
  onClick:   () => void;
}

function MenuItem({ icon, label, sub, accent, danger, active, onClick }: MenuItemProps) {
  const fire = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  return (
    <motion.button
      data-override-hub
      whileTap={{ scale: 0.96, backgroundColor: `${accent}14` }}
      onPointerDown={fire}
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        10,
        padding:    "11px 14px",
        borderRadius: 8,
        border:     active ? `1px solid ${accent}50` : "none",
        background: active
          ? `${accent}10`
          : danger
            ? "rgba(239,68,68,0.06)"
            : "transparent",
        cursor:     "pointer",
        width:      "100%",
        textAlign:  "left",
        minHeight:  52,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        transition: "background 0.15s, border-color 0.18s",
      }}
    >
      {/* Icon circle */}
      <div style={{
        width:    34,
        height:   34,
        borderRadius: "50%",
        background: `${accent}${active ? "22" : "12"}`,
        border:   `1px solid ${accent}${active ? "55" : "30"}`,
        display:  "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: active ? `0 0 10px ${accent}40` : "none",
        transition: "box-shadow 0.18s",
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize:      10.5,
          fontWeight:    700,
          color:         active ? accent : accent,
          letterSpacing: "0.1em",
          fontFamily:    FONT,
          lineHeight:    1,
          display:       "flex",
          alignItems:    "center",
          gap:           6,
        }}>
          {label}
          {active && (
            <span style={{
              fontSize:      7,
              padding:       "2px 5px",
              borderRadius:  4,
              background:    `${accent}22`,
              border:        `1px solid ${accent}55`,
              color:         accent,
              letterSpacing: "0.08em",
            }}>
              ACTIVE
            </span>
          )}
        </div>
        <div style={{
          fontSize:      8.5,
          color:         active ? `${accent}80` : "rgba(212,175,55,0.40)",
          marginTop:     4,
          letterSpacing: "0.06em",
          fontFamily:    FONT,
        }}>
          {active ? "Tap to disable" : sub}
        </div>
      </div>

      {/* Right arrow */}
      <svg width="7" height="10" viewBox="0 0 7 10" fill="none">
        <path d="M1.5 1.5L5.5 5L1.5 8.5" stroke={`${accent}50`} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </motion.button>
  );
}

// ── Kill-switch long-press item — 2-second hold required ──────────────────
// CSS height transition fills the icon circle over 2 s (linear).
// Wall-clock duration measured on pointerUp. Early release → haptics.error().

interface KillSwitchItemProps {
  icon:     React.ReactNode;
  label:    string;
  sub:      string;
  accent:   string;
  active?:  boolean;
  onCommit: () => void;
}

function KillSwitchItem({ icon, label, sub, accent, active, onCommit }: KillSwitchItemProps) {
  const [holdStart, setHoldStart] = useState<number | null>(null);
  const holding = holdStart !== null;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHoldStart(Date.now());
  }, []);

  const handlePointerUp = useCallback(() => {
    if (holdStart === null) return;
    const duration = Date.now() - holdStart;
    setHoldStart(null);
    if (duration >= 2000) {
      onCommit();
    } else {
      TitanNervousSystem.haptics.error();
    }
  }, [holdStart, onCommit]);

  const handleCancel = useCallback(() => {
    if (holdStart === null) return;
    setHoldStart(null);
    TitanNervousSystem.haptics.error();
  }, [holdStart]);

  return (
    <motion.button
      data-override-hub
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handleCancel}
      onPointerCancel={handleCancel}
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         10,
        padding:     "11px 14px",
        borderRadius: 8,
        border:      holding
          ? `1px solid ${GOLD_PILL}88`
          : active
            ? `1px solid ${accent}50`
            : "none",
        background:  holding
          ? `${GOLD_PILL}14`
          : active
            ? `${accent}10`
            : "rgba(239,68,68,0.06)",
        cursor:      "pointer",
        width:       "100%",
        textAlign:   "left",
        minHeight:   52,
        touchAction: "none",
        WebkitTapHighlightColor: "transparent",
        userSelect:  "none",
        boxShadow:   holding ? `0 0 16px ${GOLD_PILL}28` : "none",
      }}
    >
      {/* Icon circle with CSS rising fill */}
      <div style={{
        position:     "relative",
        width:        34,
        height:       34,
        borderRadius: "50%",
        overflow:     "hidden",
        border:       `1px solid ${accent}${active ? "55" : "30"}`,
        background:   `${accent}${active ? "22" : "12"}`,
        flexShrink:   0,
        boxShadow:    holding
          ? `0 0 18px ${GOLD_PILL}70`
          : active
            ? `0 0 10px ${accent}40`
            : "none",
      }}>
        {/* Rising gold fill — CSS transition drives the 2s charge */}
        <div style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          width:      "100%",
          background: GOLD_PILL,
          opacity:    0.38,
          height:     holding ? "100%" : "0%",
          transition: holding ? "height 2000ms linear" : "height 0ms",
        }} />
        {/* Icon sits above the fill */}
        <div style={{
          position:       "relative",
          zIndex:         1,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          "100%",
          height:         "100%",
        }}>
          {icon}
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:      10.5,
          fontWeight:    700,
          color:         holding ? GOLD_PILL : accent,
          letterSpacing: "0.1em",
          fontFamily:    FONT,
          lineHeight:    1,
          display:       "flex",
          alignItems:    "center",
          gap:           6,
        }}>
          {label}
          {active && !holding && (
            <span style={{
              fontSize: 7, padding: "2px 5px", borderRadius: 4,
              background: `${accent}22`, border: `1px solid ${accent}55`,
              color: accent, letterSpacing: "0.08em",
            }}>
              ACTIVE
            </span>
          )}
          {holding && (
            <span style={{
              fontSize: 7, padding: "2px 5px", borderRadius: 4,
              background: `${GOLD_PILL}22`, border: `1px solid ${GOLD_PILL}55`,
              color: GOLD_PILL, letterSpacing: "0.08em",
            }}>
              CHARGING
            </span>
          )}
        </div>
        <div style={{
          fontSize:      8.5,
          color:         holding
            ? `${GOLD_PILL}90`
            : active
              ? `${accent}80`
              : "rgba(212,175,55,0.40)",
          marginTop:     4,
          letterSpacing: "0.06em",
          fontFamily:    FONT,
          lineHeight:    1.4,
        }}>
          {holding
            ? "Release to cancel  ·  Hold 2s to engage"
            : active
              ? "Hold 2s to disable"
              : sub}
        </div>
      </div>

      {/* Chevron — hidden while charging */}
      {!holding && (
        <svg width="7" height="10" viewBox="0 0 7 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1.5 1.5L5.5 5L1.5 8.5" stroke={`${accent}50`} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )}
    </motion.button>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────

function Divider({ label }: { label?: string }) {
  return (
    <div style={{
      margin:     "4px 14px",
      height:     1,
      background: BORDER,
      position:   "relative",
      display:    "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {label && (
        <span style={{
          position:   "absolute",
          background: OBSIDIAN,
          padding:    "0 6px",
          fontSize:   7,
          color:      MUTED,
          letterSpacing: "0.14em",
          fontFamily: FONT,
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const PULSE_DUR: Record<string, string> = {
  MEDITATIVE:  "3.5s",
  FOCUSED:     "2s",
  HIGH_ENERGY: "0.85s",
};

export function SovereignOverrideHub() {
  const [open, setOpen]         = useState(false);
  const [mounted, setMounted]   = useState(false);
  const pillRef                 = useRef<HTMLButtonElement>(null);
  const [pillRect, setPillRect] = useState<DOMRect | null>(null);

  const [, navigate]            = useLocation();
  const { triggerHandoff }      = useHandoff();
  const { clearGuest }          = useGuestProfile();
  const { purgeSessions }       = useCraftExperience();
  const { activateGhost, killSwitches, toggleKillSwitch } = useSuperAdmin();
  const { lounge_mood }         = useUnifiedCognitive();

  const isBlackoutActive = killSwitches.find(s => s.name === "session_blackout")?.enabled ?? false;
  const isApiLockActive  = killSwitches.find(s => s.name === "api_disconnect")?.enabled  ?? false;

  const pulseDur = PULSE_DUR[lounge_mood] ?? "2s";

  useEffect(() => { setMounted(true); }, []);

  // Close on outside tap — pointerdown fires once for both mouse and touch
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-override-hub]")) setOpen(false);
    };
    const t = setTimeout(() => {
      window.addEventListener("pointerdown", handler);
    }, 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", handler);
    };
  }, [open]);

  const handleOpen = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (pillRef.current) setPillRect(pillRef.current.getBoundingClientRect());
    const willOpen = !open;
    setOpen(v => !v);
    if (willOpen) playPillClink();
  }, [open]);

  // ── Action handlers ──────────────────────────────────────────────────────

  const handleEeis = useCallback(() => {
    setOpen(false);
    triggerHandoff(window.innerWidth / 2, window.innerHeight / 2);
    setTimeout(() => navigate("/eeie-command"), 80);
  }, [triggerHandoff, navigate]);

  const handleGhostCore = useCallback(() => {
    setOpen(false);
    activateGhost();
    setTimeout(() => navigate("/admin-master"), 80);
  }, [activateGhost, navigate]);

  const handleBlackout = useCallback(() => {
    toggleKillSwitch("session_blackout");
    // executeGlobalCommand fires haptics.heavy() + SOVEREIGN_GLOBAL_DISRUPTION broadcast
    void TitanNervousSystem.executeGlobalCommand("BLACKOUT", 2001);
  }, [toggleKillSwitch]);

  const handleApiLock = useCallback(() => {
    toggleKillSwitch("api_disconnect");
    void TitanNervousSystem.executeGlobalCommand("API_LOCK", 2001);
  }, [toggleKillSwitch]);

  const handlePurge = useCallback(() => {
    TitanNervousSystem.haptics.heavy();
    setOpen(false);
    setTimeout(() => {
      purgeSessions();
      clearGuest();
      navigate("/portal");
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
        minWidth:             248,
        boxShadow:            `0 12px 48px rgba(0,0,0,0.82), 0 0 0 1px rgba(212,175,55,0.06) inset, 0 0 32px rgba(212,175,55,0.06)`,
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
          background: (isBlackoutActive || isApiLockActive) ? KILL_RED : "#22c55e",
          boxShadow:  `0 0 6px ${(isBlackoutActive || isApiLockActive) ? KILL_RED : "#22c55e"}`,
          animation:  `hub-pulse ${pulseDur} ease-in-out infinite`,
        }} />
        {(isBlackoutActive || isApiLockActive) ? "⚠ SOVEREIGN OVERRIDE — ENGAGED" : "SOVEREIGN PROTOCOL · ACTIVE"}
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
        label="EEIE INTEL"
        sub="EEIE Command Center · Staff Telemetry"
        accent={AMBER}
        onClick={handleEeis}
      />
      <MenuItem
        icon={<IconCore />}
        label="GHOST CORE"
        sub="Sovereign Access · Kill-Switches · Provisioning"
        accent={GOLD_PILL}
        onClick={handleGhostCore}
      />

      <Divider label="REMOTE AUTHORITY — HOLD 2s" />

      <KillSwitchItem
        icon={<IconBlackout active={isBlackoutActive} />}
        label="BLACKOUT"
        sub="Hold 2s · Freeze all active guest sessions"
        accent={KILL_RED}
        active={isBlackoutActive}
        onCommit={handleBlackout}
      />
      <KillSwitchItem
        icon={<IconApiLock active={isApiLockActive} />}
        label="API LOCK"
        sub="Hold 2s · Suspend AI calls globally"
        accent={KILL_AMBER}
        active={isApiLockActive}
        onCommit={handleApiLock}
      />

      <Divider />

      <KillSwitchItem
        icon={<IconPurge />}
        label="SYSTEM PURGE"
        sub="Hold 2s · Clear session · Return to portal"
        accent={DANGER}
        onCommit={handlePurge}
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
        onPointerDown={handleOpen}
        style={{
          position:             "fixed",
          top:                  12,
          right:                14,
          zIndex:               20000,
          display:              "flex",
          alignItems:           "center",
          gap:                  7,
          background:           open ? "rgba(212,175,55,0.10)" : OBSIDIAN,
          border:               `1px solid ${open ? GOLD_PILL : (isBlackoutActive || isApiLockActive) ? KILL_RED : BORDER}`,
          borderRadius:         999,
          padding:              "9px 16px",
          backdropFilter:       "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          cursor:               "pointer",
          minHeight:            42,
          touchAction:          "manipulation",
          WebkitTapHighlightColor: "transparent",
          transition:           "background 0.15s, border-color 0.18s, box-shadow 0.18s",
          boxShadow:            (isBlackoutActive || isApiLockActive)
            ? `0 0 20px rgba(255,45,45,0.30)`
            : open
              ? `0 0 20px rgba(212,175,55,0.20)`
              : "0 2px 12px rgba(0,0,0,0.55)",
        }}
      >
        {/* Status dot */}
        <div style={{
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   (isBlackoutActive || isApiLockActive) ? KILL_RED : "#22c55e",
          boxShadow:    `0 0 7px ${(isBlackoutActive || isApiLockActive) ? KILL_RED : "#22c55e"}`,
          flexShrink:   0,
          animation:    `hub-pulse ${pulseDur} ease-in-out infinite`,
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
          ◈ NOVEE OS // SOVEREIGN
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
