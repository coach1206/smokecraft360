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
}

function CraftCard({ id, title, color, route }: CardProps) {
  const [, navigate] = useLocation();
  const img = CRAFT_IMAGES[id] ?? CRAFT_IMAGES.smoke;
  const sub = CRAFT_SUBS[id] ?? "Select Clientele";

  return (
    <motion.div
      className="relative group axiom-card overflow-hidden cursor-pointer"
      whileHover={{ scale: 1.018, boxShadow: `0 0 28px ${color}40, 0 10px 40px rgba(0,0,0,0.80)` }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(route)}
    >
      {/* Top border accent */}
      <motion.div
        style={{ background: color }}
        className="absolute top-0 left-0 right-0 h-[1px] opacity-60"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="h-full p-6 flex flex-col justify-between">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <div className="relative">
            <img
              src={img}
              alt={title}
              className="w-20 h-20 rounded-lg object-cover"
              style={{ border: `1px solid ${color}40` }}
            />
            {/* Color tint overlay */}
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${color}18 0%, transparent 60%)` }}
            />
          </div>
          <div className="text-right">
            <p
              className="text-[10px] tracking-widest uppercase font-bold mb-1"
              style={{ color }}
            >
              {title.split(" ")[0]}
            </p>
            <h2 className="text-xl font-light text-white italic tracking-wide leading-tight">
              Craft Hub
            </h2>
            <p className="text-[9px] text-white/25 tracking-wider uppercase mt-1">
              {title.replace(/\s+/g, " ")}
            </p>
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
          <span className="text-[9px] text-white/40 uppercase tracking-tighter">{sub}</span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] tracking-widest uppercase" style={{ color: `${color}99` }}>
              Select
            </span>
            <motion.div
              className="h-2 w-2 rounded-full"
              style={{ background: "#10b981" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
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

export default function TitanCraftDeck() {
  const [, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
          <header className="flex justify-between items-center px-10 pt-8 pb-6 gold-trim flex-shrink-0 steel-panel">
            <div className="flex items-center gap-2">
              <motion.div
                className="h-1 w-6 rounded-full bg-emerald-500"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span className="gold-text text-xs uppercase font-bold tracking-widest">
                Titan Engine Active
              </span>
            </div>

            <h1 className="text-sm tracking-[0.4em] text-white/30 uppercase select-none">
              Axiom OS × CraftHub
            </h1>

            <div className="flex items-center gap-3">
              <motion.div
                className="h-3 w-3 bg-emerald-500/20 border border-emerald-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <button
                onClick={() => navigate("/craft-hub")}
                className="text-[9px] text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                Full Hub →
              </button>
            </div>
          </header>

          {/* Craft card grid */}
          <main className="grid grid-cols-2 gap-6 flex-grow px-10 py-6 min-h-0">
            {CRAFT_MODULES.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.09, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-0"
              >
                <CraftCard
                  id={mod.id}
                  title={mod.title}
                  color={mod.color}
                  route={mod.route}
                />
              </motion.div>
            ))}
          </main>

          {/* Footer */}
          <footer className="px-10 pb-8 pt-6 grid grid-cols-3 gap-10 items-center border-t border-white/5 flex-shrink-0">
            {/* Smokecraft 360 brand */}
            <div className="flex items-center gap-4">
              <motion.div
                className="w-4 h-4 bg-yellow-500 flex-shrink-0"
                style={{ rotate: "45deg" }}
                animate={{ boxShadow: ["0 0 6px rgba(212,175,55,0.4)", "0 0 14px rgba(212,175,55,0.8)", "0 0 6px rgba(212,175,55,0.4)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <div className="gold-text font-bold tracking-widest uppercase text-sm">
                Smokecraft 360
              </div>
            </div>

            {/* WifeX partner */}
            <motion.button
              className="flex items-center gap-4 border-l border-white/10 pl-8"
              style={{ background: "none", border: "none", cursor: "pointer", borderLeft: "1px solid rgba(255,255,255,0.10)", paddingLeft: 32 }}
              whileHover={{ opacity: 0.75 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleOutboundRedirect("WIFEX", "https://wifex.com")}
            >
              <div
                className="w-4 h-4 bg-violet-600 flex-shrink-0"
                style={{ transform: "rotate(45deg)" }}
              />
              <div className="text-white/60 font-bold tracking-widest uppercase text-sm">
                WifeX
              </div>
            </motion.button>

            {/* Live environment pulse */}
            <EnvPulse />
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
