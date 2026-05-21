import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NoveeGuestProfileProvider, useNoveeGuest } from "@/contexts/NoveeGuestProfileContext";
import type { Phase } from "@/contexts/NoveeGuestProfileContext";

// Lazy-load ported pages
const NoveeKioskBootSequence = lazy(() => import("@/pages/NoveeKioskBootSequence").then((m: any) => ({ default: m.default || m })));
const NoveeCraftPortalHome = lazy(() => import("@/pages/NoveeCraftPortalHome").then((m: any) => ({ default: m.default || m })));
const S1_InitGate = lazy(() => import("@/pages/S1_InitGate").then((m: any) => ({ default: m.S1_InitGate || m.default || m })));
const S2_TerroirMatrix = lazy(() => import("@/pages/S2_TerroirMatrix").then((m: any) => ({ default: m.S2_TerroirMatrix || m.default || m })));
const S3_FormulationLab = lazy(() => import("@/pages/S3_FormulationLab").then((m: any) => ({ default: m.S3_FormulationLab || m.default || m })));
const S4_DesignStudio = lazy(() => import("@/pages/S4_DesignStudio").then((m: any) => ({ default: m.S4_DesignStudio || m.default || m })));
const NoveeEATDashboard = lazy(() => import("@/pages/NoveeEATDashboard").then((m: any) => ({ default: m.default || m })));
const NoveeExecutiveCommandCenter = lazy(() => import("@/pages/NoveeExecutiveCommandCenter").then((m: any) => ({ default: m.default || m })));
const ControlChamber = lazy(() => import("@/pages/ControlChamber").then((m: any) => ({ default: m.default || m })));
const NoveeStaffPinGate = lazy(() => import("@/components/NoveeStaffPinGate").then(m => ({ default: m.NoveeStaffPinGate })));
import type { PinRole } from "@/components/NoveeStaffPinGate";

import { playClick } from "@/hooks/useNoveeAudio";
import { hapticClick } from "@/hooks/useNoveeHaptic";

const GOLD  = "#D4AF37";
const AMBER = "#C4860A";
const CREAM = "#F0E8D4";
const G = GOLD;
const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const PAGE_V = {
  enter:  { opacity: 0, scale: 0.97, filter: "blur(10px)" },
  active: { opacity: 1, scale: 1,    filter: "blur(0px)"  },
  exit:   { opacity: 0, scale: 1.02, filter: "blur(8px)"  },
};
const PAGE_T = { duration: 1.60, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] };
const EASE_CINEMA: [number, number, number, number] = [0.22, 1, 0.36, 1];

const S1_PHASES = new Set(["s1_demo", "s1_rules", "s1_leaderboard", "s1_mentor", "s1_seed", "s1_quiz", "s1_posgate"]);
const S2_PHASES = new Set(["s2_terroir", "s2_voucher"]);
const S3_PHASES = new Set(["s3_spiritquiz", "s3_sensorytrap", "s3_leafsliders"]);
const S4_PHASES = new Set(["s4_vitola", "s4_designstudio", "s4_results"]);
const SESSION_PHASES = new Set([...S1_PHASES, ...S2_PHASES, ...S3_PHASES, ...S4_PHASES]);

/* ─────────────────────────────────────────────
   NOVEE Navigation Context
───────────────────────────────────────────── */
interface NoveeNavCtx {
  navigate: (phase: Phase, pinLevel?: PinRole) => void;
  eatFlags: any;
  onFlagsChange: (f: any) => void;
  resetGuest: () => void;
}

const NoveeNavContext = React.createContext<NoveeNavCtx | null>(null);

function useNoveeNav(): NoveeNavCtx {
  const ctx = React.useContext(NoveeNavContext);
  if (!ctx) throw new Error("useNoveeNav: not inside NoveeNavContext.Provider");
  return ctx;
}

function StubView({ title, icon, sub }: { title: string; icon: string; sub: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 48, color: G }}>{icon}</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: G, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.10em" }}>{title}</div>
      <div style={{ fontSize: 20, color: "rgba(240,232,212,0.45)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>{sub}</div>
    </div>
  );
}

const FALLBACK_VENUE_ID = "00000000-0000-0000-0000-000000000001";

interface PairingSuggestion {
  id: string;
  name: string;
  category: string;
  costCents: number;
  affinityScore: number;
}

const PAIRING_CATEGORIES = [
  { id: "trending",         label: "Trending",         icon: "⟡" },
  { id: "vip",              label: "VIP Pairings",     icon: "◈" },
  { id: "rare",             label: "Rare Reserve",     icon: "⬡" },
  { id: "seasonal",         label: "Seasonal",         icon: "◎" },
  { id: "lounge_favorites", label: "Lounge Favorites", icon: "◉" },
  { id: "staff_picks",      label: "Staff Picks",      icon: "◆" },
] as const;
type PairingCat = (typeof PAIRING_CATEGORIES)[number]["id"];

function getPerfectPairing(category: string) {
  const map: Record<string, { drink: string; food: string; drinkNote: string; foodNote: string }> = {
    maduro:      { drink: "Hennessy XO",       food: "Dark Chocolate Truffles", drinkNote: "Rich Cognac, fig & raisin",      foodNote: "73% cacao, gold dusted"       },
    natural:     { drink: "Casamigos Añejo",   food: "Charcuterie Board",       drinkNote: "Smooth aged tequila, vanilla",  foodNote: "Aged cheeses, prosciutto, fig" },
    connecticut: { drink: "Glenlivet 18",      food: "Lobster Bisque",          drinkNote: "Speyside single malt, honey",   foodNote: "Hand-caught lobster, cream"   },
    robusto:     { drink: "Macallan 18",       food: "Wagyu Sliders",           drinkNote: "Sherry-oak single malt",        foodNote: "Prime Wagyu, truffle aioli"   },
  };
  const lc = category.toLowerCase();
  for (const [k, v] of Object.entries(map)) { if (lc.includes(k)) return v; }
  return { drink: "Macallan 18", food: "Wagyu Sliders", drinkNote: "Sherry-oak aged single malt", foodNote: "Prime Wagyu beef, truffle aioli" };
}

const MOCK_PAIRING_CARDS_SC = [
  { id: "m1", name: "Cohiba Siglo VI",        category: "Cuba · Churchill",    costCents: 3200, affinityScore: 94 },
  { id: "m2", name: "Arturo Fuente OpusX",    category: "D.R. · Figurado",    costCents: 2800, affinityScore: 91 },
  { id: "m3", name: "Liga Privada No.9",       category: "U.S.A. · Toro",     costCents: 2200, affinityScore: 88 },
  { id: "m4", name: "Rocky Patel Vintage '90", category: "Honduras · Robusto", costCents: 1800, affinityScore: 84 },
  { id: "m5", name: "Davidoff Year of Ox",     category: "D.R. · Limited",    costCents: 4200, affinityScore: 97 },
];

