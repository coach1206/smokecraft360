/**
 * LoyaltyGateway — Cinematic return-visit login + loyalty dashboard.
 *
 * Entry checkpoint injected before MasterBlender's standard intro.
 * Renders the "The Art of the Cigar" idle state, handles guest lookup via
 * POST /api/auth/guest-return, then reveals a glassmorphic profile dashboard
 * with XP gauge, nightly lounge average, vault-lock alert, and session launch.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }      from "framer-motion";

// ── Local constants (mirrors MasterBlender — not re-exported from there) ──
const GOLD = "#d4af37";

const TIERS = [
  { rank: 1, name: "Just Curious",        min: 0,    max: 250,     color: "#8BC34A", session: "Session I · 10 mins"   },
  { rank: 2, name: "Cultivated Beginner", min: 251,  max: 750,     color: GOLD,      session: "Session II · 12 mins"  },
  { rank: 3, name: "Rising Aficionado",   min: 751,  max: 1500,    color: "#E8741A", session: "Session III · 15 mins" },
  { rank: 4, name: "Master Sommelier",    min: 1501, max: Infinity, color: "#a78bfa", session: "The Alchemy Chamber"   },
] as const;

function getTier(xp: number) {
  return ([...TIERS] as typeof TIERS[number][]).reverse().find(t => xp >= t.min) ?? TIERS[0];
}
function getNextTier(xp: number) {
  const cur = getTier(xp);
  return TIERS.find(t => t.rank === cur.rank + 1) ?? null;
}

function loadLocalCountries(): string[] {
  try { return JSON.parse(localStorage.getItem("blender_countries") ?? "[]"); }
  catch { return []; }
}

// ── 3400 Hz bandpass click (spec) ─────────────────────────────────────────
function playGatewayClick(): void {
  try {
    type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
    if (!AC) return;
    const ctx  = new AC();
    const osc  = ctx.createOscillator();
    const bpf  = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    bpf.type           = "bandpass";
    bpf.frequency.value = 3400;
    bpf.Q.value         = 12;
    osc.type = "square";
    osc.frequency.setValueAtTime(3400, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(bpf);
    bpf.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close().catch(() => {}), 300);
  } catch { /* browser policy — silent */ }
}

// ── Types ──────────────────────────────────────────────────────────────────
interface GuestProfile {
  id:               string;
  firstName:        string;
  lastName:         string;
  totalMastery:     number;
  masteryTier:      string;
  masteryTierLabel: string;
  lastSessionScore: number | null;
  sessionCount:     number;
}

interface NightlyAvg { avg: number; count: number; }

interface Props {
  /** Skip to standard GatewayIntro (new guest path) */
  onNewGuest:    () => void;
  /** Returning guest approved — seed XP and jump to blending */
  onStartSession: (xp: number) => void;
}

