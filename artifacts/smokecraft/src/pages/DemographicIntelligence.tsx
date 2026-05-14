/**
 * DemographicIntelligence — NOVEE OS rotating audience profiler.
 * Route: /titan-demo
 *
 * Auto-cycles through 4 craft × demographic pairings every 5s.
 * Physical NFC coin tap (via TitanEngine.onSageWake) overrides the
 * rotation and pins the guest's craft tile as "active" for 15s,
 * then resumes auto-rotation.
 *
 * Status bar: live "Kiosk Locked" and "NFC Ready" indicators.
 * Footer: Smokecraft 360 brand mark + live Environment Pulse text.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation }                 from "wouter";
import { motion, AnimatePresence }     from "framer-motion";
import { CRAFT_MODULES }               from "@/data/craftScenes";
import TitanEngine, { TitanGuestProfile, SagePayload } from "@/engines/titan_engine";
import { addXP }                       from "@/lib/xpStore";

// ── Demographic metadata per craft ────────────────────────────────────────────

const DEMOGRAPHICS: Record<string, { group: string; img: string }> = {
  smoke: { group: "Luxury Connoisseur",  img: "https://images.unsplash.com/photo-1527030280862-64139fba04ca?w=300&fit=crop" },
  pour:  { group: "Executive Traveler",  img: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=300&fit=crop" },
  brew:  { group: "Young Professional",  img: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&fit=crop" },
  vape:  { group: "Social Elite",        img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&fit=crop" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVenueId(): string | null {
  for (const k of ["axiom_jwt","auth_token","axiom_token","smokecraft_token"]) {
    const t = localStorage.getItem(k);
    if (t) try { return (JSON.parse(atob(t.split(".")[1]!)) as { venueId?: string }).venueId ?? null; } catch { /* next */ }
  }
  return null;
}

// ── Craft card ────────────────────────────────────────────────────────────────

interface CardProps {
  craftId:    string;
  craftTitle: string;
  craftColor: string;
  craftRoute: string;
  isActive:   boolean;
  activeIndex: number;
}