function PairingView() {
  const [introPhase, setIntroPhase]         = useState<"intro" | "workspace">("intro");
  const [pairings, setPairings]             = useState<PairingSuggestion[]>([]);
  const [env, setEnv]                       = useState<EnvState | null>(null);
  const [pulse, setPulse]                   = useState("");
  const [activeCategory, setActiveCategory] = useState<PairingCat>("trending");

  React.useEffect(() => {
    const t = setTimeout(() => setIntroPhase("workspace"), 1800);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    const venueId = localStorage.getItem("smokecraft_venue") ?? FALLBACK_VENUE_ID;
    fetch(`/api/pairing-engine/suggest?venueId=${venueId}&type=cigar&limit=9`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.suggestions)) setPairings(d.suggestions); if (d.pulse) setPulse(d.pulse); })
      .catch(() => {});
    fetch(`/api/environment/${venueId}`)
      .then(r => r.json())
      .then(d => { if (d.state) setEnv(d.state as EnvState); })
      .catch(() => {});
  }, []);

  const featured      = pairings[0] ?? null;
  const perfPair      = getPerfectPairing(featured?.category ?? "");
  const carouselItems = pairings.length > 1 ? pairings.slice(1) : MOCK_PAIRING_CARDS_SC;

  return (
    <AnimatePresence mode="wait">
      {introPhase === "intro" ? (
        <motion.div key="pr-intro"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -24, filter: "blur(10px)" }}
          transition={{ duration: 0.55 }}
          style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 65%)` }}>
          {[1, 2, 3].map(i => (
            <motion.div key={i}
              animate={{ opacity: [0.07, 0.20, 0.07], scale: [0.94, 1.04, 0.94] }}
              transition={{ duration: 2.8 + i * 0.5, repeat: Infinity, delay: i * 0.6 }}
              style={{ position: "absolute", width: 200 + i * 100, height: 200 + i * 100, borderRadius: "50%", border: `1px solid ${GOLD}${i === 1 ? "33" : "18"}`, pointerEvents: "none" }} />
          ))}
          <motion.div animate={{ opacity: [0.4, 1, 0.6, 1] }} transition={{ duration: 1.6 }} style={{ textAlign: "center", zIndex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.44em", color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", marginBottom: 18 }}>NOVEE OS · E.A.T INTELLIGENCE</div>
            <div style={{ fontSize: 58, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", lineHeight: 1, textShadow: `0 0 60px ${GOLD}44` }}>PAIRING ENGINE</div>
            <motion.div animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.2, repeat: Infinity }}
              style={{ marginTop: 16, fontSize: 14, letterSpacing: "0.30em", color: `${GOLD}70`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
              AI SOMMELIER · FLAVOR INTELLIGENCE
            </motion.div>
          </motion.div>
          <motion.div animate={{ opacity: [0.3, 0.65, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }}
            style={{ position: "absolute", bottom: 52, fontSize: 11, color: `${GOLD}44`, letterSpacing: "0.26em", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
            calibrating palate…
          </motion.div>
        </motion.div>
      ) : (
        <motion.div key="pr-workspace"
          initial={{ opacity: 0, y: 18, filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          <div style={{ flexShrink: 0, padding: "14px 24px 10px", borderBottom: `1px solid ${GOLD}20`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", lineHeight: 1 }}>PAIRING INTELLIGENCE</div>
              <div style={{ fontSize: 12, color: `${GOLD}60`, letterSpacing: "0.20em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginTop: 3 }}>
                AI Sommelier · Flavor-Matched Recommendations{pulse ? ` · ${pulse}` : ""}
              </div>
            </div>
            <motion.button type="button" whileTap={{ scale: 0.94 }} onPointerDown={() => setIntroPhase("intro")}
              style={{ padding: "9px 20px", border: `1px solid ${GOLD}44`, borderRadius: 8, background: "rgba(212,175,55,0.07)", color: `${GOLD}88`, fontSize: 11, letterSpacing: "0.16em", cursor: "pointer", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
              ↺ RECALIBRATE
            </motion.button>
          </div>

          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 0" }}>
                {featured ? (
                  <div style={{ background: "rgba(5,3,1,0.82)", backdropFilter: "blur(20px)", borderRadius: 16, border: `1px solid ${GOLD}33`, padding: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}88, transparent)`, pointerEvents: "none" }} />
                    <div style={{ fontSize: 9, letterSpacing: "0.32em", color: `${GOLD}55`, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginBottom: 14 }}>TONIGHT'S FEATURED PAIRING</div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "stretch" }}>
                      <div style={{ flex: 1, background: "rgba(212,175,55,0.06)", borderRadius: 10, border: `1px solid ${GOLD}22`, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 9, letterSpacing: "0.24em", color: `${GOLD}60`, textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>CIGAR</div>
                        <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 7, background: `linear-gradient(135deg, rgba(212,175,55,0.10), rgba(100,50,10,0.18))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>🍬</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(240,232,212,0.95)", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2 }}>{featured.name}</div>
                        <div style={{ fontSize: 11, color: `${GOLD}70`, fontFamily: "'Inter',sans-serif" }}>{featured.category}</div>
                        <div style={{ fontSize: 14, color: GOLD, fontWeight: 700, fontFamily: "'Inter',sans-serif", marginTop: "auto" }}>${(featured.costCents / 100).toFixed(0)}</div>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 8px" }}>
                        <motion.div
                          animate={{ scale: [1, 1.07, 1], boxShadow: [`0 0 18px ${GOLD}33`, `0 0 32px ${GOLD}55`, `0 0 18px ${GOLD}33`] }}
                          transition={{ duration: 2.8, repeat: Infinity }}
                          style={{ width: 64, height: 64, borderRadius: "50%", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle, rgba(212,175,55,0.16) 0%, transparent 70%)` }}>
                          <span style={{ fontSize: 19, fontWeight: 900, color: GOLD, fontFamily: "'Inter',sans-serif" }}>{featured.affinityScore}%</span>
                        </motion.div>
                        <span style={{ fontSize: 9, color: `${GOLD}60`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>MATCH</span>
                        <div style={{ width: 1, height: 22, background: `${GOLD}28` }} />
                        <span style={{ fontSize: 8, color: `${GOLD}44`, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif", textAlign: "center", lineHeight: 1.4 }}>FLAVOR<br/>BRIDGE</span>
                      </div>
                      <div style={{ flex: 1, background: "rgba(150,80,20,0.08)", borderRadius: 10, border: "1px solid rgba(150,80,20,0.25)", padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 9, letterSpacing: "0.24em", color: "rgba(196,97,10,0.80)", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>SPIRIT</div>
                        <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 7, background: "linear-gradient(135deg, rgba(150,80,10,0.14), rgba(80,40,5,0.18))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>🥃</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(240,232,212,0.95)", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2 }}>{perfPair.drink}</div>
                        <div style={{ fontSize: 11, color: "rgba(196,97,10,0.70)", fontFamily: "'Inter',sans-serif" }}>{perfPair.drinkNote}</div>
                      </div>
                      <div style={{ flex: 1, background: "rgba(60,100,30,0.08)", borderRadius: 10, border: "1px solid rgba(60,100,30,0.22)", padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 9, letterSpacing: "0.24em", color: "rgba(80,140,60,0.80)", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>CUISINE</div>
                        <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 7, background: "linear-gradient(135deg, rgba(60,100,30,0.10), rgba(30,60,15,0.18))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>🍽️</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(240,232,212,0.95)", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2 }}>{perfPair.food}</div>
                        <div style={{ fontSize: 11, color: "rgba(80,140,60,0.70)", fontFamily: "'Inter',sans-serif" }}>{perfPair.foodNote}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
                      {([["Body", 74, GOLD], ["Strength", 58, "#C87028"], ["Flavor", featured.affinityScore, "#32B45A"]] as [string,number,string][]).map(([label, val, color]) => (
                        <div key={label} style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 11, color: `${GOLD}70`, letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>{label}</span>
                            <span style={{ fontSize: 12, color, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>{val}</span>
                          </div>
                          <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
                              style={{ height: "100%", background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 3 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {[
                        { label: "Add Full Experience",  primary: true  },
                        { label: "Save Pairing",         primary: false },
                        { label: "Compare Pairings",     primary: false },
                        { label: "Pair With My Profile", primary: false },
                        { label: "AI Recommendation",    primary: false },
                        { label: "Add To Tab",           primary: false },
                      ].map(btn => (
                        <motion.button key={btn.label} type="button" whileTap={{ scale: 0.94 }}
                          style={{
                            padding: btn.primary ? "16px 28px" : "14px 20px", borderRadius: 10, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                            fontSize: btn.primary ? 22 : 20, fontWeight: btn.primary ? 800 : 600, letterSpacing: "0.08em", textTransform: "uppercase",
                            background: btn.primary ? `linear-gradient(135deg, ${GOLD} 0%, #C87028 100%)` : "rgba(255,255,255,0.04)",
                            color: btn.primary ? "#0A0700" : `${GOLD}AA`,
                            border: `1px solid ${btn.primary ? GOLD : GOLD + "44"}`,
                            boxShadow: btn.primary ? `0 4px 22px ${GOLD}44` : "none",
                            minHeight: 58,
                          }}>
                          {btn.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}
                      style={{ fontSize: 24, color: GOLD, letterSpacing: "0.20em", fontFamily: "'Cormorant Garamond',serif" }}>
                      CALIBRATING PALATE…
                    </motion.div>
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, padding: "12px 20px 16px" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
                  {PAIRING_CATEGORIES.map(cat => (
                    <motion.button key={cat.id} type="button" onPointerDown={() => setActiveCategory(cat.id)} whileTap={{ scale: 0.94 }}
                      style={{
                        padding: "7px 16px", borderRadius: 7, fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.12em", cursor: "pointer", textTransform: "uppercase", flexShrink: 0, whiteSpace: "nowrap",
                        background: activeCategory === cat.id ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.04)",
                        color: activeCategory === cat.id ? GOLD : "rgba(240,232,212,0.45)",
                        border: `1px solid ${activeCategory === cat.id ? GOLD + "66" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      {cat.icon} {cat.label}
                    </motion.button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                  {carouselItems.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.38 }}
                      style={{ flexShrink: 0, width: 178, background: "rgba(5,3,1,0.80)", backdropFilter: "blur(14px)", borderRadius: 10, border: `1px solid ${GOLD}22`, padding: 12, cursor: "pointer" }}>
                      <div style={{ width: "100%", height: 76, borderRadius: 6, background: `linear-gradient(135deg, rgba(212,175,55,0.08), rgba(100,50,10,0.14))`, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🍬</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,232,212,0.90)", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2, marginBottom: 5 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: `${GOLD}60`, fontFamily: "'Inter',sans-serif", marginBottom: 7 }}>{p.category}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: GOLD, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>${(p.costCents / 100).toFixed(0)}</span>
                        <span style={{ fontSize: 10, color: `${GOLD}80`, fontFamily: "'Inter',sans-serif" }}>{p.affinityScore}% ✦</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ width: 246, flexShrink: 0, borderLeft: `1px solid ${GOLD}15`, background: "rgba(3,2,0,0.62)", backdropFilter: "blur(18px)", padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.28em", color: `${GOLD}55`, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", borderBottom: `1px solid ${GOLD}15`, paddingBottom: 9 }}>VENUE INTELLIGENCE</div>
              <div style={{ background: "rgba(212,175,55,0.09)", borderRadius: 9, padding: 13, border: `1px solid ${GOLD}22` }}>
                <div style={{ fontSize: 9, letterSpacing: "0.20em", color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", marginBottom: 7, textTransform: "uppercase" }}>LOUNGE MODE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", lineHeight: 1.2 }}>
                  {env ? env.energyState.replace(/_/g, " ").toUpperCase() : "SOCIAL WARMTH"}
                </div>
              </div>
              {([
                { label: "Lighting",   value: "Evening Reserve",                                                                                                                      icon: "◐" },
                { label: "Music",      value: "Jazz Quartet",                                                                                                                         icon: "♪" },
                { label: "Humidity",   value: env ? `${env.warmthOverride ?? 68}%` : "68%",                                                                                          icon: "◌" },
                { label: "Atmosphere", value: env ? (env.eventAtmosphere === "none" ? "Reserve" : env.eventAtmosphere.replace(/_/g, " ")) : "Reserve",                               icon: "◎" },
                { label: "Seating",    value: "Humidor Lounge",                                                                                                                       icon: "▣" },
              ] as { label: string; value: string; icon: string }[]).map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <span style={{ fontSize: 15, color: `${GOLD}60`, width: 18, flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: `${GOLD}45`, letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: "rgba(240,232,212,0.82)", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>{item.value}</div>
                  </div>
                </div>
              ))}
              <div style={{ background: "rgba(50,180,90,0.07)", borderRadius: 8, padding: 12, border: "1px solid rgba(50,180,90,0.18)", marginTop: "auto" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(50,180,90,0.70)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", marginBottom: 5 }}>AI RECOMMENDATION</div>
                <div style={{ fontSize: 12, color: "rgba(240,232,212,0.72)", fontFamily: "'Inter',sans-serif", lineHeight: 1.55 }}>
                  Current lounge energy pairs beautifully with full-bodied blends. Suggest the Humidor Room for an elevated experience.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface EnvState {
  energyState:       string;
  eventAtmosphere:   string;
  automationEnabled: boolean;
  intensityOverride: number | null;
  warmthOverride:    number | null;
}
const ENERGY_STATES = ["quiet_reserve","social_warmth","elevated_lounge","peak_energy","vip_session","late_night_reserve","event_atmosphere","mentor_session"] as const;

const MOOD_PRESETS_SC = [
  { id: "social_warmth",       label: "Jazz Mode",    icon: "🎷", desc: "Warm, soulful atmosphere"   },
  { id: "peak_energy",         label: "Sports Mode",  icon: "🏈", desc: "High energy, lively crowd"  },
  { id: "vip_session",         label: "VIP Mode",     icon: "✨", desc: "Private reserve experience" },
  { id: "event_atmosphere",    label: "Event Mode",   icon: "🎉", desc: "Special occasion setting"   },
  { id: "late_night_reserve",  label: "After Hours",  icon: "🌙", desc: "Deep night, intimate glow"  },
  { id: "quiet_reserve",       label: "Opening",      icon: "🌅", desc: "Soft morning atmosphere"    },
] as const;

const SCENT_PRESETS_SC  = ["Tobacco", "Cedar", "Bergamot", "Vanilla", "Sandalwood", "Leather"];
const LIGHT_PRESETS_SC  = ["Candlelight", "Dim", "Evening", "Reserve", "Spotlight", "Bright"];
const MUSIC_PRESETS_SC  = ["Jazz Quartet", "Acoustic", "Blues", "Classical", "Ambient", "None"];

function LoungeView() {
  const [env, setEnv]         = useState<EnvState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [scent, setScent]     = useState("Tobacco");
  const [lights, setLights]   = useState("Evening");
  const [music, setMusic]     = useState("Jazz Quartet");
  const venueId = localStorage.getItem("smokecraft_venue") ?? FALLBACK_VENUE_ID;

  React.useEffect(() => {
    fetch(`/api/environment/${venueId}`)
      .then(r => r.json())
      .then(d => { if (d.state) setEnv(d.state as EnvState); })
      .catch(() => {});
  }, [venueId]);

  function applyPreset(preset: string) {
    setSaving(true);
    const token = localStorage.getItem("axiom_token") ?? "";
    fetch(`/api/environment/${venueId}/preset`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ preset }),
    })
      .then(r => r.json())
      .then(d => { if (d.state) setEnv(d.state as EnvState); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function QuickRowSC({ label, items, active, onSelect }: { label: string; items: string[]; active: string; onSelect: (v: string) => void }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.26em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Inter',sans-serif" }}>{label}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map(item => (
            <motion.button key={item} type="button" onPointerDown={() => onSelect(item)} whileTap={{ scale: 0.94 }}
              style={{
                padding: "8px 14px", borderRadius: 7, fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.10em", cursor: "pointer", textTransform: "uppercase",
                background: active === item ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.04)",
                color: active === item ? GOLD : "rgba(240,232,212,0.50)",
                border: `1px solid ${active === item ? GOLD + "66" : "rgba(255,255,255,0.07)"}`,
              }}>{item}</motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", padding: "24px 28px" }}>
      <div style={{ marginBottom: 20, borderBottom: `1px solid ${GOLD}22`, paddingBottom: 14 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em" }}>LOUNGE CONTROL</div>
        <div style={{ fontSize: 13, color: `${GOLD}60`, letterSpacing: "0.20em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginTop: 4 }}>Environmental Reaction Engine · Live Venue Atmosphere</div>
      </div>

      {/* Mood Presets */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.26em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>MOOD PRESETS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {MOOD_PRESETS_SC.map(mood => {
            const active = env?.energyState === mood.id;
            return (
              <motion.button key={mood.id} type="button" onPointerDown={() => applyPreset(mood.id)} whileTap={{ scale: 0.92 }} disabled={saving}
                style={{
                  width: 160, minHeight: 80, borderRadius: 12, padding: "14px 16px",
                  background: active ? `rgba(212,175,55,0.18)` : "rgba(5,3,1,0.72)",
                  backdropFilter: "blur(14px)",
                  border: `1.5px solid ${active ? GOLD + "77" : "rgba(255,255,255,0.07)"}`,
                  boxShadow: active ? `0 0 22px ${GOLD}33` : "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5,
                  position: "relative", overflow: "hidden",
                }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>{mood.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: active ? GOLD : "rgba(240,232,212,0.85)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>{mood.label}</span>
                <span style={{ fontSize: 10, color: active ? `${GOLD}88` : "rgba(240,232,212,0.35)", fontFamily: "'Inter',sans-serif" }}>{mood.desc}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Quick controls */}
      <div style={{ background: "rgba(5,3,1,0.72)", backdropFilter: "blur(14px)", borderRadius: 14, border: `1px solid ${GOLD}22`, padding: 20, marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.26em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 16, fontFamily: "'Inter',sans-serif" }}>QUICK CONTROLS</div>
        <QuickRowSC label="Scent Atmosphere" items={SCENT_PRESETS_SC} active={scent}  onSelect={setScent}  />
        <QuickRowSC label="Lighting Preset"  items={LIGHT_PRESETS_SC} active={lights} onSelect={setLights} />
        <QuickRowSC label="Music Selection"  items={MUSIC_PRESETS_SC} active={music}  onSelect={setMusic}  />
      </div>

      {!env ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ fontSize: 20, color: GOLD, letterSpacing: "0.20em", fontFamily: "'Cormorant Garamond',serif" }}>
            READING ENVIRONMENT…
          </motion.div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "rgba(5,3,1,0.82)", backdropFilter: "blur(18px)", borderRadius: 12, border: `1px solid ${GOLD}33`, padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.26em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>LIVE STATE</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", marginBottom: 8, lineHeight: 1.2 }}>
              {env.energyState.replace(/_/g, " ").toUpperCase()}
            </div>
            <div style={{ fontSize: 13, color: "rgba(240,232,212,0.55)", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif" }}>
              Atmosphere: {env.eventAtmosphere === "none" ? "Standard" : env.eventAtmosphere.replace(/_/g, " ")}
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: env.automationEnabled ? "#32B45A" : "#F07070", boxShadow: `0 0 7px ${env.automationEnabled ? "#32B45A" : "#F07070"}` }} />
              <span style={{ fontSize: 11, color: `${GOLD}66`, letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>AUTOMATION {env.automationEnabled ? "ACTIVE" : "DISABLED"}</span>
            </div>
          </div>
          <div style={{ background: "rgba(5,3,1,0.82)", backdropFilter: "blur(18px)", borderRadius: 12, border: `1px solid ${GOLD}33`, padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.26em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 14, fontFamily: "'Inter',sans-serif" }}>ENVIRONMENT LEVELS</div>
            {([["Intensity", env.intensityOverride ?? 65, GOLD], ["Warmth", env.warmthOverride ?? 72, "#C87028"]] as [string,number,string][]).map(([label, value, color]) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: `${GOLD}70`, letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>{label}</span>
                  <span style={{ fontSize: 14, color, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>{value}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ gridColumn: "1 / -1", background: "rgba(5,3,1,0.82)", backdropFilter: "blur(18px)", borderRadius: 12, border: `1px solid ${GOLD}33`, padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.26em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 14, fontFamily: "'Inter',sans-serif" }}>ALL ENERGY STATES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ENERGY_STATES.map(s => {
                const active = env.energyState === s;
                return (
                  <motion.button key={s} type="button" onPointerDown={() => applyPreset(s)} whileTap={{ scale: 0.94 }} disabled={saving}
                    style={{
                      padding: "10px 18px", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
                      letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", textTransform: "uppercase",
                      background: active ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)",
                      color: active ? GOLD : "rgba(240,232,212,0.50)",
                      border: `1px solid ${active ? GOLD + "66" : "rgba(255,255,255,0.08)"}`,
                      boxShadow: active ? `0 0 14px ${GOLD}2A, inset 0 1px 0 ${GOLD}22` : "none",
                    }}>
                    {s.replace(/_/g, " ")}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView() {
  const { navigate, resetGuest } = useNoveeNav();
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{ fontSize: 48, color: G }}>◈</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: G, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.10em" }}>MY PROFILE</div>
      <div style={{ fontSize: 20, color: "rgba(240,232,212,0.45)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>Guest Identity & Session History</div>
      <motion.button type="button" onPointerDown={() => { resetGuest(); navigate("crafthub"); }} whileTap={{ scale: 0.96 }}
        style={{ marginTop: 20, padding: "16px 40px", background: "rgba(240,112,112,0.14)", border: "1px solid rgba(240,112,112,0.45)", borderRadius: 12, cursor: "pointer", fontSize: 20, fontWeight: 800, color: "#F07070", fontFamily: "'Inter',sans-serif", letterSpacing: "0.18em", textTransform: "uppercase" }}>
        CLEAR SESSION · RETURN TO CRAFTHUB
      </motion.button>
    </div>
  );
}

function useStaffModeSC(): boolean {
  const [isStaff, setIsStaff] = useState(() => !!localStorage.getItem("novee_staff_pin"));
  React.useEffect(() => {
    function onStorage() { setIsStaff(!!localStorage.getItem("novee_staff_pin")); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return isStaff;
}

function SettingsView() {
  const deviceId = (() => { try { return localStorage.getItem("novee_device_id") ?? "KIOSK-001"; } catch { return "KIOSK-001"; } })();
  const [activeSection, setActiveSection] = useState("session");
  const isStaff = useStaffModeSC();

  const SECTIONS = [
    { id: "session",  label: "Session",        icon: "◈" },
    { id: "audio",    label: "Audio & Media",  icon: "♪" },
    { id: "device",   label: "Device Manager", icon: "⊞" },
    { id: "api",      label: "API Config",     icon: "⟡" },
    { id: "theme",    label: "Theme",          icon: "◐" },
    { id: "roles",    label: "User Roles",     icon: "◆" },
    { id: "system",   label: "System",         icon: "⊹" },
  ];

  function SettingsRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
      <div style={{ background: "rgba(5,3,1,0.72)", backdropFilter: "blur(12px)", borderRadius: 8, border: `1px solid ${GOLD}22`, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, color: "rgba(240,232,212,0.75)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontSize: 13, color: GOLD, fontWeight: 700, fontFamily: mono ? "'Courier New',monospace" : "'Inter',sans-serif", letterSpacing: mono ? "0.05em" : "0.08em", textAlign: "right" }}>{value}</span>
      </div>
    );
  }

  function SectionContent() {
    if (activeSection === "session") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Auto-reset timer"  value="15 minutes" />
        <SettingsRow label="Guest greeting"    value="Enabled"    />
        <SettingsRow label="Boot sequence"     value="Enabled"    />
        <SettingsRow label="Session timeout"   value="30 minutes" />
        <SettingsRow label="Kiosk mode"        value="Sovereign"  />
        <SettingsRow label="Inactivity guard"  value="Active"     />
      </div>
    );
    if (activeSection === "audio") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Ambient audio"       value="Active"         />
        <SettingsRow label="Haptic feedback"     value="Enabled"        />
        <SettingsRow label="ElevenLabs TTS"      value="Connected"      />
        <SettingsRow label="Voice ID"            value="Mentor Classic" />
        <SettingsRow label="Volume level"        value="72%"            />
        <SettingsRow label="Audio on transition" value="Yes"            />
      </div>
    );
    if (activeSection === "device") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Device ID"         value={deviceId}                          mono />
        <SettingsRow label="Hardware tier"     value="Kiosk Pro"                         />
        <SettingsRow label="Screen resolution" value="1920 × 1080"                       />
        <SettingsRow label="Touch panel"       value="Calibrated ✓"                      />
        <SettingsRow label="Heartbeat"         value="Active · Live"                     />
        <SettingsRow label="Last ping"         value={new Date().toLocaleTimeString()}   />
        <SettingsRow label="Uptime"            value="14h 32m"                           />
        <SettingsRow label="Memory"            value="3.2 GB / 8 GB"                    />
      </div>
    );
    if (activeSection === "api") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="API endpoint"  value="/api"             mono />
        <SettingsRow label="Auth mode"     value="JWT HS256"        />
        <SettingsRow label="Sync interval" value="30 seconds"       />
        <SettingsRow label="Cloudinary"    value="Connected ✓"      />
        <SettingsRow label="Stripe"        value="Live Mode"        />
        <SettingsRow label="Socket.IO"     value="Connected"        />
        <SettingsRow label="ElevenLabs"    value="Streaming Active" />
      </div>
    );
    if (activeSection === "theme") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Active theme"   value="Obsidian Gold"        />
        <SettingsRow label="Accent color"   value="#D4AF37 (Gold)"       mono />
        <SettingsRow label="Background"     value="#000000 (Obsidian)"   mono />
        <SettingsRow label="Typography"     value="Cormorant + Inter"    />
        <SettingsRow label="Animation"      value="Framer Motion"        />
        <SettingsRow label="Glassmorphism"  value="Active"               />
      </div>
    );
    if (activeSection === "roles") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Current role"    value={isStaff ? (localStorage.getItem("novee_staff_pin") ?? "Staff") : "Guest"} />
        <SettingsRow label="Guest access"    value="CraftHub, SmokeCraft, Pairing, Profile" />
        <SettingsRow label="Staff access"    value="+ E.A.T Intel, Lounge, Command" />
        <SettingsRow label="Manager access"  value="+ All Analytics, Inventory" />
        <SettingsRow label="Founder access"  value="Full system access" />
        {isStaff && (
          <motion.button type="button" whileTap={{ scale: 0.95 }}
            onPointerDown={() => { localStorage.removeItem("novee_staff_pin"); window.dispatchEvent(new Event("storage")); }}
            style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(240,112,112,0.40)", background: "rgba(240,112,112,0.08)", color: "#F07070", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginTop: 8 }}>
            SIGN OUT OF STAFF MODE
          </motion.button>
        )}
      </div>
    );
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Platform version"  value="NOVEE OS v2.4"     />
        <SettingsRow label="Kernel mode"       value="Sovereign"         />
        <SettingsRow label="Database"          value="PostgreSQL · Live" />
        <SettingsRow label="Node runtime"      value="v24"               />
        <SettingsRow label="Build"             value="Vite + esbuild"    />
        <SettingsRow label="Schema version"    value="Drizzle ORM"       />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", padding: "24px 28px" }}>
      <div style={{ marginBottom: 20, borderBottom: `1px solid ${GOLD}22`, paddingBottom: 14 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em" }}>SYSTEM CONFIGURATION</div>
        <div style={{ fontSize: 13, color: `${GOLD}60`, letterSpacing: "0.20em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginTop: 4 }}>NOVEE OS Kiosk Edition · Device &amp; Platform Settings</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {SECTIONS.map(s => (
          <motion.button key={s.id} type="button" onPointerDown={() => setActiveSection(s.id)} whileTap={{ scale: 0.94 }}
            style={{
              padding: "9px 16px", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em", cursor: "pointer", textTransform: "uppercase",
              background: activeSection === s.id ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.04)",
              color: activeSection === s.id ? GOLD : "rgba(240,232,212,0.50)",
              border: `1px solid ${activeSection === s.id ? GOLD + "66" : "rgba(255,255,255,0.07)"}`,
            }}>
            {s.icon} {s.label}
          </motion.button>
        ))}
      </div>
      <SectionContent />
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <motion.button type="button" whileTap={{ scale: 0.96 }}
          onPointerDown={() => { try { sessionStorage.removeItem("novee_boot_done"); } catch { /* */ } window.location.reload(); }}
          style={{ padding: "14px 28px", borderRadius: 10, border: "1px solid rgba(240,112,112,0.35)", background: "rgba(240,112,112,0.08)", color: "#F07070", fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
          RESTART KIOSK
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.96 }}
          onPointerDown={() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* */ } window.location.reload(); }}
          style={{ padding: "14px 28px", borderRadius: 10, border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.06)", color: `${GOLD}88`, fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
          CLEAR CACHE
        </motion.button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Coach Help View
───────────────────────────────────────────── */
const COACH_TOPICS = [
  {
    id: "getting_started", icon: "◈", label: "Getting Started",
    color: "#D4AF37",
    steps: [
      "Tap the CraftHub to begin a new session.",
      "Complete your palate profile — it takes under 2 minutes.",
      "Your mentor is assigned automatically based on your taste profile.",
      "Use the SmokeCraft tab to start your guided experience.",
    ],
  },
  {
    id: "pairing", icon: "◆", label: "Pairing Guide",
    color: "#C87028",
    steps: [
      "Navigate to the Pairing tab from the main nav bar.",
      "Select a category: Classics, Vintage, etc.",
      "Tap any pairing card to see full flavor notes and XP reward.",
      "Use 'Pair With My Profile' to get AI-matched pairings.",
    ],
  },
  {
    id: "xp_levels", icon: "⬡", label: "XP & Levels",
    color: "#32B45A",
    steps: [
      "Earn XP by completing sessions, pairings, and challenges.",
      "Levels: Novice (0) → Enthusiast (1K) → Connoisseur (5K) → Aficionado (15K).",
      "Higher tiers unlock exclusive blends and challenges.",
      "View your current standing in the My Profile tab.",
    ],
  },
  {
    id: "lounge", icon: "◉", label: "Lounge Controls",
    color: "#7B5EA7",
    steps: [
      "Staff can access the Lounge tab from the nav bar.",
      "Select a mood preset: Jazz Mode, VIP Mode, After Hours, etc.",
      "Adjust lighting, music, and scent intensity independently.",
      "Presets apply instantly across all connected venue systems.",
    ],
  },
  {
    id: "golden_box", icon: "⌘", label: "Golden Box",
    color: "#D4AF37",
    steps: [
      "Your Golden Box is a living record of your mastery.",
      "Open Challenges to earn XP-gated rewards.",
      "Compare your stats against the member average.",
      "Rare blends and exclusive access unlock at higher tiers.",
    ],
  },
  {
    id: "staff_tools", icon: "⊹", label: "Staff Tools",
    color: "#C87028",
    steps: [
      "Staff PIN unlocks the E.A.T Intel and Command Center tabs.",
      "E.A.T Intel shows real-time sales intelligence and forecasts.",
      "Command Center controls lounge environment and device status.",
      "Management PIN required for billing and role management.",
    ],
  },
];

const COACH_FAQS = [
  { q: "How do I reset my session?",               a: "Go to Settings → Session → tap 'Reset Session'. This clears your current profile and returns to the CraftHub." },
  { q: "Can I save my pairing preferences?",        a: "Yes — any pairing you interact with is automatically saved to your taste profile for future recommendations." },
  { q: "What is ElevenLabs audio?",                 a: "The platform uses ElevenLabs AI voice to narrate key moments, blend descriptions, and mentor guidance. It activates automatically." },
  { q: "How do I unlock the Control Chamber?",      a: "Hold the top-left corner for 3 seconds, or triple-tap the bottom-right corner. A 6-digit Founder PIN is required to enter." },
  { q: "Why are some nav items hidden?",            a: "Staff-only items like E.A.T Intel and Lounge are hidden from guests. Enter your staff PIN to reveal them." },
  { q: "What is the Affinity Vector?",              a: "Your Affinity Vector is an AI-calculated taste fingerprint built from your session responses. It drives all recommendations." },
];

function CoachHelpView() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"guides" | "faq">("guides");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const topic = COACH_TOPICS.find(t => t.id === activeTopic);

  return (
    <div style={{ position: "relative", inset: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#0A0600 0%,#060400 100%)", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -80, left: "30%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}0A 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", lineHeight: 1.1 }}>COACH HELP</div>
            <div style={{ fontSize: 13, color: `${GOLD}66`, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 3 }}>Guided tutorials &amp; platform mastery</div>
          </div>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: `rgba(212,175,55,0.10)`, border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>◈</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 16, padding: 4, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${GOLD}1A` }}>
          {(["guides", "faq"] as const).map(tab => (
            <motion.button key={tab} type="button" whileTap={{ scale: 0.97 }} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
                background: activeTab === tab ? `linear-gradient(135deg, ${GOLD}22, ${AMBER}18)` : "transparent",
                color: activeTab === tab ? GOLD : `${GOLD}55`,
                boxShadow: activeTab === tab ? `inset 0 0 0 1px ${GOLD}33` : "none",
              }}>
              {tab === "guides" ? "⊹ GUIDES" : "◆ FAQ"}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 24px 32px" }}>
        <AnimatePresence mode="wait">
          {activeTab === "guides" && (
            <motion.div key="guides" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
              {!activeTopic ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {COACH_TOPICS.map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.97 }} onClick={() => setActiveTopic(t.id)}
                      style={{ padding: "20px 18px", borderRadius: 14, border: `1px solid ${t.color}33`, background: "rgba(255,255,255,0.03)", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${t.color}18 0%, transparent 70%)` }} />
                      <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: CREAM, letterSpacing: "0.06em", marginBottom: 4 }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: `${CREAM}55`, letterSpacing: "0.08em" }}>{t.steps.length} steps</div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div key={activeTopic} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setActiveTopic(null)}
                    style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: `1px solid ${GOLD}33`, background: "rgba(212,175,55,0.06)", color: GOLD, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.14em" }}>
                    ← BACK
                  </motion.button>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "16px 18px", borderRadius: 12, background: `rgba(212,175,55,0.06)`, border: `1px solid ${topic?.color ?? GOLD}33` }}>
                    <span style={{ fontSize: 32 }}>{topic?.icon}</span>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, letterSpacing: "0.06em" }}>{topic?.label}</div>
                      <div style={{ fontSize: 12, color: `${GOLD}55`, letterSpacing: "0.14em", marginTop: 2 }}>Step-by-step guide</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {topic?.steps.map((step, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                        style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}18` }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}33, ${AMBER}22)`, border: `1px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 900, color: GOLD }}>{i + 1}</div>
                        <div style={{ fontSize: 16, color: "rgba(240,232,212,0.82)", lineHeight: 1.55, paddingTop: 3 }}>{step}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "faq" && (
            <motion.div key="faq" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COACH_FAQS.map((faq, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <motion.div whileTap={{ scale: 0.99 }} onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    style={{ padding: "16px 18px", borderRadius: expandedFaq === i ? "12px 12px 0 0" : 12, background: expandedFaq === i ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${expandedFaq === i ? GOLD + "44" : GOLD + "18"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: expandedFaq === i ? GOLD : CREAM, letterSpacing: "0.04em" }}>{faq.q}</div>
                    <motion.div animate={{ rotate: expandedFaq === i ? 180 : 0 }} style={{ flexShrink: 0, fontSize: 14, color: `${GOLD}88` }}>▾</motion.div>
                  </motion.div>
                  <AnimatePresence>
                    {expandedFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        style={{ overflow: "hidden", padding: "14px 18px", background: "rgba(212,175,55,0.04)", border: `1px solid ${GOLD}33`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
                        <div style={{ fontSize: 15, color: "rgba(240,232,212,0.72)", lineHeight: 1.6 }}>{faq.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "crafthub",          label: "CraftHub",       abbr: "HUB", targetPhase: "crafthub" as Phase,          staffOnly: false, isActive: (p: string) => p === "crafthub" },
  { id: "smokecraft",        label: "SmokeCraft",     abbr: "SC",  targetPhase: "s1_demo" as Phase,           staffOnly: false, isActive: (p: string) => SESSION_PHASES.has(p) },
  { id: "pairing",           label: "Pairing",        abbr: "PR",  targetPhase: "pairing_view" as Phase,      staffOnly: false, isActive: (p: string) => p === "pairing_view" },
  { id: "profile",           label: "My Profile",     abbr: "ME",  targetPhase: "profile_view" as Phase,      staffOnly: false, isActive: (p: string) => p === "profile_view" },
  { id: "eat",               label: "E.A.T Intel",    abbr: "EAT", targetPhase: "eat_dashboard" as Phase,     staffOnly: true,  pinLevel: "staff" as PinRole,      isActive: (p: string) => p === "eat_dashboard" },
  { id: "executive_command", label: "Command Center", abbr: "EXC", targetPhase: "executive_command" as Phase, staffOnly: true,  pinLevel: "management" as PinRole, isActive: (p: string) => p === "executive_command" },
  { id: "lounge",            label: "Lounge",         abbr: "LG",  targetPhase: "lounge_view" as Phase,       staffOnly: true,  isActive: (p: string) => p === "lounge_view" },
  { id: "settings",          label: "Settings",       abbr: "ST",  targetPhase: "settings_view" as Phase,     staffOnly: true,  isActive: (p: string) => p === "settings_view" },
  { id: "coach_help",        label: "Coach Help",     abbr: "CH",  targetPhase: "coach_help" as Phase,        staffOnly: false, isActive: (p: string) => p === "coach_help" },
];

function OsNavBar() {
  const { profile }  = useNoveeGuest();
  const { navigate } = useNoveeNav();
  const { phase }    = profile;
  const isStaff      = useStaffModeSC();
  const visibleNav   = NAV_ITEMS.filter(item => !item.staffOnly || isStaff);

  return (
    <div style={{
      width: "100%", flexShrink: 0, height: 62,
      background: "rgba(3,2,0,0.97)",
      backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
      borderBottom: `1px solid rgba(212,175,55,0.20)`,
      display: "flex", flexDirection: "row", alignItems: "center",
      position: "relative", zIndex: 200,
      paddingLeft: 12, paddingRight: 12, gap: 4,
    }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD}88 20%, ${GOLD} 50%, ${GOLD}88 80%, transparent 100%)`, boxShadow: `0 0 12px ${GOLD}44` }} />

      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 16, borderRight: "1px solid rgba(212,175,55,0.18)", marginRight: 8, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${GOLD}55 0%, rgba(0,0,0,0.70) 100%)`, border: `1.5px solid ${GOLD}99`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 18px ${GOLD}44` }}>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>N</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: GOLD, fontFamily: "'Cormorant Garamond',Georgia,serif", letterSpacing: "0.06em" }}>NOVEE OS</span>
          <span style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>Kiosk Edition</span>
        </div>
      </div>

      {visibleNav.map((item) => {
        const active  = item.isActive(phase);
        return (
          <motion.button key={item.id} type="button"
            onPointerDown={() => { if (item.targetPhase) navigate(item.targetPhase, item.pinLevel); }}
            whileTap={{ scale: 0.93 }}
            animate={{ background: active ? `rgba(212,175,55,0.16)` : "transparent" }}
            transition={{ duration: 0.18 }}
            style={{
              border: `1.5px solid ${active ? GOLD + "66" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 10, cursor: "pointer",
              padding: "7px 14px",
              display: "flex", flexDirection: "row", alignItems: "center", gap: 8,
              fontFamily: "'Inter',sans-serif",
              position: "relative", flexShrink: 0,
              boxShadow: active ? `0 0 14px ${GOLD}33, inset 0 1px 0 ${GOLD}22` : "none",
              transition: "border-color 0.18s, box-shadow 0.18s",
            }}>
            {active && (
              <motion.div layoutId="nav-active-glow"
                style={{ position: "absolute", inset: 0, borderRadius: 10, background: `radial-gradient(ellipse at 50% 50%, ${GOLD}18 0%, transparent 70%)`, pointerEvents: "none" }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <div style={{ width: 30, height: 30, borderRadius: 7, background: active ? `rgba(212,175,55,0.28)` : "rgba(255,255,255,0.07)", border: `1px solid ${active ? GOLD + "77" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.04em", color: active ? GOLD : "rgba(240,232,212,0.80)", fontFamily: "'Inter',sans-serif" }}>{item.abbr}</span>
            </div>
            <span style={{ fontSize: 12, letterSpacing: "0.08em", color: active ? GOLD : "rgba(240,232,212,0.70)", textTransform: "uppercase", fontWeight: active ? 800 : 600, whiteSpace: "nowrap" }}>{item.label}</span>
            {item.pinLevel && (
              <span style={{ fontSize: 8, color: item.pinLevel === "management" ? "#C87028" : `${GOLD}88`, letterSpacing: "0.08em" }}>
                {item.pinLevel === "management" ? "🔒" : "🔑"}
              </span>
            )}
            {active && (
              <div style={{ position: "absolute", bottom: -1, left: "20%", right: "20%", height: 2, background: GOLD, borderRadius: 2, boxShadow: `0 0 8px ${GOLD}` }} />
            )}
          </motion.button>
        );
      })}

      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 9, color: "rgba(212,175,55,0.30)", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>v2.4</span>
    </div>
  );
}

const RAIL_ITEMS = [
  { id: "crafthub",          label: "CraftHub",   abbr: "HUB", targetPhase: "crafthub" as Phase,          pinLevel: undefined,               staffOnly: false, icon: "⊹", isActive: (p: string) => p === "crafthub" },
  { id: "smokecraft",        label: "SmokeCraft",  abbr: "SC",  targetPhase: "s1_demo" as Phase,           pinLevel: undefined,               staffOnly: false, icon: "◈", isActive: (p: string) => SESSION_PHASES.has(p) },
  { id: "pairing",           label: "Pairing",     abbr: "PR",  targetPhase: "pairing_view" as Phase,     pinLevel: undefined,               staffOnly: false, icon: "◆", isActive: (p: string) => p === "pairing_view" },
  { id: "eat",               label: "E.A.T Intel", abbr: "EAT", targetPhase: "eat_dashboard" as Phase,    pinLevel: "staff" as PinRole,      staffOnly: true,  icon: "⊞", isActive: (p: string) => p === "eat_dashboard" },
  { id: "executive_command", label: "CMD Center",  abbr: "EXC", targetPhase: "executive_command" as Phase, pinLevel: "management" as PinRole, staffOnly: true,  icon: "⟡", isActive: (p: string) => p === "executive_command" },
  { id: "lounge",            label: "Lounge",      abbr: "LG",  targetPhase: "lounge_view" as Phase,      pinLevel: undefined,               staffOnly: true,  icon: "◯", isActive: (p: string) => p === "lounge_view" },
];

function LeftRail() {
  const { profile }  = useNoveeGuest();
  const { navigate } = useNoveeNav();
  const { phase }    = profile;
  const isStaff      = useStaffModeSC();

  return (
    <div style={{
      width: 58, flexShrink: 0,
      background: "rgba(5,3,1,0.95)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderRight: `1px solid rgba(212,175,55,0.16)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 20, paddingBottom: 20, gap: 6,
      position: "relative", zIndex: 100,
    }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 1, background: `linear-gradient(180deg, transparent 0%, ${GOLD}55 20%, ${GOLD}99 50%, ${GOLD}55 80%, transparent 100%)` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, rgba(255,255,255,0.012) 1px, transparent 2px, transparent 12px)`, pointerEvents: "none" }} />

      {RAIL_ITEMS.filter(item => !item.staffOnly || isStaff).map((item) => {
        const active  = item.isActive(phase);
        return (
          <motion.button key={item.id} type="button"
            onPointerDown={() => navigate(item.targetPhase, item.pinLevel)}
            whileTap={{ scale: 0.90 }}
            animate={{ background: active ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.02)", borderColor: active ? `${GOLD}77` : "rgba(255,255,255,0.08)", boxShadow: active ? `0 0 16px ${GOLD}33, inset 0 1px 0 ${GOLD}22` : "none" }}
            transition={{ duration: 0.20 }}
            style={{ width: 42, minHeight: 54, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 4px", position: "relative" }}>
            {active && (
              <div style={{ position: "absolute", left: -1, top: "25%", bottom: "25%", width: 2, background: GOLD, borderRadius: "0 2px 2px 0", boxShadow: `0 0 8px ${GOLD}` }} />
            )}
            <span style={{ fontSize: 16, color: active ? GOLD : "rgba(212,175,55,0.45)", lineHeight: 1, filter: active ? `drop-shadow(0 0 6px ${GOLD}88)` : "none" }}>{item.icon}</span>
            <span style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: "0.14em", color: active ? GOLD : "rgba(212,175,55,0.35)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2, maxWidth: 38 }}>{item.abbr}</span>
            {item.pinLevel && (
              <div style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, borderRadius: "50%", background: item.pinLevel === "management" ? "#C87028" : GOLD, opacity: 0.7 }} />
            )}
          </motion.button>
        );
      })}

      <div style={{ flex: 1 }} />
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
      <span style={{ fontSize: 7, color: `${GOLD}30`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em" }}>v2.4</span>
    </div>
  );
}

function SystemBar() {
  const { profile }              = useNoveeGuest();
  const { navigate, resetGuest } = useNoveeNav();
  const { phase }                = profile;
  const inSession = SESSION_PHASES.has(phase);
  const [staffAuthPulsing, setStaffAuthPulsing] = useState(true);
  const [staffAuthActive,  setStaffAuthActive]  = useState(false);

  function onStaffAuth() {
    setStaffAuthActive(true);
    setStaffAuthPulsing(false);
    navigate("eat_dashboard", "staff");
    setTimeout(() => { setStaffAuthActive(false); setStaffAuthPulsing(true); }, 4000);
  }

  return (
    <div style={{ position: "absolute", top: 3, left: 0, right: 0, height: 38, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 6px #32B45A" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.28em", color: "rgba(212,175,55,0.45)", fontWeight: 800, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>GA</span>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid rgba(212,175,55,0.30)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1px solid ${GOLD}66` }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button type="button" onPointerDown={() => navigate("crafthub")} whileTap={{ scale: 0.95 }}
          style={{ border: "1px solid rgba(212,175,55,0.35)", borderRadius: 6, padding: "5px 14px", background: "rgba(212,175,55,0.08)", cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", opacity: inSession ? 1 : 0.35 }}>
          RESET BLEND
        </motion.button>

        <motion.button type="button" onPointerDown={() => navigate("eat_dashboard", "staff")} whileTap={{ scale: 0.95 }}
          style={{ border: `1px solid ${GOLD}66`, borderRadius: 6, padding: "5px 14px", background: `rgba(212,175,55,0.14)`, cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", boxShadow: `0 0 10px ${GOLD}22` }}>
          COACH HELP
        </motion.button>

        <style>{`
          @keyframes staffAuthPulse { 0%   { box-shadow: 0 0 8px rgba(212,175,55,0.55), 0 0 2px rgba(212,175,55,0.80); border-color: rgba(212,175,55,0.55); } 50%  { box-shadow: 0 0 22px rgba(212,175,55,0.90), 0 0 8px rgba(212,175,55,1.0), inset 0 0 6px rgba(212,175,55,0.18); border-color: rgba(212,175,55,1.0); } 100% { box-shadow: 0 0 8px rgba(212,175,55,0.55), 0 0 2px rgba(212,175,55,0.80); border-color: rgba(212,175,55,0.55); } }
          @keyframes staffAuthDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.72); } }
        `}</style>
        <motion.button type="button" onPointerDown={onStaffAuth} whileTap={{ scale: 0.93 }}
          style={{ border: `1px solid ${GOLD}`, borderRadius: 6, padding: "5px 14px", background: staffAuthActive ? `rgba(212,175,55,0.32)` : `rgba(212,175,55,0.10)`, cursor: "pointer", fontSize: 9, fontWeight: 900, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: 6, animation: staffAuthPulsing ? "staffAuthPulse 2.0s ease-in-out infinite" : "none", transition: "background 0.25s" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, animation: staffAuthPulsing ? "staffAuthDot 2.0s ease-in-out infinite" : "none", boxShadow: `0 0 6px ${GOLD}`, flexShrink: 0 }} />
          STAFF AUTH
        </motion.button>

        <motion.button type="button" onPointerDown={() => { resetGuest(); navigate("crafthub"); }} whileTap={{ scale: 0.93 }}
          style={{ border: "1px solid rgba(240,112,112,0.35)", borderRadius: 6, padding: "5px 14px", background: "rgba(240,112,112,0.08)", cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: "#F07070", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
          PROFILE RESET
        </motion.button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 100, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.26em", color: "rgba(255,255,255,0.18)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>TABLE KIOSK · ACTIVE</span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
        <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.12)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>KIOSK EDITION · NOVEE OS</span>
      </div>
    </div>
  );
}

function EATTelemetryBar() {
  const { navigate } = useNoveeNav();
  const [temp, setTemp]       = useState(68);
  const [humidity,setHumidity]= useState(72);
  const [count, setCount]     = useState(145);

  React.useEffect(() => {
    const id = setInterval(() => {
      setTemp(t      => Math.round(Math.min(74, Math.max(64, t + (Math.random() - 0.5) * 0.8))));
      setHumidity(h  => Math.round(Math.min(80, Math.max(65, h + (Math.random() - 0.5) * 0.6))));
      setCount(c     => Math.max(120, c - (Math.random() > 0.97 ? 1 : 0)));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const telemetry = [
    { label: "Lounge Temp",     value: `${temp}°F`,       color: temp > 71 ? "#F07070" : "#5BBFFF" },
    { label: "Humidity",        value: `${humidity}%`,    color: humidity > 76 ? "#F07070" : "#32B45A" },
    { label: "Humidor Count",   value: `${count} Puros`,  color: GOLD },
    { label: "Lounge Mode",     value: "Active",          color: "#32B45A" },
    { label: "POS Transaction", value: "Authenticated",   color: GOLD },
  ];

  return (
    <motion.div onPointerDown={() => navigate("eat_dashboard", "staff")} whileTap={{ scale: 0.995 }}
      style={{ width: "100%", flexShrink: 0, height: 42, background: "rgba(3,2,0,0.98)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `1px solid rgba(212,175,55,0.30)`, borderBottom: `1px solid rgba(212,175,55,0.12)`, display: "flex", flexDirection: "row", alignItems: "center", position: "relative", zIndex: 180, cursor: "pointer", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 200, background: `radial-gradient(ellipse at 0% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ flexShrink: 0, padding: "0 16px", borderRight: `1px solid rgba(212,175,55,0.22)`, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, height: "100%", background: "rgba(212,175,55,0.05)" }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: `rgba(212,175,55,0.20)`, border: `1px solid ${GOLD}66`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 8px ${GOLD}33` }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: GOLD, fontFamily: "'Inter',sans-serif" }}>⊞</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", color: GOLD, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>E.A.T INTELLIGENCE</span>
          <span style={{ fontSize: 7.5, letterSpacing: "0.18em", color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>Environment • Asset • Transaction</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "row", alignItems: "center", padding: "0 20px", gap: 0, overflow: "hidden" }}>
        {telemetry.map((item, i) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 0, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", padding: "0 18px", borderLeft: i === 0 ? "none" : `1px solid rgba(212,175,55,0.12)` }}>
              <span style={{ fontSize: 8.5, letterSpacing: "0.22em", color: "rgba(212,175,55,0.40)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.label}</span>
              <motion.span key={item.value} initial={{ opacity: 0.6, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                style={{ fontSize: 13, fontWeight: 800, color: item.color, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em", whiteSpace: "nowrap", textShadow: `0 0 12px ${item.color}55` }}>
                {item.value}
              </motion.span>
            </div>
          </div>
        ))}
      </div>

      <div
        onPointerDown={(e) => { e.stopPropagation(); navigate("executive_command", "management"); }}
        style={{ flexShrink: 0, padding: "0 18px", height: "100%", display: "flex", alignItems: "center", gap: 8, borderLeft: `1px solid rgba(212,175,55,0.22)`, cursor: "pointer", background: "rgba(212,175,55,0.03)", transition: "background 0.18s" }}>
        <span style={{ fontSize: 8.5, letterSpacing: "0.22em", color: `${GOLD}80`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>OPEN COMMAND CENTER</span>
        <span style={{ fontSize: 14, color: GOLD }}>›</span>
      </div>
    </motion.div>
  );
}

const TICKER_ITEMS = [
  { cat: "CIGAR",   text: "Arturo Fuente Opus X — Limited Reserve, Tonight Only" },
  { cat: "SPIRITS", text: "Hennessy XO Cognac — Complimentary First Pour with Session" },
  { cat: "KITCHEN", text: "Wagyu Beef Sliders, Chef's Feature — Available Until 11 PM" },
  { cat: "CIGAR",   text: "Padron 1964 Aniversario Natural — 2 for $68 This Evening" },
  { cat: "DRINKS",  text: "Anejo Old Fashioned — House Cocktail Special $16" },
  { cat: "BITES",   text: "Lobster Bisque Shots, Truffle Deviled Eggs — Lounge Menu" },
  { cat: "CIGAR",   text: "Rocky Patel Vintage 1990 — Staff Recommendation Tonight" },
  { cat: "WINE",    text: "Opus One 2019 — Sommelier Select, Limited Bottles Available" },
  { cat: "KITCHEN", text: "Pan-Seared Sea Bass — Market Price, Reserve at the Bar" },
];

function BottomBar() {
  const textSegment = TICKER_ITEMS.map((item, i) => (
    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "0 36px", flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.20em", color: GOLD, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}55`, borderRadius: 4, padding: "3px 10px", flexShrink: 0 }}>{item.cat}</span>
      <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "0.04em", color: "rgba(255,248,235,0.95)", fontFamily: "'Cormorant Garamond',Georgia,serif", whiteSpace: "nowrap" }}>{item.text}</span>
      <span style={{ color: `${GOLD}77`, fontSize: 8, marginLeft: 4, letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif" }}>—</span>
    </span>
  ));

  const dayOneItem = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "0 48px", flexShrink: 0 }}>
      <img src={IMG("dayone360.png")} alt="Day One 360 Travel" style={{ height: 32, width: 32, borderRadius: 6, objectFit: "contain", background: "#fff", padding: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.10em", color: "#C8D8F0", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>DAY ONE 360 TRAVEL</span>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "rgba(200,216,240,0.65)", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>— Your Luxury Travel Partner — Ask Staff for Details</span>
      <span style={{ color: `${GOLD}77`, fontSize: 8, marginLeft: 4 }}>—</span>
    </span>
  );

  return (
    <div style={{ width: "100%", flexShrink: 0, height: 58, background: "rgba(4,2,0,0.98)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `2px solid ${GOLD}`, boxShadow: `0 -6px 32px rgba(212,175,55,0.18)`, display: "flex", flexDirection: "row", alignItems: "center", position: "relative", zIndex: 200, overflow: "hidden" }}>
      <style>{`
        @keyframes novee-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .novee-ticker-track { display: inline-flex; flex-direction: row; align-items: center; white-space: nowrap; animation: novee-ticker 80s linear infinite; will-change: transform; }
      `}</style>
      <div style={{ flexShrink: 0, padding: "0 18px", borderRight: `1px solid ${GOLD}44`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2, background: "rgba(212,175,55,0.06)" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.28em", color: `${GOLD}99`, fontWeight: 900, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>TONIGHT'S</span>
        <span style={{ fontSize: 13, letterSpacing: "0.20em", color: GOLD, fontWeight: 900, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>SPECIALS</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", height: "100%", display: "flex", alignItems: "center", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 48, background: "linear-gradient(90deg, rgba(4,2,0,0.98) 0%, transparent 100%)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 48, background: "linear-gradient(270deg, rgba(4,2,0,0.98) 0%, transparent 100%)", zIndex: 2, pointerEvents: "none" }} />
        <div className="novee-ticker-track">{textSegment}{dayOneItem}{textSegment}{dayOneItem}</div>
      </div>
    </div>
  );
}

function phaseKey(phase: string): string {
  if (phase === "crafthub")          return "crafthub";
  if (phase === "eat_dashboard")     return "eat_dashboard";
  if (phase === "executive_command") return "executive_command";
  if (phase === "pairing_view")      return "pairing_view";
  if (phase === "lounge_view")       return "lounge_view";
  if (phase === "profile_view")      return "profile_view";
  if (phase === "settings_view")     return "settings_view";
  if (phase === "control-chamber")   return "control-chamber";
  if (phase === "coach_help")        return "coach_help";
  if (S1_PHASES.has(phase))          return "s1";
  if (S2_PHASES.has(phase))          return "s2";
  if (S3_PHASES.has(phase))          return "s3";
  if (S4_PHASES.has(phase))          return "s4";
  return "crafthub";
}

function PhaseScreen({ eatFlags, onFlagsChange }: { eatFlags: any; onFlagsChange: (f: any) => void }) {
  const { profile } = useNoveeGuest();
  const { phase }   = profile;
  
  const Comp1 = S1_InitGate as any;
  const Comp2 = S2_TerroirMatrix as any;
  const Comp3 = S3_FormulationLab as any;
  const Comp4 = S4_DesignStudio as any;
  const CompEAT = NoveeEATDashboard as any;
  const CompExec = NoveeExecutiveCommandCenter as any;
  const CompBoot = NoveeKioskBootSequence as any;

  return (
    <Suspense fallback={null}>
      {phase === "crafthub" && <NoveeCraftPortalHome />}
      {phase === "eat_dashboard" && <CompEAT eatFlags={eatFlags} />}
      {phase === "executive_command" && <CompExec flags={eatFlags} onFlagsChange={onFlagsChange} />}
      {phase === "pairing_view" && <PairingView />}
      {phase === "lounge_view" && <LoungeView />}
      {phase === "profile_view" && <ProfileView />}
      {phase === "settings_view" && <SettingsView />}
      {phase === "coach_help" && <CoachHelpView />}
      {phase === "control-chamber" && <ControlChamber />}
      {(S1_PHASES.has(phase) || (phase as string) === "s1") && <Comp1 />}
      {(S2_PHASES.has(phase) || (phase as string) === "s2") && <Comp2 />}
      {(S3_PHASES.has(phase) || (phase as string) === "s3") && <Comp3 />}
      {(S4_PHASES.has(phase) || (phase as string) === "s4") && <Comp4 />}
    </Suspense>
  );
}

function PhaseRouter({ eatFlags, onFlagsChange }: { eatFlags: any; onFlagsChange: (f: any) => void }) {
  const { profile } = useNoveeGuest();
  const key = phaseKey(profile.phase);
  return (
    <AnimatePresence mode="wait">
      <motion.div key={key} variants={PAGE_V} initial="enter" animate="active" exit="exit" transition={PAGE_T}
        style={{ position: "absolute", inset: 0 }}>
        <PhaseScreen eatFlags={eatFlags} onFlagsChange={onFlagsChange} />
      </motion.div>
    </AnimatePresence>
  );
}

function FullBleedBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(175deg, #100C06 0%, #080502 50%, #0C0804 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.018) 1px, transparent 2px, transparent 10px)` }} />
      <div style={{ position: "absolute", top: "-8%", left: "50%", transform: "translateX(-50%)", width: "110%", height: "65%", background: "radial-gradient(ellipse at 50% 10%, rgba(212,140,30,0.13) 0%, rgba(160,80,10,0.06) 35%, transparent 65%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 100% at 0% 50%, rgba(5,3,1,0.80) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 100% at 100% 50%, rgba(5,3,1,0.75) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 100% 55% at 50% 100%, rgba(4,2,0,0.85) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 0%, ${G}60 20%, ${G} 50%, ${G}60 80%, transparent 100%)`, boxShadow: `0 0 40px 6px ${G}28, 0 1px 0 rgba(255,255,255,0.08)` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${G}40 30%, ${G}70 50%, ${G}40 70%, transparent 100%)` }} />
    </div>
  );
}

function handlePointerDown() { playClick(); hapticClick(); }

function OsShellContent() {
  const { setPhase, resetProfile } = useNoveeGuest();
  const [eatFlags, setEatFlags]    = useState<any>({
    revenue: true,
    environmental: true,
    inventory: true,
    telemetry: true,
    social: true
  });

  interface PinTarget { phase: Phase; level: PinRole }
  const [pinGate, setPinGate] = useState<PinTarget | null>(null);
  const [gestures, setGestures] = useState({ topLeft: 0, bottomRight: 0 });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setGestures(prev => ({
        ...prev,
        topLeft: Math.max(0, prev.topLeft - 100),
      }));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  function handleTopLeftDown() {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start >= 3000) {
        clearInterval(interval);
        setPhase("control-chamber");
      }
    }, 100);
    const up = () => clearInterval(interval);
    window.addEventListener("pointerup", up, { once: true });
  }

  function handleBottomRightClick() {
    setGestures(prev => {
      const count = prev.bottomRight + 1;
      if (count >= 3) {
        setPhase("control-chamber");
        return { ...prev, bottomRight: 0 };
      }
      return { ...prev, bottomRight: count };
    });
    setTimeout(() => setGestures(prev => ({ ...prev, bottomRight: 0 })), 1000);
  }

  function navigate(phase: Phase, pinLevel?: PinRole) {
    if (pinLevel) {
      setPinGate({ phase, level: pinLevel });
    } else {
      setPhase(phase);
    }
  }

  function onPinSuccess(role: PinRole, targetPhase: Phase) {
    localStorage.setItem("novee_staff_pin", role);
    window.dispatchEvent(new Event("storage"));
    setPinGate(null);
    setPhase(targetPhase);
  }

  function resetGuest() {
    resetProfile();
    try {
      sessionStorage.removeItem("novee_golden_box_seen");
    } catch { /* */ }
  }

  const navCtx: NoveeNavCtx = {
    navigate,
    eatFlags,
    onFlagsChange: setEatFlags,
    resetGuest,
  };

  return (
    <NoveeNavContext.Provider value={navCtx}>
      <div onPointerDown={handlePointerDown}
        style={{ position: "fixed", inset: 0, cursor: "none", userSelect: "none", WebkitUserSelect: "none", overscrollBehavior: "none", touchAction: "manipulation", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Hidden Gesture Zones */}
        <div 
          onPointerDown={handleTopLeftDown}
          style={{ position: "absolute", top: 0, left: 0, width: 100, height: 100, zIndex: 1000 }} 
        />
        <div 
          onPointerDown={handleBottomRightClick}
          style={{ position: "absolute", bottom: 0, right: 0, width: 100, height: 100, zIndex: 1000 }} 
        />

        <OsNavBar />

        <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", position: "relative" }}>
          <LeftRail />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <FullBleedBackground />
            <SystemBar />
            {/* Content starts at top:44 so SystemBar never clips or intercepts */}
            <div style={{ position: "absolute", top: 44, bottom: 0, left: 0, right: 0, zIndex: 50, overflow: "hidden" }}>
              <PhaseRouter eatFlags={eatFlags} onFlagsChange={setEatFlags} />
            </div>
          </div>
        </div>

        <EATTelemetryBar />
        <BottomBar />

        <AnimatePresence>
          {pinGate && (
            <Suspense fallback={null}>
              <NoveeStaffPinGate
                key={`pin-${pinGate.phase}`}
                level={pinGate.level}
                onSuccess={(role) => onPinSuccess(role, pinGate.phase)}
                onCancel={() => setPinGate(null)}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    </NoveeNavContext.Provider>
  );
}

export default function NoveeOsShell() {
  const [bootDone, setBootDone] = useState<boolean>(() => {
    try { return sessionStorage.getItem("novee_boot_done") === "1"; } catch { return false; }
  });

  const CompBoot = NoveeKioskBootSequence as any;

  function handleBootComplete() {
    try { sessionStorage.setItem("novee_boot_done", "1"); } catch { /* */ }
    setBootDone(true);
  }

  return (
    <NoveeGuestProfileProvider>
      <AnimatePresence mode="wait">
        {!bootDone ? (
          <Suspense fallback={null}>
            <CompBoot key="boot" onComplete={handleBootComplete} />
          </Suspense>
        ) : (
          <motion.div key="shell"
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.20, ease: EASE_CINEMA }}
            style={{ position: "fixed", inset: 0 }}>
            <OsShellContent />
          </motion.div>
        )}
      </AnimatePresence>
    </NoveeGuestProfileProvider>
  );
}
