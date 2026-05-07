/**
 * TitanCraftDeck — Axiom OS TITAN-styled craft portal.
 * Route: /titan-hub
 *
 * Dark steel kiosk surface using the TITAN CSS class system:
 *   .glass-card, .gold-text, .steel-texture
 *
 * Data: live CRAFT_MODULES (smoke / pour / brew / vape).
 * Cards navigate to /experience/:type on tap.
 * Footer: Smokecraft 360 brand mark, WifeX affiliate link,
 *         live Environment Pulse widget from IoT API.
 */

import { useEffect, useState }     from "react";
import { useLocation }             from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CRAFT_MODULES }           from "@/data/craftScenes";
import TitanEngine, { AtmosphereReading } from "@/engines/titan_engine";
import { handleOutboundRedirect }  from "@/lib/affiliateLink";
import { getXP, getCurrentLevel, xpProgressPct } from "@/lib/xpStore";

// ── Unsplash hero images mapped by craft id ────────────────────────────────

const CRAFT_IMAGES: Record<string, string> = {
  smoke: "https://images.unsplash.com/photo-1527030280862-64139fba04ca?q=80&w=400&fit=crop",
  pour:  "https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=400&fit=crop",
  brew:  "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=400&fit=crop",
  vape:  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&fit=crop",
};

const CRAFT_SUBS: Record<string, string> = {
  smoke: "Luxury Connoisseurs",
  pour:  "Executive Travelers",
  brew:  "Young Professionals",
  vape:  "Social Elite",
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
  id:     string;
  title:  string;
  color:  string;
  route:  string;
  active: boolean;
}

