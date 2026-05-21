import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IntegrationInfraPanel }     from "@/components/IntegrationInfraPanel";
import { HealthMonitorPanel }         from "@/components/HealthMonitorPanel";
import { IntegrationAnalyticsPanel }  from "@/components/IntegrationAnalyticsPanel";
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
    { id: "roles",      label: "User Roles",        icon: "◆" },
    { id: "knowledge",     label: "Knowledge Center",  icon: "◎" },
    { id: "integrations",  label: "Integrations",      icon: "⟡" },
    { id: "health",        label: "Health Monitor",    icon: "◎" },
    { id: "int_analytics", label: "Int. Analytics",    icon: "▦" },
    { id: "system",        label: "System",            icon: "⊹" },
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
    if (activeSection === "knowledge") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ padding: "10px 13px", borderRadius: 8, background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 10, color: `${GOLD}66`, letterSpacing: "0.20em", fontFamily: "'Inter',sans-serif", marginBottom: 3 }}>MASTER MANUALS — 10 DOCUMENTS INDEXED</div>
          <div style={{ fontSize: 11, color: "rgba(240,232,212,0.50)", fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>All training docs are AI-searchable. Use AI Coach for live queries across all domains.</div>
        </div>
        {[
          "Hospitality Fundamentals Manual",
          "Cigar Knowledge & Terroir Guide",
          "Spirit Pairing & Mixology Bible",
          "VIP Service Protocol Handbook",
          "Revenue Optimization Playbook",
          "Guest Recovery & De-escalation Guide",
          "Flavor Education & Sensory Training",
          "Humidor Management & Care Manual",
          "Staff Development & Progression Guide",
          "Emergency Operations & Safety SOPs",
        ].map((manual, i) => (
          <div key={i} style={{ padding: "10px 13px", borderRadius: 7, background: "rgba(255,255,255,0.025)", border: `1px solid ${GOLD}16`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: CREAM, fontFamily: "'Inter',sans-serif", letterSpacing: "0.02em" }}>{manual}</div>
              <div style={{ fontSize: 9, color: `${GOLD}50`, fontFamily: "'Inter',sans-serif", marginTop: 2, letterSpacing: "0.12em" }}>INDEXED · AI SEARCHABLE</div>
            </div>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 4px #32B45A", flexShrink: 0 }} />
          </div>
        ))}
        <div style={{ padding: "9px 13px", borderRadius: 7, background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}30`, marginTop: 2 }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: "0.16em", fontFamily: "'Inter',sans-serif" }}>8 KNOWLEDGE DOMAINS ACTIVE</div>
          <div style={{ fontSize: 9, color: `${GOLD}60`, marginTop: 2, fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>Guest Guidance · Pairing Intelligence · Revenue Coaching · Recovery · Flavor Education · VIP Coaching · Quick Answers · Live AI</div>
        </div>
      </div>
    );
    if (activeSection === "integrations") return (
      <IntegrationInfraPanel venueId="demo-venue" GOLD={GOLD} CREAM={CREAM} />
    );
    if (activeSection === "health") return (
      <HealthMonitorPanel venueId="demo-venue" GOLD={GOLD} CREAM={CREAM} />
    );
    if (activeSection === "int_analytics") return (
      <IntegrationAnalyticsPanel venueId="demo-venue" GOLD={GOLD} CREAM={CREAM} />
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
   Hospitality Intelligence Console (Coach Help)
───────────────────────────────────────────── */
const INTEL_SECTIONS = [
  { id: "guest_guidance", label: "Guest Guidance", icon: "⊹", color: "#D4AF37",
    summary: "First-timer coaching, VIP handling, guest psychology, and service protocols.",
    items: [
      { title: "First-Time Smoker Protocol", body: "Recommend Connecticut or Dominican. Warn of nicotine on empty stomach. Pace at 1–2 draws/min. Frame it as a terroir experience — they're tasting the land of Nicaragua." },
      { title: "VIP Recognition Rules", body: "Use guest name within 30s. Anticipate preferences before they ask. The 3-minute engagement rule: no more than 3 minutes between seating and first engagement." },
      { title: "Emotional Pacing", body: "Celebratory guests: fast-paced enthusiasm. Contemplative guests: slow, deliberate guidance. Read the room — never rush either. Pacing drives repeat visits." },
    ] },
  { id: "pairing_intelligence", label: "Pairing Intelligence", icon: "◆", color: "#C87028",
    summary: "Spirit, wine, and cuisine pairings by cigar profile with flavor bridge notes.",
    items: [
      { title: "Connecticut + Wheated Bourbon", body: "Caramel and vanilla mirror the mild creaminess. Pappy Van Winkle or W.L. Weller. The intensity bridge: match the strength of the spirit to the body of the cigar." },
      { title: "Maduro + High-Rye Bourbon", body: "Spice and fruit esters match the dark chocolate–espresso profile. Booker's or Four Roses Single Barrel. Bold on bold — reinforces, not overpowers." },
      { title: "Habano + Single Malt Scotch", body: "Rich oak and spice match the complexity. Macallan 18 or Eagle Rare. The sherry-cask sweetness bridges the earthy Habano mid-palette beautifully." },
    ] },
  { id: "revenue_coaching", label: "Revenue Coaching", icon: "◈", color: "#32B45A",
    summary: "Attachment selling, second-round timing, premium conversion, and ticket growth.",
    items: [
      { title: "Second-Round Timing", body: "At 75% of the first cigar, return to the table. 'Would you like to select your next smoke?' Target conversion rate: 65%. Never wait until the guest asks." },
      { title: "Premium Conversion", body: "Never say 'more expensive.' Use 'allocated,' 'reserve,' or 'signature.' Lead with the story: '500 boxes reached the US this year — we received 12.'" },
      { title: "Pairing Bridge Upsell", body: "'The experience changes significantly with the right spirit — may I suggest our Macallan 18?' Always a question. Permission-based selling drives 40% ticket increase." },
    ] },
  { id: "recovery_guidance", label: "Recovery Guidance", icon: "⬡", color: "#C84A4A",
    summary: "Complaint recovery (L.A.S.T.), intoxication management, de-escalation.",
    items: [
      { title: "L.A.S.T. Recovery Framework", body: "Listen (no interruption) → Acknowledge ('You're absolutely right, I sincerely apologize') → Solve (immediate, concrete remedy) → Thank ('Thank you for telling us')." },
      { title: "Intoxication Protocol", body: "Slow the pace naturally. Redirect with food — compliments of the house. Bring water as a palate cleanser, no comment. Notify manager via SMS, never over radio in earshot." },
      { title: "De-escalation Technique", body: "Speak 20% below normal volume. Move to the guest's eye level. Remove audience by guiding to private area. Agree with feelings, not facts. Offer two acceptable options." },
    ] },
  { id: "flavor_education", label: "Flavor Education", icon: "◉", color: "#7B5EA7",
    summary: "Wrapper varieties, regional terroir, filler architecture, and cutting techniques.",
    items: [
      { title: "Wrapper Guide", body: "Connecticut: silky, mild, cedar, cream. Maduro: dark chocolate, espresso, dried fruit. Habano: spicy, complex, cedar. Corojo: earthy, oily. Cameroon: sweet, toothy, unique." },
      { title: "Filler Architecture", body: "Seco: combustion and balance (40%). Viso: flavor and complexity (40%). Ligero: strength and length (20% medium / 30% full). Ratio drives the strength trajectory." },
      { title: "Region Terroir", body: "Cuba (Vuelta Abajo): world's finest. Nicaragua (Jalapa): volcanic, complex. Dominican (Santiago): smooth, refined. Honduras (Danlí): hearty, earthy. Each region imprints the leaf." },
    ] },
  { id: "vip_coaching", label: "VIP Coaching", icon: "⟡", color: "#C8960A",
    summary: "High-value guest retention, anticipatory service, and lifetime value thinking.",
    items: [
      { title: "Anticipatory Intelligence", body: "Repeat VIP + known preference = stage before they arrive. 'We received the Padron 1926 this week — I thought of you immediately.' That sentence is worth $500 in loyalty." },
      { title: "The Graceful Departure", body: "When a VIP is deep in conversation, a slow withdrawal and brief nod is preferred over verbal interruption. Never hover. Presence without intrusion is the highest service level." },
      { title: "VIP Recovery Investment", body: "A $15 cigar complaint resolves with a $50 credit and a personal follow-up call. The remedy must exceed the complaint for high-value guests. Think lifetime value, not transaction cost." },
    ] },
  { id: "quick_answers", label: "Quick Answers", icon: "◎", color: "#4A9BC8",
    summary: "Instant answers to the most common operational and guest service questions.",
    items: [
      { title: "How do I reset a session?", body: "Settings → Session → Reset Session. Clears the current profile and returns to CraftHub. Guest data is preserved in sessionStorage — they can return on the same device." },
      { title: "Humidor emergency (RH > 75%)", body: "Remove all Boveda packs immediately. Leave the humidor lid slightly ajar for 2 hours. Monitor every 30 minutes. Do not add any humidification until RH drops below 72%." },
      { title: "Staff PIN locked out?", body: "After 5 failed attempts: automatic 15-minute lockout. Reset via Settings → Security (management PIN required). Contact your venue administrator if management PIN is unavailable." },
    ] },
  { id: "live_ai", label: "Live AI", icon: "⊞", color: "#D4AF37",
    summary: "Ask the AI Coach anything about hospitality, operations, pairings, or guest situations.",
    items: [] },
];

const STAFF_ROLES_COACH = [
  { id: "server",           label: "Server" },
  { id: "bartender",        label: "Bartender" },
  { id: "tobacconist",      label: "Tobacconist" },
  { id: "manager",          label: "Manager" },
  { id: "concierge",        label: "Concierge" },
  { id: "vip_host",         label: "VIP Host" },
  { id: "brand_ambassador", label: "Ambassador" },
];

interface AiCoachResult {
  answer: string;
  confidence: number;
  sources: { title: string; domain: string }[];
  lowConfidenceWarning: boolean;
  provider: string;
  suggestedFollowUps: string[];
}

function CoachHelpView() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("server");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<AiCoachResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docResults, setDocResults] = useState<{ title: string; source: string; excerpt: string }[]>([]);
  const [docLoading, setDocLoading] = useState(false);

  const section = INTEL_SECTIONS.find(s => s.id === activeSection);

  async function handleAskAI() {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch("/api/coach-ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: aiQuery, role: selectedRole }),
      });
      if (!res.ok) throw new Error("AI service unavailable");
      const data = await res.json() as AiCoachResult;
      setAiResult(data);
    } catch {
      setAiError("AI Coach is temporarily unavailable. Use Quick Answers or consult your manager.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleDocSearch() {
    if (!docSearchQuery.trim()) return;
    setDocLoading(true);
    try {
      const res = await fetch("/api/coach-ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: docSearchQuery }),
      });
      const data = await res.json() as { results: { title: string; source: string; excerpt: string }[] };
      setDocResults(data.results ?? []);
    } catch {
      setDocResults([]);
    } finally {
      setDocLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", inset: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#0A0600 0%,#060400 100%)", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -80, left: "30%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, right: "10%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, #C8702818 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em", lineHeight: 1.1 }}>HOSPITALITY INTELLIGENCE</div>
            <div style={{ fontSize: 11, color: `${GOLD}55`, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 3, fontFamily: "'Inter',sans-serif" }}>AI-Powered Staff Coach · 8 Knowledge Domains</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 20, background: "rgba(50,180,90,0.10)", border: "1px solid rgba(50,180,90,0.28)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 5px #32B45A" }} />
            <span style={{ fontSize: 10, color: "#32B45A", fontWeight: 700, letterSpacing: "0.16em", fontFamily: "'Inter',sans-serif" }}>AI ACTIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {STAFF_ROLES_COACH.map(r => (
            <motion.button key={r.id} type="button" whileTap={{ scale: 0.95 }} onClick={() => setSelectedRole(r.id)}
              style={{ flexShrink: 0, padding: "5px 11px", borderRadius: 6, border: `1px solid ${selectedRole === r.id ? GOLD + "66" : GOLD + "18"}`, background: selectedRole === r.id ? `rgba(212,175,55,0.14)` : "transparent", color: selectedRole === r.id ? GOLD : `${GOLD}55`, fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
              {r.label.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 32px" }}>
        <AnimatePresence mode="wait">

          {!activeSection && (
            <motion.div key="grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 9, marginBottom: 16 }}>
                {INTEL_SECTIONS.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.97 }} onClick={() => setActiveSection(s.id)}
                    style={{ padding: "16px 14px", borderRadius: 12, border: `1px solid ${s.color}33`, background: "rgba(255,255,255,0.025)", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -15, right: -15, width: 60, height: 60, borderRadius: "50%", background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)` }} />
                    <div style={{ fontSize: 20, color: s.color, marginBottom: 7, fontFamily: "'Inter',sans-serif" }}>{s.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: CREAM, letterSpacing: "0.04em", marginBottom: 4, fontFamily: "'Inter',sans-serif" }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: `${CREAM}50`, lineHeight: 1.4, fontFamily: "'Inter',sans-serif" }}>{s.summary}</div>
                  </motion.div>
                ))}
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${GOLD}22`, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ fontSize: 11, color: `${GOLD}77`, letterSpacing: "0.20em", fontWeight: 700, marginBottom: 9, fontFamily: "'Inter',sans-serif" }}>SEARCH KNOWLEDGE BASE</div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input value={docSearchQuery} onChange={e => setDocSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && void handleDocSearch()}
                    placeholder="e.g. How do I relight a cigar? Bourbon pairing..."
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 7, border: `1px solid ${GOLD}33`, background: "rgba(255,255,255,0.04)", color: CREAM, fontSize: 12, fontFamily: "'Inter',sans-serif", outline: "none" }} />
                  <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => void handleDocSearch()} disabled={docLoading}
                    style={{ padding: "9px 14px", borderRadius: 7, border: `1px solid ${GOLD}55`, background: `rgba(212,175,55,0.14)`, color: GOLD, fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
                    {docLoading ? "..." : "SEARCH"}
                  </motion.button>
                </div>
                {docResults.length > 0 && (
                  <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 6 }}>
                    {docResults.slice(0, 4).map((r, i) => (
                      <div key={i} style={{ padding: "9px 11px", borderRadius: 7, background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}18` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 2, fontFamily: "'Inter',sans-serif" }}>{r.title}</div>
                        <div style={{ fontSize: 10, color: `${CREAM}55`, marginBottom: 2, fontFamily: "'Inter',sans-serif" }}>{r.source}</div>
                        <div style={{ fontSize: 11, color: `${CREAM}75`, lineHeight: 1.4, fontFamily: "'Inter',sans-serif" }}>{r.excerpt.substring(0, 120)}...</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection && activeSection !== "live_ai" && section && (
            <motion.div key={activeSection} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setActiveSection(null)}
                style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 7, border: `1px solid ${GOLD}33`, background: "rgba(212,175,55,0.06)", color: GOLD, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>
                ← ALL SECTIONS
              </motion.button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 10, background: `rgba(212,175,55,0.06)`, border: `1px solid ${section.color}33`, marginBottom: 12 }}>
                <span style={{ fontSize: 26, color: section.color, fontFamily: "'Inter',sans-serif" }}>{section.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: GOLD, letterSpacing: "0.06em", fontFamily: "'Cormorant Garamond',serif" }}>{section.label}</div>
                  <div style={{ fontSize: 10, color: `${GOLD}55`, letterSpacing: "0.12em", marginTop: 1, fontFamily: "'Inter',sans-serif" }}>{section.summary}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
                {section.items.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ padding: "13px 15px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}18` }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: CREAM, letterSpacing: "0.03em", marginBottom: 5, fontFamily: "'Inter',sans-serif" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "rgba(240,232,212,0.72)", lineHeight: 1.6, fontFamily: "'Inter',sans-serif" }}>{item.body}</div>
                  </motion.div>
                ))}
              </div>
              <motion.button type="button" whileTap={{ scale: 0.97 }}
                onClick={() => { setAiQuery(`Tell me more about ${section.label} for a ${selectedRole}`); setActiveSection("live_ai"); }}
                style={{ width: "100%", padding: "12px", borderRadius: 9, border: `1px solid ${GOLD}44`, background: `rgba(212,175,55,0.10)`, color: GOLD, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.16em", fontFamily: "'Inter',sans-serif" }}>
                ASK AI ABOUT {section.label.toUpperCase()}
              </motion.button>
            </motion.div>
          )}

          {activeSection === "live_ai" && (
            <motion.div key="live_ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => { setActiveSection(null); setAiResult(null); setAiError(null); }}
                style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 7, border: `1px solid ${GOLD}33`, background: "rgba(212,175,55,0.06)", color: GOLD, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>
                ← ALL SECTIONS
              </motion.button>
              <div style={{ padding: "13px 15px", borderRadius: 10, background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}33`, marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: GOLD, letterSpacing: "0.06em", fontFamily: "'Cormorant Garamond',serif", marginBottom: 2 }}>LIVE AI COACH</div>
                <div style={{ fontSize: 10, color: `${GOLD}55`, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>Responding as {STAFF_ROLES_COACH.find(r => r.id === selectedRole)?.label ?? "Server"} · Grounded on internal manuals</div>
              </div>
              {!aiResult && !aiLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: `${GOLD}55`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif" }}>SUGGESTED QUESTIONS</div>
                  {["How do I relight a cigar properly?", "What bourbon pairs best with a Maduro?", "How do I recover an upset VIP guest?", "Show me the pre-shift humidor checklist."].map((q, i) => (
                    <motion.button key={i} type="button" whileTap={{ scale: 0.98 }} onClick={() => setAiQuery(q)}
                      style={{ padding: "9px 12px", borderRadius: 7, border: `1px solid ${GOLD}22`, background: "rgba(255,255,255,0.02)", color: `${CREAM}77`, fontSize: 12, textAlign: "left", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                      {q}
                    </motion.button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 12 }}>
                <textarea value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                  placeholder="Ask anything about guest service, pairings, operations, or conflict recovery..."
                  rows={3}
                  style={{ padding: "11px 13px", borderRadius: 9, border: `1px solid ${GOLD}33`, background: "rgba(255,255,255,0.04)", color: CREAM, fontSize: 12, fontFamily: "'Inter',sans-serif", outline: "none", resize: "none", lineHeight: 1.5 }} />
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => void handleAskAI()} disabled={aiLoading || !aiQuery.trim()}
                  style={{ padding: "12px", borderRadius: 9, border: `1px solid ${aiLoading ? GOLD + "33" : GOLD + "66"}`, background: aiLoading ? "rgba(212,175,55,0.06)" : `rgba(212,175,55,0.18)`, color: aiLoading ? `${GOLD}55` : GOLD, fontSize: 13, fontWeight: 800, cursor: aiLoading ? "default" : "pointer", letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif" }}>
                  {aiLoading ? "CONSULTING AI COACH..." : "ASK AI COACH"}
                </motion.button>
              </div>
              <AnimatePresence>
                {aiError && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ padding: "12px 14px", borderRadius: 9, background: "rgba(200,74,74,0.08)", border: "1px solid rgba(200,74,74,0.28)", color: "#F07070", fontSize: 12, fontFamily: "'Inter',sans-serif", lineHeight: 1.5, marginBottom: 9 }}>
                    {aiError}
                  </motion.div>
                )}
                {aiResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {aiResult.lowConfidenceWarning && (
                      <div style={{ padding: "7px 11px", borderRadius: 7, background: "rgba(200,160,10,0.10)", border: "1px solid rgba(200,160,10,0.28)", color: "#C8A00A", fontSize: 10, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }}>
                        LOW CONFIDENCE — Verify with your manager or Knowledge Center before acting on this guidance.
                      </div>
                    )}
                    <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}33` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                        <div style={{ fontSize: 10, color: `${GOLD}66`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif" }}>AI RESPONSE · {(STAFF_ROLES_COACH.find(r => r.id === selectedRole)?.label ?? "Server").toUpperCase()}</div>
                        <div style={{ fontSize: 10, color: aiResult.confidence >= 0.7 ? "#32B45A" : "#C8A00A", fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                          {Math.round(aiResult.confidence * 100)}% CONFIDENCE
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: CREAM, lineHeight: 1.65, fontFamily: "'Inter',sans-serif", whiteSpace: "pre-wrap" }}>{aiResult.answer}</div>
                    </div>
                    {aiResult.sources.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em" }}>SOURCES:</span>
                        {aiResult.sources.slice(0, 3).map((s, i) => (
                          <div key={i} style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}22`, fontSize: 9, color: `${GOLD}88`, fontFamily: "'Inter',sans-serif" }}>{s.title}</div>
                        ))}
                      </div>
                    )}
                    {aiResult.suggestedFollowUps.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: `${GOLD}55`, letterSpacing: "0.14em", marginBottom: 5, fontFamily: "'Inter',sans-serif" }}>FOLLOW-UP QUESTIONS</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {aiResult.suggestedFollowUps.map((q, i) => (
                            <motion.button key={i} type="button" whileTap={{ scale: 0.98 }} onClick={() => { setAiQuery(q); setAiResult(null); }}
                              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${GOLD}22`, background: "rgba(255,255,255,0.02)", color: `${CREAM}77`, fontSize: 11, textAlign: "left", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                              {q}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
              <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.04em", color: active ? GOLD : "rgba(240,232,212,0.80)", fontFamily: "'Inter',sans-serif" }}>{item.abbr}</span>
            </div>
            <span style={{ fontSize: 14, letterSpacing: "0.08em", color: active ? GOLD : "rgba(240,232,212,0.70)", textTransform: "uppercase", fontWeight: active ? 800 : 600, whiteSpace: "nowrap" }}>{item.label}</span>
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
  { id: "coach_help",        label: "Coach Help",  abbr: "CH",  targetPhase: "coach_help" as Phase,       pinLevel: undefined,               staffOnly: false, icon: "◈", isActive: (p: string) => p === "coach_help" },
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
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: active ? GOLD : "rgba(212,175,55,0.45)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2, maxWidth: 38 }}>{item.abbr}</span>
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
    <div style={{ position: "absolute", top: 3, left: 0, right: 0, height: 38, background: "rgba(1,1,1,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", zIndex: 50 }}>
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
