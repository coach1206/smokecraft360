import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuestProfileProvider, useGuest } from "@/context/GuestProfileContext";
import { ReentryGate } from "@/pages/ReentryGate";
import { S1_InitGate } from "@/pages/S1_InitGate";
import { S2_TerroirMatrix } from "@/pages/S2_TerroirMatrix";
import { S3_FormulationLab } from "@/pages/S3_FormulationLab";
import { S4_DesignStudio } from "@/pages/S4_DesignStudio";
import { playClick } from "@/hooks/useAudio";

const queryClient = new QueryClient();

const S1_PHASES = new Set([
  "s1_demo",
  "s1_rules",
  "s1_leaderboard",
  "s1_mentor",
  "s1_seed",
  "s1_quiz",
  "s1_posgate",
]);

const S2_PHASES = new Set(["s2_terroir", "s2_voucher"]);

const S3_PHASES = new Set([
  "s3_spiritquiz",
  "s3_sensorytrap",
  "s3_leafsliders",
]);

const S4_PHASES = new Set(["s4_vitola", "s4_designstudio", "s4_results"]);

function PhaseRouter() {
  const { profile } = useGuest();
  const { phase } = profile;

  if (phase === "reentry") return <ReentryGate />;
  if (S1_PHASES.has(phase))  return <S1_InitGate />;
  if (S2_PHASES.has(phase))  return <S2_TerroirMatrix />;
  if (S3_PHASES.has(phase))  return <S3_FormulationLab />;
  if (S4_PHASES.has(phase))  return <S4_DesignStudio />;
  return <ReentryGate />;
}

/* Root pointer-down listener — fires 3400Hz click on every touch/click anywhere */
function AudioRoot({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position:   "fixed",
        inset:      0,
        background: "#000000",
        cursor:     "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        overscrollBehavior: "none",
        touchAction: "manipulation",
      }}
      onPointerDown={playClick}
    >
      {children}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GuestProfileProvider>
        <AudioRoot>
          <PhaseRouter />
        </AudioRoot>
      </GuestProfileProvider>
    </QueryClientProvider>
  );
}
