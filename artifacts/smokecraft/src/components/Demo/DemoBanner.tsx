/**
 * DemoBanner — fixed "Demo Mode Active" indicator + Reset button.
 *
 * Shown only when DEMO_MODE = true (config/demo.ts).
 * Positioned at the bottom-right, intentionally subtle.
 * Reset clears all local state, wipes server-side demo orders, and reloads.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, RotateCcw, Loader2 } from "lucide-react";
import { DEMO_MODE, clearDemoLocalState } from "@/config/demo";
import { resetDemoData } from "@/services/api";

if (!DEMO_MODE) {
  // Tree-shaken in production builds when DEMO_MODE is false
}

export function DemoBanner() {
  const [resetting, setResetting] = useState(false);
  const [expanded,  setExpanded]  = useState(false);

  if (!DEMO_MODE) return null;

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await resetDemoData();
    } catch {
      // Best-effort — even if server reset fails, clear local state
    }
    clearDemoLocalState();
    // Brief pause so the user sees the reset state, then reload
    await new Promise((r) => setTimeout(r, 600));
    window.location.href = "/";
  };

  return (
    <motion.div
      className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 p-4 rounded-xl"
            style={{
              background: "linear-gradient(155deg, rgba(20,13,4,0.97), rgba(12,8,2,0.98))",
              border:     "1px solid rgba(212,175,55,0.25)",
              boxShadow:  "0 8px 32px rgba(0,0,0,0.6)",
              minWidth:   180,
            }}
          >
            <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: "rgba(212,175,55,0.5)" }}>
              Demo Safe Mode
            </p>
            <p className="text-[10px] leading-relaxed" style={{ color: "rgba(180,155,100,0.65)" }}>
              Payments simulated. No real charges. Dashboard populated with sample data.
            </p>
            <div className="h-px w-full my-1" style={{ background: "rgba(212,175,55,0.1)" }} />
            <motion.button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] transition-all duration-200"
              style={resetting ? {
                background: "rgba(255,255,255,0.04)",
                border:     "1px solid rgba(255,255,255,0.06)",
                color:      "rgba(180,155,100,0.35)",
                cursor:     "not-allowed",
              } : {
                background: "rgba(212,175,55,0.08)",
                border:     "1px solid rgba(212,175,55,0.25)",
                color:      "rgba(212,175,55,0.75)",
              }}
              whileHover={!resetting ? { background: "rgba(212,175,55,0.14)", borderColor: "rgba(212,175,55,0.45)" } : {}}
              whileTap={!resetting ? { scale: 0.97 } : {}}
            >
              {resetting ? (
                <><Loader2 size={10} className="animate-spin" />Resetting…</>
              ) : (
                <><RotateCcw size={10} />Reset Demo</>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge pill */}
      <motion.button
        onClick={() => setExpanded((x) => !x)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-[0.2em] select-none"
        style={{
          background: "rgba(12,8,2,0.90)",
          border:     "1px solid rgba(212,175,55,0.22)",
          color:      "rgba(212,175,55,0.55)",
          backdropFilter: "blur(8px)",
        }}
        whileHover={{ borderColor: "rgba(212,175,55,0.4)", color: "rgba(212,175,55,0.8)" }}
        whileTap={{ scale: 0.96 }}
      >
        <motion.span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.7)" }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <FlaskConical size={9} />
        Demo Mode Active
      </motion.button>
    </motion.div>
  );
}
