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

// ── Hero images mapped by craft id ────────────────────────────────────────

const CRAFT_IMAGES: Record<string, string> = {
  smoke: "/images/scenes/smokecraft-card.jpg",
  pour:  "/images/scenes/pourcraft-card.jpg",
  brew:  "/images/scenes/brewcraft-card.jpg",
  vape:  "/images/scenes/vapecraft-card.jpg",
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

// ── Vitality widget ───────────────────────────────────────────────────────────

function VitalityWidget() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "rgba(0,0,0,.65)",
      border: "1px solid rgba(212,175,55,.25)",
      padding: "10px 18px", borderRadius: 12,
      backdropFilter: "blur(20px)",
      boxShadow: "0 0 20px rgba(212,175,55,.12)",
    }}>
      <motion.div
        style={{
          width: 12, height: 12, borderRadius: "50%",
          background: "#00ff84",
          boxShadow: "0 0 12px rgba(0,255,132,.9), 0 0 24px rgba(0,255,132,.5)",
          flexShrink: 0,
        }}
        animate={{ opacity: [1, 0.55, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div>
        <div style={{ color: "#d4af37", fontSize: ".7rem", letterSpacing: ".2em", textTransform: "uppercase" }}>
          Vitality
        </div>
        <div style={{ color: "#fff", fontSize: ".95rem", marginTop: 2 }}>
          Synchronizing
        </div>
      </div>
      <div style={{ marginLeft: 16, color: "rgba(255,255,255,.55)", letterSpacing: ".12em", fontSize: ".85rem" }}>
        {time}
      </div>
    </div>
  );
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

  const goldLuster: React.CSSProperties = {
    background: "linear-gradient(180deg, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(0 0 12px rgba(212,175,55,.5))",
  };

  return (
    <motion.div
      className="cursor-pointer h-full group"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 40,
        borderTop: "1px solid rgba(255,255,255,0.3)",
        borderLeft: "1px solid rgba(255,255,255,0.1)",
        background: "#121214",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      animate={{
        scale:   active ? 1.02 : 1,
        opacity: active ? 1 : 0.72,
        boxShadow: active
          ? `0 50px 100px rgba(0,0,0,0.9), 0 0 0 1px ${color}80, 0 0 36px ${color}40`
          : "0 50px 100px rgba(0,0,0,0.9)",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(route)}
    >
      {/* Full-bleed hero image — overflow-hidden wrapper forces cover clipping */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img
          src={img}
          alt={title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: 1,
            filter: "brightness(1.2) contrast(1.1)",
            display: "block",
          }}
        />
      </div>

      {/* Precision shadow — bottom text zone only, product stays crystal clear */}
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 40%)",
      }} />

      {/* Animated top accent line */}
      <motion.div
        style={{ background: color }}
        className="absolute top-0 left-0 right-0 h-[2px] z-20"
        animate={{ opacity: active ? [0.7, 1, 0.7] : [0.15, 0.35, 0.15] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom content */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", padding: "28px 32px", zIndex: 20 }}>
        <h2 style={{
          fontSize: "clamp(1rem, 1.8vw, 1.875rem)",
          fontStyle: "italic",
          letterSpacing: "0.6em",
          marginBottom: 8,
          lineHeight: 1,
          textTransform: "uppercase",
          fontWeight: 900,
          whiteSpace: "nowrap",
          ...(isSmoke
            ? {
                background: "linear-gradient(to bottom, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 12px rgba(212,175,55,.55))",
              }
            : {
                background: "linear-gradient(to bottom, #fff 0%, #999 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }),
        }}>
          {title}
        </h2>
        <p style={{
          color: "#fff",
          opacity: 0.5,
          fontSize: "10px",
          marginBottom: 18,
          letterSpacing: ".4em",
          textTransform: "uppercase",
        }}>
          {sub}
        </p>
        {/* Machined enter — thin line + [ENTER] */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={e => { e.stopPropagation(); navigate(route); }}
        >
          <div style={{
            flex: 1,
            height: "0.5px",
            background: isSmoke ? "#d4af37" : "rgba(255,255,255,0.25)",
          }} />
          <span style={{
            color: isSmoke ? "#d4af37" : "rgba(255,255,255,0.55)",
            fontSize: "9px",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}>[ ENTER ]</span>
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
            style={{ background: "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 70%)", zIndex: 0 }} />

          {/* Header */}
          <header className="relative z-10 flex justify-between items-center px-10 border-b border-white/10 flex-shrink-0"
            style={{ height: 90 }}>
            {/* Left — logo + tagline */}
            <div>
              <div style={{
                background: "linear-gradient(180deg, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 15px rgba(212,175,55,.6))",
                fontSize: "32px",
                letterSpacing: ".4em",
                fontWeight: 900,
                textTransform: "uppercase",
                margin: 0,
              }}>
                Axiom 360
              </div>
              <div style={{
                fontSize: "10px",
                letterSpacing: "0.6em",
                opacity: 0.4,
                marginTop: 8,
                textTransform: "uppercase",
              }}>
                Sovereign OS // Premier Terminal
              </div>
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

            {/* Right — status badge */}
            <div style={{ background: "transparent", padding: "7px 22px", borderRadius: 999, border: "0.5px solid #d4af37" }}>
              <span style={{
                background: "linear-gradient(180deg, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}>STATUS: NOMINAL</span>
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
                className="grid grid-cols-2 grid-rows-2 gap-8 h-[70vh] px-14 my-6"
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
          <footer className="relative z-10 flex justify-between items-center border-t border-white/10 flex-shrink-0"
            style={{
              height: 80,
              padding: "0 36px",
              background: "linear-gradient(180deg, rgba(10,10,10,.7) 0%, rgba(0,0,0,.95) 100%)",
            }}>
            {/* Left — diamond + telemetry */}
            <div className="flex items-center gap-5">
              <div style={{
                width: 18, height: 18,
                background: "#d4af37",
                transform: "rotate(45deg)",
                boxShadow: "0 0 30px #d4af37",
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11,
                letterSpacing: "0.6em",
                opacity: 0.4,
                textTransform: "uppercase",
                color: "#fff",
              }}>
                Titan Engine // Live Telemetry
              </span>
            </div>

            {/* Right — version */}
            <span style={{
              background: "linear-gradient(180deg, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "10px",
              opacity: 0.6,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
            }}>
              Axiom Sovereign OS v3.0
            </span>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
