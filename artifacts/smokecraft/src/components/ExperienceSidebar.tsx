/**
 * ExperienceSidebar — fixed left step-progress navigator.
 * Rebuilt for ages 35–75: larger text, more spacing, strong gold highlights.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame }            from "lucide-react";
import { useVenue }                from "@/contexts/VenueContext";

export type SidebarStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface StepDef {
  label:    string;
  sublabel: string;
}

const STEPS: StepDef[] = [
  { label: "Experience", sublabel: "Cigar or spirits" },
  { label: "Flavor",     sublabel: "Choose tasting notes" },
  { label: "Strength",   sublabel: "Light to full body" },
  { label: "Mood",       sublabel: "Set the atmosphere" },
  { label: "Curate",     sublabel: "Find your match" },
  { label: "Pairing",    sublabel: "Perfect complements" },
  { label: "Reveal",     sublabel: "Order or save" },
];

interface Props {
  activeStep: SidebarStep;
  completed:  Set<number>;
}

export function ExperienceSidebar({ activeStep, completed }: Props) {
  const venue = useVenue();

  return (
    <aside
      className="sc-sidebar fixed left-0 top-0 bottom-0 hidden lg:flex flex-col z-20"
      style={{
        width:                260,
        background:           "rgba(10,7,4,0.88)",
        backdropFilter:       "blur(24px) saturate(1.3)",
        WebkitBackdropFilter: "blur(24px) saturate(1.3)",
        borderRight:          "1px solid rgba(212,175,55,0.14)",
        boxShadow:            "4px 0 32px rgba(0,0,0,0.6), inset -1px 0 0 rgba(255,255,255,0.02)",
      }}
    >
      {/* Logo */}
      <div className="px-7 pt-8 pb-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Flame size={16} style={{ color: "rgba(212,175,55,0.8)" }} />
          <p className="font-serif tracking-[0.1em] text-base"
            style={{ color: "rgba(212,175,55,0.9)", fontWeight: 500 }}>
            {venue.logoText}
          </p>
        </div>
        <div className="h-px mt-3" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.3), transparent)" }} />
      </div>

      {/* Steps */}
      <nav className="flex-1 px-4 space-y-1 overflow-hidden">
        {STEPS.map((step, i) => {
          const isCompleted = completed.has(i);
          const isActive    = activeStep === i;
          const isLocked    = !isCompleted && !isActive && i > activeStep;

          return (
            <motion.div
              key={step.label}
              className="relative flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300"
              style={{
                background: isActive
                  ? "rgba(212,175,55,0.10)"
                  : isCompleted ? "rgba(212,175,55,0.04)" : "transparent",
                border: isActive
                  ? "1px solid rgba(212,175,55,0.30)"
                  : "1px solid transparent",
                opacity: isLocked ? 0.35 : 1,
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isLocked ? 0.35 : 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              {/* Connector */}
              {i > 0 && (
                <div className="absolute left-[28px] -top-1 w-px"
                  style={{
                    height: "0.35rem",
                    background: isCompleted || isActive
                      ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.07)",
                  }} />
              )}

              {/* Step circle */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))"
                    : isCompleted ? "rgba(212,175,55,0.20)" : "rgba(255,255,255,0.05)",
                  border: isActive ? "none"
                    : isCompleted ? "1px solid rgba(212,175,55,0.40)"
                    : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: isActive
                    ? "0 0 16px rgba(212,175,55,0.45), 0 0 5px rgba(212,175,55,0.65)" : "none",
                }}
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.span key="check"
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                      <Check size={13} style={{ color: "rgba(212,175,55,0.9)" }} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span key="num"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-xs font-semibold"
                      style={{ color: isActive ? "hsl(22 18% 6%)" : "rgba(180,155,100,0.4)" }}>
                      {i + 1}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active pulse ring */}
                {isActive && (
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ border: "1px solid rgba(212,175,55,0.45)" }}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                )}
              </div>

              {/* Labels */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[0.05em] leading-snug"
                  style={{
                    color: isActive
                      ? "rgba(240,220,180,0.95)"
                      : isCompleted ? "rgba(210,185,135,0.75)"
                      : "rgba(180,155,100,0.38)",
                  }}>
                  {step.label}
                </p>
                {(isActive || isCompleted) && (
                  <motion.p className="text-xs mt-0.5 leading-snug"
                    style={{ color: isActive ? "rgba(180,155,100,0.55)" : "rgba(155,130,80,0.4)" }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {step.sublabel}
                  </motion.p>
                )}
              </div>

              {/* Active right glow bar */}
              {isActive && (
                <motion.div className="absolute right-0 top-2 bottom-2 w-0.5 rounded-full"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.65), transparent)" }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ duration: 0.35 }} />
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-7 py-6">
        <div className="h-px mb-4" style={{ background: "rgba(212,175,55,0.08)" }} />
        <p className="text-[9px] uppercase tracking-[0.3em] text-center" style={{ color: "rgba(180,155,100,0.22)" }}>
          SmokeCraft 360 · Est. 2024
        </p>
      </div>
    </aside>
  );
}
