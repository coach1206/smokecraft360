/**
 * ExperienceSidebar — fixed left step-progress navigator.
 *
 * Steps map to the Home page form flow:
 *   0 Experience  (category selected)
 *   1 Flavor      (≥1 flavor chip chosen)
 *   2 Strength    (slider moved from default)
 *   3 Mood        (mood selected — always has default)
 *   4 Discover    (curate button pressed)
 *   5 Pairing     (results showing)
 *   6 Reveal      (order/save action)
 *
 * States:
 *   locked    — not yet reachable
 *   active    — currently filling / user is here
 *   completed — done
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
  /** Currently active step index (0–6) */
  activeStep: SidebarStep;
  /** Steps that are fully completed (checked) */
  completed:  Set<number>;
}

export function ExperienceSidebar({ activeStep, completed }: Props) {
  const venue = useVenue();

  return (
    <aside
      className="sc-sidebar fixed left-0 top-0 bottom-0 hidden lg:flex flex-col z-20"
      style={{
        width:           220,
        background:      "rgba(8,6,4,0.82)",
        backdropFilter:  "blur(24px) saturate(1.3)",
        WebkitBackdropFilter: "blur(24px) saturate(1.3)",
        borderRight:     "1px solid rgba(212,175,55,0.10)",
        boxShadow:       "4px 0 32px rgba(0,0,0,0.55), inset -1px 0 0 rgba(255,255,255,0.02)",
      }}
    >
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Flame size={13} style={{ color: "rgba(212,175,55,0.7)" }} />
          <p className="font-serif tracking-[0.12em] text-sm"
            style={{ color: "rgba(212,175,55,0.85)", fontWeight: 400 }}>
            {venue.logoText}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.3), transparent)" }} />
          <p className="text-[6px] uppercase tracking-[0.35em]" style={{ color: "rgba(212,175,55,0.3)" }}>
            360
          </p>
        </div>
      </div>

      {/* Gold divider */}
      <div className="mx-6 mb-6" style={{ height: 1, background: "rgba(212,175,55,0.1)" }} />

      {/* Steps */}
      <nav className="flex-1 px-4 space-y-1 overflow-hidden">
        {STEPS.map((step, i) => {
          const isCompleted = completed.has(i);
          const isActive    = activeStep === i;
          const isLocked    = !isCompleted && !isActive && i > activeStep;

          return (
            <motion.div
              key={step.label}
              className="relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300"
              style={{
                background: isActive
                  ? "rgba(212,175,55,0.07)"
                  : isCompleted
                    ? "rgba(212,175,55,0.03)"
                    : "transparent",
                border: isActive
                  ? "1px solid rgba(212,175,55,0.22)"
                  : "1px solid transparent",
                opacity: isLocked ? 0.32 : 1,
              }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: isLocked ? 0.32 : 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              {/* Connector line above (skip first) */}
              {i > 0 && (
                <div
                  className="absolute left-[22px] -top-1 w-px"
                  style={{
                    height: "0.25rem",
                    background: isCompleted || isActive
                      ? "rgba(212,175,55,0.3)"
                      : "rgba(255,255,255,0.06)",
                  }}
                />
              )}

              {/* Step indicator */}
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center relative"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))"
                    : isCompleted
                      ? "rgba(212,175,55,0.18)"
                      : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? "none"
                    : isCompleted
                      ? "1px solid rgba(212,175,55,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isActive
                    ? "0 0 12px rgba(212,175,55,0.4), 0 0 4px rgba(212,175,55,0.6)"
                    : "none",
                }}
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.span key="check"
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                      <Check size={9} style={{ color: "rgba(212,175,55,0.8)" }} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span key="num"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[8px] font-medium"
                      style={{ color: isActive ? "hsl(22 18% 6%)" : "rgba(180,155,100,0.35)" }}>
                      {i + 1}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active pulse ring */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: "1px solid rgba(212,175,55,0.4)" }}
                    animate={{ scale: [1, 1.45, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>

              {/* Labels */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium tracking-[0.08em] leading-none"
                  style={{
                    color: isActive
                      ? "rgba(230,210,175,0.92)"
                      : isCompleted
                        ? "rgba(200,175,130,0.65)"
                        : "rgba(180,155,100,0.35)",
                  }}>
                  {step.label}
                </p>
                {(isActive || isCompleted) && (
                  <motion.p
                    className="text-[7px] tracking-[0.05em] mt-0.5"
                    style={{ color: isActive ? "rgba(180,155,100,0.45)" : "rgba(155,130,80,0.35)" }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {step.sublabel}
                  </motion.p>
                )}
              </div>

              {/* Active glow bar */}
              {isActive && (
                <motion.div
                  className="absolute right-0 top-2 bottom-2 w-0.5 rounded-full"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.6), transparent)" }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ duration: 0.35 }}
                />
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-6">
        <div className="h-px mb-4" style={{ background: "rgba(212,175,55,0.08)" }} />
        <p className="text-[6px] uppercase tracking-[0.3em] text-center" style={{ color: "rgba(180,155,100,0.2)" }}>
          SmokeCraft 360 · Est. 2024
        </p>
      </div>
    </aside>
  );
}
