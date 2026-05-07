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
import { getXP, addXP, getCurrentLevel, xpProgressPct } from "@/lib/xpStore";

// ── Unsplash hero images mapped by craft id ────────────────────────────────

const CRAFT_IMAGES: Record<string, string> = {
  smoke: "https://images.unsplash.com/photo-1527030280862-64139fba04ca?q=80&w=800&fit=crop",
  pour:  "https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=800&fit=crop",
  brew:  "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=800&fit=crop",
  vape:  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&fit=crop",
};

const CRAFT_SUBS: Record<string, string> = {
  smoke: "Molecular Leaf Lab // Ritual Prep",
  pour:  "Vessel Geometry // Spirit Sync",
  brew:  "Fermentation Lab // Craft Intelligence",
  vape:  "Cloud Architecture // Vapor Sync",
};

const CRAFT_CTAS: Record<string, string> = {
  smoke: "Enter Atelier",
  pour:  "Explore Spirits",
  brew:  "Enter Brewery",
  vape:  "Enter Vapor Lab",
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
  const img     = CRAFT_IMAGES[id] ?? CRAFT_IMAGES.smoke;
  const sub     = CRAFT_SUBS[id]   ?? "";
  const cta     = CRAFT_CTAS[id]   ?? "Enter";
  const isSmoke = id === "smoke";

  return (
    <motion.div
      className="console-slab cursor-pointer h-full group"
      style={{ border: `1px solid ${isSmoke ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.05)"}` }}
      animate={{
        scale:   active ? 1.02 : 1,
        opacity: active ? 1 : 0.68,
        boxShadow: active
          ? `0 0 0 1px ${color}80, 0 0 36px ${color}40, 0 40px 80px rgba(0,0,0,0.90)`
          : "0 40px 80px rgba(0,0,0,0.90)",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(route)}
    >
      {/* Full-bleed hero image with hover zoom */}
      <img
        src={img}
        alt={title}
        className={`hero-img transition-transform duration-1000 group-hover:scale-110 ${isSmoke ? "opacity-60" : "opacity-50"}`}
      />

      {/* Bottom-up gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />

      {/* Animated top accent */}
      <motion.div
        style={{ background: color }}
        className="absolute top-0 left-0 right-0 h-[2px] z-20"
        animate={{ opacity: active ? [0.7, 1, 0.7] : [0.15, 0.35, 0.15] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 p-10 w-full z-20">
        <h2 className={`${isSmoke ? "gold-engraved" : "text-white/90"} italic text-4xl mb-4`}
          style={isSmoke ? {} : { color }}>
          {title}
        </h2>
        <p className="text-white/60 text-[10px] tracking-widest uppercase mb-6">{sub}</p>
        {isSmoke ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-black/60 border border-yellow-500/50 px-10 py-4 text-[11px] uppercase tracking-[0.4em] hover:bg-yellow-600/20 transition-all cursor-pointer"
            onClick={e => { e.stopPropagation(); navigate(route); }}
          >
            <span className="gold-engraved">{cta}</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white/5 border border-white/20 backdrop-blur-md px-10 py-4 text-[11px] text-white font-black uppercase tracking-[0.4em] hover:bg-white/10 transition-all cursor-pointer"
            onClick={e => { e.stopPropagation(); navigate(route); }}
          >
            {cta}
          </motion.button>
        )}
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

type LeafKey = "maduro" | "habano" | "connecticut";
type CutKey  = "straight" | "vcut" | "punch";

const LEAF_KNOWLEDGE: Record<LeafKey, { note: string; intensity: number; synergy: string }> = {
  maduro:      { note: "Earthy/Sweet",   intensity: 8, synergy: "Stout/Bourbon" },
  habano:      { note: "Spicy/Nutty",    intensity: 7, synergy: "Rye/IPA"       },
  connecticut: { note: "Creamy/Cedar",   intensity: 4, synergy: "Pilsner/Cognac"},
};

const CUT_PHYSICS: Record<CutKey, { label: string; velocity: string; temp: string; longevity: string }> = {
  straight: { label: "Straight", velocity: "Low",     temp: "Cool",  longevity: "+15m" },
  vcut:     { label: "V-Cut",    velocity: "High",    temp: "Warm",  longevity: "−5m"  },
  punch:    { label: "Punch",    velocity: "Intense", temp: "Hot",   longevity: "+20m" },
};

export default function TitanCraftDeck() {
  const [, navigate]           = useLocation();
  const [mounted, setMounted]  = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView]        = useState<View>("grid");
  const [xp, setXp]            = useState(0);
  const [build, setBuild]      = useState<{ leaf: LeafKey; cut: CutKey }>({
    leaf: "maduro",
    cut:  "straight",
  });
  const [mentorMsg, setMentorMsg] = useState("Awaiting first selection…");

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

  const runAnalysis = (leaf: LeafKey = build.leaf, cut: CutKey = build.cut) => {
    const l = LEAF_KNOWLEDGE[leaf];
    const c = CUT_PHYSICS[cut];
    setMentorMsg(
      `Sage Analysis: The ${c.temp} draw of the ${c.label} will amplify the ${l.note} notes. Pair with a ${l.synergy}.`
    );
    const next = addXP(10);
    setXp(next);
  };

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          id="axiom-terminal"
          className="axiom-theme axiom-terminal h-screen w-full flex flex-col"
          style={{
            fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
            overflow: "hidden",
          }}
        >
          {/* Ambient amber vignette — top-center radial glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)", zIndex: 0 }} />

          {/* Header */}
          <header className="relative z-10 flex justify-between items-end px-10 pt-8 pb-6 border-b border-white/10 flex-shrink-0">
            {/* Left — engine status + title */}
            <div>
              <h1 className="gold-engraved text-2xl uppercase tracking-[0.5em]">Axiom 360</h1>
              <p className="text-[10px] text-white/40 tracking-[0.3em] mt-2 font-bold italic uppercase">Sovereign OS // Vault v3.0</p>
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

            {/* Right — rank badge */}
            <div className="console-slab px-6 py-2 border border-yellow-500/30 rounded-lg flex items-center justify-center" style={{ height: "auto" }}>
              <span className="text-[10px] font-black uppercase tracking-widest italic animate-pulse"
                style={{ color: level.color }}>
                {level.badge} {level.name} · {pct}%
              </span>
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
                className="grid grid-cols-2 gap-12 h-[65vh] px-10 my-6"
              >
                {CRAFT_MODULES.map((mod, i) => (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.08, duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-0 h-full"
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
                className="flex-grow px-10 py-6 min-h-0 flex items-center"
              >
                {/* Single slab-3d wrapper — both sections inside */}
                <div className="slab-3d w-full p-12 grid grid-cols-2 gap-12 relative overflow-hidden">

                  {/* Ambient light catcher */}
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />

                  {/* LEFT — Molecular Atelier */}
                  <section className="flex flex-col justify-between border-r border-white/5 pr-12 z-10">
                    <div>
                      <h2 className="gold-luster-text italic text-4xl mb-6">Leaf Atelier</h2>
                      <p className="text-sm text-white/70 leading-relaxed mb-6 font-light">
                        {LEAF_KNOWLEDGE[build.leaf].note} — {LEAF_KNOWLEDGE[build.leaf].synergy} synergy.
                        Selecting a Maduro wrapper will intensify the nutty character of your blend.
                      </p>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {(Object.keys(LEAF_KNOWLEDGE) as LeafKey[]).map(leaf => (
                          <motion.button
                            key={leaf}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              const next = { ...build, leaf };
                              setBuild(next);
                              runAnalysis(leaf, build.cut);
                            }}
                            className="machined-btn py-4 text-[10px] uppercase font-bold tracking-widest"
                            style={{
                              border: build.leaf === leaf
                                ? "1px solid rgba(212,175,55,0.80)"
                                : undefined,
                              color: build.leaf === leaf ? "var(--gold)" : "rgba(255,255,255,0.55)",
                              borderRadius: 6,
                            }}
                          >
                            {leaf}
                          </motion.button>
                        ))}
                      </div>
                      {/* Intensity bar */}
                      <div>
                        <div className="flex justify-between text-[9px] text-white/30 uppercase mb-1">
                          <span>Intensity</span>
                          <span>{LEAF_KNOWLEDGE[build.leaf].intensity}/10</span>
                        </div>
                        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "var(--gold)" }}
                            animate={{ width: `${LEAF_KNOWLEDGE[build.leaf].intensity * 10}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* RIGHT — Physics & Prep */}
                  <section className="flex flex-col justify-between z-10">
                    <div>
                      <h2 className="text-white/90 italic text-4xl mb-6">Vessel &amp; Prep</h2>
                      {/* Sage mentor message */}
                      <p className="text-sm text-white/60 leading-relaxed mb-8 font-light italic border-l-2 border-yellow-500/40 pl-4">
                        "{mentorMsg}"
                      </p>
                      {/* Cut selector */}
                      <div className="flex gap-3 mb-8">
                        {(Object.keys(CUT_PHYSICS) as CutKey[]).map(cut => (
                          <motion.button
                            key={cut}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              setBuild(b => ({ ...b, cut }));
                              runAnalysis(build.leaf, cut);
                            }}
                            className="machined-btn flex-1 py-4 text-[10px] uppercase font-bold tracking-widest"
                            style={{
                              border: build.cut === cut
                                ? "1px solid rgba(212,175,55,0.80)"
                                : undefined,
                              color: build.cut === cut ? "var(--gold)" : "rgba(255,255,255,0.55)",
                              borderRadius: 6,
                            }}
                          >
                            {CUT_PHYSICS[cut].label}
                          </motion.button>
                        ))}
                      </div>
                      {/* Ritual longevity */}
                      <div className="p-4 border-l-2 border-emerald-500 bg-emerald-500/5 rounded-r-lg">
                        <p className="text-[10px] uppercase text-emerald-500 font-bold mb-1 tracking-widest">
                          Ritual Longevity
                        </p>
                        <motion.p
                          key={build.cut}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-2xl font-light text-white"
                        >
                          {CUT_PHYSICS[build.cut].longevity} Smoke Time
                        </motion.p>
                        <p className="text-[9px] text-white/30 mt-1 uppercase tracking-widest">
                          {CUT_PHYSICS[build.cut].velocity} draw · {CUT_PHYSICS[build.cut].temp} temp
                        </p>
                      </div>
                    </div>
                    {/* Commence Ritual CTA */}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/craft-hub")}
                      className="mt-6 bg-yellow-600/20 border border-yellow-500/60 py-5 gold-luster-text text-[11px] uppercase tracking-[0.4em]"
                      style={{
                        boxShadow: "0 0 20px rgba(212,175,55,0.20)",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Commence Ritual
                    </motion.button>
                  </section>

                </div>
              </motion.main>
            )}
          </AnimatePresence>

          {/* Footer */}
          <footer className="px-10 pb-8 pt-6 flex justify-between items-center border-t border-white/10 flex-shrink-0">
            {/* Left — diamond indicator + telemetry */}
            <div className="flex items-center gap-6">
              <div className="w-4 h-4 bg-yellow-500 rotate-45 shadow-[0_0_20px_rgba(212,175,55,0.6)]" />
              <span className="text-[10px] text-white/30 tracking-[0.5em] font-bold uppercase italic">
                Titan Engine // Synchronized
              </span>
            </div>

            {/* Right — version etch */}
            <span className="gold-engraved italic text-[11px] uppercase tracking-widest opacity-40">
              Axiom OS Premier
            </span>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