// ── XP Gauge ───────────────────────────────────────────────────────────────
function XpGauge({ xp }: { xp: number }) {
  const tier     = getTier(xp);
  const nextTier = getNextTier(xp);
  const pct      = nextTier
    ? Math.min(100, Math.round(((xp - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100;
  const toNext   = nextTier ? nextTier.min - xp : 0;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Tier label row */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: tier.color, fontSize: 11, fontWeight: 800,
          letterSpacing: "0.22em", textTransform: "uppercase" }}>
          {tier.name}
        </span>
        <span style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.14em" }}>
          {Math.round(xp).toLocaleString()} XP
        </span>
      </div>

      {/* Bar track */}
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)",
        borderRadius: 999, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
          style={{ height: "100%", borderRadius: 999,
            background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})` }}
        />
      </div>

      {/* Progress note */}
      <div style={{ display: "flex", justifyContent: "space-between",
        marginTop: 6 }}>
        <span style={{ color: "rgba(240,232,212,0.35)", fontSize: 9,
          letterSpacing: "0.12em" }}>
          {pct}% complete
        </span>
        {nextTier ? (
          <span style={{ color: `${GOLD}60`, fontSize: 9, letterSpacing: "0.12em" }}>
            {toNext.toLocaleString()} XP to {nextTier.name}
          </span>
        ) : (
          <span style={{ color: tier.color, fontSize: 9, letterSpacing: "0.12em" }}>
            APEX TIER ACHIEVED
          </span>
        )}
      </div>
    </div>
  );
}

// ── Nightly Average Widget ─────────────────────────────────────────────────
function NightlyWidget({ guestScore, nightly }: { guestScore: number | null; nightly: NightlyAvg | null }) {
  if (!nightly) {
    return (
      <div style={{ height: 54, display: "flex", alignItems: "center",
        justifyContent: "center" }}>
        <span style={{ color: `${GOLD}40`, fontSize: 10,
          letterSpacing: "0.12em" }}>Loading lounge average…</span>
      </div>
    );
  }

  const score    = guestScore ?? 0;
  const avg      = nightly.avg;
  const delta    = score - avg;
  const aboveLine = delta >= 0;

  return (
    <div style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}18`,
      borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
      <div style={{ color: `${GOLD}70`, fontSize: 8, letterSpacing: "0.28em",
        textTransform: "uppercase", marginBottom: 8 }}>
        vs Nightly Lounge Average
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "rgba(240,232,212,0.50)", fontSize: 8,
            letterSpacing: "0.14em", marginBottom: 3 }}>Your Last Score</div>
          <div style={{ color: GOLD, fontSize: 22, fontWeight: 800,
            lineHeight: 1 }}>
            {guestScore != null ? Math.round(guestScore) : "—"}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "rgba(240,232,212,0.50)", fontSize: 8,
            letterSpacing: "0.14em", marginBottom: 3 }}>
            Lounge Avg ({nightly.count} sessions)
          </div>
          <div style={{ color: "rgba(240,232,212,0.65)", fontSize: 22,
            fontWeight: 700, lineHeight: 1 }}>
            {Math.round(avg)}
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ color: aboveLine ? "#4ade80" : "#f87171", fontSize: 13,
            fontWeight: 800 }}>
            {aboveLine ? "+" : ""}{Math.round(delta)}
          </div>
          <div style={{ color: "rgba(240,232,212,0.35)", fontSize: 8,
            letterSpacing: "0.10em" }}>
            {aboveLine ? "ABOVE AVG" : "BELOW AVG"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function LoyaltyGateway({ onNewGuest, onStartSession }: Props) {
  const [view,       setView]       = useState<"idle" | "profile">("idle");
  const [lastName,   setLastName]   = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [profile,    setProfile]    = useState<GuestProfile | null>(null);
  const [nightly,    setNightly]    = useState<NightlyAvg | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);

  // Fetch nightly average when profile loads
  useEffect(() => {
    if (view !== "profile") return;
    fetch("/api/master-blender/nightly-average")
      .then(r => r.ok ? r.json() : null)
      .then((d: NightlyAvg | null) => { if (d) setNightly(d); })
      .catch(() => {});
  }, [view]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    playGatewayClick();
    if (!lastName.trim() || phoneLast4.length !== 4) {
      setError("Enter your last name and 4-digit phone code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/auth/guest-return", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lastName: lastName.trim(), phoneLast4 }),
      });
      if (res.status === 404) {
        setError("No profile found — check your details or enroll below.");
        return;
      }
      if (!res.ok) throw new Error("lookup failed");
      const data = await res.json() as { profile: GuestProfile };
      setProfile(data.profile);
      setView("profile");
    } catch {
      setError("Unable to reach the lounge server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const visitedCountries = loadLocalCountries();
  const vaultLocked      = visitedCountries.length < 2;
  const tier             = profile ? getTier(profile.totalMastery) : null;

  // ── Idle / Input view ───────────────────────────────────────────────────
  const idleView = (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.8 }}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        minHeight:      "100vh",
        padding:        "40px 24px",
        position:       "relative",
        zIndex:         10,
      }}
    >
      {/* Ambient gold glow */}
      <div style={{
        position:         "absolute",
        top:              "30%",
        left:             "50%",
        transform:        "translate(-50%,-50%)",
        width:            480,
        height:           480,
        borderRadius:     "50%",
        background:       "radial-gradient(circle, rgba(255,176,0,0.04) 0%, transparent 70%)",
        pointerEvents:    "none",
      }} />

      {/* Overline */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ color: `${GOLD}70`, fontSize: 9, letterSpacing: "0.42em",
          textTransform: "uppercase", marginBottom: 20 }}
      >
        Axiom OS · Loyalty Portal
      </motion.p>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.9 }}
        style={{
          fontFamily:    "'Cormorant Garamond', 'Georgia', serif",
          fontSize:      "clamp(32px, 8vw, 58px)",
          fontWeight:    300,
          color:         "rgba(240,232,212,0.92)",
          letterSpacing: "0.06em",
          textAlign:     "center",
          lineHeight:    1.15,
          marginBottom:  10,
        }}
      >
        The Art of the Cigar
      </motion.h1>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 64 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{ height: 1, background: `${GOLD}50`, marginBottom: 36 }}
      />

      {/* Input card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        style={{
          width:          "100%",
          maxWidth:       380,
          background:     "linear-gradient(135deg, rgba(15,15,15,0.88) 0%, rgba(5,5,5,0.72) 100%)",
          border:         `1px solid rgba(212,175,55,0.20)`,
          borderRadius:   16,
          padding:        "30px 28px",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
      >
        <p style={{ color: "rgba(240,232,212,0.55)", fontSize: 11,
          letterSpacing: "0.16em", textAlign: "center", marginBottom: 24,
          textTransform: "uppercase" }}>
          Returning Guest Access
        </p>

        <form onSubmit={handleLookup}>
          {/* Last name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: `${GOLD}70`, fontSize: 9,
              letterSpacing: "0.26em", textTransform: "uppercase",
              marginBottom: 6 }}>
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") phoneRef.current?.focus(); }}
              placeholder="e.g. Reyes"
              autoComplete="family-name"
              style={{
                width:           "100%",
                background:      "rgba(0,0,0,0.55)",
                border:          `1px solid rgba(212,175,55,0.20)`,
                borderRadius:    8,
                padding:         "12px 14px",
                color:           "rgba(240,232,212,0.90)",
                fontSize:        14,
                letterSpacing:   "0.04em",
                outline:         "none",
                boxSizing:       "border-box",
              }}
            />
          </div>

          {/* Phone last 4 */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", color: `${GOLD}70`, fontSize: 9,
              letterSpacing: "0.26em", textTransform: "uppercase",
              marginBottom: 6 }}>
              Last 4 Digits of Phone
            </label>
            <input
              ref={phoneRef}
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={phoneLast4}
              onChange={e => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="_ _ _ _"
              autoComplete="off"
              style={{
                width:          "100%",
                background:     "rgba(0,0,0,0.55)",
                border:         `1px solid rgba(212,175,55,0.20)`,
                borderRadius:   8,
                padding:        "12px 14px",
                color:          GOLD,
                fontSize:       20,
                letterSpacing:  "0.32em",
                outline:        "none",
                textAlign:      "center" as const,
                boxSizing:      "border-box",
              }}
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ color: "#f87171", fontSize: 11, textAlign: "center",
                  marginBottom: 14, letterSpacing: "0.06em" }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Access button — mechanical compress on contact */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.96, y: 2 }}
            disabled={loading}
            onClick={() => playGatewayClick()}
            style={{
              width:          "100%",
              padding:        "15px 20px",
              borderRadius:   8,
              border:         `1.5px solid ${GOLD}`,
              background:     `linear-gradient(135deg, rgba(212,175,55,0.18), rgba(0,0,0,0.65))`,
              color:          GOLD,
              fontSize:       11,
              fontWeight:     700,
              letterSpacing:  "0.28em",
              textTransform:  "uppercase" as const,
              cursor:         loading ? "default" : "pointer",
              backdropFilter: "blur(12px)",
              opacity:        loading ? 0.6 : 1,
              transition:     "opacity 0.2s",
            }}
          >
            {loading ? "Verifying…" : "Access Masterclass"}
          </motion.button>
        </form>
      </motion.div>

      {/* New guest bypass */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => { playGatewayClick(); onNewGuest(); }}
        style={{
          marginTop:     24,
          background:    "transparent",
          border:        "none",
          color:         "rgba(240,232,212,0.35)",
          fontSize:      11,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          cursor:        "pointer",
          padding:       "8px 16px",
        }}
      >
        New Guest — Begin Enrollment
      </motion.button>
    </motion.div>
  );

  // ── Profile dashboard view ───────────────────────────────────────────────
  const profileView = profile && tier ? (
    <motion.div
      key="profile"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        minHeight:      "100vh",
        padding:        "40px 24px",
        position:       "relative",
        zIndex:         10,
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position:      "absolute",
        top:           "30%",
        left:          "50%",
        transform:     "translate(-50%,-50%)",
        width:         560,
        height:        560,
        borderRadius:  "50%",
        background:    "radial-gradient(circle, rgba(255,176,0,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Overline */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ color: `${GOLD}70`, fontSize: 9, letterSpacing: "0.42em",
          textTransform: "uppercase", marginBottom: 16 }}
      >
        Loyalty Profile · Verified
      </motion.p>

      {/* Greeting */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.8 }}
        style={{
          fontFamily:    "'Cormorant Garamond','Georgia',serif",
          fontSize:      "clamp(22px,5vw,36px)",
          fontWeight:    300,
          color:         "rgba(240,232,212,0.92)",
          letterSpacing: "0.04em",
          textAlign:     "center",
          marginBottom:  6,
        }}
      >
        Welcome Back, {tier.name}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ color: "rgba(240,232,212,0.42)", fontSize: 12,
          letterSpacing: "0.16em", textAlign: "center", marginBottom: 28 }}
      >
        {profile.firstName} {profile.lastName} · {profile.sessionCount} session{profile.sessionCount !== 1 ? "s" : ""} completed
      </motion.p>

      {/* Dashboard card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.8 }}
        style={{
          width:                "100%",
          maxWidth:             420,
          background:           "linear-gradient(135deg, rgba(15,15,15,0.85) 0%, rgba(5,5,5,0.70) 100%)",
          border:               `1px solid ${GOLD}22`,
          borderRadius:         16,
          padding:              "26px 24px",
          backdropFilter:       "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          marginBottom:         16,
        }}
      >
        {/* XP gauge */}
        <XpGauge xp={profile.totalMastery} />

        {/* Nightly average */}
        <NightlyWidget
          guestScore={profile.lastSessionScore}
          nightly={nightly}
        />

        {/* Vault lock alert */}
        <AnimatePresence>
          {vaultLocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                background:   "rgba(251,191,36,0.06)",
                border:       "1px solid rgba(251,191,36,0.28)",
                borderRadius: 8,
                padding:      "12px 14px",
                marginBottom: 18,
                overflow:     "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>
                  {"\u{1F512}"}
                </span>
                <p style={{ color: "rgba(251,191,36,0.85)", fontSize: 11,
                  lineHeight: 1.55, letterSpacing: "0.04em", margin: 0 }}>
                  <strong style={{ letterSpacing: "0.12em",
                    textTransform: "uppercase" }}>Vault Locked</strong>
                  {" "}— You must complete a masterclass selection for{" "}
                  <strong>TWO different countries</strong> to qualify for the{" "}
                  <strong>Golden Box archive</strong>.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session launch buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Primary: tier-appropriate session */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97, y: 2 }}
            onClick={() => {
              playGatewayClick();
              onStartSession(profile.totalMastery);
            }}
            style={{
              width:          "100%",
              padding:        "15px 20px",
              borderRadius:   8,
              border:         `1.5px solid ${tier.color}`,
              background:     `linear-gradient(135deg, ${tier.color}18, rgba(0,0,0,0.60))`,
              color:          tier.color,
              fontSize:       11,
              fontWeight:     800,
              letterSpacing:  "0.24em",
              textTransform:  "uppercase" as const,
              cursor:         "pointer",
              backdropFilter: "blur(12px)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            10,
            }}
          >
            <span style={{ fontSize: 16 }}>{"\u{1F6AC}"}</span>
            <span>Begin {tier.session}</span>
          </motion.button>

          {/* Secondary: next tier preview (if not apex) */}
          {(() => {
            const next = getNextTier(profile.totalMastery);
            if (!next) return null;
            return (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97, y: 2 }}
                onClick={() => {
                  playGatewayClick();
                  onStartSession(profile.totalMastery);
                }}
                style={{
                  width:          "100%",
                  padding:        "13px 20px",
                  borderRadius:   8,
                  border:         `1px solid ${next.color}40`,
                  background:     "rgba(255,255,255,0.03)",
                  color:          `${next.color}80`,
                  fontSize:       10,
                  fontWeight:     700,
                  letterSpacing:  "0.22em",
                  textTransform:  "uppercase" as const,
                  cursor:         "pointer",
                }}
              >
                Unlock {next.session} — {(next.min - profile.totalMastery).toLocaleString()} XP away
              </motion.button>
            );
          })()}
        </div>
      </motion.div>

      {/* Back to idle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => { setView("idle"); setProfile(null); setNightly(null); setError(null); }}
        style={{
          background:    "transparent",
          border:        "none",
          color:         "rgba(240,232,212,0.28)",
          fontSize:      10,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          cursor:        "pointer",
          padding:       "8px 16px",
        }}
      >
        ← Different Guest
      </motion.button>
    </motion.div>
  ) : null;

  return (
    <div
      className="fixed inset-0"
      style={{ background: "#000000", fontFamily: "'Inter',sans-serif" }}
    >
      {/* 4% radial gold gradient overlay — always present per spec */}
      <div style={{
        position:      "absolute",
        inset:         0,
        background:    "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,176,0,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex:        1,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <AnimatePresence mode="wait">
          {view === "idle"    && idleView}
          {view === "profile" && profileView}
        </AnimatePresence>
      </div>
    </div>
  );
}
