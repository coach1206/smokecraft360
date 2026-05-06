/**
 * HandoffContainer — AXIOM 360 dual-mode OS shell.
 *
 * Manages the full Patron ↔ Staff mode state machine and renders
 * both UI layers with the cinematic Handoff transition.
 *
 * PATRON MODE
 *   Four large craft cards (SmokeCraft, PourCraft, BrewCraft, VapeCraft)
 *   on a Hardware-First canvas: brushed-graphite texture, card-recessed
 *   shadows, axiomAmber highlights, Lounge Pulse ambient cloud.
 *
 * THE SECRET HANDOFF
 *   A 3-second invisible long-press on the top-center of the screen
 *   triggers The Handoff. A SystemOverride flash plays, then the Staff
 *   Dashboard slides in with a "sliding metal" Framer Motion animation —
 *   a chrome-sheen sweeps the panel surface as it enters from the right.
 *   The Patron UI simultaneously blurs and recedes behind it.
 *
 * STAFF MODE
 *   Chrome-gradient Staff Dashboard with a 9-button recessed nav grid,
 *   last-craft memory badge, and a "Return to Patron" control.
 *
 * Usage:
 *   <HandoffContainer />
 *
 * State is managed via useAxiom360 (Zustand, localStorage-persisted)
 * so mode + craft selection survive page refreshes and device wakes.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation }                              from "wouter";
import { motion, AnimatePresence }                  from "framer-motion";
import {
  Settings, CreditCard, BookOpen, BarChart3,
  DollarSign, Package, Zap, Activity, Shield,
  ChevronLeft, Clock,
} from "lucide-react";
import { useAxiom360 }   from "@/store/axiom360Store";
import type { CraftType } from "@/store/axiom360Store";
import { Pulse }          from "./Pulse";

// ── Craft definitions ─────────────────────────────────────────────────────────

const CRAFTS = [
  {
    id:      "smoke",
    label:   "SmokeCraft",
    tagline: "Premium Tobacco",
    sub:     "Curated reserve experience",
    color:   "#C9A84C",
    route:   "/experience/smoke",
    glyph:   "◈",
  },
  {
    id:      "pour",
    label:   "PourCraft",
    tagline: "Curated Spirits",
    sub:     "Single-malt discovery engine",
    color:   "#9B7FD4",
    route:   "/experience/pour",
    glyph:   "◇",
  },
  {
    id:      "brew",
    label:   "BrewCraft",
    tagline: "Artisan Beer",
    sub:     "Small-batch craft selections",
    color:   "#3BBFA3",
    route:   "/experience/brew",
    glyph:   "◎",
  },
  {
    id:      "vape",
    label:   "VapeCraft",
    tagline: "Next-Gen Vapor",
    sub:     "Precision vapor experiences",
    color:   "#5BC4F5",
    route:   "/experience/vape",
    glyph:   "◉",
  },
] as const;

// ── Staff nav grid ────────────────────────────────────────────────────────────

const STAFF_NAV = [
  { label: "Operations", icon: Settings,   route: "/operations"             },
  { label: "POS Mode",   icon: CreditCard, route: "/pos"                    },
  { label: "Training",   icon: BookOpen,   route: "/training"               },
  { label: "Analytics",  icon: BarChart3,  route: "/analytics"              },
  { label: "Finance",    icon: DollarSign, route: "/finance-reconciliation" },
  { label: "Inventory",  icon: Package,    route: "/inventory"              },
  { label: "Revenue",    icon: Zap,        route: "/revenue"                },
  { label: "Devices",    icon: Activity,   route: "/devices"                },
  { label: "Audit",      icon: Shield,     route: "/operations"             },
] as const;

// ── Constants ─────────────────────────────────────────────────────────────────

const HOLD_MS      = 3000;
const FLASH_MS     = 680;

// Recessed button inline shadow (supplements .btn-recessed Tailwind utility)
const BTN_SHADOW =
  "inset 0 3px 8px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(255,255,255,0.03)";

// ── System Override flash ─────────────────────────────────────────────────────

function OverrideFlash() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: FLASH_MS / 1000, times: [0, 0.14, 0.74, 1] }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-4"
      style={{ background: "linear-gradient(135deg, #1c1814, #0a0806)" }}
    >
      {/* Scan line top */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-64 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }}
      />

      <div
        className="text-[9px] tracking-[0.38em] uppercase"
        style={{ color: "rgba(201,168,76,0.55)" }}
      >
        System Override
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="font-serif text-5xl font-bold tracking-wider"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: "#C9A84C",
        }}
      >
        Staff Access
      </motion.div>

      {/* Scan line bottom */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="w-64 h-px mt-2"
        style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }}
      />
    </motion.div>
  );
}

