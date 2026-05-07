/**
 * OfflineBanner
 *
 * Non-intrusive pill shown at the top of the screen whenever the browser
 * reports that network connectivity is unavailable.
 *
 * The pill fades in/out with Framer Motion so it never causes layout shifts.
 */

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

interface Props {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: Props) {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          className="fixed top-4 left-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-[0.18em] pointer-events-none"
          style={{
            transform:      "translateX(-50%)",
            background:     "rgba(22,14,6,0.95)",
            border:         "1px solid rgba(180,100,40,0.45)",
            color:          "rgba(220,160,80,0.9)",
            backdropFilter: "blur(12px)",
            boxShadow:      "0 4px 20px rgba(26,26,27,0.14)",
          }}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y:   0 }}
          exit={{    opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <WifiOff size={11} />
          Offline — cached results in use
        </motion.div>
      )}
    </AnimatePresence>
  );
}
