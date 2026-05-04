import { createContext, useContext, type ReactNode } from "react";
import { useEngagement, type EngagementAction } from "@/hooks/useEngagement";
import { AnimatePresence, motion } from "framer-motion";
import { Zap } from "lucide-react";

interface EngagementContextValue {
  totalPoints: number;
  sessionActions: number;
  lastReward: { action: EngagementAction; points: number } | null;
  trackAction: (action: EngagementAction, meta?: Record<string, string>) => number;
  dismissReward: () => void;
}

const EngagementContext = createContext<EngagementContextValue | null>(null);

export function useEngagementContext(): EngagementContextValue {
  const ctx = useContext(EngagementContext);
  if (!ctx) throw new Error("useEngagementContext must be inside EngagementProvider");
  return ctx;
}

function PointsToast({ reward }: { reward: { action: EngagementAction; points: number } }) {
  const actionLabels: Record<EngagementAction, string> = {
    select: "Selection",
    customize: "Customization",
    confirm: "Confirmation",
    purchase: "Purchase",
    navigate: "Navigation",
    experience_start: "Experience Started",
    experience_answer: "Answer",
    experience_complete: "Experience Complete",
    campaign_enter: "Campaign Entry",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 20px",
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(245,158,11,0.15))",
        border: "1px solid rgba(212,175,55,0.4)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.15)",
      }}
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
        transition={{ duration: 0.5 }}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "linear-gradient(135deg, #d4af37, #f59e0b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Zap size={18} color="#0a0806" fill="#0a0806" />
      </motion.div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#d4af37" }}>
          +{reward.points} pts
        </div>
        <div style={{ fontSize: 11, color: "rgba(232,224,200,0.5)" }}>
          {actionLabels[reward.action]}
        </div>
      </div>
    </motion.div>
  );
}

export function EngagementProvider({ children }: { children: ReactNode }) {
  const engagement = useEngagement();

  return (
    <EngagementContext.Provider value={engagement}>
      {children}
      <AnimatePresence>
        {engagement.lastReward && (
          <PointsToast key="pts-toast" reward={engagement.lastReward} />
        )}
      </AnimatePresence>
    </EngagementContext.Provider>
  );
}
