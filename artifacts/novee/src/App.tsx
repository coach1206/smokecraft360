import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuestProfileProvider, useGuest } from "@/context/GuestProfileContext";
import { ReentryGate } from "@/pages/ReentryGate";
import { S1_InitGate } from "@/pages/S1_InitGate";
import { S2_TerroirMatrix } from "@/pages/S2_TerroirMatrix";
import { S3_FormulationLab } from "@/pages/S3_FormulationLab";
import { S4_DesignStudio } from "@/pages/S4_DesignStudio";
import { playClick } from "@/hooks/useAudio";
import { hapticClick } from "@/hooks/useHaptic";

const queryClient = new QueryClient();

const S1_PHASES = new Set([
  "s1_demo", "s1_rules", "s1_leaderboard", "s1_mentor", "s1_seed", "s1_quiz", "s1_posgate",
]);
const S2_PHASES = new Set(["s2_terroir", "s2_voucher"]);
const S3_PHASES = new Set(["s3_spiritquiz", "s3_sensorytrap", "s3_leafsliders"]);
const S4_PHASES = new Set(["s4_vitola", "s4_designstudio", "s4_results"]);

function PhaseRouter() {
  const { profile } = useGuest();
  const { phase } = profile;
  if (phase === "reentry")         return <ReentryGate />;
  if (S1_PHASES.has(phase))        return <S1_InitGate />;
  if (S2_PHASES.has(phase))        return <S2_TerroirMatrix />;
  if (S3_PHASES.has(phase))        return <S3_FormulationLab />;
  if (S4_PHASES.has(phase))        return <S4_DesignStudio />;
  return <ReentryGate />;
}

function handlePointerDown() {
  playClick();
  hapticClick();
}

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
            /* Deep cinematic obsidian — never flat black */
            background: `
              radial-gradient(ellipse 140% 60% at 50% -10%, rgba(212,175,55,0.09) 0%, transparent 55%),
              radial-gradient(ellipse 80% 80% at 15% 90%, rgba(30,20,5,0.80) 0%, transparent 60%),
              radial-gradient(ellipse 80% 80% at 85% 90%, rgba(20,15,5,0.60) 0%, transparent 60%),
              linear-gradient(165deg, #0E0B06 0%, #080603 45%, #0A0804 100%)
            `,
          }}
        >
          {/* Brushed chrome texture layer */}
          <div style={{
            position:   "absolute",
            inset:      0,
            opacity:    0.028,
            backgroundImage: `repeating-linear-gradient(
              92deg,
              transparent 0px,
              rgba(255,255,255,0.5) 1px,
              transparent 2px,
              transparent 8px
            )`,
            pointerEvents: "none",
            zIndex: 0,
          }} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
            <PhaseRouter />
          </div>
        </div>
      </GuestProfileProvider>
    </QueryClientProvider>
  );
}
