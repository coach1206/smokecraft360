/**
 * ExperienceSidebar — fixed left navigator.
 * Shows every step with clearly readable text at all times.
 * Completed steps display the user's actual selection below the name.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, RotateCcw } from "lucide-react";
import { useVenue } from "@/contexts/VenueContext";

export type SidebarStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface StepDef {
  label:    string;
  sublabel: string;
}

const STEPS: StepDef[] = [
  { label: "Experience", sublabel: "Cigar or spirits" },
  { label: "Flavor",     sublabel: "Tasting notes" },
  { label: "Strength",   sublabel: "Body intensity" },
  { label: "Mood",       sublabel: "Atmosphere" },
  { label: "Curate",     sublabel: "Find your match" },
  { label: "Pairing",    sublabel: "Complements" },
  { label: "Reveal",     sublabel: "Your experience" },
];

export interface SidebarValues {
  category?: string;
  flavors?:  string[];
  strength?: number;
  mood?:     string;
}

const STRENGTH_LABELS = ["", "Very Mild", "Mild", "Medium", "Full", "Intense"];

interface Props {
  activeStep:   SidebarStep;
  completed:    Set<number>;
  values?:      SidebarValues;
  onReset?:     () => void;
  onStepClick?: (step: number) => void;
}

function stepValue(index: number, values: SidebarValues): string | null {
  switch (index) {
    case 0: return values.category
      ? values.category.charAt(0).toUpperCase() + values.category.slice(1)
      : null;
    case 1: return values.flavors && values.flavors.length > 0
      ? values.flavors.slice(0, 3).join(", ")
      : null;
    case 2: return values.strength ? STRENGTH_LABELS[values.strength] : null;
    case 3: return values.mood
      ? values.mood.charAt(0).toUpperCase() + values.mood.slice(1)
      : null;
    default: return null;
  }
}

export function ExperienceSidebar({ activeStep, completed, values = {}, onReset, onStepClick }: Props) {
  const venue = useVenue();

  return (
    <aside
      className="sc-sidebar fixed left-0 top-0 bottom-0 hidden lg:flex flex-col z-20"
      style={{
        width:                260,
        background:           "rgba(8,5,3,0.94)",
        backdropFilter:       "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        borderRight:          "1px solid rgba(212,139,0,0.18)",
        boxShadow:            "4px 0 40px rgba(26,26,27,0.32)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-2.5">
          <Flame size={18} style={{ color: "#D48B00" }} />
          <p style={{ fontFamily: "var(--app-font-serif)", fontSize: 16, fontWeight: 600, color: "rgba(245,225,180,0.95)", letterSpacing: "0.08em" }}>
            {venue.logoText}
          </p>
        </div>
        <div className="mt-3 h-px" style={{ background: "linear-gradient(90deg, rgba(212,139,0,0.4), transparent)" }} />
      </div>

      {/* ── Steps ────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-0.5">
        {STEPS.map((step, i) => {
          const isCompleted = completed.has(i);
          const isActive    = activeStep === i;
          const isLocked    = !isCompleted && !isActive;
          const val         = stepValue(i, values);

          return (
            <motion.div
              key={step.label}
              onClick={() => !isLocked && onStepClick?.(i)}
              className="relative flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left"
              style={{
                background: isActive
                  ? "linear-gradient(135deg, rgba(212,139,0,0.15), rgba(180,130,30,0.08))"
                  : isCompleted ? "rgba(212,139,0,0.05)" : "transparent",
                border: isActive
                  ? "1px solid rgba(212,139,0,0.35)"
                  : "1px solid transparent",
                opacity:    isLocked ? 0.58 : 1,
                cursor:     isLocked ? "default" : "pointer",
                appearance: "none",
              }}
              whileHover={(!isLocked && onStepClick) ? { backgroundColor: isActive ? undefined : "rgba(212,139,0,0.06)", scale: 1.01 } : {}}
              whileTap={(!isLocked && onStepClick) ? { scale: 0.97 } : {}}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isLocked ? 0.58 : 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              {/* Connector line */}
              {i > 0 && (
                <div className="absolute left-[27px] -top-0.5 w-px h-1"
                  style={{ background: isCompleted || isActive ? "rgba(212,139,0,0.30)" : "rgba(26,26,27,0.10)" }} />
              )}

              {/* Step circle */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, #b07c14, #D48B00)"
                    : isCompleted ? "rgba(212,139,0,0.22)" : "rgba(26,26,27,0.09)",
                  border: isActive ? "none"
                    : isCompleted ? "1.5px solid rgba(212,139,0,0.45)"
                    : "1.5px solid rgba(26,26,27,0.16)",
                  boxShadow: isActive ? "0 0 16px rgba(212,139,0,0.45)" : "none",
                }}>
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.span key="check"
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                      <Check size={14} style={{ color: "#D48B00" }} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span key="num"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ fontSize: 12, fontWeight: 700, color: isActive ? "#EFEBE0" : "rgba(220,195,150,0.65)" }}>
                      {i + 1}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ border: "1px solid rgba(212,139,0,0.5)" }}
                    animate={{ scale: [1, 1.55, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p style={{
                  fontSize:      16,                                    /* bumped 13→16 for kiosk readability */
                  fontWeight:    700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  lineHeight:    1.2,
                  color: isActive
                    ? "rgba(245,225,180,0.98)"
                    : isCompleted ? "rgba(230,210,170,0.82)"
                    : "rgba(215,195,155,0.72)",   /* locked — visible but softer */
                }}>
                  {step.label}
                </p>

                {/* Show selected value for completed steps */}
                {isCompleted && val ? (
                  <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(212,139,0,0.85)", marginTop: 3, lineHeight: 1.3 }}>
                    {val}
                  </p>
                ) : isActive ? (
                  <p style={{ fontSize: 14, color: "rgba(210,185,140,0.72)", marginTop: 3, lineHeight: 1.3 }}>
                    {step.sublabel}
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: "rgba(195,170,120,0.55)", marginTop: 3, lineHeight: 1.3 }}>
                    {step.sublabel}
                  </p>
                )}
              </div>

              {/* Active right bar */}
              {isActive && (
                <motion.div className="absolute right-0 top-3 bottom-3 w-0.5 rounded-full"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(212,139,0,0.7), transparent)" }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ duration: 0.3 }} />
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* ── Reset button ─────────────────────────────────────── */}
      {onReset && (
        <div className="px-4 pb-3">
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{
              background:   "rgba(26,26,27,0.06)",
              border:       "1px solid rgba(26,26,27,0.12)",
              color:        "rgba(210,185,140,0.65)",
              fontSize:     14,                                          /* bumped 12→14 */
              fontWeight:   600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor:       "pointer",
            }}>
            <RotateCcw size={14} />
            Start Over
          </button>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="px-6 py-4">
        <div className="h-px mb-3" style={{ background: "rgba(212,139,0,0.10)" }} />
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.28em", textAlign: "center", color: "rgba(180,155,100,0.4)" }}>
          SmokeCraft 360 · Est. 2024
        </p>
      </div>
    </aside>
  );
}
