import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const NoveeOsShell = lazy(() => import("@/pages/NoveeOsShell"));

const BASE = import.meta.env.BASE_URL;
const IMG  = (n: string) => `${BASE}images/${n}`;
const GOLD = "#D4AF37";
const EASE: [number,number,number,number] = [0.22, 1, 0.36, 1];

const EAT_CMDS = [
  { code: "ENVIRONMENT", label: "Ambience & Lighting",  route: "/environment" },
  { code: "ASSET VAULT",  label: "Inventory Ledger",     route: "/inventory"   },
  { code: "TRANSACTION",  label: "Sommelier Up-Sell",    route: "/transaction"  },
] as const;

type Stage = "boot" | "grid" | "journey";
type BootPhase = 1 | 2 | 3 | 4;

const BOOT_PHASES: { phase: BootPhase; logo: string; label: string; sub: string; hold: number }[] = [
  { phase: 1, logo: IMG("logo_profound.png"),  label: "PROFOUND INNOVATION", sub: "Software & Systems Development Company", hold: 320 },
  { phase: 2, logo: IMG("logo_novee_os.jpg"),  label: "NOVEE OS",            sub: "Intelligence That Elevates",              hold: 280 },
  { phase: 3, logo: IMG("logo_craft_hub.jpg"), label: "CRAFT HUB",           sub: "Intro To Smoke Craft",                    hold: 260 },
  { phase: 4, logo: IMG("logo_eat.png"),       label: "E.A.T. SYSTEM",       sub: "Environment · Asset · Transactions",      hold: 260 },
];

const TILES = [
  {
    id: "smokecraft",
    label: "SMOKECRAFT 360",
    sub: "The Luxury Cigar Ritual",
    imgs: [
      IMG("smokecraft-card.jpg"),
      IMG("cigar_hero.png"),
      IMG("cigar1.png"),
    ],
    active: true,
    accent: GOLD,
    tag: "ACTIVE NOW",
  },
  {
    id: "pourcraft",
    label: "POURCRAFT 360",
    sub: "Master Mixology & Spirits",
    imgs: [
      IMG("pourcraft-card.jpg"),
      IMG("whiskey.png"),
      IMG("pour/pour_whiskey.png"),
    ],
    active: false,
    accent: "#D4914A",
    tag: "COMING SOON",
  },
  {
    id: "beercraft",
    label: "BEERCRAFT 360",
    sub: "Artisanal Craft Brewing",
    imgs: [
      IMG("brewcraft-card.jpg"),
      IMG("brewcraft-card.png"),
    ],
    active: false,
    accent: "#C8A44A",
    tag: "COMING SOON",
  },
  {
    id: "winecraft",
    label: "WINECRAFT 360",
    sub: "Fine Wine & Cellar Curation",
    imgs: [
      IMG("craft/wine-1.png"),
      IMG("craft/wine-2.png"),
      IMG("craft/wine-3.png"),
    ],
    active: false,
    accent: "#A03050",
    tag: "COMING SOON",
  },
];

