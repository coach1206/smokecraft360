import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useGoldenBoxStore } from "@/store/useGoldenBoxStore";

const AMBER = "#D48B00";
const AMBER_DIM = "rgba(212,139,0,0.18)";
const AMBER_GLOW = "rgba(212,139,0,0.40)";
const SURFACE = "rgba(18,14,6,0.97)";
const BORDER = "rgba(212,139,0,0.22)";
const TEXT = "#F0E8D4";
const TEXT_DIM = "rgba(240,232,212,0.55)";
const MONO = "'JetBrains Mono','Courier New',monospace";
const SANS = "'Inter','SF Pro Display',sans-serif";

const ROUTES = [
  { label: "Home",               path: "/" },
  { label: "Dashboard",          path: "/dashboard" },
  { label: "Craft Hub",          path: "/craft-hub" },
  { label: "Golden Box",         path: "/golden-box" },
  { label: "Analytics",          path: "/analytics" },
  { label: "Swipe Intelligence", path: "/analytics/swipe-intelligence" },
  { label: "Operations",         path: "/operations" },
  { label: "POS Mode",           path: "/pos" },
  { label: "Staff Module",       path: "/staff" },
  { label: "Command Center",     path: "/command-center" },
  { label: "Dev Console",        path: "/dev-console" },
  { label: "Finance",            path: "/finance-reconciliation" },
  { label: "Inventory",          path: "/inventory" },
  { label: "Lounge League",      path: "/competition" },
  { label: "Intelligence",       path: "/intelligence" },
  { label: "Settings",           path: "/settings" },
  { label: "Admin Master",       path: "/admin-master" },
];

const XP_PRESETS = [100, 500, 1000, 5000];

function CodeEntryModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const { enableDeveloperMode } = useGoldenBoxStore();

  const tap = (k: string) => {
    if (k === "⌫") { setDigits(d => d.slice(0, -1)); setError(false); return; }
    if (digits.length >= 4) return;
    const next = [...digits, k];
    setDigits(next);
    if (next.length === 4) {
      const code = next.join("");
      const ok = enableDeveloperMode("JC Collins", code);
      if (ok) {
        setTimeout(onSuccess, 300);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setShake(false); setDigits([]); setError(false); }, 900);
      }
    }
  };

  const PAD = ["1","2","3","4","5","6","7","8","9","⌫","0","·"];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: SURFACE, border: `1px solid ${error ? "#F87171" : BORDER}`,
          borderRadius: 20, padding: "36px 32px", minWidth: 320, textAlign: "center",
          boxShadow: `0 0 48px ${error ? "rgba(248,113,113,0.25)" : AMBER_GLOW}` }}
      >
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.32em", color: AMBER, textTransform: "uppercase", marginBottom: 6 }}>
          DEVELOPER ACCESS
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: "0.08em", marginBottom: 4 }}>
          SMOKECRAFT 360
        </div>
        <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 28, letterSpacing: "0.12em" }}>
          Enter developer access code
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ width: 44, height: 52, borderRadius: 10,
              border: `2px solid ${digits[i] ? (error ? "#F87171" : AMBER) : BORDER}`,
              background: "rgba(255,255,255,0.03)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: digits[i] && !error ? `0 0 12px ${AMBER_GLOW}` : "none",
              transition: "all 0.15s" }}>
              {digits[i] && <div style={{ width: 10, height: 10, borderRadius: "50%", background: error ? "#F87171" : AMBER }} />}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,60px)", gap: 8, justifyContent: "center" }}>
          {PAD.map(k => (
            <motion.button key={k} whileTap={{ scale: 0.88 }}
              onClick={() => k !== "·" && tap(k)}
              style={{ height: 52, borderRadius: 10,
                border: `1px solid ${BORDER}`,
                background: k === "⌫" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
                color: TEXT, fontSize: 18, fontWeight: 600, cursor: k === "·" ? "default" : "pointer",
                fontFamily: SANS, opacity: k === "·" ? 0 : 1 }}>
              {k}
            </motion.button>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, color: "#F87171", letterSpacing: "0.18em" }}>
            INVALID CODE
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function DevPanel({ onClose }: { onClose: () => void }) {
  const [location, navigate] = useLocation();
  const [xpInput, setXpInput] = useState("500");
  const [toast, setToast] = useState("");
  const {
    developerName, xp, unlockedLevels, skipAnimations,
    addXP, unlockAllLevels, resetSession, setSkipAnimations,
    disableDeveloperMode, routeSnapshot,
  } = useGoldenBoxStore();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const jumpTo = (path: string) => {
    navigate(path);
    onClose();
    showToast(`Navigated to ${path}`);
  };

  const handleAddXP = () => {
    const amount = parseInt(xpInput, 10);
    if (!isNaN(amount) && amount > 0) { addXP(amount); showToast(`+${amount} XP added`); }
  };

  const handleUnlockAll = () => { unlockAllLevels(); showToast("All levels unlocked!"); };

  const handleReset = () => { resetSession(); showToast("Session reset"); };

  const handleRestorePrev = () => {
    if (routeSnapshot.lastRoute && routeSnapshot.lastRoute !== location) {
      navigate(routeSnapshot.lastRoute);
      onClose();
    }
  };

  const section = (title: string) => (
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.28em", color: AMBER,
      textTransform: "uppercase", marginTop: 20, marginBottom: 8, paddingBottom: 6,
      borderBottom: `1px solid ${BORDER}` }}>
      {title}
    </div>
  );

  const btn = (label: string, onClick: () => void, accent?: boolean) => (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, cursor: "pointer",
        border: `1px solid ${accent ? AMBER : BORDER}`,
        background: accent ? AMBER_DIM : "rgba(255,255,255,0.03)",
        color: accent ? AMBER : TEXT, fontSize: 13, fontWeight: accent ? 700 : 400,
        textAlign: "left", fontFamily: SANS, marginBottom: 6, letterSpacing: "0.04em" }}>
      {label}
    </motion.button>
  );

  const currentTier = unlockedLevels.length;

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 360, zIndex: 99997,
        background: SURFACE, borderLeft: `1px solid ${BORDER}`,
        boxShadow: `-8px 0 48px ${AMBER_GLOW}`, display: "flex", flexDirection: "column",
        fontFamily: SANS, overflowY: "auto" }}
    >
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.32em", color: AMBER, textTransform: "uppercase" }}>
              DEV MODE ACTIVE
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: "0.06em" }}>
              {developerName || "JC Collins"}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${BORDER}`,
              background: "rgba(255,255,255,0.04)", color: TEXT_DIM, fontSize: 18, cursor: "pointer" }}>
            ✕
          </motion.button>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 12, padding: "10px 12px",
          background: AMBER_DIM, borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.18em" }}>XP</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: AMBER }}>{xp.toLocaleString()}</div>
          </div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.18em" }}>ROUTE</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {location}
            </div>
          </div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.18em" }}>TIERS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: AMBER }}>{currentTier}/6</div>
          </div>
        </div>

        {section("Jump To Screen")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {ROUTES.map(r => (
            <motion.button key={r.path} whileTap={{ scale: 0.94 }} onClick={() => jumpTo(r.path)}
              style={{ padding: "8px 10px", borderRadius: 7, border: `1px solid ${location === r.path ? AMBER : BORDER}`,
                background: location === r.path ? AMBER_DIM : "rgba(255,255,255,0.025)",
                color: location === r.path ? AMBER : TEXT_DIM, fontSize: 12, cursor: "pointer",
                textAlign: "left", fontFamily: SANS }}>
              {r.label}
            </motion.button>
          ))}
        </div>

        {section("XP Tools")}
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input value={xpInput} onChange={e => setXpInput(e.target.value)}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`,
              background: "rgba(255,255,255,0.04)", color: TEXT, fontFamily: MONO, fontSize: 14, outline: "none" }} />
          <motion.button whileTap={{ scale: 0.94 }} onClick={handleAddXP}
            style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${AMBER}`,
              background: AMBER_DIM, color: AMBER, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + XP
          </motion.button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {XP_PRESETS.map(n => (
            <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => { addXP(n); showToast(`+${n} XP`); }}
              style={{ flex: 1, padding: "7px 4px", borderRadius: 7, border: `1px solid ${BORDER}`,
                background: "rgba(255,255,255,0.025)", color: TEXT_DIM, fontSize: 12, cursor: "pointer" }}>
              +{n >= 1000 ? `${n/1000}k` : n}
            </motion.button>
          ))}
        </div>
        {btn("⚡ Unlock All Levels", handleUnlockAll, true)}

        {section("Session")}
        {btn("↺  Reset Session", handleReset)}
        {btn("🏆 Simulate Rewards", () => { addXP(2500); showToast("Rewards simulated (+2500 XP)"); })}

        {section("Navigation")}
        {btn("⟳  Reload Current Route", () => window.location.reload())}
        {btn(`↩  Restore Previous Route${routeSnapshot.lastRoute ? ` (${routeSnapshot.lastRoute})` : ""}`,
          handleRestorePrev,
          !!routeSnapshot.lastRoute && routeSnapshot.lastRoute !== location)}

        {section("Config")}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`,
          background: "rgba(255,255,255,0.025)", marginBottom: 6 }}>
          <div onClick={() => setSkipAnimations(!skipAnimations)}
            style={{ width: 36, height: 20, borderRadius: 10,
              background: skipAnimations ? AMBER : "rgba(255,255,255,0.12)",
              border: `1px solid ${skipAnimations ? AMBER : BORDER}`,
              display: "flex", alignItems: "center", padding: "2px",
              transition: "all 0.2s", cursor: "pointer" }}>
            <motion.div animate={{ x: skipAnimations ? 16 : 0 }}
              style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff" }} />
          </div>
          <span style={{ fontSize: 13, color: TEXT }}>Skip Animations</span>
        </label>
        {btn("🔒 Disable Dev Mode", () => { disableDeveloperMode(); onClose(); })}
      </div>

      <div style={{ padding: "20px", marginTop: "auto" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(240,232,212,0.20)", letterSpacing: "0.24em", textAlign: "center" }}>
          SMOKECRAFT 360 · DEV MODE · CODE 6810
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", bottom: 24, right: 24, padding: "10px 20px",
              background: AMBER, color: "#000", borderRadius: 8, fontWeight: 700,
              fontSize: 13, zIndex: 99999, boxShadow: `0 4px 24px ${AMBER_GLOW}` }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DevModeOverlay() {
  const [location] = useLocation();
  const {
    developerMode, developerCode, devPanelOpen,
    setDevPanelOpen, saveRoute,
  } = useGoldenBoxStore();

  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPanel = useCallback(() => {
    if (developerMode) {
      setDevPanelOpen(true);
    } else {
      setShowCodeEntry(true);
    }
  }, [developerMode, setDevPanelOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "D") openPanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPanel]);

  useEffect(() => {
    saveRoute({
      lastRoute: location,
      scrollPosition: window.scrollY,
      activeScreen: location,
    });
  }, [location, saveRoute]);

  useEffect(() => {
    if (developerCode === "6810" && !developerMode) {
      useGoldenBoxStore.getState().enableDeveloperMode("JC Collins", "6810");
    }
  }, [developerCode, developerMode]);

  const handleBadgeTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      openPanel();
    } else {
      tapTimerRef.current = setTimeout(() => {
        if (developerMode) setDevPanelOpen(true);
        tapCountRef.current = 0;
      }, 600);
    }
  };

  return (
    <>
      {developerMode && (
        <motion.button
          onClick={handleBadgeTap}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ position: "fixed", top: 12, right: 12, zIndex: 99995,
            display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1,
            background: "rgba(18,14,6,0.88)", backdropFilter: "blur(12px)",
            border: `1px solid ${AMBER}`, borderRadius: 8,
            padding: "5px 10px", cursor: "pointer",
            boxShadow: `0 0 16px ${AMBER_GLOW}` }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: AMBER }}
            />
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.28em", color: AMBER, textTransform: "uppercase" }}>
              DEV MODE ACTIVE
            </span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", color: "rgba(212,139,0,0.65)", textTransform: "uppercase" }}>
            JC COLLINS
          </span>
        </motion.button>
      )}

      {!developerMode && (
        <div
          onClick={handleBadgeTap}
          style={{ position: "fixed", top: 0, right: 0, width: 60, height: 60,
            zIndex: 99994, cursor: "default" }}
        />
      )}

      <AnimatePresence>
        {showCodeEntry && (
          <CodeEntryModal
            onSuccess={() => { setShowCodeEntry(false); setDevPanelOpen(true); }}
            onClose={() => setShowCodeEntry(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {devPanelOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDevPanelOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 99996, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            />
            <DevPanel onClose={() => setDevPanelOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