function DemoCard({ craftId, craftTitle, craftColor, craftRoute, isActive, activeIndex }: CardProps) {
  const [, navigate] = useLocation();
  const demo = DEMOGRAPHICS[craftId] ?? DEMOGRAPHICS.smoke;

  // Rotate through images when not active
  const allImgs = CRAFT_MODULES.map(m => DEMOGRAPHICS[m.id]?.img ?? demo.img);
  const rotatedImg = isActive ? demo.img : allImgs[(activeIndex + CRAFT_MODULES.findIndex(m => m.id === craftId)) % 4];

  return (
    <motion.div
      className="axiom-card p-6 flex items-center gap-6 cursor-pointer"
      style={{ borderColor: isActive ? `${craftColor}55` : undefined }}
      whileHover={{ scale: 1.015, boxShadow: `0 0 24px ${craftColor}30, 0 10px 40px rgba(0,0,0,0.80)` }}
      whileTap={{ scale: 0.98 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(craftRoute)}
    >
      {/* Active glow top-edge */}
      {isActive && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
          style={{ background: craftColor }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}

      {/* Image */}
      <div className="relative flex-shrink-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={rotatedImg}
            src={rotatedImg}
            alt={craftId}
            className="w-24 h-24 object-cover rounded-md shadow-xl"
            style={{ border: `1px solid rgba(212,175,55,0.20)` }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5 }}
          />
        </AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: craftColor }}>
          {craftTitle.split(" ")[0]} Craft
        </p>
        <AnimatePresence mode="wait">
          <motion.h2
            key={isActive ? demo.group : "analyzing"}
            className="text-2xl font-light italic leading-tight truncate"
            style={{ color: isActive ? "white" : "rgba(255,255,255,0.35)" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
          >
            {isActive ? demo.group : "Analyzing…"}
          </motion.h2>
        </AnimatePresence>
        {isActive && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            className="text-[9px] uppercase tracking-wider mt-1"
            style={{ color: craftColor }}
          >
            Tap to enter
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const NFC_AVAILABLE = "NDEFReader" in window;
const PIN_DURATION_MS = 15_000;

export default function DemographicIntelligence() {
  const [, navigate]       = useLocation();
  const [activeIndex, setActiveIndex]   = useState(0);
  const [nfcGuest, setNfcGuest]         = useState<TitanGuestProfile | null>(null);
  const [envLabel, setEnvLabel]         = useState("Nominal");
  const [sageFlash, setSageFlash]       = useState(false);
  const pinTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-rotation every 5s ────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      if (!nfcGuest) setActiveIndex(i => (i + 1) % CRAFT_MODULES.length);
    }, 5_000);
    return () => clearInterval(iv);
  }, [nfcGuest]);

  // ── NFC Event Listener & Sage Wake Trigger ────────────────────────────────
  useEffect(() => {
    if (!("NDEFReader" in window)) return;
    type NdefLike = {
      scan:      (opts?: { signal?: AbortSignal }) => Promise<void>;
      onreading: ((e: { serialNumber: string }) => void) | null;
    };
    const ndef = new (window as unknown as { NDEFReader: new () => NdefLike }).NDEFReader();
    const ctrl = new AbortController();

    const startNFC = async (): Promise<void> => {
      try {
        await ndef.scan({ signal: ctrl.signal });
        ndef.onreading = (event: { serialNumber: string }) => {
          const serial = event.serialNumber;

          // XP Reward for physical coin interaction
          addXP(50);

          // SAGE WAKE: Force rotation to "Pour Craft" (Index 1) on tap
          setActiveIndex(1);

          // Trigger a temporary UI pulse effect
          setSageFlash(true);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setSageFlash(false), 300);

          // Fire backend NFC lookup (resolves guest profile + mentor)
          void TitanEngine.handleNFCTap(serial).then(result => {
            if (!result.success || !result.profile) return;
            setNfcGuest(result.profile);
            if (result.sage) {
              const mentorCraft = (result.sage.mentorId ?? "").toLowerCase();
              const idx = CRAFT_MODULES.findIndex(m => mentorCraft.startsWith(m.id));
              if (idx > -1) setActiveIndex(idx);
            }
            if (pinTimer.current) clearTimeout(pinTimer.current);
            pinTimer.current = setTimeout(() => setNfcGuest(null), PIN_DURATION_MS);
          });
        };
      } catch {
        // NFC Init Failed: Hardware not detected or Permission Denied.
      }
    };

    void startNFC();
    return () => {
      ctrl.abort();
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (pinTimer.current)   clearTimeout(pinTimer.current);
    };
  }, []);

  // ── Environment Pulse text ────────────────────────────────────────────────
  useEffect(() => {
    const venueId = getVenueId();
    if (!venueId) return;
    TitanEngine.syncEnvironment(venueId).then(r => {
      if (!r) return;
      setEnvLabel(r.isDeviant ? "Deviant" : r.vitality !== null && r.vitality >= 80 ? "High" : "Nominal");
    });
  }, []);

  return (
    <div
      className="p-8 h-screen flex flex-col justify-between select-none"
      style={{ background: "var(--axiom-body-bg, var(--steel-bg))", color: "white", overflow: "hidden" }}
    >
      {/* ── Sage Wake brightness flash overlay ── */}
      <AnimatePresence>
        {sageFlash && (
          <motion.div
            key="sage-flash"
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.30, ease: "easeOut" }}
            style={{
              position: "fixed", inset: 0, zIndex: 999,
              background: "rgba(255,255,255,0.85)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="flex justify-between items-center gold-trim pb-4">
        <h1 className="text-xs tracking-[0.4em] font-bold uppercase" style={{ color: "var(--gold)" }}>
          NOVEE OS // Titan Active
        </h1>
        <div className="flex gap-4 text-[10px] uppercase">
          <span className="flex items-center gap-1.5 opacity-60">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            Kiosk Locked
          </span>
          <span className={`flex items-center gap-1.5 ${NFC_AVAILABLE ? "opacity-80" : "opacity-30"}`}>
            <motion.div
              className={`w-1.5 h-1.5 rounded-full ${NFC_AVAILABLE ? "bg-amber-400" : "bg-white/30"}`}
              animate={NFC_AVAILABLE ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
            NFC {NFC_AVAILABLE ? "Ready" : "Unavailable"}
          </span>
          {nfcGuest && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-amber-400"
            >
              ◆ {nfcGuest.firstName} — Pinned
            </motion.span>
          )}
        </div>
        <button
          onClick={() => navigate("/titan-hub")}
          style={{ background: "none", border: "none", cursor: "pointer",
                   fontSize: 9, color: "rgba(255,255,255,0.30)", letterSpacing: "0.10em",
                   textTransform: "uppercase" }}
        >
          Craft Hub →
        </button>
      </header>

      {/* 2×2 Demographic grid */}
      <main className="grid grid-cols-2 gap-8 flex-grow mt-8 relative">
        {CRAFT_MODULES.map((mod, i) => (
          <DemoCard
            key={mod.id}
            craftId={mod.id}
            craftTitle={mod.title}
            craftColor={mod.color}
            craftRoute={mod.route}
            isActive={activeIndex === i}
            activeIndex={activeIndex}
          />
        ))}

        {/* Rotation progress bar */}
        {!nfcGuest && (
          <motion.div
            key={activeIndex}
            className="absolute bottom-0 left-0 h-[1px]"
            style={{ background: CRAFT_MODULES[activeIndex]?.color ?? "var(--gold)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="flex justify-between items-center steel-panel p-6 mt-8 rounded-lg"
        style={{ borderTop: "1px solid rgba(120,83,0,0.30)" }}>
        <div className="flex items-center gap-4">
          <motion.div
            className="w-4 h-4 bg-yellow-600 flex-shrink-0"
            style={{ transform: "rotate(45deg)" }}
            animate={{ boxShadow: ["0 0 6px rgba(212,175,55,0.4)", "0 0 14px rgba(212,175,55,0.8)", "0 0 6px rgba(212,175,55,0.4)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <span className="font-bold tracking-widest text-white uppercase text-sm">
            Smokecraft 360
          </span>
        </div>
        <div className="text-[10px] opacity-40 uppercase tracking-tighter text-right leading-relaxed">
          Environment Pulse: {envLabel}<br />Lounge Vitality: High
        </div>
      </footer>
    </div>
  );
}
