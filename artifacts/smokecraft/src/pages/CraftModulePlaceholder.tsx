import { ArrowLeft, ClipboardList, Home, RadioTower, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { PointerEvent } from "react";
import { useState } from "react";
import { useLocation } from "wouter";
import "./CraftHubVisualPortal.css";

type CraftModulePlaceholderProps = {
  title: string;
  eyebrow: string;
  description: string;
  image?: string;
  status?: string;
};

type ModulePlan = {
  statusLine: string;
  lanes: Array<{ label: string; value: string; detail: string }>;
  signals: string[];
};

type TouchPulse = {
  id: number;
  x: number;
  y: number;
};

let lastModuleHapticAt = 0;

const modulePlans: Record<string, ModulePlan> = {
  smoke: {
    statusLine: "Guest ritual, pairing guidance, and staff handoff are connected for the lounge floor.",
    lanes: [
      { label: "Profile", value: "Palate DNA", detail: "Strength, wrapper, draw, aroma, and pace captured before recommendation." },
      { label: "Pairing", value: "Spirit Match", detail: "Cigar selection is bridged to whiskey, cognac, cocktail, and small-plate options." },
      { label: "Service", value: "Staff Ready", detail: "Cut, light, ash etiquette, and reorder cues are prepared for assisted service." },
    ],
    signals: ["Humidor inventory visible", "VIP preference memory active", "Pairing engine warmed"],
  },
  wine: {
    statusLine: "Cellar guidance is mapped to taste profile, bottle service, and guest preference capture.",
    lanes: [
      { label: "Taste", value: "Profile Build", detail: "Body, acidity, fruit, tannin, and occasion are ready for guided selection." },
      { label: "Bottle", value: "Cellar Match", detail: "Reserve, by-the-glass, and pairing options stay organized for staff review." },
      { label: "Serve", value: "Pour Notes", detail: "Temperature, glassware, decant timing, and table notes remain visible." },
    ],
    signals: ["Cellar list staged", "Sommelier notes online", "Guest history attached"],
  },
  pour: {
    statusLine: "Spirits recommendations are organized around mood, flavor bridge, and premium upsell flow.",
    lanes: [
      { label: "Spirit", value: "Pour Path", detail: "Whiskey, bourbon, cognac, tequila, and cocktail lanes are ready for comparison." },
      { label: "Mood", value: "Room Match", detail: "Lighting, pace, and service tone align with the selected pour profile." },
      { label: "Upsell", value: "Reserve Cue", detail: "Premium bottles and limited pours surface at the right decision moment." },
    ],
    signals: ["Backbar inventory linked", "Reserve suggestions active", "Tab handoff ready"],
  },
  beer: {
    statusLine: "Taproom guidance is ready for style discovery, food pairing, and active draft service.",
    lanes: [
      { label: "Style", value: "Flavor Map", detail: "IPA, stout, lager, sour, wheat, and seasonal options are grouped by palate." },
      { label: "Glass", value: "Serve Mode", detail: "Pour size, glassware, and flight structure are prepared for service." },
      { label: "Pair", value: "Menu Bridge", detail: "Food pairings and second-round suggestions stay visible to staff." },
    ],
    signals: ["Draft board synced", "Flight builder active", "Kitchen pairing route ready"],
  },
  default: {
    statusLine: "This module is connected to the venue workflow with service notes, staff cues, and guest context.",
    lanes: [
      { label: "Guest", value: "Context", detail: "Preference, session, and service state remain visible." },
      { label: "Staff", value: "Handoff", detail: "Next actions are organized for fast venue response." },
      { label: "Venue", value: "Live Mode", detail: "Operational signals are ready for the active floor." },
    ],
    signals: ["Guest context loaded", "Service state online", "Venue controls ready"],
  },
};

function getModulePlan(title: string): ModulePlan {
  const key = title.toLowerCase();
  if (key.includes("smoke") || key.includes("humidor") || key.includes("lounge")) return modulePlans.smoke;
  if (key.includes("wine") || key.includes("cellar")) return modulePlans.wine;
  if (key.includes("pour") || key.includes("spirit")) return modulePlans.pour;
  if (key.includes("beer") || key.includes("brew") || key.includes("taproom")) return modulePlans.beer;
  return modulePlans.default;
}

function tapFeedback(pattern: number | number[] = 18) {
  const now = Date.now();
  if (now - lastModuleHapticAt < 90) return;
  lastModuleHapticAt = now;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are best-effort; iPadOS/Safari may ignore vibration.
  }
}

export default function CraftModulePlaceholder({
  title,
  eyebrow,
  description,
  image = "/images/scenes/craft-hub.jpg",
  status = "Live service board online",
}: CraftModulePlaceholderProps) {
  const [, navigate] = useLocation();
  const [touchPulse, setTouchPulse] = useState<TouchPulse | null>(null);
  const plan = getModulePlan(title);

  const handleTouchPress = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("button, a, input, [role='button']")) return;
    tapFeedback();
    setTouchPulse({ id: Date.now(), x: event.clientX, y: event.clientY });
  };

  return (
    <main className="chvp-module-shell" onPointerDownCapture={handleTouchPress}>
      <div className="chvp-module-bg" style={{ backgroundImage: `url(${image})` }} />
      <AnimatePresence>
        {touchPulse && (
          <motion.span
            key={touchPulse.id}
            className="chvp-touch-ripple"
            style={{ left: touchPulse.x, top: touchPulse.y }}
            initial={{ opacity: 0.42, scale: 0.18 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <section className="chvp-module-panel">
        <div className="chvp-module-actions">
          <button onClick={() => window.history.back()}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <button onClick={() => navigate("/craft-hub")}>
            <Home size={20} />
            <span>Return to Craft Hub</span>
          </button>
        </div>

        <span className="chvp-overline">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>

        <div className="chvp-module-status">
          <ShieldCheck size={22} />
          <div>
            <strong>{status}</strong>
            <span>{plan.statusLine}</span>
          </div>
        </div>

        <div className="chvp-module-live-grid" aria-label={`${title} service lanes`}>
          {plan.lanes.map(({ label, value, detail }) => (
            <article key={label} className="chvp-module-live-card">
              <ClipboardList size={20} />
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>

        <div className="chvp-module-signal-strip">
          <RadioTower size={18} />
          {plan.signals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>

        <button className="chvp-module-primary" type="button" onClick={() => navigate("/craft-hub")}>
          <Sparkles size={18} />
          <span>Choose Another Craft</span>
        </button>
      </section>
    </main>
  );
}
