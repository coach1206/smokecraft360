import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGoldenBoxStore } from "@/store/useGoldenBoxStore";
import { useGuest } from "@/context/GuestProfileContext";
import type { Phase } from "@/context/GuestProfileContext";

const AMBER = "#D48B00";
const AMBER_DIM = "rgba(212,139,0,0.18)";
const AMBER_GLOW = "rgba(212,139,0,0.40)";
const SURFACE = "rgba(18,14,6,0.97)";
const BORDER = "rgba(212,139,0,0.22)";
const TEXT = "#F0E8D4";
const TEXT_DIM = "rgba(240,232,212,0.55)";
const MONO = "'JetBrains Mono','Courier New',monospace";
const SANS = "'Inter','SF Pro Display',sans-serif";

const PHASES: { label: string; phase: Phase }[] = [
  { label: "Craft Hub",          phase: "crafthub" },
  { label: "EAT Dashboard",      phase: "eat_dashboard" },
  { label: "Golden Box",         phase: "profile_view" },
  { label: "Executive Command",  phase: "executive_command" },
  { label: "Pairing",            phase: "pairing_view" },
  { label: "Lounge",             phase: "lounge_view" },
  { label: "Settings",           phase: "settings_view" },
  { label: "Dev Console",        phase: "dev_console" },
  { label: "Control Chamber",    phase: "control-chamber" },
  { label: "POS Terminal",       phase: "pos_terminal" },
  { label: "Master Blender",     phase: "master_blender" },
  { label: "Coach Help",         phase: "coach_help" },
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
      const ok = enableDeveloperMode("JC Collins", next.join(""));
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
          NOVEE OS
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
                background: "rgba(255,255,255,0.025)",
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
  const { profile, setPhase } = useGuest();
  const [xpInput, setXpInput] = useState("500");
  const [tickerMsg, setTickerMsg] = useState("");
  const [tickerCat, setTickerCat] = useState("cigar");
  const [toast, setToast] = useState("");
  const {
    developerName, xp, unlockedLevels, skipAnimations,
    addXP, unlockAllLevels, resetSession, setSkipAnimations,
    disableDeveloperMode, routeSnapshot,
    tickerSpeed, tickerPaused, setTickerSpeed, setTickerPaused, setTickerTestMessage,
  } = useGoldenBoxStore();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const jumpTo = (phase: Phase) => {
    setPhase(phase);
    onClose();
    showToast(`Navigated to ${phase}`);
  };

  const handleAddXP = () => {
    const amount = parseInt(xpInput, 10);
    if (!isNaN(amount) && amount > 0) { addXP(amount); showToast(`+${amount} XP added`); }
  };

  const handleRestorePrev = () => {
    if (routeSnapshot.activeScreen) {
      const matchedPhase = PHASES.find(p => p.label.toLowerCase() === routeSnapshot.activeScreen.toLowerCase());
      if (matchedPhase) { jumpTo(matchedPhase.phase); }
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

        <div style={{ display: "flex", gap: 12, marginTop: 12, padding: "10px 12px",
          background: AMBER_DIM, borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.18em" }}>XP</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: AMBER }}>{xp.toLocaleString()}</div>
          </div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.18em" }}>SCREEN</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{profile.phase}</div>
          </div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.18em" }}>TIERS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: AMBER }}>{unlockedLevels.length}/6</div>
          </div>
        </div>

        {section("Jump To Screen")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {PHASES.map(r => (
            <motion.button key={r.phase} whileTap={{ scale: 0.94 }} onClick={() => jumpTo(r.phase)}
              style={{ padding: "8px 10px", borderRadius: 7,
                border: `1px solid ${profile.phase === r.phase ? AMBER : BORDER}`,
                background: profile.phase === r.phase ? AMBER_DIM : "rgba(255,255,255,0.025)",
                color: profile.phase === r.phase ? AMBER : TEXT_DIM,
                fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: SANS }}>
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
        {btn("⚡ Unlock All Levels", () => { unlockAllLevels(); showToast("All levels unlocked!"); }, true)}

        {section("Session")}
        {btn("↺  Reset Session", () => { resetSession(); showToast("Session reset"); })}
        {btn("🏆 Simulate Rewards", () => { addXP(2500); showToast("Rewards simulated (+2500 XP)"); })}

        {section("Navigation")}
        {btn("⟳  Reload Current Route", () => window.location.reload())}
        {btn("↩  Restore Previous Screen", handleRestorePrev, !!routeSnapshot.activeScreen)}

        {section("Ticker Controls")}

        {/* Speed slider */}
        <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`,
          background: "rgba(255,255,255,0.025)", marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.14em" }}>
              TICKER SPEED
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: AMBER, fontWeight: 700 }}>
              {tickerSpeed.toFixed(1)}×
            </span>
          </div>
          <input
            type="range" min={0.2} max={3.0} step={0.1}
            value={tickerSpeed}
            onChange={e => setTickerSpeed(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#D48B00", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: TEXT_DIM }}>SLOW 0.2×</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: TEXT_DIM }}>FAST 3.0×</span>
          </div>
        </div>

        {/* Pause toggle */}
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", borderRadius: 8, border: `1px solid ${tickerPaused ? AMBER : BORDER}`,
          background: tickerPaused ? "rgba(212,139,0,0.08)" : "rgba(255,255,255,0.025)", marginBottom: 6, cursor: "pointer" }}>
          <span style={{ fontFamily: SANS, fontSize: 13, color: tickerPaused ? AMBER : TEXT }}>
            {tickerPaused ? "⏸ Ticker Paused" : "▶ Ticker Running"}
          </span>
          <div onClick={() => setTickerPaused(!tickerPaused)}
            style={{ width: 36, height: 20, borderRadius: 10,
              background: tickerPaused ? AMBER : "rgba(255,255,255,0.12)",
              border: `1px solid ${tickerPaused ? AMBER : BORDER}`,
              display: "flex", alignItems: "center", padding: "2px",
              transition: "all 0.2s", cursor: "pointer" }}>
            <motion.div animate={{ x: tickerPaused ? 16 : 0 }}
              style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff" }} />
          </div>
        </label>

        {/* Test message injector */}
        <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`,
          background: "rgba(255,255,255,0.025)", marginBottom: 6 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.14em", marginBottom: 8 }}>
            INJECT TEST MESSAGE
          </div>
          <select
            value={tickerCat}
            onChange={e => setTickerCat(e.target.value)}
            style={{ width: "100%", background: "#111", color: AMBER, border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: MONO,
              letterSpacing: "0.10em", marginBottom: 8, cursor: "pointer" }}
          >
            {["cigar","drinks","kitchen","rewards","system"].map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text" placeholder="Enter test message..."
              value={tickerMsg} onChange={e => setTickerMsg(e.target.value)}
              style={{ flex: 1, background: "#111", color: TEXT, border: `1px solid ${BORDER}`,
                borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: SANS,
                outline: "none" }}
            />
            <motion.button whileTap={{ scale: 0.94 }}
              onClick={() => {
                if (tickerMsg.trim()) {
                  setTickerTestMessage(tickerMsg.trim(), tickerCat);
                  showToast("Test message injected");
                  setTickerMsg("");
                }
              }}
              style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${AMBER}`,
                background: "rgba(212,139,0,0.14)", color: AMBER, fontSize: 12, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap" }}>
              Fire
            </motion.button>
          </div>
          {btn("✕ Clear Test Message", () => { setTickerTestMessage(null); showToast("Test message cleared"); })}
        </div>

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
          NOVEE OS · DEV MODE · CODE 6810
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
  const { profile, setPhase } = useGuest();
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
      activeScreen: profile.phase,
      timestamp: Date.now(),
    });
  }, [profile.phase, saveRoute]);

  useEffect(() => {
    if (developerCode === "6810" && !developerMode) {
      useGoldenBoxStore.getState().enableDeveloperMode("JC Collins", "6810");
    }
    if (developerMode) {
      try {
        const raw = localStorage.getItem("novee_guest_profile");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const stored = JSON.parse(localStorage.getItem("novee_session") ?? "{}") as Record<string, unknown>;
          saveRoute({
            lastRoute: String(parsed.phase ?? "crafthub"),
            activeScreen: String(parsed.phase ?? "crafthub"),
            formState: stored,
          });
        }
      } catch (_e) {}
    }
  }, [developerCode, developerMode, saveRoute]);

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

  void setPhase;

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
