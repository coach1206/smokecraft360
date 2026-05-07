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

export default function TitanCraftDeck() {
  const [, navigate]           = useLocation();
  const [mounted, setMounted]  = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Auto-rotation every 6s (matches reference cadence)
  useEffect(() => {
    const iv = setInterval(() => setActiveIndex(i => (i + 1) % CRAFT_MODULES.length), 6_000);
    return () => clearInterval(iv);
  }, []);

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
          <header className="flex justify-between items-center px-10 pt-8 pb-6 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <motion.div
                className="h-1 w-8 bg-emerald-500 rounded-full"
                style={{ boxShadow: "0 0 10px #10b981" }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span className="gold-text text-xs uppercase font-bold tracking-[0.4em]">
                Titan Engine Active
              </span>
            </div>

            <h1 className="text-sm tracking-[0.4em] text-white/30 uppercase select-none">
              Axiom OS × CraftHub
            </h1>

            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">Axiom OS Premier Terminal</p>
              <p className="text-[8px] uppercase tracking-widest" style={{ color: "var(--gold)" }}>
                Kiosk Lock: Absolute
              </p>
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
                  active={activeIndex === i}
                />
              </motion.div>
            ))}
          </main>

          {/* Footer */}
          <footer className="px-10 pb-8 pt-6 grid grid-cols-3 gap-10 items-center border-t border-white/5 flex-shrink-0">
            {/* Smokecraft 360 brand */}
            <div className="flex items-center gap-4 group cursor-pointer">
              <motion.div
                className="w-5 h-5 bg-yellow-500 flex-shrink-0"
                style={{ rotate: "45deg" }}
                animate={{ boxShadow: ["0 0 6px rgba(212,175,55,0.4)", "0 0 15px gold", "0 0 6px rgba(212,175,55,0.4)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <div>
                <p className="gold-text font-bold tracking-[0.3em] uppercase text-sm">Smokecraft 360</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest italic font-serif">Axiom Legacy</p>
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
