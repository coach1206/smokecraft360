import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StaffPinGate } from "@/components/StaffPinGate";
import { Router } from "wouter";

const DeveloperGate   = lazy(() => import("@/pages/DeveloperGate"));
const StaffTerminal   = lazy(() => import("@/pages/StaffTerminal"));

const EAT_CMDS = [
  { code: "ENVIRONMENT", label: "Ambience & Lighting",  key: "environment" as const },
  { code: "ASSET VAULT",  label: "Inventory Ledger",     key: "inventory"    as const },
  { code: "TRANSACTION",  label: "Sommelier Up-Sell",    key: "transaction"  as const },
] as const;
type EATKey = (typeof EAT_CMDS)[number]["key"];

const BASE = import.meta.env.BASE_URL;
const IMG  = (n: string) => `${BASE}images/${n}`;
const GOLD = "#D4AF37";
const EASE: [number,number,number,number] = [0.22, 1, 0.36, 1];

type Stage = "boot" | "grid";
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

const ADMIN_TILES = [
  { id: "pos",        label: "POS GATEWAY",   sub: "Integration Hub",       accent: "#D4AF37" },
  { id: "revenue",    label: "REVENUE BRAIN", sub: "v2 Telemetry",          accent: "#34D399" },
  { id: "operations", label: "OPERATIONS",    sub: "Command Terminal",       accent: "#60A5FA" },
  { id: "venue",      label: "VENUE SETUP",   sub: "Floor & Configuration",  accent: "#A78BFA" },
  { id: "devices",    label: "DEVICE FLEET",  sub: "Health Monitor",         accent: "#F87171" },
  { id: "developer",  label: "DEV GATE",      sub: "Sovereign Console",      accent: "#10B981" },
] as const;

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

const NAV_RAIL_ITEMS = [
  { id: "HUB", label: "HUB" },
  { id: "SC",  label: "SC"  },
  { id: "PR",  label: "PR"  },
  { id: "CH",  label: "CH"  },
] as const;

