import { useState, createContext, useContext, useEffect, Component } from "react";
import type { ReactNode } from "react";
import { IntegrationInfraPanel }          from "@/components/IntegrationInfraPanel";
import { HealthMonitorPanel }             from "@/components/HealthMonitorPanel";
import { IntegrationAnalyticsPanel }      from "@/components/IntegrationAnalyticsPanel";
import { GlobalProviderControlCenter }    from "@/components/GlobalProviderControlCenter";
import { useVisualSync } from "@/hooks/useVisualSync";
import { startHeartbeat, getOrCreateDeviceId } from "@/lib/deviceTelemetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GuestProfileProvider, useGuest } from "@/context/GuestProfileContext";
import type { Phase } from "@/context/GuestProfileContext";
import { LicenseProvider } from "@/contexts/LicenseContext";
import { ThemeConfigProvider } from "@/contexts/ThemeConfigContext";
import UpgradePage from "@/pages/UpgradePage";
import UpgradeRequired from "@/pages/UpgradeRequired";
import GoldenBoxPage from "@/pages/GoldenBoxPage";
import CraftPortalHome from "@/pages/CraftPortalHome";
import EATDashboard from "@/pages/EATDashboard";
import EatPosModule  from "@/pages/EatPosModule";
import ExecutiveCommandCenter from "@/pages/ExecutiveCommandCenter";
import type { EATModuleFlags } from "@/pages/ExecutiveCommandCenter";
import { DEFAULT_FLAGS } from "@/pages/ExecutiveCommandCenter";
import DevConsole from "@/pages/DevConsole";
import { StaffPinGate } from "@/components/StaffPinGate";
import type { PinRole } from "@/components/StaffPinGate";
import CraftEntryPoint, { CraftGrid } from "@/pages/CraftEntryPoint";
import { SplashController } from "@/components/SplashController";
import { S1_InitGate } from "@/pages/S1_InitGate";
import { S2_TerroirMatrix } from "@/pages/S2_TerroirMatrix";
import { S3_FormulationLab } from "@/pages/S3_FormulationLab";
import { S4_DesignStudio } from "@/pages/S4_DesignStudio";
import ControlChamber from "@/pages/ControlChamber";
import StaffTerminal from "@/pages/StaffTerminal";
import MasterBlender from "@/pages/MasterBlender";
import GesturalEngine from "@/pages/GesturalEngine";
import { AmbientEmberField } from "@/components/AmbientEmberField";
import { AshParticles } from "@/components/AshParticles";
import { RevenueOptimizationOverlay } from "@/components/RevenueOptimizationOverlay";
import { NoveeXPBridge }              from "@/components/PosXPFeedback";
import { DevModeOverlay } from "@/components/DevModeOverlay";
import { playClick } from "@/hooks/useAudio";
import { hapticClick } from "@/hooks/useHaptic";
import { EnvironmentalSceneStack } from "@/lib/EnvironmentalSceneEngine";
import { useKioskRuntime, type KioskRuntimeState } from "@/hooks/useKioskRuntime";
import { POS_TERMINAL_CONFIG, formatProviderLabel } from "@/config/kioskPosConfig";
import {
  Armchair,
  Activity,
  BadgeHelp,
  BarChart3,
  BookOpen,
  CircleDot,
  CreditCard,
  Flame,
  Grid3X3,
  Home,
  KeyRound,
  Lamp,
  Monitor,
  Music2,
  Package,
  Palette,
  Plug,
  Search,
  Server,
  Settings,
  SlidersHorizontal,
  Sofa,
  TerminalSquare,
  Users,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

class EATErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: unknown) {
    const msg = String(err);
    if (msg.includes("Failed to fetch dynamically imported module") || msg.includes("Importing a module script failed")) {
      window.location.reload();
      return { error: null };
    }
    return { error: msg };
  }
  componentDidCatch(err: unknown, info: { componentStack: string }) {
    console.error("[EAT Dashboard Crash]", err, "\nComponent stack:", info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1A1008", color: "#D4AF37", fontFamily: "'Inter',sans-serif", gap: 16, padding: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.12em" }}>E.A.T SYSTEM ERROR</div>
          <div style={{ fontSize: 18, color: "rgba(255,200,100,0.90)", textAlign: "center", maxWidth: 520, lineHeight: 1.6, wordBreak: "break-word" }}>{this.state.error}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", textAlign: "center" }}>Full details in browser console</div>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 8, padding: "14px 32px", borderRadius: 8, border: "1px solid #D4AF37", background: "rgba(212,175,55,0.15)", color: "#D4AF37", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: "0.10em" }}>RETRY</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const GOLD  = "#D4AF37";
const AMBER = "#C4860A";
const CREAM = "#F0E8D4";
const G    = GOLD;
const IMG  = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const PAGE_V = {
  enter:  { opacity: 0, scale: 0.99, filter: "blur(4px)" },
  active: { opacity: 1, scale: 1,    filter: "blur(0px)" },
  exit:   { opacity: 0, scale: 1.01, filter: "blur(3px)" },
};
const PAGE_T = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] };

const queryClient = new QueryClient();

const S1_PHASES = new Set(["s1_demo","s1_rules","s1_leaderboard","s1_mentor","s1_seed","s1_quiz","s1_posgate"]);
const S2_PHASES = new Set(["s2_terroir","s2_voucher"]);
const S3_PHASES = new Set(["s3_spiritquiz","s3_sensorytrap","s3_leafsliders"]);
const S4_PHASES = new Set(["s4_vitola","s4_designstudio","s4_results"]);
const SESSION_PHASES = new Set([...S1_PHASES,...S2_PHASES,...S3_PHASES,...S4_PHASES]);

/* ─────────────────────────────────────────────
   NOVEE Navigation Context — PIN-gated routing
───────────────────────────────────────────── */
interface NoveeNavCtx {
  navigate:        (phase: Phase, pinLevel?: PinRole) => void;
  eatFlags:        EATModuleFlags;
  onFlagsChange:   (f: EATModuleFlags) => void;
  resetGuest:      () => void;
  resetBlend:      () => void;
}

const NoveeNavContext = createContext<NoveeNavCtx | null>(null);

function useNoveeNav(): NoveeNavCtx {
  const ctx = useContext(NoveeNavContext);
  if (!ctx) throw new Error("useNoveeNav: not inside NoveeNavContext.Provider");
  return ctx;
}

/* ─────────────────────────────────────────────
   Stub views for Pairing / Lounge / Profile / Settings
───────────────────────────────────────────── */
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
  { id: "trending",         label: "Trending",         icon: "SIGNAL" },
  { id: "vip",              label: "VIP Pairings",     icon: "VIP" },
  { id: "rare",             label: "Rare Reserve",     icon: "RESERVE" },
  { id: "seasonal",         label: "Seasonal",         icon: "SEASON" },
  { id: "lounge_favorites", label: "Lounge Favorites", icon: "LOUNGE" },
  { id: "staff_picks",      label: "Staff Picks",      icon: "STAFF" },
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