function CraftCard({ id, title, color, route, active }: CardProps) {
  const [, navigate] = useLocation();
  const img = CRAFT_IMAGES[id] ?? CRAFT_IMAGES.smoke;
  const sub = CRAFT_SUBS[id] ?? "Select Clientele";

  return (
    <motion.div
      className="relative group axiom-card overflow-hidden cursor-pointer"
      animate={{
        scale:   active ? 1.035 : 1,
        opacity: active ? 1 : 0.58,
        boxShadow: active
          ? `0 0 0 1px ${color}90, 0 0 28px ${color}40, 0 10px 40px rgba(0,0,0,0.80)`
          : "0 0 0 1px rgba(212,175,55,0.12), 0 10px 30px rgba(0,0,0,0.50)",
      }}
      whileTap={{ scale: active ? 1.01 : 0.98 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(route)}
    >
      {/* Animated top accent */}
      <motion.div
        style={{ background: color }}
        className="absolute top-0 left-0 right-0 h-[1px]"
        animate={{ opacity: active ? [0.6, 1, 0.6] : [0.2, 0.35, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Gradient bleed */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(to bottom right, ${color}14 0%, transparent 55%, rgba(0,0,0,0.35) 100%)` }}
      />

      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <div className="relative">
            <img
              src={img}
              alt={title}
              className="w-24 h-24 rounded-lg object-cover"
              style={{ border: `1px solid ${color}${active ? "55" : "22"}` }}
            />
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${color}18 0%, transparent 60%)` }}
            />
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold mb-1" style={{ color }}>
              {title}
            </p>
            <h2 className="text-2xl font-light text-white italic tracking-wide leading-tight">
              Craft Hub
            </h2>
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] uppercase tracking-tighter opacity-50">
          <span>Target: {sub}</span>
          <motion.div
            className="h-2 w-2 rounded-full"
            style={{ background: active ? "#10b981" : "#4b5563" }}
            animate={active ? { scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Environment Pulse widget ──────────────────────────────────────────────────

const BARS = [3, 6, 4, 8, 2, 7];

function EnvPulse() {
  const [reading, setReading] = useState<AtmosphereReading | null>(null);

  useEffect(() => {
    const venueId = getVenueId();
    if (!venueId) return;
    TitanEngine.syncEnvironment(venueId).then(r => { if (r) setReading(r); });
  }, []);

  const vitality = reading?.vitality ?? null;
  const isDeviant = reading?.isDeviant ?? false;
  const label = isDeviant ? "⚠ DEVIANT" : vitality !== null ? "NOMINAL" : "MONITORING";
  const gold = "var(--gold-luster)";

  return (
    <div className="steel-panel rounded-lg p-4 flex justify-between items-center border-l-2"
      style={{ borderLeftColor: isDeviant ? "#f59e0b" : "var(--ax-gold)" }}>
      <div>
        <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: gold }}>
          Environment Pulse
        </div>
        <div className="text-xs text-white uppercase mt-0.5 font-semibold">
          {label}
        </div>
        {vitality !== null && (
          <div className="text-[8px] text-white/35 mt-0.5">{vitality}% vitality</div>
        )}
      </div>
      <div className="flex gap-1 h-8 items-end">
        {BARS.map((h, i) => (
          <motion.div
            key={i}
            className="w-2 rounded-sm"
            style={{ background: isDeviant ? "rgba(245,158,11,0.55)" : "rgba(212,139,0,0.45)" }}
            animate={{ height: [`${h * 10}%`, `${Math.min(100, h * 10 + 15)}%`, `${h * 10}%`] }}
            transition={{ duration: 1.8 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type View = "grid" | "atelier";

const CUTS = ["Straight", "V-Cut", "Punch"] as const;
const BAR_HEIGHTS = [40, 70, 100] as const;

export default function TitanCraftDeck() {
  const [, navigate]           = useLocation();
  const [mounted, setMounted]  = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView]        = useState<View>("grid");
  const [xp, setXp]            = useState(0);
  const [selectedCut, setSelectedCut] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setXp(getXP());
  }, []);

  // Sync XP when tab regains focus (NFC may have fired on another page)
  useEffect(() => {
    const onFocus = () => setXp(getXP());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Auto-rotation every 6s — paused while in atelier view
  useEffect(() => {
    if (view !== "grid") return;
    const iv = setInterval(() => setActiveIndex(i => (i + 1) % CRAFT_MODULES.length), 6_000);
    return () => clearInterval(iv);
  }, [view]);

  const level   = getCurrentLevel(xp);
  const pct     = xpProgressPct(xp);

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="h-screen w-full flex flex-col"
          style={{
            background: "var(--axiom-body-bg, var(--steel-bg))",
            color: "white",
            fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <header className="flex justify-between items-end px-10 pt-8 pb-6 border-b border-white/5 flex-shrink-0">
            {/* Left — engine status + title */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <motion.div
                  className="h-1 w-8 bg-emerald-500 rounded-full"
                  style={{ boxShadow: "0 0 10px #10b981" }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <span className="gold-text text-xs uppercase font-bold tracking-[0.5em]">
                  Titan Engine // Active
                </span>
              </div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Axiom OS Premier Terminal</p>
            </div>

            {/* Centre — view toggle */}
            <div className="flex gap-1 steel-panel rounded-full p-1">
              {(["grid", "atelier"] as View[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-5 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all"
                  style={{
                    background: view === v ? "rgba(212,175,55,0.18)" : "transparent",
                    color: view === v ? "var(--gold)" : "rgba(255,255,255,0.30)",
                    border: "none", cursor: "pointer",
                  }}
                >
                  {v === "grid" ? "Craft Grid" : "Atelier"}
                </button>
              ))}
            </div>

            {/* Right — rank + XP bar */}
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2"
                style={{ color: level.color }}>
                {level.badge} {level.name} Rank
              </p>
              <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden ml-auto">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: level.color }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-[8px] text-white/25 mt-1">{xp} XP</p>
            </div>
          </header>

          {/* Main — grid or atelier */}
          <AnimatePresence mode="wait">
            {view === "grid" ? (
              <motion.main
                key="grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="grid grid-cols-2 gap-6 flex-grow px-10 py-6 min-h-0"
              >
                {CRAFT_MODULES.map((mod, i) => (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.08, duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-0"
                  >
                    <CraftCard
                      id={mod.id}
                      title={mod.title}
                      color={mod.color}
                      route={mod.route}
                      active={activeIndex === i}
                    />
                  </motion.div>
                ))}
              </motion.main>
            ) : (
              <motion.main
                key="atelier"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="grid grid-cols-2 gap-10 flex-grow px-10 py-6 min-h-0"
              >
                {/* Molecular Leaf Lab */}
                <div className="glass-card p-8 flex flex-col justify-between relative overflow-hidden min-h-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-yellow-500/50" />
                  <div>
                    <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">
                      Smokecraft 360
                    </span>
                    <h2 className="text-4xl font-light italic mt-2 text-white leading-tight">
                      Molecular Leaf Lab
                    </h2>
                    <p className="text-xs text-white/40 mt-4 leading-relaxed">
                      Select your vitola and cut. The Sage Mentor will analyze your Earth-Nut synergy based on selected leaves.
                    </p>
                  </div>
                  {/* Cut selector */}
                  <div className="flex gap-3 mt-6">
                    {CUTS.map(cut => (
                      <motion.button
                        key={cut}
                        onClick={() => setSelectedCut(cut)}
                        whileTap={{ scale: 0.96 }}
                        className="flex-1 steel-panel py-3 text-[10px] uppercase tracking-widest transition-all"
                        style={{
                          border: selectedCut === cut
                            ? "1px solid rgba(212,175,55,0.70)"
                            : "1px solid rgba(255,255,255,0.05)",
                          color: selectedCut === cut ? "var(--gold)" : "rgba(255,255,255,0.50)",
                          cursor: "pointer",
                          borderRadius: 8,
                        }}
                      >
                        {cut}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Vessel Geometry */}
                <div className="glass-card p-8 flex flex-col justify-between min-h-0">
                  <div>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                      Beercraft 360
                    </span>
                    <h2 className="text-4xl font-light italic mt-2 text-white leading-tight">
                      Vessel Geometry
                    </h2>
                    <p className="text-xs text-white/40 mt-4 leading-relaxed">
                      Match the glass geometry to your cigar's ritual duration.
                    </p>
                  </div>
                  {/* Bar chart */}
                  <div className="grid grid-cols-3 gap-3 h-32 items-end mt-6">
                    {BAR_HEIGHTS.map((h, i) => (
                      <motion.div
                        key={i}
                        className="border-t-2 border-yellow-500 rounded-sm"
                        style={{ background: "rgba(212,175,55,0.15)", height: `${h}%` }}
                        initial={{ scaleY: 0, originY: 1 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ))}
                  </div>
                </div>
              </motion.main>
            )}
          </AnimatePresence>

          {/* Footer */}
          <footer className="px-10 pb-8 pt-6 grid grid-cols-3 items-center border-t border-white/5 flex-shrink-0">
            {/* Smokecraft 360 brand */}
            <div className="flex items-center gap-4">
              <motion.div
                className="w-5 h-5 bg-yellow-500 flex-shrink-0"
                style={{ rotate: "45deg" }}
                animate={{ boxShadow: ["0 0 6px rgba(212,175,55,0.4)", "0 0 15px rgba(212,175,55,0.8)", "0 0 6px rgba(212,175,55,0.4)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <span className="gold-text font-bold tracking-[0.3em] uppercase text-sm">Smokecraft 360</span>
            </div>

            {/* Centre — lounge vitality */}
            <div className="text-center text-[9px] uppercase tracking-[0.5em] text-white/30">
              Lounge Vitality: Nominal
            </div>

            {/* Order CTA */}
            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/craft-hub")}
                className="steel-panel px-8 py-3 rounded-full text-[10px] gold-text font-bold uppercase tracking-widest"
                style={{ border: "1px solid rgba(212,175,55,0.25)", cursor: "pointer" }}
              >
                Order Ritual Pairing
              </motion.button>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