function ObsidianNavRail({ active = "HUB", onSC }: { active?: string; onSC?: () => void }) {
  const playTone = useTactileTone();
  return (
    <div style={{
      position:             "relative",
      width:                64,
      flexShrink:           0,
      height:               "100%",
      background:           "rgba(8,8,8,0.96)",
      backdropFilter:       "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRight:          "1px solid rgba(212,175,55,0.18)",
      display:              "flex",
      flexDirection:        "column",
      alignItems:           "center",
      paddingTop:           24,
      gap:                  8,
      zIndex:               20,
    }}>
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
        const locked   = item.id === "PR" || item.id === "CH";
        return (
          <motion.button
            key={item.id}
            whileTap={locked ? {} : { scale: 0.92 }}
            onClick={() => {
              if (locked) return;
              playTone();
              if (item.id === "SC" && onSC) onSC();
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

            {phase === 2 && (
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -10 }}>
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.6 + i * 0.2], opacity: [0.55, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
                    style={{ position: "absolute", width: 56, height: 56, borderRadius: "50%", border: `1.5px solid ${GOLD}` }}
                  />
                ))}
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${GOLD}`, boxShadow: `0 0 28px ${GOLD}88` }} />
              </div>
            )}

            {isPhase4 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}44`,
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

            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px", textShadow: `0 0 40px ${GOLD}66` }}>{current.label}</p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, letterSpacing: "0.30em", color: "rgba(240,228,196,0.48)", textTransform: "uppercase", margin: 0 }}>{current.sub}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

export function CraftGrid({
  onSmokecraft,
  onEAT,
  isAdminView = false,
  onStaffAccess,
}: {
  onSmokecraft: () => void;
  onEAT?: (key: EATKey) => void;
  isAdminView?: boolean;
  onStaffAccess?: () => void;
}) {
  const [hoveredEAT, setHoveredEAT] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showDevGate,       setShowDevGate]       = useState(false);
  const [showStaffTerminal, setShowStaffTerminal] = useState(false);
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
      <ObsidianNavRail active="HUB" onSC={onSmokecraft} />

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
      <div style={{
        flexShrink: 0, padding: "24px 48px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(212,175,55,0.10)",
        background: "rgba(0,0,0,0.60)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={IMG("logo_craft_hub.jpg")} alt="Craft Hub" style={{ height: 48, width: "auto", objectFit: "contain" }} />
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Craft Hub</p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.30em", color: "rgba(240,228,196,0.38)", margin: 0, textTransform: "uppercase" }}>Select Your Craft Experience</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isAdminView && (
            <div style={{ padding: "4px 12px", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#D4AF37", letterSpacing: "0.22em", textTransform: "uppercase" }}>
              STAFF MODE
            </div>
          )}
          <img src={IMG("logo_novee_os.jpg")} alt="NOVEE OS" style={{ height: 40, width: "auto", objectFit: "contain", opacity: 0.85 }} />
          {!isAdminView && onStaffAccess && (
            <motion.button
              onClick={onStaffAccess}
              onTouchStart={onStaffAccess}
              whileTap={{ scale: 0.96 }}
              whileHover={{ boxShadow: "0 0 32px rgba(212,175,55,0.55), 0 0 8px rgba(212,175,55,0.80)" }}
              style={{
                height: 58, padding: "0 28px",
                background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 100%)",
                border: "2px solid #D4AF37",
                borderRadius: 8,
                color: "#D4AF37",
                fontSize: 16, fontWeight: 900, letterSpacing: "0.14em",
                textTransform: "uppercase", cursor: "pointer",
                fontFamily: "'Inter',sans-serif",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 0 18px rgba(212,175,55,0.28), inset 0 1px 0 rgba(212,175,55,0.20)",
                whiteSpace: "nowrap",
              }}>
              ⚡ LAUNCH TERMINAL (POS 3)
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Admin tile grid ── */}
      {isAdminView && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", overflow: "hidden", gap: 1, background: "rgba(212,175,55,0.06)" }}>
          {ADMIN_TILES.map((tile) => {
            const isHov = hovered === tile.id;
            return (
              <motion.button
                key={tile.id}
                onHoverStart={() => setHovered(tile.id)}
                onHoverEnd={() => setHovered(null)}
                onClick={() =>
                  tile.id === "developer" ? setShowDevGate(true) :
                  tile.id === "pos"       ? setShowStaffTerminal(true) :
                  onSmokecraft()
                }
                whileTap={{ scale: 0.98 }}
                style={{
                  position: "relative", border: "none", padding: 0,
                  background: "#010101", cursor: "pointer", overflow: "hidden",
                  display: "flex", alignItems: "flex-end", justifyContent: "flex-start",
                  borderRight: "1px solid rgba(212,175,55,0.05)",
                }}
              >
                <motion.div animate={{ opacity: isHov ? 1 : 0 }} transition={{ duration: 0.3 }}
                  style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${tile.accent}12, transparent)`, borderTop: `2px solid ${tile.accent}55` }} />
                <motion.div animate={{ opacity: isHov ? 0.08 : 0.03 }} transition={{ duration: 0.4 }}
                  style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 80% at 20% 80%, ${tile.accent}, transparent)` }} />
                <div style={{ padding: "0 36px 40px", position: "relative", zIndex: 2 }}>
                  <div style={{ fontSize: 10, color: `${tile.accent}77`, letterSpacing: "0.32em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>
                    ADMIN OPS  →
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 42, fontWeight: 700, color: "#FDFBF7", letterSpacing: "0.04em", lineHeight: 1.05, marginBottom: 10, textShadow: "0 0 40px rgba(0,0,0,0.90)" }}>
                    {tile.label}
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, letterSpacing: "0.18em", color: "rgba(253,251,247,0.45)", textTransform: "uppercase" }}>
                    {tile.sub}
                  </div>
                </div>
                {isHov && (
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                    style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${tile.accent}, transparent)`, transformOrigin: "left" }} />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Guest 4-tile grid ── */}
      {!isAdminView && (
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
              <motion.div
                animate={{ opacity: isHovered && tile.active ? 0.55 : 0.75 }}
                transition={{ duration: 0.4 }}
                style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(1,1,1,0.30) 0%, rgba(1,1,1,0.88) 100%)` }}
              />
              <div style={{ position: "absolute", inset: 0, backdropFilter: tile.active && isHovered ? "blur(0px)" : "blur(1px)", WebkitBackdropFilter: tile.active && isHovered ? "blur(0px)" : "blur(1px)" }} />

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

              {tile.active && (
                <div style={{ position: "absolute", top: 22, right: 18, display: "flex", alignItems: "center", gap: 6 }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }}
                  />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.26em", color: "#32B45A99", textTransform: "uppercase" }}>Active</span>
                </div>
              )}

              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 28px 32px" }}>
                <motion.div animate={{ y: isHovered && tile.active ? -6 : 0 }} transition={{ duration: 0.4, ease: EASE }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, letterSpacing: "0.38em", color: tile.active ? `${tile.accent}cc` : "rgba(253,251,247,0.30)", textTransform: "uppercase", margin: "0 0 12px" }}>
                    {tile.active ? "Select Experience  →" : "Not Yet Available"}
                  </p>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 44, fontWeight: 700, color: "#FDFBF7", letterSpacing: "0.04em", margin: "0 0 10px", lineHeight: 1.05, textShadow: `0 0 40px rgba(0,0,0,0.90), 0 2px 8px rgba(0,0,0,0.70)` }}>
                    {tile.label}
                  </p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, letterSpacing: "0.18em", color: "rgba(253,251,247,0.55)", textTransform: "uppercase", margin: 0, fontWeight: 500 }}>
                    {tile.sub}
                  </p>
                </motion.div>

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
                      borderRadius: 8, padding: "14px 28px", minHeight: 58,
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
      )}

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
        {/* Left: NOVEE OS wordmark (guest) | E.A.T. System (admin) */}
        {isAdminView ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 36, borderRight: "1px solid rgba(212,175,55,0.12)", flexShrink: 0 }}>
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
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingRight: 36, borderRight: "1px solid rgba(212,175,55,0.10)", flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.10em", textTransform: "uppercase", lineHeight: 1 }}>
                NOVEE OS
              </div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.28em", color: `${GOLD}66`, textTransform: "uppercase", marginTop: 3 }}>
                INTELLIGENCE THAT ELEVATES
              </div>
            </div>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2.0, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A", flexShrink: 0 }} />
          </div>
        )}

        {/* Center: EAT command badges (admin) | discovery pillars (guest) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          {isAdminView ? (
            <>
              {EAT_CMDS.map((cmd) => {
                const isHov = hoveredEAT === cmd.key;
                return (
                  <motion.button
                    key={cmd.code}
                    onHoverStart={() => setHoveredEAT(cmd.key)}
                    onHoverEnd={() => setHoveredEAT(null)}
                    onClick={() => onEAT?.(cmd.key)}
                    animate={{
                      background: isHov ? "rgba(212,175,55,0.16)" : "rgba(212,175,55,0.06)",
                      boxShadow: isHov ? "0 0 28px rgba(212,175,55,0.22)" : "0 0 0px transparent",
                    }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      border: `1px solid ${isHov ? "rgba(212,175,55,0.70)" : "rgba(212,175,55,0.35)"}`,
                      borderRadius: 10, padding: "10px 28px", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      minWidth: 148, fontFamily: "inherit", touchAction: "manipulation",
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
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
              {["AI SOMMELIER", "IMMERSIVE DISCOVERY", "YOUR RESERVE"].map(tag => (
                <div key={tag} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, letterSpacing: "0.30em", color: `${GOLD}66`, textTransform: "uppercase" }}>
                    {tag}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* ── Staff Terminal Overlay ── */}
      <AnimatePresence>
        {showStaffTerminal && (
          <motion.div key="staffterminal-overlay"
            style={{ position: "fixed", inset: 0, zIndex: 10002 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}>
            <Router base="">
              <Suspense fallback={null}>
                <StaffTerminal onBack={() => setShowStaffTerminal(false)} />
              </Suspense>
            </Router>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Developer Gate Overlay ── */}
      <AnimatePresence>
        {showDevGate && (
          <motion.div key="devgate-overlay"
            style={{ position: "fixed", inset: 0, zIndex: 10002 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>
            <Router base="">
              <Suspense fallback={null}>
                <DeveloperGate />
              </Suspense>
            </Router>
            <button onClick={() => setShowDevGate(false)} style={{
              position: "absolute", top: 20, left: 20, zIndex: 10003,
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.40)",
              borderRadius: 8, padding: "8px 18px", color: "#10B981",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.20em",
              textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter',sans-serif",
            }}>
              ← CLOSE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  onComplete: () => void;
}

export default function CraftEntryPoint({ onComplete }: Props) {
  const [stage, setStage] = useState<Stage>(() => {
    try { return localStorage.getItem("craft_entry_done") === "1" ? "grid" : "boot"; } catch { return "boot"; }
  });
  const [isAdminView, setIsAdminView] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);

  function handleBootComplete() {
    try { localStorage.setItem("craft_entry_done", "1"); } catch {}
    setStage("grid");
  }

  function handleSmokecraftSelect() {
    onComplete();
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
          <CraftGrid
            onSmokecraft={handleSmokecraftSelect}
            isAdminView={isAdminView}
            onStaffAccess={() => setShowPinGate(true)}
          />
          <AnimatePresence>
            {showPinGate && (
              <motion.div key="pingate"
                style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.80)", backdropFilter: "blur(10px)" }}
                  onClick={() => setShowPinGate(false)} />
                <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
                  <StaffPinGate level="staff" onSuccess={() => { setIsAdminView(true); setShowPinGate(false); }} onCancel={() => setShowPinGate(false)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
