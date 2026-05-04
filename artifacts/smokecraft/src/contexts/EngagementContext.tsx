import { createContext, useContext, type ReactNode } from "react";
import { useEngagement, type EngagementAction } from "@/hooks/useEngagement";
import { AnimatePresence, motion } from "framer-motion";
import { Zap, Flame, BookMarked } from "lucide-react";

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

const ACTION_META: Record<EngagementAction, { label: string; icon: "zap" | "flame" | "save" }> = {
  select:               { label: "Selection",          icon: "zap"   },
  customize:            { label: "Customization",      icon: "zap"   },
  confirm:              { label: "Confirmation",        icon: "zap"   },
  purchase:             { label: "Purchase",            icon: "flame" },
  navigate:             { label: "Navigation",          icon: "zap"   },
  experience_start:     { label: "Experience Started",  icon: "zap"   },
  experience_answer:    { label: "Answer",              icon: "zap"   },
  experience_complete:  { label: "Experience Complete", icon: "flame" },
  campaign_enter:       { label: "Campaign Entry",      icon: "flame" },
  craft_complete:       { label: "Craft Complete",      icon: "flame" },
  design_save:          { label: "Design Saved",        icon: "save"  },
};

function ToastIcon({ type }: { type: "zap" | "flame" | "save" }) {
  const gradients = {
    zap:   "linear-gradient(135deg, #d4af37, #f59e0b)",
    flame: "linear-gradient(135deg, #ef4444, #f97316)",
    save:  "linear-gradient(135deg, #6366f1, #8b5cf6)",
  };
  const icons = {
    zap:   <Zap   size={18} color="#0a0806" fill="#0a0806" />,
    flame: <Flame size={18} color="#fff"    fill="#fff"    />,
    save:  <BookMarked size={16} color="#fff" />,
  };
  const borders = {
    zap:   "rgba(212,175,55,0.4)",
    flame: "rgba(239,68,68,0.4)",
    save:  "rgba(99,102,241,0.4)",
  };
  return (
    <motion.div
      animate={{ rotate: type === "zap" ? [0, -10, 10, -5, 5, 0] : [0, -5, 5, 0] }}
      transition={{ duration: 0.5 }}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: gradients[type],
        border: `1px solid ${borders[type]}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icons[type]}
    </motion.div>
  );
}

function PointsToast({ reward }: { reward: { action: EngagementAction; points: number } }) {
  const meta = ACTION_META[reward.action];
  const isBig = reward.points >= 25;

  const bgMap = {
    zap:   "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(245,158,11,0.15))",
    flame: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.15))",
    save:  "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
  };
  const borderMap = {
    zap:   "rgba(212,175,55,0.4)",
    flame: "rgba(239,68,68,0.4)",
    save:  "rgba(99,102,241,0.4)",
  };
  const colorMap = {
    zap:   "#d4af37",
    flame: "#f97316",
    save:  "#a78bfa",
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
        padding: isBig ? "14px 22px" : "12px 20px",
        borderRadius: 16,
        background: bgMap[meta.icon],
        border: `1px solid ${borderMap[meta.icon]}`,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.15)",
      }}
    >
      <ToastIcon type={meta.icon} />
      <div>
        <div style={{ fontSize: isBig ? 17 : 15, fontWeight: 700, color: colorMap[meta.icon] }}>
          +{reward.points} pts
        </div>
        <div style={{ fontSize: 11, color: "rgba(232,224,200,0.5)" }}>
          {meta.label}
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