function useTactileTone() {
  const ctxRef = useRef(null as AudioContext | null);
  return useCallback(() => {
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(3400, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (_e) { /* audio unavailable */ }
  }, []);
}

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<BootPhase>(1);
  const [visible, setVisible] = useState(true);
  const playTone = useTactileTone();

  useEffect(() => { playTone(); }, []);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      if (phase < 4) {
        setPhase((p) => (p + 1) as BootPhase);
        setVisible(true);
      } else {
        try { localStorage.setItem("craft_system_active", "1"); } catch {}
        onComplete();
      }
    }, 180);
  }, [phase, onComplete]);

  useEffect(() => {
    const current = BOOT_PHASES.find((b) => b.phase === phase)!;
    const t = setTimeout(advance, current.hold);
    return () => clearTimeout(t);
  }, [phase, advance]);

  const current = BOOT_PHASES.find((b) => b.phase === phase)!;
  const isPhase4 = phase === 4;

  return (
    <div
      onClick={phase >= 2 ? advance : undefined}
      style={{
        position: "fixed", inset: 0, background: "#010101",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: phase >= 2 ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {/* Ambient glow */}
      <motion.div
        animate={{ opacity: [0.04, 0.10, 0.04] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,175,55,0.18) 0%, transparent 70%)`,
        }}
      />

      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={`phase-${phase}`}
            initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -30, filter: "blur(4px)" }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, zIndex: 2 }}
          >
            {/* Logo */}
            <motion.img
              src={current.logo}
              alt={current.label}
              initial={{ scale: 0.88 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.0, ease: EASE }}
              style={{
                height: phase === 1 ? 200 : 220,
                width: "auto",
                objectFit: "contain",
                filter: phase === 2 ? "none" : phase === 3 ? "none" : "drop-shadow(0 0 32px rgba(212,175,55,0.55))",
              }}
            />

            {/* Phase 2 pulsating ring */}
            {phase === 2 && (
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -10 }}>
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.6 + i * 0.2], opacity: [0.55, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
                    style={{
                      position: "absolute",
                      width: 56, height: 56, borderRadius: "50%",
                      border: `1.5px solid ${GOLD}`,
                    }}
                  />
                ))}
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: `2px solid ${GOLD}`,
                  boxShadow: `0 0 28px ${GOLD}88`,
                }} />
              </div>
            )}

            {/* Phase 4 status node */}
            {isPhase4 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(212,175,55,0.08)",
                  border: `1px solid ${GOLD}44`,
                  borderRadius: 8, padding: "10px 22px",
                }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.0, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 10px #32B45A" }}
                />
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, letterSpacing: "0.26em", color: `${GOLD}CC`, textTransform: "uppercase" }}>
                  Data Integration Chassis Online
                </span>
              </motion.div>
            )}

            {/* Label */}
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600,
                color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px",
                textShadow: `0 0 40px ${GOLD}66`,
              }}>{current.label}</p>
              <p style={{
                fontFamily: "'Inter',sans-serif", fontSize: 11, letterSpacing: "0.30em",
                color: "rgba(240,228,196,0.48)", textTransform: "uppercase", margin: 0,
              }}>{current.sub}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase indicator dots */}
      <div style={{ position: "absolute", bottom: 36, display: "flex", gap: 10 }}>
        {BOOT_PHASES.map((b) => (
          <motion.div
            key={b.phase}
            animate={{ width: b.phase === phase ? 28 : 6, background: b.phase <= phase ? GOLD : "rgba(255,255,255,0.18)" }}
            transition={{ duration: 0.3 }}
            style={{ height: 4, borderRadius: 3 }}
          />
        ))}
      </div>

      {phase >= 2 && (
        <div style={{ position: "absolute", bottom: 20, fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.30em", color: "rgba(255,255,255,0.20)", textTransform: "uppercase" }}>
          Tap to continue
        </div>
      )}
    </div>
  );
}

const NAV_RAIL_ITEMS = [
  { id: "HUB", label: "HUB", route: "/craft-hub" },
  { id: "SC",  label: "SC",  route: "/master-blender" },
  { id: "PR",  label: "PR",  route: null },
  { id: "CH",  label: "CH",  route: null },
] as const;

function ObsidianNavRail({ active = "HUB", onTap }: { active?: string; onTap?: (id: string) => void }) {
  const [, navigate] = useLocation();
  const playTone = useTactileTone();
  return (
    <div style={{
      position:        "relative",
      width:           64,
      flexShrink:      0,
      height:          "100%",
      background:      "rgba(8,8,8,0.96)",
      backdropFilter:  "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRight:     "1px solid rgba(212,175,55,0.18)",
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      paddingTop:      24,
      gap:             8,
      zIndex:          20,
    }}>
      {/* Hex emblem */}
      <div style={{ marginBottom: 16 }}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5"
            fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.7" />
          <polygon points="16,7 24,11.5 24,20.5 16,25 8,20.5 8,11.5"
            fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.35" />
        </svg>
      </div>
      {NAV_RAIL_ITEMS.map(item => {
        const isActive = active === item.id;
        const locked   = item.route === null;
        return (
          <motion.button
            key={item.id}
            whileTap={locked ? {} : { scale: 0.92 }}
            onClick={() => {
              if (locked) return;
              playTone();
              if (onTap) onTap(item.id);
              if (item.route) navigate(item.route);
            }}
            style={{
              width:           50,
              height:          50,
              borderRadius:    10,
              border:          `1px solid ${isActive ? "#D4AF37" : "rgba(212,175,55,0.18)"}`,
              background:      isActive ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.03)",
              backdropFilter:  "blur(8px)",
              cursor:          locked ? "default" : "pointer",
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "center",
              justifyContent:  "center",
              gap:             2,
              outline:         "none",
              boxShadow:       isActive ? "0 0 18px rgba(212,175,55,0.22)" : "none",
              opacity:         locked ? 0.38 : 1,
              transition:      "border-color 0.2s, background 0.2s",
            }}
          >
            <span style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      11,
              fontWeight:    800,
              letterSpacing: "0.14em",
              color:         isActive ? "#D4AF37" : "rgba(240,228,196,0.55)",
              textTransform: "uppercase",
              lineHeight:    1,
            }}>{item.label}</span>
            {locked && (
              <span style={{ fontSize: 7, color: "rgba(212,175,55,0.30)", letterSpacing: "0.08em" }}>—</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export function CraftGrid({ onSmokecraft, onEAT }: { onSmokecraft: () => void; onEAT?: () => void }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredEAT, setHoveredEAT] = useState<string | null>(null);
  const [imgIndices, setImgIndices] = useState<Record<string, number>>(() =>
    Object.fromEntries(TILES.map(t => [t.id, 0]))
  );

  useEffect(() => {
    const iv = setInterval(() => {
      setImgIndices(prev =>
        Object.fromEntries(TILES.map(t => [t.id, (prev[t.id] + 1) % t.imgs.length]))
      );
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#010101", display: "flex", flexDirection: "row" }}>
      {/* ── Left Obsidian Nav Rail — 64px ── */}
      <ObsidianNavRail active="HUB" onTap={(id) => { if (id === "SC") onSmokecraft(); }} />

      {/* ── Main content area — pushed 64px right ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Ambient back-lit radial gradient */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, background: "radial-gradient(ellipse 70% 60% at 50% 80%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />

      {/* Smoke wisps + ember sparks */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}>
        {[0,1,2,3,4,5].map(i => (
          <motion.div key={`sw${i}`}
            style={{ position: "absolute", bottom: -20, left: `${8 + i * 15}%`, width: 70 + i * 28, height: 120 + i * 30, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(${i % 2 === 0 ? "212,175,55" : "255,253,208"},0.025) 0%, transparent 70%)`, filter: "blur(28px)" }}
            animate={{ y: [0, -(180 + i * 40)], opacity: [0, 0.55, 0], scale: [0.8, 1.5 + i * 0.08] }}
            transition={{ duration: 5.4 + i * 0.5, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
          />
        ))}
        {[0,1,2,3,4].map(i => (
          <motion.div key={`em${i}`}
            style={{ position: "absolute", bottom: 50 + i * 18, left: `${12 + i * 19}%`, width: 3, height: 3, borderRadius: "50%", background: GOLD, boxShadow: `0 0 5px ${GOLD}` }}
            animate={{ y: [0, -(55 + i * 18)], opacity: [0, 0.85, 0], x: [0, i % 2 === 0 ? 10 : -8] }}
            transition={{ duration: 3.2 + i * 0.4, repeat: Infinity, delay: i * 1.08, ease: "easeOut" }}
          />
        ))}
      </div>
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: "24px 48px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(212,175,55,0.10)",
        background: "rgba(0,0,0,0.60)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={IMG("logo_craft_hub.jpg")} alt="Craft Hub" style={{ height: 48, width: "auto", objectFit: "contain" }} />
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
              Craft Hub
            </p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.30em", color: "rgba(240,228,196,0.38)", margin: 0, textTransform: "uppercase" }}>
              Select Your Craft Experience
            </p>
          </div>
        </div>
        <img src={IMG("logo_novee_os.jpg")} alt="NOVEE OS" style={{ height: 40, width: "auto", objectFit: "contain", opacity: 0.85 }} />
      </div>

      {/* 4-tile grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", overflow: "hidden" }}>
        {TILES.map((tile) => {
          const isHovered = hovered === tile.id;
          return (
            <motion.button
              key={tile.id}
              type="button"
              onHoverStart={() => setHovered(tile.id)}
              onHoverEnd={() => setHovered(null)}
              onPointerDown={() => tile.active && onSmokecraft()}
              whileTap={tile.active ? { scale: 0.98 } : {}}
              style={{
                position: "relative", border: "none", padding: 0,
                background: "transparent", cursor: tile.active ? "pointer" : "default",
                overflow: "hidden", outline: "none",
                borderRight: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {/* Background image carousel */}
              <AnimatePresence mode="sync">
                <motion.img
                  key={imgIndices[tile.id]}
                  src={tile.imgs[imgIndices[tile.id]]}
                  alt={tile.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: isHovered && tile.active ? 1.06 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ opacity: { duration: 1.4 }, scale: { duration: 0.6, ease: EASE } }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              </AnimatePresence>

              {/* Dark overlay */}
              <motion.div
                animate={{ opacity: isHovered && tile.active ? 0.55 : 0.75 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(180deg, rgba(1,1,1,0.30) 0%, rgba(1,1,1,0.88) 100%)`,
                }}
              />

              {/* Obsidian glass panel — bottom */}
              <div style={{
                position: "absolute", inset: 0,
                backdropFilter: tile.active && isHovered ? "blur(0px)" : "blur(1px)",
                WebkitBackdropFilter: tile.active && isHovered ? "blur(0px)" : "blur(1px)",
              }} />

              {/* Gold accent top rim on hover */}
              <AnimatePresence>
                {isHovered && tile.active && (
                  <motion.div
                    key="top-rim"
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${tile.accent}, transparent)`, transformOrigin: "left" }}
                  />
                )}
              </AnimatePresence>

              {/* COMING SOON badge */}
              {!tile.active && (
                <div style={{
                  position: "absolute", top: 20, right: 18,
                  background: "rgba(253,251,247,0.06)", border: `1px solid rgba(253,251,247,0.20)`,
                  backdropFilter: "blur(8px)",
                  borderRadius: 5, padding: "6px 14px",
                  fontFamily: "'Inter',sans-serif", fontSize: 9, fontWeight: 800,
                  letterSpacing: "0.32em", color: "rgba(253,251,247,0.50)", textTransform: "uppercase",
                }}>
                  {tile.tag}
                </div>
              )}

              {/* ACTIVE badge for SmokeCraft */}
              {tile.active && (
                <div style={{
                  position: "absolute", top: 22, right: 18,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }}
                  />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.26em", color: "#32B45A99", textTransform: "uppercase" }}>Active</span>
                </div>
              )}

              {/* Content */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "0 28px 32px",
              }}>
                <motion.div
                  animate={{ y: isHovered && tile.active ? -6 : 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <p style={{
                    fontFamily: "'Inter',sans-serif", fontSize: 10, letterSpacing: "0.38em",
                    color: tile.active ? `${tile.accent}cc` : "rgba(253,251,247,0.30)", textTransform: "uppercase", margin: "0 0 12px",
                  }}>
                    {tile.active ? "Select Experience  →" : "Not Yet Available"}
                  </p>
                  <p style={{
                    fontFamily: "'Cormorant Garamond',serif", fontSize: 44, fontWeight: 700,
                    color: "#FDFBF7", letterSpacing: "0.04em", margin: "0 0 10px", lineHeight: 1.05,
                    textShadow: `0 0 40px rgba(0,0,0,0.90), 0 2px 8px rgba(0,0,0,0.70)`,
                  }}>
                    {tile.label}
                  </p>
                  <p style={{
                    fontFamily: "'Inter',sans-serif", fontSize: 13, letterSpacing: "0.18em",
                    color: "rgba(253,251,247,0.55)", textTransform: "uppercase", margin: 0, fontWeight: 500,
                  }}>
                    {tile.sub}
                  </p>
                </motion.div>

                {/* Touch target indicator */}
                {tile.active && (
                  <motion.div
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
                    transition={{ duration: 0.3 }}
                    style={{ marginTop: 18 }}
                  >
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 12,
                      background: `linear-gradient(135deg, rgba(253,251,247,0.10), rgba(212,175,55,0.18))`,
                      border: `1px solid rgba(253,251,247,0.35)`,
                      backdropFilter: "blur(12px)",
                      borderRadius: 8, padding: "14px 28px",
                      minHeight: 58,
                      boxShadow: `0 0 24px rgba(212,175,55,0.18), inset 0 1px 0 rgba(255,255,255,0.10)`,
                    }}>
                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: "0.22em", color: "#FDFBF7", textTransform: "uppercase" }}>
                        Enter SmokeCraft 360
                      </span>
                      <span style={{ color: GOLD, fontSize: 18, fontWeight: 300 }}>→</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      {/* ── E.A.T. Command Bar ── */}
      <div style={{
        flexShrink: 0,
        padding: "0 48px",
        display: "flex", alignItems: "stretch",
        borderTop: "1px solid rgba(212,175,55,0.22)",
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        minHeight: 72,
        gap: 0,
        zIndex: 10,
        position: "relative",
      }}>
        {/* Left: EAT logo + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 36, borderRight: "1px solid rgba(212,175,55,0.12)", marginRight: 0, flexShrink: 0 }}>
          <img src={IMG("logo_eat.png")} alt="E.A.T System" style={{ height: 30, width: "auto", filter: "drop-shadow(0 0 8px rgba(212,175,55,0.40))" }} />
          <div>
            <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.32em", color: `${GOLD}55`, textTransform: "uppercase" }}>
              ENVIRONMENT · ASSET · TRANSACTION
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.24em", color: "#32B45Acc", textTransform: "uppercase" }}>REVENUE ENGINE ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Center: 3 command badges */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          {EAT_CMDS.map((cmd) => {
            const isHov = hoveredEAT === cmd.code;
            return (
              <motion.button
                key={cmd.code}
                onHoverStart={() => setHoveredEAT(cmd.code)}
                onHoverEnd={() => setHoveredEAT(null)}
                onClick={() => onEAT ? onEAT() : navigate(cmd.route)}
                animate={{
                  background: isHov ? "rgba(212,175,55,0.16)" : "rgba(212,175,55,0.06)",
                  boxShadow: isHov ? "0 0 28px rgba(212,175,55,0.22)" : "0 0 0px transparent",
                }}
                whileTap={{ scale: 0.96 }}
                style={{
                  border: `1px solid ${isHov ? "rgba(212,175,55,0.70)" : "rgba(212,175,55,0.35)"}`,
                  borderRadius: 10,
                  padding: "10px 28px",
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  minWidth: 148,
                  fontFamily: "inherit",
                  touchAction: "manipulation",
                  transition: "border-color 0.2s",
                }}
              >
                <span style={{ color: GOLD, fontSize: 18, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  [ {cmd.code} ]
                </span>
                <span style={{ color: "rgba(240,228,196,0.42)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {cmd.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Right: Profound logo + live pulse */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingLeft: 36, borderLeft: "1px solid rgba(212,175,55,0.12)", flexShrink: 0 }}>
          <img src={IMG("logo_profound.png")} alt="Profound Innovation" style={{ height: 26, width: "auto", filter: "drop-shadow(0 0 6px rgba(212,175,55,0.25))", opacity: 0.75 }} />
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
        </div>
      </div>
      {/* ── end inner column ── */}
      </div>
    </div>
  );
}

export default function CraftEntryPoint() {
  const [stage, setStage] = useState<Stage>(() => {
    try { return localStorage.getItem("craft_entry_done") === "1" ? "grid" : "boot"; } catch { return "boot"; }
  });

  function handleBootComplete() {
    try { localStorage.setItem("craft_entry_done", "1"); } catch {}
    setStage("grid");
  }

  function handleSmokecraftSelect() {
    try {
      sessionStorage.setItem("novee_boot_done", "1");
      sessionStorage.setItem("novee_initial_phase", "s1_demo");
    } catch {}
    setStage("journey");
  }

  return (
    <AnimatePresence mode="wait">
      {stage === "boot" && (
        <motion.div key="boot" style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          exit={{ opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.28, ease: EASE }}>
          <BootSequence onComplete={handleBootComplete} />
        </motion.div>
      )}
      {stage === "grid" && (
        <motion.div key="grid" style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.01, filter: "blur(3px)" }}
          transition={{ duration: 0.28, ease: EASE }}>
          <CraftGrid onSmokecraft={handleSmokecraftSelect} />
        </motion.div>
      )}
      {stage === "journey" && (
        <motion.div key="journey" style={{ position: "fixed", inset: 0, zIndex: 9998 }}
          initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.28, ease: EASE }}>
          <Suspense fallback={null}>
            <NoveeOsShell />
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