// ── Individual craft card ─────────────────────────────────────────────────────

function CraftCard({
  craft,
  idx,
  onTap,
}: {
  craft: typeof CRAFTS[number];
  idx:   number;
  onTap: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + idx * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onTapStart={() => setPressed(true)}
      onTap={() => { setPressed(false); onTap(); }}
      onTapCancel={() => setPressed(false)}
      /* Tailwind: bg-axiom-graphite card-recessed brushed-graphite */
      className="relative overflow-hidden rounded-2xl cursor-pointer text-left outline-none
                 bg-axiom-graphite card-recessed brushed-graphite"
      style={{
        border: `1px solid ${hovered ? `${craft.color}55` : "rgba(255,255,255,0.07)"}`,
        boxShadow: pressed
          ? `inset 0 5px 18px rgba(0,0,0,0.9), 0 0 0 1px ${craft.color}40`
          : `inset 0 2px 4px rgba(255,255,255,0.05), 0 6px 32px rgba(0,0,0,0.55), 0 0 0 1px ${craft.color}14`,
        transition: "box-shadow 0.18s, border-color 0.22s",
      }}
    >
      {/* Per-craft bottom color bleed */}
      <motion.div
        animate={{ opacity: hovered ? 0.26 : 0.10 }}
        transition={{ duration: 0.35 }}
        className="absolute pointer-events-none"
        style={{
          bottom: -10, left: "12%", right: "12%", height: 36,
          borderRadius: "50%",
          background: craft.color,
          filter: "blur(20px)",
        }}
      />

      {/* Breathing glow ring */}
      <motion.div
        animate={{ opacity: [0.07, 0.24, 0.07] }}
        transition={{ duration: 3.2 + idx * 0.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ border: `1px solid ${craft.color}` }}
      />

      {/* Tap flash */}
      <AnimatePresence>
        {pressed && (
          <motion.div
            initial={{ opacity: 0.28 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: craft.color }}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
        {/* Glyph */}
        <motion.div
          animate={{ opacity: [0.18, 0.42, 0.18] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.4 }}
          className="text-4xl sm:text-5xl mb-2 leading-none"
          style={{ color: craft.color }}
        >
          {craft.glyph}
        </motion.div>

        {/* Labels */}
        <div>
          <div
            className="font-serif font-bold leading-tight mb-1"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(17px, 2.4vw, 24px)",
              color: "#F0E8D4",
            }}
          >
            {craft.label}
          </div>
          <div
            className="uppercase font-bold tracking-widest mb-1"
            style={{ fontSize: 9, color: craft.color, letterSpacing: "0.22em" }}
          >
            {craft.tagline}
          </div>
          <div
            className="leading-snug"
            style={{ fontSize: 9, color: "rgba(240,232,212,0.28)", letterSpacing: "0.04em" }}
          >
            {craft.sub}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          animate={{ x: hovered ? 4 : 0, opacity: hovered ? 1 : 0.4 }}
          transition={{ duration: 0.18 }}
          className="mt-3 font-bold uppercase tracking-widest"
          style={{ fontSize: 10, color: craft.color }}
        >
          Enter ›
        </motion.div>
      </div>
    </motion.button>
  );
}

