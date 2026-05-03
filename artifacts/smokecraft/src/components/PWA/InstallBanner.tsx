/**
 * InstallBanner
 *
 * Floating install button that appears when the browser signals the app
 * is installable (beforeinstallprompt) — Chrome / Edge / Android.
 *
 * On iOS Safari there is no `beforeinstallprompt`. For the iPad kiosk
 * use case we instead detect Mobile Safari and show a small Add-to-Home
 * instruction popover the first time the user lands.
 *
 * In both cases the banner self-dismisses once the app is running in
 * standalone (`display-mode: standalone` or iOS `navigator.standalone`).
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const IOS_DISMISS_KEY = "smokecraft_ios_install_dismissed";

function isStandalone(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS uses a non-standard property
  const navStandalone = (navigator as { standalone?: boolean }).standalone;
  return navStandalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac with touch events
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari   = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export function InstallBanner() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (!isIosSafari()) return;
    try {
      if (localStorage.getItem(IOS_DISMISS_KEY) === "1") return;
    } catch { /* ignore */ }
    // Slight delay so it doesn't fight with the Intro animations.
    const t = window.setTimeout(() => setShowIosHint(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  function dismissIos() {
    setShowIosHint(false);
    try { localStorage.setItem(IOS_DISMISS_KEY, "1"); } catch { /* ignore */ }
  }

  // Chrome/Edge/Android path
  if (canInstall && !isInstalled) {
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

  // iOS Safari path — Add to Home Screen instructions
  return (
    <AnimatePresence>
      {showIosHint && (
        <motion.div
          className="fixed bottom-6 right-6 z-40 flex items-start gap-3 px-4 py-3 rounded-2xl max-w-[300px]"
          style={{
            background:     "linear-gradient(135deg, rgba(20,14,6,0.96), rgba(8,6,3,0.96))",
            border:         "1px solid rgba(212,175,55,0.45)",
            color:          "rgba(230,210,170,0.92)",
            boxShadow:      "0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(212,175,55,0.12)",
            backdropFilter: "blur(12px)",
          }}
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 20, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
            style={{
              background: "rgba(212,175,55,0.12)",
              border:     "1px solid rgba(212,175,55,0.3)",
              color:      "rgba(212,175,55,0.95)",
            }}
          >
            <Share size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-serif"
              style={{ fontSize: 13, fontWeight: 500, color: "rgba(232,210,170,0.95)", lineHeight: 1.3 }}
            >
              Install on this iPad
            </p>
            <p
              style={{
                fontSize: 11.5,
                color: "rgba(190,170,130,0.75)",
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              Tap <strong style={{ color: "rgba(212,175,55,0.95)" }}>Share</strong>, then{" "}
              <strong style={{ color: "rgba(212,175,55,0.95)" }}>Add&nbsp;to&nbsp;Home&nbsp;Screen</strong> to launch SmokeCraft full-screen.
            </p>
          </div>
          <button
            onClick={dismissIos}
            aria-label="Dismiss install hint"
            className="flex-shrink-0 -mt-1 -mr-1 p-1 rounded hover:bg-white/5"
            style={{ color: "rgba(190,170,130,0.5)" }}
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
