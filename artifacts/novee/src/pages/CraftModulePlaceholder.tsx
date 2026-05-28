import { ArrowLeft, Home, ShieldCheck } from "lucide-react";
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

type TouchPulse = {
  id: number;
  x: number;
  y: number;
};

let lastModuleHapticAt = 0;

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
  status = "Being prepared",
}: CraftModulePlaceholderProps) {
  const [, navigate] = useLocation();
  const [touchPulse, setTouchPulse] = useState<TouchPulse | null>(null);

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
            <span>This experience is being prepared for live service tools.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