// ── Staff dashboard panel ─────────────────────────────────────────────────────

function StaffPanel({
  currentCraft,
  lastHandoffAt,
  onExit,
}: {
  currentCraft:  CraftType;
  lastHandoffAt: number | null;
  onExit:        () => void;
}) {
  const [, navigate] = useLocation();
  const craft = CRAFTS.find((c) => c.id === currentCraft);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 290, damping: 30 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #211d18 0%, #0e0c0a 100%)",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        color: "#F0E8D4",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Chrome sheen — sweeps left→right on entry, simulates sliding metal */}
      <motion.div
        initial={{ x: "-120%" }}
        animate={{ x: "220%" }}
        transition={{ duration: 0.58, ease: "easeOut", delay: 0.08 }}
        className="absolute inset-y-0 w-1/2 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
        }}
      />

      {/* Brushed graphite texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none brushed-graphite"
        style={{ opacity: 0.6, zIndex: 0 }}
      />

      {/* ── Header ── */}
      <div
        className="relative z-10 flex-shrink-0 px-7 pt-7 pb-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.22)" }}
      >
        <div
          className="flex items-center gap-2 mb-3 uppercase tracking-[0.35em]"
          style={{ fontSize: 8, color: "rgba(240,232,212,0.38)" }}
        >
          <Shield size={9} color="rgba(201,168,76,0.5)" />
          Staff Override Active
        </div>

        <div
          className="font-bold leading-tight"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(24px, 3.5vw, 34px)",
            color: "#C9A84C",
            letterSpacing: "0.05em",
          }}
        >
          Staff Dashboard
        </div>

        {/* Context badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {craft && (
            <span
              className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
              style={{
                background: `${craft.color}18`,
                border: `1px solid ${craft.color}40`,
                color: craft.color,
              }}
            >
              {craft.label} — Patron Was Here
            </span>
          )}
          {lastHandoffAt && (
            <span
              className="px-3 py-1 rounded-full text-[10px] flex items-center gap-1"
              style={{
                background: "rgba(201,168,76,0.10)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "rgba(201,168,76,0.55)",
              }}
            >
              <Clock size={9} />
              {new Date(lastHandoffAt).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* ── Nav grid ── */}
      <div
        className="relative z-10 flex-1 overflow-y-auto p-6"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, alignContent: "start" }}
      >
        {STAFF_NAV.map(({ label, icon: Icon, route }) => (
          <button
            key={label}
            onClick={() => navigate(route)}
            className="rounded-2xl flex flex-col items-center gap-2 py-4 px-2 cursor-pointer
                       transition-colors btn-recessed"
            style={{
              background: "linear-gradient(160deg, #1e1a15, #141210)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(240,232,212,0.45)",
              boxShadow: BTN_SHADOW,
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)";
              e.currentTarget.style.color = "#F0E8D4";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "rgba(240,232,212,0.45)";
            }}
          >
            <Icon size={16} color="rgba(201,168,76,0.55)" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Footer ── */}
      <div
        className="relative z-10 flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.18)" }}
      >
        <button
          onClick={onExit}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold
                     uppercase tracking-wider cursor-pointer transition-colors"
          style={{
            background: "linear-gradient(135deg, #1e1a14, #141210)",
            border: "1px solid rgba(201,168,76,0.35)",
            color: "#C9A84C",
            boxShadow: BTN_SHADOW,
            outline: "none",
          }}
        >
          <ChevronLeft size={13} />
          Return to Patron
        </button>

        <div
          className="text-[8px] uppercase tracking-[0.2em]"
          style={{ color: "rgba(240,232,212,0.22)" }}
        >
          Axiom 360 OS
        </div>
      </div>
    </motion.div>
  );
}

// ── Patron view ───────────────────────────────────────────────────────────────