const MOCK_PAIRING_CARDS = [
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

  useEffect(() => {
    const t = setTimeout(() => setIntroPhase("workspace"), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
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
  const carouselItems = pairings.length > 1 ? pairings.slice(1) : MOCK_PAIRING_CARDS;

  return (
    <EnvironmentalSceneStack sceneId="pairing-room" className="env-depth-stack--absolute" contentClassName="env-full-content">
    <AnimatePresence mode="wait">
      {introPhase === "intro" ? (
        /* ── CINEMATIC INTRO ── */
        <motion.div key="pr-intro"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -24, filter: "blur(10px)" }}
          transition={{ duration: 0.55 }}
          style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "transparent" }}>
          {[1, 2, 3].map(i => (
            <motion.div key={i}
              animate={{ opacity: [0.07, 0.20, 0.07], scale: [0.94, 1.04, 0.94] }}
              transition={{ duration: 2.8 + i * 0.5, repeat: Infinity, delay: i * 0.6 }}
              style={{ position: "absolute", width: 200 + i * 100, height: 200 + i * 100, borderRadius: "50%", border: `1px solid ${GOLD}${i === 1 ? "33" : "18"}`, pointerEvents: "none" }} />
          ))}
          <motion.div animate={{ opacity: [0.4, 1, 0.6, 1] }} transition={{ duration: 1.6 }} style={{ textAlign: "center", zIndex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.44em", color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", marginBottom: 18 }}>NOVEE OS · E.A.T INTELLIGENCE</div>
            <div style={{ fontSize: 58, fontWeight: 900, color: "#FFFDD0", fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", lineHeight: 1, textShadow: `0 0 60px ${GOLD}66, 0 0 120px rgba(253,251,247,0.10)` }}>PAIRING ENGINE</div>
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
        /* ── FULL WORKSPACE ── */
        <motion.div key="pr-workspace"
          initial={{ opacity: 0, y: 18, filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ flexShrink: 0, padding: "14px 24px 10px", borderBottom: `1px solid ${GOLD}20`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", lineHeight: 1 }}>PAIRING INTELLIGENCE</div>
              <div style={{ fontSize: 12, color: `${GOLD}60`, letterSpacing: "0.20em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginTop: 3 }}>
                AI Sommelier · Flavor-Matched Recommendations{pulse ? ` · ${pulse}` : ""}
              </div>
            </div>
            <motion.button type="button" whileTap={{ scale: 0.94 }} onPointerDown={() => setIntroPhase("intro")}
              style={{ minHeight: 58, padding: "0 28px", border: `1px solid ${GOLD}55`, borderRadius: 8, background: "rgba(212,175,55,0.10)", color: `${GOLD}AA`, fontSize: 13, letterSpacing: "0.14em", cursor: "pointer", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", fontWeight: 800, touchAction: "manipulation" }}>
              Recalibrate
            </motion.button>
          </div>

          {/* Body: Left content + Right intelligence panel */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* LEFT */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 0" }}>
                {featured ? (
                  <div style={{ background: "rgba(5,3,1,0.82)", backdropFilter: "blur(20px)", borderRadius: 16, border: `1px solid ${GOLD}33`, padding: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}88, transparent)`, pointerEvents: "none" }} />
                    <div style={{ fontSize: 12, letterSpacing: "0.24em", color: `${GOLD}70`, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginBottom: 14, fontWeight: 800 }}>Tonight's Featured Pairing</div>

                    {/* Three-column: cigar | badge | spirit | food */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "stretch" }}>
                      <div style={{ flex: 1, background: "rgba(212,175,55,0.06)", borderRadius: 10, border: `1px solid ${GOLD}33`, padding: 16, display: "flex", flexDirection: "column", gap: 8, backdropFilter: "blur(12px)" }}>
                        <div style={{ fontSize: 12, letterSpacing: "0.18em", color: `${GOLD}99`, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", fontWeight: 800 }}>Cigar</div>
                        <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 7, overflow: "hidden", position: "relative" }}>
                          <img src={IMG("smoke/smoke_selection.png")} alt="Maduro cigar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(5,3,1,0.75) 100%)" }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFDD0", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2 }}>{featured.name}</div>
                        <div style={{ fontSize: 11, color: `${GOLD}88`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em" }}>{featured.category}</div>
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

                      <div style={{ flex: 1, background: "rgba(150,80,20,0.10)", borderRadius: 10, border: "1px solid rgba(196,120,40,0.35)", padding: 16, display: "flex", flexDirection: "column", gap: 8, backdropFilter: "blur(12px)" }}>
                        <div style={{ fontSize: 12, letterSpacing: "0.18em", color: "rgba(255,190,80,0.95)", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", fontWeight: 800 }}>Spirit</div>
                        <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 7, overflow: "hidden", position: "relative" }}>
                          <img src={IMG("pour/pour_whiskey.png")} alt="Crystal tumbler whiskey" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(5,2,0,0.75) 100%)" }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFDD0", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2 }}>{perfPair.drink}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,190,80,0.75)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }}>{perfPair.drinkNote}</div>
                      </div>

                      <div style={{ flex: 1, background: "rgba(60,100,30,0.09)", borderRadius: 10, border: "1px solid rgba(80,160,60,0.28)", padding: 16, display: "flex", flexDirection: "column", gap: 8, backdropFilter: "blur(12px)" }}>
                        <div style={{ fontSize: 12, letterSpacing: "0.18em", color: "rgba(120,200,90,0.90)", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", fontWeight: 800 }}>Cuisine</div>
                        <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 7, overflow: "hidden", position: "relative" }}>
                          <img src={IMG("pour/pour_tasting.png")} alt="Upscale tasting plate" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(2,5,1,0.75) 100%)" }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFDD0", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2 }}>{perfPair.food}</div>
                        <div style={{ fontSize: 11, color: "rgba(120,200,90,0.70)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }}>{perfPair.foodNote}</div>
                      </div>
                    </div>

                    {/* Body / Strength / Flavor meters */}
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

                    {/* Action buttons */}
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
                            padding: btn.primary ? "16px 28px" : "14px 20px",
                            borderRadius: 10, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                            fontSize: btn.primary ? 22 : 20, fontWeight: btn.primary ? 800 : 600,
                            letterSpacing: "0.08em", textTransform: "uppercase",
                            background: btn.primary ? `linear-gradient(135deg, ${GOLD} 0%, #C87028 100%)` : "rgba(255,255,255,0.04)",
                            color: btn.primary ? "#0A0700" : `${GOLD}AA`,
                            border: `1px solid ${btn.primary ? GOLD : GOLD + "44"}`,
                            boxShadow: btn.primary ? `0 4px 22px ${GOLD}44` : "none",
                            minHeight: 64,
                            touchAction: "manipulation",
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

              {/* Category tabs + horizontal scroll */}
              <div style={{ flexShrink: 0, padding: "12px 20px 16px" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
                  {PAIRING_CATEGORIES.map(cat => (
                    <motion.button key={cat.id} type="button" onPointerDown={() => setActiveCategory(cat.id)} whileTap={{ scale: 0.94 }}
                      style={{
                        minHeight: 54, padding: "0 20px", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 800,
                        letterSpacing: "0.12em", cursor: "pointer", textTransform: "uppercase", flexShrink: 0, whiteSpace: "nowrap",
                        background: activeCategory === cat.id ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.04)",
                        color: activeCategory === cat.id ? GOLD : "rgba(240,232,212,0.45)",
                        border: `1px solid ${activeCategory === cat.id ? GOLD + "66" : "rgba(255,255,255,0.08)"}`,
                        boxShadow: activeCategory === cat.id ? `0 0 12px ${GOLD}22` : "none",
                        touchAction: "manipulation",
                      }}>
                      {cat.icon} {cat.label}
                    </motion.button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                  {carouselItems.map((p, i) => (
                    <motion.div key={p.id}
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.38 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ flexShrink: 0, width: 220, minHeight: 172, background: "rgba(5,3,1,0.80)", backdropFilter: "blur(14px)", borderRadius: 10, border: `1px solid ${GOLD}28`, padding: 14, cursor: "pointer", overflow: "hidden", touchAction: "pan-x" }}>
                      <div style={{ width: "100%", height: 76, borderRadius: 6, overflow: "hidden", marginBottom: 8, position: "relative" }}>
                        <img src={IMG("smokecraft-card.jpg")} alt="Cigar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 30%, rgba(5,3,1,0.80) 100%)" }} />
                        <div style={{ position: "absolute", bottom: 5, right: 7, fontSize: 9, color: GOLD, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>{p.affinityScore}% ✦</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFDD0", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2, marginBottom: 5 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: `${GOLD}77`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em", marginBottom: 7 }}>{p.category}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: GOLD, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>${(p.costCents / 100).toFixed(0)}</span>
                        <span style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Reserve</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Venue Intelligence Panel */}
            <div style={{ width: 246, flexShrink: 0, borderLeft: `1px solid ${GOLD}15`, background: "rgba(3,2,0,0.62)", backdropFilter: "blur(18px)", padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              <div style={{ fontSize: 12, letterSpacing: "0.22em", color: `${GOLD}70`, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", borderBottom: `1px solid ${GOLD}15`, paddingBottom: 12, fontWeight: 800 }}>Venue Intelligence</div>

              <div style={{ background: "rgba(212,175,55,0.09)", borderRadius: 9, padding: 13, border: `1px solid ${GOLD}22` }}>
                <div style={{ fontSize: 9, letterSpacing: "0.20em", color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", marginBottom: 7, textTransform: "uppercase" }}>LOUNGE MODE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em", lineHeight: 1.2 }}>
                  {env ? env.energyState.replace(/_/g, " ").toUpperCase() : "SOCIAL WARMTH"}
                </div>
              </div>

              {([
                { label: "Lighting",   value: "Evening Reserve",                                                                                                                      Icon: Lamp },
                { label: "Music",      value: "Jazz Quartet",                                                                                                                         Icon: Music2 },
                { label: "Humidity",   value: env ? `${env.warmthOverride ?? 68}%` : "68%",                                                                                          Icon: CircleDot },
                { label: "Atmosphere", value: env ? (env.eventAtmosphere === "none" ? "Reserve" : env.eventAtmosphere.replace(/_/g, " ")) : "Reserve",                               Icon: Flame },
                { label: "Seating",    value: "Humidor Lounge",                                                                                                                       Icon: Sofa },
              ] as { label: string; value: string; Icon: LucideIcon }[]).map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 54, padding: "8px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <item.Icon size={16} color={`${GOLD}99`} style={{ width: 18, flexShrink: 0 }} />
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
    </EnvironmentalSceneStack>
  );
}

interface EnvState {
  energyState:       string;
  eventAtmosphere:   string;
  mentorPersonality: string;
  automationEnabled: boolean;
  overrideActive:    boolean;
  intensityOverride: number | null;
  warmthOverride:    number | null;
}
const ENERGY_STATES = ["quiet_reserve","social_warmth","elevated_lounge","peak_energy","vip_session","late_night_reserve","event_atmosphere","mentor_session"] as const;

const MOOD_PRESETS = [
  { id: "social_warmth",       label: "Jazz Mode",    icon: "JAZZ", desc: "Warm, soulful atmosphere"   },
  { id: "peak_energy",         label: "Peak Mode",    icon: "PEAK", desc: "High energy, lively crowd"  },
  { id: "vip_session",         label: "VIP Mode",     icon: "VIP", desc: "Private reserve experience" },
  { id: "event_atmosphere",    label: "Event Mode",   icon: "EVENT", desc: "Special occasion setting"   },
  { id: "late_night_reserve",  label: "After Hours",  icon: "NIGHT", desc: "Deep night, intimate glow"  },
  { id: "quiet_reserve",       label: "Opening",      icon: "OPEN", desc: "Soft morning atmosphere"    },
] as const;

const SCENT_PRESETS  = ["Tobacco", "Cedar", "Bergamot", "Vanilla", "Sandalwood", "Leather"];
const LIGHT_PRESETS  = ["Candlelight", "Dim", "Evening", "Reserve", "Spotlight", "Bright"];
const MUSIC_PRESETS  = ["Jazz Quartet", "Acoustic", "Blues", "Classical", "Ambient", "None"];

function LoungeView() {
  const [env, setEnv]         = useState<EnvState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [scent, setScent]     = useState("Tobacco");
  const [lights, setLights]   = useState("Evening");
  const [music, setMusic]     = useState("Jazz Quartet");
  const venueId = localStorage.getItem("smokecraft_venue") ?? FALLBACK_VENUE_ID;

  useEffect(() => {
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

  function QuickRow({ label, items, active, onSelect }: { label: string; items: string[]; active: string; onSelect: (v: string) => void }) {
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
                boxShadow: active === item ? `0 0 10px ${GOLD}20` : "none",
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

      {/* Mood Presets — large tiles */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.26em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>MOOD PRESETS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {MOOD_PRESETS.map(mood => {
            const active = env?.energyState === mood.id;
            return (
              <motion.button key={mood.id} type="button" onPointerDown={() => applyPreset(mood.id)} whileTap={{ scale: 0.92 }} disabled={saving}
                style={{
                  width: 160, minHeight: 80, borderRadius: 12, padding: "14px 16px",
                  background: active ? `rgba(212,175,55,0.18)` : "rgba(5,3,1,0.72)",
                  backdropFilter: "blur(14px)",
                  border: `1.5px solid ${active ? GOLD + "77" : "rgba(255,255,255,0.07)"}`,
                  boxShadow: active ? `0 0 22px ${GOLD}33, inset 0 1px 0 ${GOLD}22` : "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5,
                  position: "relative", overflow: "hidden",
                }}>
                {active && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 30%, ${GOLD}12 0%, transparent 70%)`, pointerEvents: "none" }} />}
                <span style={{ fontSize: 9, lineHeight: 1, letterSpacing: "0.16em", color: `${GOLD}AA`, fontWeight: 900 }}>{mood.icon}</span>
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
        <QuickRow label="Scent Atmosphere"  items={SCENT_PRESETS} active={scent}  onSelect={setScent}  />
        <QuickRow label="Lighting Preset"   items={LIGHT_PRESETS} active={lights} onSelect={setLights} />
        <QuickRow label="Music Selection"   items={MUSIC_PRESETS} active={music}  onSelect={setMusic}  />
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
          {/* Current State */}
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

          {/* Intensity Meters */}
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

          {/* All energy state presets */}
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
  const { navigate } = useNoveeNav();
  return <GoldenBoxPage onBack={() => navigate("crafthub")} />;
}

function SettingsView() {
  const deviceId = (() => { try { return localStorage.getItem("novee_device_id") ?? "KIOSK-001"; } catch { return "KIOSK-001"; } })();
  const [activeSection, setActiveSection] = useState("session");
  const isStaff = useStaffMode();

  const SECTIONS = [
    { id: "session",         label: "Session",          Icon: Settings },
    { id: "audio",           label: "Audio & Media",    Icon: Music2 },
    { id: "device",          label: "Device Manager",   Icon: Monitor },
    { id: "api",             label: "API Config",       Icon: KeyRound },
    { id: "theme",           label: "Theme",            Icon: Palette },
    { id: "roles",           label: "User Roles",       Icon: Users },
    { id: "knowledge",       label: "Knowledge Center", Icon: BookOpen },
    { id: "integrations",    label: "Integrations",     Icon: Plug },
    { id: "health",          label: "Health Monitor",   Icon: Activity },
    { id: "int_analytics",   label: "Int. Analytics",   Icon: BarChart3 },
    { id: "global_controls", label: "API Controls",     Icon: SlidersHorizontal },
    { id: "system",          label: "System",           Icon: Server },
  ] as { id: string; label: string; Icon: LucideIcon }[];

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
        <SettingsRow label="Ambient audio"      value="Active"     />
        <SettingsRow label="Haptic feedback"    value="Enabled"    />
        <SettingsRow label="ElevenLabs TTS"     value="Connected"  />
        <SettingsRow label="Voice ID"           value="Mentor Classic" />
        <SettingsRow label="Volume level"       value="72%"        />
        <SettingsRow label="Audio on transition" value="Yes"       />
      </div>
    );
    if (activeSection === "device") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Device ID"          value={deviceId}          mono />
        <SettingsRow label="Hardware tier"      value="Kiosk Pro"         />
        <SettingsRow label="Screen resolution"  value="1920 × 1080"       />
        <SettingsRow label="Touch panel"        value="Calibrated ✓"      />
        <SettingsRow label="Heartbeat"          value="Active · Live"     />
        <SettingsRow label="Last ping"          value={new Date().toLocaleTimeString()} />
        <SettingsRow label="Uptime"             value="14h 32m"           />
        <SettingsRow label="Memory"             value="3.2 GB / 8 GB"     />
      </div>
    );
    if (activeSection === "api") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="API endpoint"       value="/api"              mono />
        <SettingsRow label="Auth mode"          value="JWT HS256"         />
        <SettingsRow label="Sync interval"      value="30 seconds"        />
        <SettingsRow label="Cloudinary"         value="Connected ✓"       />
        <SettingsRow label="Stripe"             value="Live Mode"         />
        <SettingsRow label="Socket.IO"          value="Connected"         />
        <SettingsRow label="ElevenLabs"         value="Streaming Active"  />
      </div>
    );
    if (activeSection === "theme") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Active theme"       value="Obsidian Gold"     />
        <SettingsRow label="Accent color"       value="#D4AF37 (Gold)"    mono />
        <SettingsRow label="Background"         value="#000000 (Obsidian)" mono />
        <SettingsRow label="Typography"         value="Cormorant + Inter" />
        <SettingsRow label="Animation"          value="Framer Motion"     />
        <SettingsRow label="Glassmorphism"      value="Active"            />
      </div>
    );
    if (activeSection === "roles") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Current role"       value={isStaff ? (localStorage.getItem("novee_staff_pin") ?? "Staff") : "Guest"} />
        <SettingsRow label="Guest access"       value="CraftHub, SmokeCraft, Pairing, Profile" />
        <SettingsRow label="Staff access"       value="+ E.A.T Intel, Lounge, Command" />
        <SettingsRow label="Manager access"     value="+ All Analytics, Inventory" />
        <SettingsRow label="Founder access"     value="Full system access" />
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
    if (activeSection === "global_controls") return (
      <GlobalProviderControlCenter GOLD={GOLD} CREAM={CREAM} />
    );
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SettingsRow label="Platform version"   value="NOVEE OS v2.4"     />
        <SettingsRow label="Kernel mode"        value="Sovereign"         />
        <SettingsRow label="Database"           value="PostgreSQL · Live" />
        <SettingsRow label="Node runtime"       value="v24"               />
        <SettingsRow label="Build"              value="Vite + esbuild"    />
        <SettingsRow label="Schema version"     value="Drizzle ORM"       />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", padding: "24px 28px" }}>
      <div style={{ marginBottom: 20, borderBottom: `1px solid ${GOLD}22`, paddingBottom: 14 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em" }}>SYSTEM CONFIGURATION</div>
        <div style={{ fontSize: 13, color: `${GOLD}60`, letterSpacing: "0.20em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", marginTop: 4 }}>NOVEE OS Kiosk Edition · Device &amp; Platform Settings</div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {SECTIONS.map(s => (
          <motion.button key={s.id} type="button" onPointerDown={() => setActiveSection(s.id)} whileTap={{ scale: 0.94 }}
            style={{
              padding: "9px 16px", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em", cursor: "pointer", textTransform: "uppercase",
              background: activeSection === s.id ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.04)",
              color: activeSection === s.id ? GOLD : "rgba(240,232,212,0.50)",
              border: `1px solid ${activeSection === s.id ? GOLD + "66" : "rgba(255,255,255,0.07)"}`,
              boxShadow: activeSection === s.id ? `0 0 12px ${GOLD}22` : "none",
            }}>
            <s.Icon size={13} strokeWidth={1.8} style={{ verticalAlign: "-2px", marginRight: 7 }} />
            {s.label}
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
const INTEL_SECTIONS = [
  { id: "guest_guidance", label: "Guest Guidance", icon: "GUIDE", color: "#D4AF37",
    summary: "First-timer coaching, VIP handling, guest psychology, and service protocols.",
    items: [
      { title: "First-Time Smoker Protocol", body: "Recommend Connecticut or Dominican. Warn of nicotine on empty stomach. Pace at 1–2 draws/min. Frame it as a terroir experience — they're tasting the land of Nicaragua." },
      { title: "VIP Recognition Rules", body: "Use guest name within 30s. Anticipate preferences before they ask. The 3-minute engagement rule: no more than 3 minutes between seating and first engagement." },
      { title: "Emotional Pacing", body: "Celebratory guests: fast-paced enthusiasm. Contemplative guests: slow, deliberate guidance. Read the room — never rush either. Pacing drives repeat visits." },
    ] },
  { id: "pairing_intelligence", label: "Pairing Intelligence", icon: "PAIR", color: "#C87028",
    summary: "Spirit, wine, and cuisine pairings by cigar profile with flavor bridge notes.",
    items: [
      { title: "Connecticut + Wheated Bourbon", body: "Caramel and vanilla mirror the mild creaminess. Pappy Van Winkle or W.L. Weller. The intensity bridge: match the strength of the spirit to the body of the cigar." },
      { title: "Maduro + High-Rye Bourbon", body: "Spice and fruit esters match the dark chocolate–espresso profile. Booker's or Four Roses Single Barrel. Bold on bold — reinforces, not overpowers." },
      { title: "Habano + Single Malt Scotch", body: "Rich oak and spice match the complexity. Macallan 18 or Eagle Rare. The sherry-cask sweetness bridges the earthy Habano mid-palette beautifully." },
    ] },
  { id: "revenue_coaching", label: "Revenue Coaching", icon: "REV", color: "#32B45A",
    summary: "Attachment selling, second-round timing, premium conversion, and ticket growth.",
    items: [
      { title: "Second-Round Timing", body: "At 75% of the first cigar, return to the table. 'Would you like to select your next smoke?' Target conversion rate: 65%. Never wait until the guest asks." },
      { title: "Premium Conversion", body: "Never say 'more expensive.' Use 'allocated,' 'reserve,' or 'signature.' Lead with the story: '500 boxes reached the US this year — we received 12.'" },
      { title: "Pairing Bridge Upsell", body: "'The experience changes significantly with the right spirit — may I suggest our Macallan 18?' Always a question. Permission-based selling drives 40% ticket increase." },
    ] },
  { id: "recovery_guidance", label: "Recovery Guidance", icon: "CARE", color: "#C84A4A",
    summary: "Complaint recovery (L.A.S.T.), intoxication management, de-escalation.",
    items: [
      { title: "L.A.S.T. Recovery Framework", body: "Listen (no interruption) → Acknowledge ('You're absolutely right, I sincerely apologize') → Solve (immediate, concrete remedy) → Thank ('Thank you for telling us')." },
      { title: "Intoxication Protocol", body: "Slow the pace naturally. Redirect with food — compliments of the house. Bring water as a palate cleanser, no comment. Notify manager via SMS, never over radio in earshot." },
      { title: "De-escalation Technique", body: "Speak 20% below normal volume. Move to the guest's eye level. Remove audience by guiding to private area. Agree with feelings, not facts. Offer two acceptable options." },
    ] },
  { id: "flavor_education", label: "Flavor Education", icon: "LEAF", color: "#7B5EA7",
    summary: "Wrapper varieties, regional terroir, filler architecture, and cutting techniques.",
    items: [
      { title: "Wrapper Guide", body: "Connecticut: silky, mild, cedar, cream. Maduro: dark chocolate, espresso, dried fruit. Habano: spicy, complex, cedar. Corojo: earthy, oily. Cameroon: sweet, toothy, unique." },
      { title: "Filler Architecture", body: "Seco: combustion and balance (40%). Viso: flavor and complexity (40%). Ligero: strength and length (20% medium / 30% full). Ratio drives the strength trajectory." },
      { title: "Region Terroir", body: "Cuba (Vuelta Abajo): world's finest. Nicaragua (Jalapa): volcanic, complex. Dominican (Santiago): smooth, refined. Honduras (Danlí): hearty, earthy. Each region imprints the leaf." },
    ] },
  { id: "vip_coaching", label: "VIP Coaching", icon: "VIP", color: "#C8960A",
    summary: "High-value guest retention, anticipatory service, and lifetime value thinking.",
    items: [
      { title: "Anticipatory Intelligence", body: "Repeat VIP + known preference = stage before they arrive. 'We received the Padron 1926 this week — I thought of you immediately.' That sentence is worth $500 in loyalty." },
      { title: "The Graceful Departure", body: "When a VIP is deep in conversation, a slow withdrawal and brief nod is preferred over verbal interruption. Never hover. Presence without intrusion is the highest service level." },
      { title: "VIP Recovery Investment", body: "A $15 cigar complaint resolves with a $50 credit and a personal follow-up call. The remedy must exceed the complaint for high-value guests. Think lifetime value, not transaction cost." },
    ] },
  { id: "quick_answers", label: "Quick Answers", icon: "FAQ", color: "#4A9BC8",
    summary: "Instant answers to the most common operational and guest service questions.",
    items: [
      { title: "How do I reset a session?", body: "Settings → Session → Reset Session. Clears the current profile and returns to CraftHub. Guest data is preserved in sessionStorage — they can return on the same device." },
      { title: "Humidor emergency (RH > 75%)", body: "Remove all Boveda packs immediately. Leave the humidor lid slightly ajar for 2 hours. Monitor every 30 minutes. Do not add any humidification until RH drops below 72%." },
      { title: "Staff PIN locked out?", body: "After 5 failed attempts: automatic 15-minute lockout. Reset via Settings → Security (management PIN required). Contact your venue administrator if management PIN is unavailable." },
    ] },
  { id: "live_ai", label: "Live AI", icon: "AI", color: "#D4AF37",
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

const GUIDE_TOPICS_NOVEE = [
  { id: "ritual",  label: "CIGAR RITUAL MASTERY",      sub: "Relighting, cutting, ash etiquette",    img: "https://images.unsplash.com/photo-1589831377283-33cb1cc6bd5d?w=700&q=80" },
  { id: "guest",   label: "GUEST EXPERIENCE PROTOCOL", sub: "From greeting to farewell",              img: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=700&q=80" },
  { id: "vip",     label: "VIP SERVICE EXCELLENCE",    sub: "White-glove lounge standards",           img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=700&q=80" },
  { id: "pairing", label: "FLAVOR & PAIRING INTEL",    sub: "Spirits and food harmonics",             img: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=700&q=80" },
  { id: "ops",     label: "INVENTORY & OPERATIONS",    sub: "Humidor checks, stock integrity",        img: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=700&q=80" },
  { id: "revenue", label: "REVENUE & UPSELLING",       sub: "Menu strategy, guided upgrades",         img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=700&q=80" },
] as const;

const FAQ_ITEMS_NOVEE = [
  { q: "How do I properly relight a cigar?",               a: "Toast the foot with a soft flame without direct contact. Rotate slowly until the ash glows evenly. Draw gently — never puff aggressively." },
  { q: "What bourbon pairs best with a Maduro?",           a: "Full-bodied bourbons with high-rye content complement Maduro’s cocoa and coffee notes. Wheated expressions harmonize beautifully with the wrapper’s natural sweetness." },
  { q: "How do I recover a dissatisfied VIP guest?",       a: "Lead with acknowledgment, not explanation. Offer a complimentary selection from the reserve. Escalate to the lounge director if the guest remains uncomfortable." },
  { q: "What are pre-shift humidor checks?",               a: "Verify humidity (68–72%), temperature (65–70°F), inspect wrappers for cracks, rotate stock oldest-forward, log the puro count, and report any anomaly immediately." },
  { q: "How do I recommend the right vitola?",             a: "Match ring gauge to experience level: Coronas (44–46 RG) for novices, Robustos for intermediate guests, Churchills for connoisseurs. Factor in available time." },
  { q: "What are table service protocols for the lounge?", a: "Greet within 90 seconds. Present the humidor selection within 3 minutes. Pair a beverage recommendation. Return every 12 minutes without interrupting conversation." },
] as const;

function CoachHelpView() {
  const [activeTab,   setActiveTab]   = useState<"guides" | "faq">("guides");
  const [activeGuide, setActiveGuide] = useState<typeof GUIDE_TOPICS_NOVEE[number] | null>(null);
  const [chatMsg,     setChatMsg]     = useState("");
  const [chatReply,   setChatReply]   = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [openFaqIdx,  setOpenFaqIdx]  = useState<number | null>(null);

  async function askGuide(topic: typeof GUIDE_TOPICS_NOVEE[number], msg: string) {
    if (!msg.trim() || chatLoading) return;
    setChatLoading(true);
    setChatReply(null);
    try {
      const res = await fetch("/api/coach-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, topicContext: topic.label }),
      });
      if (!res.ok) throw new Error("unavailable");
      const data = await res.json() as { reply: string };
      setChatReply(data.reply);
    } catch {
      setChatReply("Guidance temporarily unavailable. Consult your lounge director.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#0A0600 0%,#060400 100%)", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em", lineHeight: 1.1, marginBottom: 4 }}>HOSPITALITY INTELLIGENCE</div>
        <div style={{ fontSize: 11, color: `${GOLD}55`, letterSpacing: "0.22em", textTransform: "uppercase" as const, marginBottom: 16, fontFamily: "'Inter',sans-serif" }}>AI-Powered Staff Coach</div>

        {/* 2-tab switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
          {(["guides", "faq"] as const).map(tab => (
            <motion.button key={tab} type="button" whileTap={{ scale: 0.96 }} onClick={() => { setActiveTab(tab); setActiveGuide(null); setChatReply(null); setChatMsg(""); setOpenFaqIdx(null); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${activeTab === tab ? GOLD + "66" : GOLD + "18"}`, background: activeTab === tab ? `rgba(212,175,55,0.14)` : "rgba(255,255,255,0.02)", color: activeTab === tab ? GOLD : `${GOLD}55`, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
              {tab === "guides" ? "GUIDES" : "FAQ"}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 32px" }}>
        <AnimatePresence mode="wait">

          {/* ── GUIDES TAB ── */}
          {activeTab === "guides" && !activeGuide && (
            <motion.div key="guides-grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {GUIDE_TOPICS_NOVEE.map((topic, i) => (
                  <motion.div key={topic.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    whileTap={{ scale: 0.97 }} onClick={() => { setActiveGuide(topic); setChatMsg(""); setChatReply(null); }}
                    style={{ minHeight: 160, borderRadius: 14, border: `1px solid ${GOLD}44`, cursor: "pointer", position: "relative", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.40)" }}>
                    <img src={topic.img} alt={topic.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(5,3,1,0.38) 0%, rgba(5,3,1,0.85) 100%)" }} />
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}88, transparent)` }} />
                    <div style={{ position: "relative", padding: "16px 14px", display: "flex", flexDirection: "column" as const, gap: 6, minHeight: 160 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#FFFDD0", letterSpacing: "0.03em", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.2, textShadow: "0 1px 8px rgba(0,0,0,0.70)" }}>{topic.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,253,208,0.65)", lineHeight: 1.5, fontFamily: "'Inter',sans-serif" }}>{topic.sub}</div>
                      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ height: 1, width: 16, background: `linear-gradient(90deg, ${GOLD}, transparent)`, borderRadius: 1 }} />
                        <span style={{ fontSize: 9, color: `${GOLD}88`, letterSpacing: "0.28em", fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>TAP TO EXPLORE</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── GUIDE DETAIL + CHAT ── */}
          {activeTab === "guides" && activeGuide && (
            <motion.div key={`guide-${activeGuide.id}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => { setActiveGuide(null); setChatReply(null); setChatMsg(""); }}
                style={{ marginBottom: 14, padding: "6px 12px", borderRadius: 7, border: `1px solid ${GOLD}33`, background: "rgba(212,175,55,0.06)", color: GOLD, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>
                BACK TO GUIDES
              </motion.button>

              <div style={{ padding: "14px 16px", borderRadius: 12, background: `rgba(212,175,55,0.07)`, border: `1px solid ${GOLD}44`, marginBottom: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "0.06em", fontFamily: "'Cormorant Garamond',serif", marginBottom: 4 }}>{activeGuide.label}</div>
                <div style={{ fontSize: 11, color: `${GOLD}66`, letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>{activeGuide.sub}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 12 }}>
                <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  placeholder={`Ask about ${activeGuide.label.toLowerCase()}...`}
                  rows={3}
                  style={{ padding: "11px 13px", borderRadius: 9, border: `1px solid ${GOLD}33`, background: "rgba(255,255,255,0.04)", color: CREAM, fontSize: 12, fontFamily: "'Inter',sans-serif", outline: "none", resize: "none" as const, lineHeight: 1.5 }} />
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => void askGuide(activeGuide, chatMsg)} disabled={chatLoading || !chatMsg.trim()}
                  style={{ padding: "12px", borderRadius: 9, border: `1px solid ${chatLoading ? GOLD + "33" : GOLD + "66"}`, background: chatLoading ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.18)", color: chatLoading ? `${GOLD}55` : GOLD, fontSize: 13, fontWeight: 800, cursor: chatLoading ? "default" : "pointer", letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif" }}>
                  {chatLoading ? "CONSULTING AI..." : "ASK AI COACH"}
                </motion.button>
              </div>

              <AnimatePresence>
                {chatReply && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ padding: "16px 18px", borderRadius: 12, background: `rgba(212,175,55,0.06)`, border: `1px solid ${GOLD}33` }}>
                    <div style={{ fontSize: 9, color: `${GOLD}66`, letterSpacing: "0.22em", marginBottom: 9, fontFamily: "'Inter',sans-serif" }}>SOVEREIGN AI COACH RESPONSE</div>
                    <div style={{ fontSize: 13, color: CREAM, lineHeight: 1.70, fontFamily: "'Inter',sans-serif" }}>{chatReply}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── FAQ TAB ── */}
          {activeTab === "faq" && (
            <motion.div key="faq" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ fontSize: 11, color: `${GOLD}55`, letterSpacing: "0.22em", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>FREQUENTLY ASKED QUESTIONS</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
                {FAQ_ITEMS_NOVEE.map((item, i) => (
                  <motion.div key={i} layout style={{ borderRadius: 10, border: `1px solid ${openFaqIdx === i ? GOLD + "55" : GOLD + "18"}`, background: openFaqIdx === i ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                    <motion.button type="button" whileTap={{ scale: 0.99 }} onClick={() => setOpenFaqIdx(openFaqIdx === i ? null : i)}
                      style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", color: openFaqIdx === i ? GOLD : CREAM, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" as const, fontFamily: "'Inter',sans-serif", letterSpacing: "0.02em" }}>
                      <span style={{ flex: 1, paddingRight: 12 }}>{item.q}</span>
                      <motion.span animate={{ rotate: openFaqIdx === i ? 45 : 0 }} transition={{ duration: 0.2 }}
                        style={{ fontSize: 18, color: GOLD, flexShrink: 0, lineHeight: 1 }}>+</motion.span>
                    </motion.button>
                    <AnimatePresence>
                      {openFaqIdx === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                          <div style={{ padding: "0 16px 14px", fontSize: 12, color: `${CREAM}BB`, lineHeight: 1.65, fontFamily: "'Inter',sans-serif", borderTop: `1px solid ${GOLD}18`, paddingTop: 10 }}>
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function useStaffMode() {
  const [isStaff, setIsStaff] = useState(() => !!localStorage.getItem("novee_staff_pin"));
  useEffect(() => {
    const check = () => setIsStaff(!!localStorage.getItem("novee_staff_pin"));
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);
  return isStaff;
}

function OsNavBar({ kiosk }: { kiosk: KioskRuntimeState }) {
  return (
    <div style={{
      width: "100%", flexShrink: 0, minHeight: 72,
      background: "rgba(3,2,0,0.97)",
      backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
      borderBottom: `1px solid rgba(212,175,55,0.20)`,
      display: "flex", flexDirection: "row", alignItems: "center",
      position: "relative", zIndex: 200,
      paddingLeft: 16, paddingRight: 16, gap: 8,
    }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD}88 20%, ${GOLD} 50%, ${GOLD}88 80%, transparent 100%)`, boxShadow: `0 0 12px ${GOLD}44` }} />

      {/* NOVEE OS logo */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 16, borderRight: "1px solid rgba(212,175,55,0.18)", marginRight: 8, flexShrink: 0 }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: `linear-gradient(135deg, ${GOLD}55 0%, rgba(0,0,0,0.70) 100%)`, border: `1.5px solid ${GOLD}99`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 18px ${GOLD}44` }}>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>N</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: GOLD, fontFamily: "'Cormorant Garamond',Georgia,serif", letterSpacing: "0.06em" }}>NOVEE OS</span>
          <span style={{ fontSize: 11, color: `${GOLD}66`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 800 }}>Kiosk Edition</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <KioskRuntimePanel kiosk={kiosk} />
      <span style={{ fontSize: 9, color: "rgba(212,175,55,0.30)", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>v2.4</span>
    </div>
  );
}

function KioskRuntimePanel({ kiosk }: { kiosk: KioskRuntimeState }) {
  const modeLabel = kiosk.displayMode === "browser" ? "Browser" : kiosk.displayMode;
  const idleLabel = `${Math.max(0, kiosk.idleSecondsRemaining)}s`;
  const providerLabel = formatProviderLabel(POS_TERMINAL_CONFIG.preferredProvider);
  return (
    <div
      aria-label="Kiosk runtime status"
      style={{
        flexShrink: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 8,
        maxWidth: "min(760px, 58vw)",
        minHeight: 36,
        padding: "6px 10px",
        borderRadius: 8,
        background: "rgba(6,4,2,0.58)",
        border: `1px solid rgba(212,175,55,0.22)`,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        pointerEvents: "none",
      }}
    >
      {[
        { label: kiosk.isOnline ? `${providerLabel} LINK` : "OFFLINE", color: kiosk.isOnline ? "#32B45A" : "#F07070" },
        { label: POS_TERMINAL_CONFIG.laneName.toUpperCase(), color: "rgba(253,251,247,0.62)" },
        { label: kiosk.isLandscape ? "LANDSCAPE" : "ROTATE TABLET", color: kiosk.isLandscape ? "#32B45A" : "#F07070" },
        { label: kiosk.isCoarsePointer ? "TOUCH" : "POINTER", color: kiosk.isCoarsePointer ? GOLD : "#F4A240" },
        { label: modeLabel.toUpperCase(), color: kiosk.displayMode === "browser" ? "#F4A240" : GOLD },
        { label: kiosk.wakeLockActive ? "AWAKE" : "WAKE READY", color: kiosk.wakeLockActive ? "#5BBFFF" : `${GOLD}99` },
        { label: `RESET ${idleLabel}`, color: "rgba(253,251,247,0.62)" },
      ].map(item => (
        <span
          key={item.label}
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.12em",
            color: item.color,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Left Vertical OS Rail
───────────────────────────────────────────── */
const RAIL_ITEMS = [
  { id: "crafthub",          label: "CraftHub",   abbr: "HUB", targetPhase: "crafthub" as Phase,          pinLevel: undefined,               staffOnly: false, Icon: Home,           isActive: (p: string) => p === "crafthub" },
  { id: "smokecraft",        label: "SmokeCraft",  abbr: "SC",  targetPhase: "s1_demo" as Phase,           pinLevel: undefined,               staffOnly: false, Icon: Flame,          isActive: (p: string) => SESSION_PHASES.has(p) },
  { id: "pairing",           label: "Pairing",     abbr: "PR",  targetPhase: "pairing_view" as Phase,     pinLevel: undefined,               staffOnly: false, Icon: Search,         isActive: (p: string) => p === "pairing_view" },
  { id: "eat",               label: "E.A.T Intel", abbr: "EAT", targetPhase: "eat_dashboard" as Phase,    pinLevel: "management" as PinRole, staffOnly: true,  Icon: Grid3X3,        isActive: (p: string) => p === "eat_dashboard" },
  { id: "eat_pos",           label: "EAT POS",     abbr: "POS", targetPhase: "eat_pos_module" as Phase,   pinLevel: undefined,               staffOnly: true,  Icon: CreditCard,     isActive: (p: string) => p === "eat_pos_module" },
  { id: "executive_command", label: "CMD Center",  abbr: "EXC", targetPhase: "executive_command" as Phase, pinLevel: "management" as PinRole, staffOnly: true,  Icon: TerminalSquare, isActive: (p: string) => p === "executive_command" },
  { id: "lounge",            label: "Lounge",      abbr: "LG",  targetPhase: "lounge_view" as Phase,      pinLevel: undefined,               staffOnly: true,  Icon: Armchair,       isActive: (p: string) => p === "lounge_view" },
  { id: "coach_help",        label: "Coach Help",  abbr: "CH",  targetPhase: "coach_help" as Phase,       pinLevel: undefined,               staffOnly: true,  Icon: BadgeHelp,      isActive: (p: string) => p === "coach_help" },
];

function LeftRail() {
  const { profile }  = useGuest();
  const { navigate } = useNoveeNav();
  const { phase }    = profile;
  const isStaff      = useStaffMode();
  const visibleRail  = RAIL_ITEMS.filter(item => !item.staffOnly || isStaff);

  return (
    <div style={{
      width: 76, flexShrink: 0,
      background: "rgba(5,3,1,0.95)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderRight: `1px solid rgba(212,175,55,0.16)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 22, paddingBottom: 22, gap: 10,
      position: "relative", zIndex: 100,
    }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 1, background: `linear-gradient(180deg, transparent 0%, ${GOLD}55 20%, ${GOLD}99 50%, ${GOLD}55 80%, transparent 100%)` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, rgba(255,255,255,0.012) 1px, transparent 2px, transparent 12px)`, pointerEvents: "none" }} />

      {visibleRail.map((item) => {
        const active  = item.isActive(phase);
        return (
          <motion.button key={item.id} type="button"
            onPointerDown={() => navigate(item.targetPhase, item.pinLevel)}
            whileTap={{ scale: 0.90 }}
            animate={{ background: active ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.02)", borderColor: active ? `${GOLD}77` : "rgba(255,255,255,0.08)", boxShadow: active ? `0 0 16px ${GOLD}33, inset 0 1px 0 ${GOLD}22` : "none" }}
            transition={{ duration: 0.20 }}
            style={{ width: 58, minHeight: 66, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 4px", position: "relative", touchAction: "manipulation" }}>
            {active && (
              <div style={{ position: "absolute", left: -1, top: "25%", bottom: "25%", width: 2, background: GOLD, borderRadius: "0 2px 2px 0", boxShadow: `0 0 8px ${GOLD}` }} />
            )}
            <item.Icon size={19} strokeWidth={1.8} color={active ? GOLD : "rgba(212,175,55,0.48)"} style={{ filter: active ? `drop-shadow(0 0 6px ${GOLD}88)` : "none" }} />
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", color: active ? GOLD : "rgba(212,175,55,0.45)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2, maxWidth: 52 }}>{item.abbr}</span>
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

/* ─────────────────────────────────────────────
   Top system bar — RESET BLEND · COACH HELP · STAFF AUTH · PROFILE RESET
───────────────────────────────────────────── */
function SystemBar() {
  const { profile }              = useGuest();
  const { navigate, resetGuest, resetBlend } = useNoveeNav();
  const { phase }                = profile;
  const inSession = SESSION_PHASES.has(phase);
  const [staffAuthPulsing, setStaffAuthPulsing] = useState(true);
  const [staffAuthActive,  setStaffAuthActive]  = useState(false);

  function onStaffAuth() {
    setStaffAuthActive(true);
    setStaffAuthPulsing(false);
    navigate("pos_terminal");
  }

  return (
    <div style={{ position: "absolute", top: 3, left: 0, right: 0, minHeight: 58, background: "rgba(1,1,1,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", zIndex: 50 }}>

      {/* Left: location + biometric */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 6px #32B45A" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.28em", color: "rgba(212,175,55,0.45)", fontWeight: 800, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>GA</span>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid rgba(212,175,55,0.30)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1px solid ${GOLD}66` }} />
        </div>
      </div>

      {/* Center: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button type="button" onPointerDown={() => { if (inSession) resetBlend(); else navigate("crafthub"); }} whileTap={{ scale: 0.95 }}
          style={{ minHeight: 48, border: `1px solid rgba(212,175,55,${inSession ? "0.55" : "0.25"})`, borderRadius: 8, padding: "0 18px", background: `rgba(212,175,55,${inSession ? "0.14" : "0.05"})`, cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: inSession ? GOLD : `${GOLD}66`, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", boxShadow: inSession ? `0 0 10px rgba(212,175,55,0.22)` : "none", transition: "all 0.2s", touchAction: "manipulation" }}>
          RESET BLEND
        </motion.button>

        <motion.button type="button" onPointerDown={() => navigate("eat_dashboard")} whileTap={{ scale: 0.95 }}
          style={{ minHeight: 48, border: `1px solid ${GOLD}66`, borderRadius: 8, padding: "0 18px", background: `rgba(212,175,55,0.14)`, cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", boxShadow: `0 0 10px ${GOLD}22`, touchAction: "manipulation" }}>
          COACH HELP
        </motion.button>

        {/* STAFF AUTH — pulsating amber glow */}
        <style>{`
          @keyframes staffAuthPulse { 0%   { box-shadow: 0 0 8px rgba(212,175,55,0.55), 0 0 2px rgba(212,175,55,0.80); border-color: rgba(212,175,55,0.55); } 50%  { box-shadow: 0 0 22px rgba(212,175,55,0.90), 0 0 8px rgba(212,175,55,1.0), inset 0 0 6px rgba(212,175,55,0.18); border-color: rgba(212,175,55,1.0); } 100% { box-shadow: 0 0 8px rgba(212,175,55,0.55), 0 0 2px rgba(212,175,55,0.80); border-color: rgba(212,175,55,0.55); } }
          @keyframes staffAuthDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.72); } }
        `}</style>
        <motion.button type="button" onPointerDown={onStaffAuth} whileTap={{ scale: 0.93 }}
          style={{ minHeight: 48, border: `1px solid ${GOLD}`, borderRadius: 8, padding: "0 18px", background: staffAuthActive ? `rgba(212,175,55,0.32)` : `rgba(212,175,55,0.10)`, cursor: "pointer", fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: 8, animation: staffAuthPulsing ? "staffAuthPulse 2.0s ease-in-out infinite" : "none", transition: "background 0.25s", touchAction: "manipulation" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, animation: staffAuthPulsing ? "staffAuthDot 2.0s ease-in-out infinite" : "none", boxShadow: `0 0 6px ${GOLD}`, flexShrink: 0 }} />
          POS TERMINAL
        </motion.button>

        {/* PROFILE RESET */}
        <motion.button type="button" onPointerDown={() => { resetGuest(); navigate("crafthub"); }} whileTap={{ scale: 0.93 }}
          style={{ minHeight: 48, border: "1px solid rgba(240,112,112,0.35)", borderRadius: 8, padding: "0 18px", background: "rgba(240,112,112,0.08)", cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "#F07070", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", touchAction: "manipulation" }}>
          PROFILE RESET
        </motion.button>
      </div>

      {/* Right: kiosk status */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 100, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,255,255,0.26)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", fontWeight: 800 }}>TABLE KIOSK · ACTIVE</span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
        <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.12)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>KIOSK EDITION · NOVEE OS</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   E.A.T Intelligence Telemetry Bar
───────────────────────────────────────────── */
const BASE_TELEMETRY = [
  { label: "Lounge Temp",     value: "68°F",         color: "#5BBFFF" },
  { label: "Humidity",        value: "72%",           color: "#32B45A" },
  { label: "Humidor Count",   value: "145 Puros",     color: GOLD      },
  { label: "Lounge Mode",     value: "Active",        color: "#32B45A" },
  { label: "POS Transaction", value: "Authenticated", color: GOLD      },
];

function EATTelemetryBar() {
  const { navigate } = useNoveeNav();
  const [tick, setTick]       = useState(0);
  const [temp, setTemp]       = useState(68);
  const [humidity,setHumidity]= useState(72);
  const [count, setCount]     = useState(145);

  void tick; void BASE_TELEMETRY;

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
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
    { label: `${formatProviderLabel(POS_TERMINAL_CONFIG.preferredProvider)} POS`, value: "Authenticated",   color: GOLD },
  ];

  return (
    <motion.div onPointerDown={() => navigate("eat_dashboard")} whileTap={{ scale: 0.995 }}
      style={{ width: "100%", flexShrink: 0, minHeight: 56, background: "rgba(3,2,0,0.98)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `1px solid rgba(212,175,55,0.30)`, borderBottom: `1px solid rgba(212,175,55,0.12)`, display: "flex", flexDirection: "row", alignItems: "center", position: "relative", zIndex: 180, cursor: "pointer", overflow: "hidden", touchAction: "manipulation" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 200, background: `radial-gradient(ellipse at 0% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />

      {/* E.A.T label */}
      <div style={{ flexShrink: 0, padding: "0 16px", borderRight: `1px solid rgba(212,175,55,0.22)`, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, height: "100%", background: "rgba(212,175,55,0.05)" }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: `rgba(212,175,55,0.20)`, border: `1px solid ${GOLD}66`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 8px ${GOLD}33` }}>
          <Grid3X3 size={12} color={GOLD} strokeWidth={1.9} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em", color: GOLD, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>E.A.T INTELLIGENCE</span>
          <span style={{ fontSize: 9, letterSpacing: "0.14em", color: `${GOLD}66`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>Environment • Asset • Transaction</span>
        </div>
      </div>

      {/* Telemetry items */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", alignItems: "center", padding: "0 20px", gap: 0, overflow: "hidden" }}>
        {telemetry.map((item, i) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 0, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", padding: "0 18px", borderLeft: i === 0 ? "none" : `1px solid rgba(212,175,55,0.12)` }}>
              <span style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(212,175,55,0.48)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: 800 }}>{item.label}</span>
              <motion.span key={item.value} initial={{ opacity: 0.6, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                style={{ fontSize: 16, fontWeight: 900, color: item.color, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em", whiteSpace: "nowrap", textShadow: `0 0 12px ${item.color}55` }}>
                {item.value}
              </motion.span>
            </div>
          </div>
        ))}
      </div>

      <div
        onPointerDown={(e) => { e.stopPropagation(); navigate("executive_command", "management"); }}
        style={{ flexShrink: 0, padding: "0 22px", minHeight: 56, display: "flex", alignItems: "center", gap: 8, borderLeft: `1px solid rgba(212,175,55,0.22)`, cursor: "pointer", background: "rgba(212,175,55,0.03)", transition: "background 0.18s", touchAction: "manipulation" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.18em", color: `${GOLD}88`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: 900 }}>OPEN COMMAND CENTER</span>
        <span style={{ fontSize: 14, color: GOLD }}>›</span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Bottom bar — ticker tape + Day One 360
───────────────────────────────────────────── */
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
        .novee-ticker-track { display: inline-flex; flex-direction: row; align-items: center; white-space: nowrap; animation: novee-ticker 260s linear infinite; will-change: transform; }
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

/* ─────────────────────────────────────────────
   Phase routing
───────────────────────────────────────────── */
function phaseKey(phase: string): string {
  if (phase === "crafthub")          return "crafthub";
  if (phase === "eat_dashboard")     return "eat_dashboard";
  if (phase === "executive_command") return "executive_command";
  if (phase === "pairing_view")      return "pairing_view";
  if (phase === "lounge_view")       return "lounge_view";
  if (phase === "profile_view")      return "profile_view";
  if (phase === "settings_view")     return "settings_view";
  if (phase === "coach_help")        return "coach_help";
  if (phase === "control-chamber")   return "control-chamber";
  if (phase === "dev_console")       return "dev_console";
  if (phase === "upgrade_plan")      return "upgrade_plan";
  if (phase === "upgrade_required")  return "upgrade_required";
  if (S1_PHASES.has(phase))          return "s1";
  if (S2_PHASES.has(phase))          return "s2";
  if (S3_PHASES.has(phase))          return "s3";
  if (S4_PHASES.has(phase))          return "s4";
  return "crafthub";
}

function POSCommandHub() {
  const CREW = "#FDFBF7";
  const [humidor] = useState(145);
  const [kitchen, setKitchen] = useState(12);
  const [barPours, setBarPours] = useState(37);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminLog, setAdminLog] = useState("SYSTEM_NOMINAL — All subsystems online.");
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setKitchen(k => Math.min(20, Math.max(6, k + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0))));
      setBarPours(b => Math.max(30, b + (Math.random() > 0.82 ? 1 : 0)));
    }, 4800);
    return () => clearInterval(id);
  }, []);

  async function sendOverride(action: string) {
    setAdminBusy(true);
    setAdminLog(`DISPATCHING: ${action}...`);
    try {
      const r = await fetch("/api/v1/admin/system-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_directive: action, auth_token: "SOVEREIGN_360_AUTH" }),
      });
      const d = await r.json();
      setAdminLog(d.success ? `DIRECTIVE_EXECUTED: ${action} | Sync broadcast complete.` : `ERR: ${(d as {error?: string}).error ?? "UNKNOWN"}`);
    } catch {
      setAdminLog("ERR_GATEWAY_TIMEOUT: Local mesh link failure.");
    } finally {
      setAdminBusy(false);
    }
  }

  const STATUS_COLORS = { occupied: "#32B45A", available: `${GOLD}50`, reserved: "#5BBFFF" } as const;
  const TABLES: { n: number; status: "occupied" | "available" | "reserved"; guests: number; items: number }[] = [
    { n: 1, status: "occupied",  guests: 4, items: 3 },
    { n: 2, status: "occupied",  guests: 2, items: 1 },
    { n: 3, status: "available", guests: 0, items: 0 },
    { n: 4, status: "occupied",  guests: 6, items: 5 },
    { n: 5, status: "reserved",  guests: 0, items: 0 },
    { n: 6, status: "occupied",  guests: 3, items: 2 },
    { n: 7, status: "available", guests: 0, items: 0 },
    { n: 8, status: "occupied",  guests: 5, items: 4 },
  ];
  const metrics = [
    { label: "Kitchen Orders",  value: String(kitchen),  unit: "ACTIVE",          Icon: Utensils, color: "#F4A240" },
    { label: "Bar Pour Level",  value: String(barPours), unit: "POURS TONIGHT",   Icon: Wine,     color: "#5BBFFF" },
    { label: "Humidor Stock",   value: String(humidor),  unit: "PUROS REMAINING", Icon: Package,  color: GOLD      },
  ];
  const overrideActions = [
    { key: "FORCE_HIGH_READABILITY",      label: "FORCE HIGH-READABILITY",      sub: "Upscales typography sizing patterns to 24pt base contrast", danger: false },
    { key: "RE-CALIBRATE_ENVIRONMENT",    label: "RE-CALIBRATE ENVIRONMENT",    sub: "Resets room sensory matrices to absolute zero profiles",   danger: false },
    { key: "RECONCILE_COMMERCE_ENTRIES",  label: "RECONCILE COMMERCE ENTRIES",  sub: "Forces full audit verification across open billing nodes",  danger: false },
    { key: "RESET_ACTIVE_VENUE",          label: "HARD REBOOT SYSTEM RE-SYNC",  sub: "Purges local active system cache layers and refreshes viewport", danger: true },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: "#060402", display: "flex", flexDirection: "column", fontFamily: "'Inter',sans-serif", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 900, height: 400, background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.09) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ flexShrink: 0, padding: "14px 20px", borderBottom: "1px solid rgba(212,175,55,0.18)", display: "flex", alignItems: "center", gap: 14, background: "rgba(4,2,0,0.94)", backdropFilter: "blur(20px)", flexWrap: "wrap" }}>
        <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: "rgba(212,175,55,0.16)", border: "1.5px solid rgba(212,175,55,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Grid3X3 size={18} color={GOLD} strokeWidth={1.8} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "clamp(18px, 4vw, 30px)", fontWeight: 900, color: CREW, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em", lineHeight: 1 }}>E.A.T. COMMAND HUB</div>
          <div style={{ fontSize: 11, color: "rgba(253,251,247,0.35)", letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 2 }}>Management Clearance · Live Floor</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(50,180,90,0.10)", border: "1px solid rgba(50,180,90,0.30)", borderRadius: 8, flexShrink: 0 }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#32B45A", letterSpacing: "0.10em" }}>FLOOR ACTIVE</span>
        </div>
      </div>

      {/* Metrics strip — wraps on narrow screens */}
      <div style={{ flexShrink: 0, display: "flex", flexWrap: "wrap", borderBottom: "1px solid rgba(212,175,55,0.16)" }}>
        {metrics.map((m, i) => (
          <div key={m.label} style={{ flex: "1 1 120px", padding: "14px 20px", borderLeft: i > 0 ? "1px solid rgba(212,175,55,0.14)" : "none", position: "relative", overflow: "hidden" }}>
            {i === 2 && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 60%)", pointerEvents: "none" }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, letterSpacing: "0.28em", color: "rgba(253,251,247,0.30)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
              <m.Icon size={12} color={m.color} strokeWidth={1.8} />
              <span>{m.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <motion.span key={m.value} initial={{ opacity: 0.7, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: m.color, fontFamily: "'Inter',sans-serif", lineHeight: 1, textShadow: `0 0 24px ${m.color}44` }}>{m.value}</motion.span>
              <span style={{ fontSize: 9, letterSpacing: "0.18em", color: `${m.color}66`, fontWeight: 800, textTransform: "uppercase" }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floor label row */}
      <div style={{ flexShrink: 0, padding: "10px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 2, height: 14, background: GOLD, borderRadius: 2 }} />
        <span style={{ fontSize: 10, letterSpacing: "0.30em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800 }}>ACTIVE FLOOR LAYOUT</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(212,175,55,0.22), transparent)" }} />
        <span style={{ fontSize: 10, letterSpacing: "0.14em", color: "rgba(253,251,247,0.22)", textTransform: "uppercase" }}>{TABLES.filter(t => t.status === "occupied").length}/{TABLES.length} OCCUPIED</span>
      </div>

      {/* Table grid — responsive auto-fill */}
      <div style={{ flex: 1, padding: "0 14px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gridAutoRows: "1fr", gap: 12, overflowY: "auto" }}>
        {TABLES.map(table => (
          <motion.div key={table.n} whileTap={{ scale: 0.96 }}
            style={{ background: table.status === "occupied" ? "rgba(50,180,90,0.07)" : table.status === "reserved" ? "rgba(91,191,255,0.05)" : "rgba(253,251,247,0.03)", border: `1.5px solid ${table.status === "occupied" ? "rgba(50,180,90,0.28)" : table.status === "reserved" ? "rgba(91,191,255,0.22)" : "rgba(212,175,55,0.14)"}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, backdropFilter: "blur(8px)", position: "relative", minHeight: 100 }}>
            {table.status === "occupied" && (
              <motion.div animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                style={{ position: "absolute", top: 10, right: 10, width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
            )}
            <div style={{ fontSize: 10, letterSpacing: "0.24em", color: "rgba(253,251,247,0.28)", textTransform: "uppercase", fontWeight: 700 }}>TABLE</div>
            <div style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: CREW, fontFamily: "'Cormorant Garamond',serif", lineHeight: 1 }}>{String(table.n).padStart(2, "0")}</div>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: STATUS_COLORS[table.status], fontWeight: 700 }}>
              {table.status === "occupied" ? `${table.guests}G · ${table.items}I` : table.status === "reserved" ? "RESERVED" : "AVAILABLE"}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Invisible 80×80 bottom-right admin trigger */}
      <div
        style={{ position: "absolute", bottom: 0, right: 0, width: 80, height: 80, zIndex: 9999, cursor: "pointer" }}
        onClick={() => setShowAdmin(true)}
        onTouchStart={() => setShowAdmin(true)}
      />

      {/* Admin Command Center overlay */}
      {showAdmin && (
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "tween", duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
          style={{ position: "fixed", inset: 0, background: "#F9F8F6", color: "#010101", zIndex: 10000, display: "flex", flexDirection: "column", fontFamily: "'Inter',sans-serif", overflowY: "auto" }}
        >
          {/* ACC Header */}
          <div style={{ flexShrink: 0, padding: "28px 32px 20px", borderBottom: "1px solid rgba(1,1,1,0.10)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#D4AF37", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Sovereign Management Center</div>
              <div style={{ fontSize: "clamp(20px, 4vw, 30px)", fontWeight: 800, color: "#010101", letterSpacing: "-0.01em" }}>Admin System Command Center</div>
            </div>
            <button
              onClick={() => setShowAdmin(false)}
              style={{ padding: "12px 22px", background: "#010101", color: "#F4F3EF", fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", border: "none", cursor: "pointer", borderRadius: 2, flexShrink: 0 }}
            >
              CLOSE COMMAND DRAWER
            </button>
          </div>

          {/* ACC Body */}
          <div style={{ flex: 1, padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, alignContent: "start" }}>

            {/* Column 1 — Hardware Telemetry */}
            <div style={{ background: "#F4F3EF", border: "1px solid rgba(44,44,48,0.10)", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.12em" }}>Kiosk Hardware Telemetry</div>
              <div style={{ background: "linear-gradient(135deg,#2C1A08,#1A0C02)", borderRadius: 4, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(212,175,55,0.6)", letterSpacing: "0.2em" }}>VIP LOUNGE · ZONE 4</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "monospace", fontSize: 11, color: "#2C2C30" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(1,1,1,0.05)", paddingBottom: 8 }}>
                  <span>MESH LAN SUITE LINK:</span>
                  <span style={{ color: "#38A169", fontWeight: 700 }}>PORT 8443 ACTIVE</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(1,1,1,0.05)", paddingBottom: 8 }}>
                  <span>TLS SECURITY PASS:</span>
                  <span style={{ color: "#38A169", fontWeight: 700 }}>TLS 1.3 ENFORCED</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>HARDWARE ID LINK:</span>
                  <span style={{ color: "#010101", fontWeight: 700 }}>KLO-TERMINAL-04B</span>
                </div>
              </div>
            </div>

            {/* Column 2 — Tactical Overrides */}
            <div style={{ background: "#F4F3EF", border: "1px solid rgba(44,44,48,0.10)", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Tactical Override Panel</div>
                <div style={{ fontSize: 11, color: "#8E8E93" }}>Direct pipeline control to override terminal instances instantly.</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {overrideActions.map(a => (
                  <button key={a.key} disabled={adminBusy}
                    onClick={() => sendOverride(a.key)}
                    style={{
                      background: a.danger ? "transparent" : "#010101",
                      color: a.danger ? "#E53E3E" : "#F4F3EF",
                      border: a.danger ? "1px solid #E53E3E" : "none",
                      fontFamily: "monospace", fontSize: 11, fontWeight: 700, padding: "14px 16px",
                      borderRadius: 2, cursor: adminBusy ? "not-allowed" : "pointer",
                      textAlign: "left", opacity: adminBusy ? 0.6 : 1,
                    }}
                  >
                    [{a.label}]
                    <span style={{ display: "block", fontSize: 10, fontWeight: 400, marginTop: 4, color: a.danger ? "rgba(229,62,62,0.7)" : "#8E8E93", textTransform: "lowercase" }}>{a.sub}</span>
                  </button>
                ))}
              </div>
              {/* Console log */}
              <div style={{ background: "#010101", color: "#38A169", padding: "12px 14px", borderRadius: 2, fontFamily: "monospace", fontSize: 11, border: "1px solid #2C2C30", minHeight: 72, overflowY: "auto" }}>
                <span style={{ color: "#8E8E93", fontWeight: 700 }}>[SYSTEM LOG FEED CORE ACTIVE]</span>
                <div style={{ marginTop: 6, lineHeight: 1.5 }}>{adminLog}</div>
              </div>
            </div>
          </div>

          {/* ACC Footer */}
          <div style={{ flexShrink: 0, padding: "14px 32px", borderTop: "1px solid rgba(1,1,1,0.10)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontFamily: "monospace", fontSize: 11, color: "#8E8E93" }}>
            <span>GATEWAY LINK STATUS: <span style={{ color: "#38A169", fontWeight: 700 }}>CONNECTED VIA VLAN 100 SECURE CORE</span></span>
            <span>SECURE KERNEL VERSION: <span style={{ color: "#010101", fontWeight: 700 }}>v6.6.0-PROD</span></span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CraftHubWrapper() {
  const { setPhase } = useGuest();
  return (
    <CraftGrid
      embedded
      onSmokecraft={() => setPhase("s1_demo")}
      onEAT={() => setPhase("eat_dashboard")}
    />
  );
}

function PhaseScreen({ eatFlags, onFlagsChange }: { eatFlags: EATModuleFlags; onFlagsChange: (f: EATModuleFlags) => void }) {
  const { profile } = useGuest();
  const { phase }   = profile;
  if (phase === "crafthub")          return <CraftHubWrapper />;
  if (phase === "eat_dashboard")     return <EATErrorBoundary><EATDashboard eatFlags={eatFlags} /></EATErrorBoundary>;
  if (phase === "executive_command") return <POSCommandHub />;
  if (phase === "pairing_view")      return <PairingView />;
  if (phase === "lounge_view")       return <LoungeView />;
  if (phase === "profile_view")      return <ProfileView />;
  if (phase === "settings_view")     return <SettingsView />;
  if (phase === "coach_help")        return <CoachHelpView />;
  if (phase === "control-chamber")   return <ControlChamber />;
  if (phase === "dev_console")       return <DevConsole />;
  if (phase === "upgrade_plan")      return <UpgradePage />;
  if (phase === "upgrade_required")  return <UpgradeRequired />;
  if (phase === "master_blender")    return <MasterBlender />;
  if (phase === "pos_terminal")      return <StaffTerminal />;
  if ((phase as string) === "eat_pos_module") return <EatPosModule />;
  if ((phase as string) === "gestural_engine") return <GesturalEngine />;
  if (S1_PHASES.has(phase))          return <S1_InitGate />;
  if (S2_PHASES.has(phase))          return <S2_TerroirMatrix />;
  if (S3_PHASES.has(phase))          return <S3_FormulationLab />;
  if (S4_PHASES.has(phase))          return <S4_DesignStudio />;
  return <CraftPortalHome />;
}

function PhaseRouter({ eatFlags, onFlagsChange }: { eatFlags: EATModuleFlags; onFlagsChange: (f: EATModuleFlags) => void }) {
  const { profile } = useGuest();
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

/* ─────────────────────────────────────────────
   Cinematic background
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Root OS Shell — PIN gate state lives here
───────────────────────────────────────────── */
function handlePointerDown() { playClick(); hapticClick(); }

function OsShell() {
  const { setPhase, resetProfile, profile } = useGuest();
  const isEAT = profile.phase === "eat_dashboard";
  const isStaff = useStaffMode();
  const { env: syncedEnv, updateEnv } = useVisualSync();
  const [eatFlags, setEatFlags]    = useState<EATModuleFlags>(DEFAULT_FLAGS);

  /* PIN gate state */
  interface PinTarget { phase: Phase; level: PinRole }
  const [pinGate, setPinGate] = useState<PinTarget | null>(null);
  const [gestures, setGestures] = useState({ topLeft: 0, bottomRight: 0 });

  useEffect(() => {
    const t = setTimeout(() => {
      import("@/pages/EATDashboard").catch(() => {});
      import("@/pages/S1_InitGate").catch(() => {});
      import("@/pages/S2_TerroirMatrix").catch(() => {});
      import("@/pages/S3_FormulationLab").catch(() => {});
      import("@/pages/S4_DesignStudio").catch(() => {});
      import("@/pages/ExecutiveCommandCenter").catch(() => {});
      import("@/components/StaffPinGate").catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      const launchPhase = sessionStorage.getItem("novee_launch_phase") as Phase | null;
      if (launchPhase) {
        sessionStorage.removeItem("novee_launch_phase");
        setPhase(launchPhase);
      }
    } catch { /* storage unavailable */ }
  }, [setPhase]);

  useEffect(() => {
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

  function resetBlend() {
    try {
      [
        "novee_session_restore", "novee_craft_quiz", "novee_craft_build",
        "craft_build_data", "novee_blend_session", "novee_golden_box_seen",
      ].forEach(k => { try { sessionStorage.removeItem(k); } catch { /* */ } });
    } catch { /* */ }
    setPhase("s1_demo");
  }

  const kiosk = useKioskRuntime({
    idleMs: isStaff ? POS_TERMINAL_CONFIG.staffIdleResetMs : POS_TERMINAL_CONFIG.idleResetMs,
    onIdleReset: () => {
      if (!isStaff) resetGuest();
      setPhase("crafthub");
    },
  });

  const navCtx: NoveeNavCtx = {
    navigate,
    eatFlags,
    onFlagsChange: setEatFlags,
    resetGuest,
    resetBlend,
  };

  return (
    <NoveeNavContext.Provider value={navCtx}>
      <div onPointerDown={handlePointerDown}
        className="kiosk-shell"
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

        {/* Top OS navigation bar */}
        <OsNavBar kiosk={kiosk} />

        {/* Middle: Left Rail + Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", position: "relative" }}>
          <LeftRail />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <FullBleedBackground />
            {!isEAT && <SystemBar />}
            <div style={{ position: "absolute", top: isEAT ? 0 : 64, bottom: 0, left: 0, right: 0, zIndex: 50, overflow: "hidden" }}>
              <PhaseRouter eatFlags={eatFlags} onFlagsChange={setEatFlags} />
            </div>
          </div>
        </div>

        {/* E.A.T Intelligence Telemetry Bar */}
        {!isEAT && <EATTelemetryBar />}

        {/* Bottom ticker + Day One 360 */}
        {!isEAT && <BottomBar />}

        {/* PIN Gate Overlay */}
        <AnimatePresence>
          {pinGate && (
            <StaffPinGate
              key={`pin-${pinGate.phase}`}
              level={pinGate.level}
              onSuccess={(role) => onPinSuccess(role, pinGate.phase)}
              onCancel={() => setPinGate(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </NoveeNavContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   Root app
───────────────────────────────────────────── */
export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [bootDone, setBootDone] = useState(false);

  // ── Device heartbeat — keeps kiosk registered as ACTIVE in venue registry ──
  useEffect(() => {
    const stop = startHeartbeat({
      deviceId:  getOrCreateDeviceId(),
      platform:  "kiosk",
      version:   "2.0.0",
    });
    return stop;
  }, []);

  function handleBootComplete() {
    setBootDone(true);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LicenseProvider>
      <ThemeConfigProvider>
      <GuestProfileProvider>
        <AnimatePresence mode="wait">
          {!splashDone ? (
            <SplashController key="splash" onFinish={() => setSplashDone(true)} />
          ) : !bootDone ? (
            <CraftEntryPoint key="boot" onComplete={handleBootComplete} />
          ) : (
            <motion.div key="shell"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "fixed", inset: 0 }}>
              <OsShell />
              <AmbientEmberField />
              <AshParticles />
              <RevenueOptimizationOverlay />
              <NoveeXPBridge />
              <DevModeOverlay />
            </motion.div>
          )}
        </AnimatePresence>
      </GuestProfileProvider>
      </ThemeConfigProvider>
      </LicenseProvider>
    </QueryClientProvider>
  );
}
