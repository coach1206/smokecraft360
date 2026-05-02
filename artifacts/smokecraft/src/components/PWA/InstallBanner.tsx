/**
 * InstallBanner
 *
 * Floating install button that appears when the browser signals the app
 * is installable (beforeinstallprompt). Dismissed once installed.
 *
 * Positioned at bottom-right so it never blocks the main UI.
 */

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function InstallBanner() {
  const { canInstall, isInstalled, install } = usePWAInstall();

  if (!canInstall || isInstalled) return null;

  return (
    <motion.button
      onClick={install}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full text-xs uppercase tracking-[0.18em] cursor-pointer"
      style={{
        background:  "linear-gradient(135deg, rgba(180,130,30,0.25), rgba(212,175,55,0.15))",
        border:      "1px solid rgba(212,175,55,0.4)",
        color:       "rgba(212,175,55,0.9)",
        boxShadow:   "0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.08)",
        backdropFilter: "blur(10px)",
      }}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0,  scale: 1   }}
      exit={{    opacity: 0, y: 20, scale: 0.9 }}
      whileHover={{
        boxShadow: "0 4px 30px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.18)",
        borderColor: "rgba(212,175,55,0.65)",
      }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <Download size={13} />
      Install App
    </motion.button>
  );
}
