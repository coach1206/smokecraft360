import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuestProfileProvider, useGuest } from "@/context/GuestProfileContext";
import CraftPortalHome from "@/pages/CraftPortalHome";
import { ReentryGate } from "@/pages/ReentryGate";
import { S1_InitGate } from "@/pages/S1_InitGate";
import { S2_TerroirMatrix } from "@/pages/S2_TerroirMatrix";
import { S3_FormulationLab } from "@/pages/S3_FormulationLab";
import { S4_DesignStudio } from "@/pages/S4_DesignStudio";
import { playClick } from "@/hooks/useAudio";
import { hapticClick } from "@/hooks/useHaptic";

const queryClient = new QueryClient();

const S1_PHASES = new Set(["s1_demo","s1_rules","s1_leaderboard","s1_mentor","s1_seed","s1_quiz","s1_posgate"]);
const S2_PHASES = new Set(["s2_terroir","s2_voucher"]);
const S3_PHASES = new Set(["s3_spiritquiz","s3_sensorytrap","s3_leafsliders"]);
const S4_PHASES = new Set(["s4_vitola","s4_designstudio","s4_results"]);

function PhaseRouter() {
  const { profile } = useGuest();
  const { phase }   = profile;
  if (phase === "crafthub")   return <CraftPortalHome />;
  if (phase === "reentry")    return <ReentryGate />;
  if (S1_PHASES.has(phase))   return <S1_InitGate />;
  if (S2_PHASES.has(phase))   return <S2_TerroirMatrix />;
  if (S3_PHASES.has(phase))   return <S3_FormulationLab />;
  if (S4_PHASES.has(phase))   return <S4_DesignStudio />;
  return <CraftPortalHome />;
}

function handlePointerDown() { playClick(); hapticClick(); }

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GuestProfileProvider>
        <div
          onPointerDown={handlePointerDown}
          style={{
            position:           "fixed",
            inset:              0,
            cursor:             "none",
            userSelect:         "none",
            WebkitUserSelect:   "none",
            overscrollBehavior: "none",
            touchAction:        "manipulation",
            overflow:           "hidden",
            background:         "#08060200",
          }}
        >
          {/* ── Full-bleed cinematic canvas ── */}
          <FullBleedBackground />
          {/* ── App content ── */}
          <div style={{ position: "relative", zIndex: 10, width: "100%", height: "100%" }}>
            <PhaseRouter />
          </div>
        </div>
      </GuestProfileProvider>
    </QueryClientProvider>
  );
}

/* Photorealistic lounge atmosphere — pure CSS/SVG */
function FullBleedBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>

      {/* Base obsidian — deep warm black */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(175deg, #100C06 0%, #080502 50%, #0C0804 100%)",
      }} />

      {/* Brushed titanium grain — horizontal micro-lines */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `repeating-linear-gradient(
          90deg,
          transparent 0px,
          rgba(255,255,255,0.018) 1px,
          transparent 2px,
          transparent 10px
        )`,
      }} />

      {/* Ambient ember — warm top-center radial */}
      <div style={{
        position:  "absolute",
        top:       "-8%",
        left:      "50%",
        transform: "translateX(-50%)",
        width:     "110%",
        height:    "65%",
        background: "radial-gradient(ellipse at 50% 10%, rgba(212,140,30,0.13) 0%, rgba(160,80,10,0.06) 35%, transparent 65%)",
      }} />

      {/* Left-wall depth vignette */}
      <div style={{
        position:   "absolute", inset: 0,
        background: "radial-gradient(ellipse 55% 100% at 0% 50%, rgba(5,3,1,0.80) 0%, transparent 55%)",
      }} />
      {/* Right-wall depth vignette */}
      <div style={{
        position:   "absolute", inset: 0,
        background: "radial-gradient(ellipse 55% 100% at 100% 50%, rgba(5,3,1,0.75) 0%, transparent 55%)",
      }} />
      {/* Floor vignette */}
      <div style={{
        position:   "absolute", inset: 0,
        background: "radial-gradient(ellipse 100% 55% at 50% 100%, rgba(4,2,0,0.85) 0%, transparent 55%)",
      }} />

      {/* Gold top hardware bezel rim */}
      <div style={{
        position:   "absolute",
        top:        0, left: 0, right: 0,
        height:     3,
        background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.60) 20%, rgba(212,175,55,1) 50%, rgba(212,175,55,0.60) 80%, transparent 100%)",
        boxShadow:  "0 0 40px 6px rgba(212,175,55,0.28), 0 1px 0 rgba(255,255,255,0.08)",
      }} />

      {/* Gold bottom hardware bezel rim */}
      <div style={{
        position:   "absolute",
        bottom:     0, left: 0, right: 0,
        height:     2,
        background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.40) 30%, rgba(212,175,55,0.70) 50%, rgba(212,175,55,0.40) 70%, transparent 100%)",
      }} />

      {/* Hardware status bar */}
      <div style={{
        position:   "absolute",
        top:        3, left: 0, right: 0,
        height:     38,
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display:    "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding:    "0 32px",
        zIndex:     5,
      }}>
        <span style={{ fontSize: 10, letterSpacing: "0.50em", color: "rgba(212,175,55,0.55)", fontWeight: 800, fontFamily: "'Inter', sans-serif", textTransform: "uppercase" }}>
          SmokeCraft 360 · Kiosk Edition
        </span>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <span style={{ fontSize: 10, letterSpacing: "0.30em", color: "rgba(255,255,255,0.20)", fontFamily: "'Inter', sans-serif" }}>
            TABLE KIOSK · ACTIVE
          </span>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
        </div>
      </div>

      {/* Ambient cigar smoke SVG */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "40%", opacity: 0.06, pointerEvents: "none" }}
        viewBox="0 0 1920 400" preserveAspectRatio="xMidYMax slice">
        <defs>
          <filter id="smoke">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.006" numOctaves="3" seed="2" result="nz" />
            <feDisplacementMap in="SourceGraphic" in2="nz" scale="60" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {[180, 420, 700, 980, 1260, 1540, 1780].map((x, i) => (
          <ellipse key={i} cx={x} cy={380} rx={60 + i * 8} ry={220 + i * 12}
            fill={`rgba(200,160,80,${0.15 + i * 0.02})`} filter="url(#smoke)" />
        ))}
      </svg>
    </div>
  );
}