function PatronView({
  onHandoff,
  onCraftSelect,
}: {
  onHandoff:     () => void;
  onCraftSelect: (craft: typeof CRAFTS[number]) => void;
}) {
  const [, navigate]   = useLocation();
  const [activeCraft, setActiveCraft] = useState<string | null>(null);
  const [burstKey, setBurstKey]       = useState(0);
  const [portal, setPortal]           = useState<{ route: string; color: string } | null>(null);

  // Live clock
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
      10_000,
    );
    return () => clearInterval(id);
  }, []);

  function handleCraftTap(craft: typeof CRAFTS[number]) {
    setActiveCraft(craft.id);
    setBurstKey((k) => k + 1);
    onCraftSelect(craft);
    setTimeout(() => setPortal({ route: craft.route, color: craft.color }), 320);
  }

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden grainy-texture"
      style={{
        background: "#0d0b09",
        color: "#F0E8D4",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Lounge Pulse ambient — centered in the craft grid area */}
      <Pulse
        id="patron"
        color={activeCraft ? (CRAFTS.find((c) => c.id === activeCraft)?.color ?? "#FFBF00") : "#FFBF00"}
        size={560}
        blur={36}
        minOpacity={0.06}
        maxOpacity={0.18}
        burst={burstKey > 0}
        style={{
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* ── Header ── */}
      <header
        className="relative z-10 flex items-center gap-4 px-5 py-3 flex-shrink-0"
        style={{
          borderBottom:   "1px solid rgba(255,255,255,0.07)",
          background:     "rgba(13,11,9,0.88)",
          backdropFilter: "blur(18px)",
        }}
      >
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          className="flex flex-col"
        >
          <span
            className="font-bold uppercase leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(18px, 2.4vw, 22px)",
              color: "#F0E8D4",
              letterSpacing: "0.18em",
            }}
          >
            Axiom 360
          </span>
          <span
            className="uppercase"
            style={{ fontSize: 8, color: "rgba(201,168,76,0.5)", letterSpacing: "0.3em", marginTop: 2 }}
          >
            Experience OS
          </span>
        </motion.div>

        {/* Status row */}
        <div className="flex items-center gap-5 flex-1 overflow-x-auto scrollbar-none ml-2">
          {[
            { label: "AI Engine",    state: "ACTIVE",  color: "#4ade80" },
            { label: "Taste Engine", state: "READY",   color: "#C9A84C" },
            { label: "Revenue",      state: "ONLINE",  color: "#a78bfa" },
            { label: "Inventory",    state: "SYNC",    color: "#60a5fa" },
          ].map((n) => (
            <div key={n.label} className="flex items-center gap-1.5 flex-shrink-0">
              <motion.div
                className="rounded-full"
                style={{ width: 4, height: 4, background: n.color }}
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <span style={{ fontSize: 8, color: "rgba(240,232,212,0.3)", letterSpacing: "0.14em" }}>
                {n.label}
              </span>
              <span style={{ fontSize: 8, color: n.color, fontWeight: 700, letterSpacing: "0.1em" }}>
                {n.state}
              </span>
            </div>
          ))}
        </div>

        {/* Clock */}
        <div
          className="flex-shrink-0 flex items-center gap-2"
          style={{ fontSize: 10, color: "rgba(240,232,212,0.25)", letterSpacing: "0.12em" }}
        >
          <motion.div
            className="rounded-full"
            style={{ width: 5, height: 5, background: "#34d399" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          {time}
        </div>
      </header>

      {/* ── Hero label ── */}
      <div className="relative z-10 px-5 pt-4 pb-2 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5 }}
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(15px, 2.2vw, 21px)",
            fontWeight: 300,
            color: "#F0E8D4",
          }}
        >
          Select your{" "}
          <span style={{ color: "#FFBF00", fontWeight: 600 }}>experience.</span>
        </motion.div>
        <p style={{ fontSize: 10, color: "rgba(240,232,212,0.38)", marginTop: 5 }}>
          The AI engine curates in real time — tap to begin.
        </p>
      </div>

      {/* ── 4 Craft Cards ── */}
      <div
        className="relative z-10 flex-1 min-h-0 px-4 pb-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows:    "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        {CRAFTS.map((craft, i) => (
          <CraftCard
            key={craft.id}
            craft={craft}
            idx={i}
            onTap={() => handleCraftTap(craft)}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 flex items-center gap-4 px-5 py-2.5 flex-shrink-0"
        style={{
          borderTop:      "1px solid rgba(255,255,255,0.06)",
          background:     "rgba(13,11,9,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        {CRAFTS.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <motion.div
              className="rounded-full"
              style={{ width: 4, height: 4, background: c.color }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
            />
            <span
              className="uppercase"
              style={{ fontSize: 8, color: "rgba(240,232,212,0.22)", letterSpacing: "0.2em" }}
            >
              {c.id}
            </span>
          </div>
        ))}
        <div
          className="ml-auto text-[8px] uppercase tracking-widest"
          style={{ color: "rgba(240,232,212,0.16)" }}
        >
          Hold top-center 3s · Staff
        </div>
      </footer>

      {/* ── Portal curtain ── */}
      <AnimatePresence>
        {portal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.48 }}
            onAnimationComplete={() => navigate(portal.route)}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "#0a0806" }}
          >
            <motion.div
              initial={{ scale: 0.05, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.48, ease: "easeOut" }}
              style={{
                width: 200, height: 200, borderRadius: "50%",
                background: `radial-gradient(circle, ${portal.color}55 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── HandoffContainer — root orchestrator ──────────────────────────────────────

export function HandoffContainer() {
  const { activeMode, currentCraft, lastHandoffAt, setMode, setCraft } = useAxiom360();
  const [flashing, setFlashing] = useState(false);

  // ── Hidden 3-second long-press trigger ────────────────────────────────────
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = useCallback(() => {
    if (holdTimerRef.current) return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (activeMode === "staff") {
        setMode("patron");
        return;
      }
      setFlashing(true);
      setTimeout(() => {
        setFlashing(false);
        setMode("staff");
      }, FLASH_MS);
    }, HOLD_MS);
  }, [activeMode, setMode]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-axiom-graphite">

      {/* ╔═══════════════════════════════════════════════════════════╗
          ║  HIDDEN TRIGGER — 3-second invisible long-press           ║
          ║  Position: top-center of the screen                       ║
          ║  Size: 128px wide × 44px tall, opacity 0                  ║
          ╚═══════════════════════════════════════════════════════════╝ */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 touch-none select-none"
        style={{ width: 128, height: 44, opacity: 0, cursor: "default" }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
      />

      {/* Patron layer — blurs and recedes when staff mode activates */}
      <motion.div
        className="absolute inset-0"
        animate={
          activeMode === "staff"
            ? { scale: 0.93, filter: "blur(7px)", opacity: 0.38 }
            : { scale: 1,    filter: "blur(0px)", opacity: 1    }
        }
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <PatronView
          onHandoff={() => {
            setFlashing(true);
            setTimeout(() => { setFlashing(false); setMode("staff"); }, FLASH_MS);
          }}
          onCraftSelect={(craft) => setCraft(craft.id as CraftType)}
        />
      </motion.div>

      {/* Staff Dashboard — slides in from right with "sliding metal" animation */}
      <AnimatePresence>
        {activeMode === "staff" && !flashing && (
          <StaffPanel
            currentCraft={currentCraft}
            lastHandoffAt={lastHandoffAt}
            onExit={() => setMode("patron")}
          />
        )}
      </AnimatePresence>

      {/* System Override flash — cinematic transition between modes */}
      <AnimatePresence>
        {flashing && <OverrideFlash />}
      </AnimatePresence>
    </div>
  );
}
