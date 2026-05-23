import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useGuestProfile } from "@/contexts/GuestProfileContext";

const GOLD   = "#D4AF37";
const AMBER  = "#C4860A";
const CREAM  = "#F0E8D4";
const DARK   = "#0A0700";
const EASE   = [0.22, 1, 0.36, 1] as const;

/* ── XP tier helpers ── */
export type GBTier = "novice" | "enthusiast" | "connoisseur" | "aficionado";

function getTier(xp: number): GBTier {
  if (xp >= 15000) return "aficionado";
  if (xp >= 5000)  return "connoisseur";
  if (xp >= 1000)  return "enthusiast";
  return "novice";
}

function getNextMilestone(xp: number): { label: string; needed: number } {
  if (xp >= 15000) return { label: "PINNACLE", needed: 0 };
  if (xp >= 5000)  return { label: "AFICIONADO", needed: 15000 - xp };
  if (xp >= 1000)  return { label: "CONNOISSEUR", needed: 5000 - xp };
  return { label: "ENTHUSIAST", needed: 1000 - xp };
}

/* ── Badge SVG emblems ── */
function FlameEmblem() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke="rgba(200,80,20,0.60)" strokeWidth="1.5" fill="rgba(200,80,20,0.08)" />
      <circle cx="36" cy="36" r="28" stroke="rgba(200,80,20,0.35)" strokeWidth="1" fill="none" />
      <path d="M36 16 C36 16 44 26 44 34 C44 40 40 44 36 46 C32 44 28 40 28 34 C28 26 36 16 36 16Z" fill="url(#flame1)" opacity="0.9" />
      <path d="M36 26 C36 26 40 32 40 36 C40 39 38 41 36 42 C34 41 32 39 32 36 C32 32 36 26 36 26Z" fill="rgba(255,200,80,0.80)" />
      <defs>
        <linearGradient id="flame1" x1="36" y1="16" x2="36" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6020" />
          <stop offset="1" stopColor="#C84010" />
        </linearGradient>
      </defs>
      <text x="36" y="64" textAnchor="middle" fontSize="8" fontWeight="900" fill="rgba(200,80,20,0.70)" fontFamily="'Inter',sans-serif" letterSpacing="2">I</text>
    </svg>
  );
}

function TorchEmblem() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke={`${AMBER}88`} strokeWidth="1.5" fill={`${AMBER}0D`} />
      <circle cx="36" cy="36" r="28" stroke={`${AMBER}44`} strokeWidth="1" fill="none" />
      <rect x="33" y="34" width="6" height="18" rx="2" fill={`${AMBER}CC`} />
      <path d="M36 18 C36 18 42 26 42 31 C42 35 39 37 36 37 C33 37 30 35 30 31 C30 26 36 18 36 18Z" fill="url(#torch1)" />
      <path d="M36 24 C36 24 39 29 39 31.5 C39 33 37.5 34 36 34 C34.5 34 33 33 33 31.5 C33 29 36 24 36 24Z" fill="rgba(255,220,100,0.85)" />
      <defs>
        <linearGradient id="torch1" x1="36" y1="18" x2="36" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFA040" />
          <stop offset="1" stopColor="#C06810" />
        </linearGradient>
      </defs>
      <text x="36" y="64" textAnchor="middle" fontSize="8" fontWeight="900" fill={`${AMBER}99`} fontFamily="'Inter',sans-serif" letterSpacing="2">II</text>
    </svg>
  );
}

function GemEmblem() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke="rgba(140,80,200,0.55)" strokeWidth="1.5" fill="rgba(120,60,180,0.08)" />
      <circle cx="36" cy="36" r="28" stroke="rgba(140,80,200,0.30)" strokeWidth="1" fill="none" />
      <path d="M36 18 L50 30 L44 50 L28 50 L22 30 Z" fill="url(#gem1)" opacity="0.90" />
      <path d="M36 18 L50 30 L36 26 Z" fill="rgba(200,160,255,0.50)" />
      <path d="M28 50 L36 26 L44 50 Z" fill="rgba(160,80,220,0.30)" />
      <defs>
        <linearGradient id="gem1" x1="36" y1="18" x2="36" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C080FF" />
          <stop offset="1" stopColor="#7020C0" />
        </linearGradient>
      </defs>
      <text x="36" y="64" textAnchor="middle" fontSize="8" fontWeight="900" fill="rgba(160,80,220,0.80)" fontFamily="'Inter',sans-serif" letterSpacing="2">III</text>
    </svg>
  );
}

function LionEmblem() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke={`${GOLD}88`} strokeWidth="1.5" fill={`${GOLD}0A`} />
      <circle cx="36" cy="36" r="28" stroke={`${GOLD}44`} strokeWidth="1" fill="none" />
      {/* Crown */}
      <path d="M24 32 L24 28 L29 31 L36 24 L43 31 L48 28 L48 32 Z" fill={GOLD} opacity="0.90" />
      <rect x="24" y="32" width="24" height="10" rx="2" fill={GOLD} opacity="0.70" />
      {/* Laurel left */}
      <path d="M16 42 Q18 36 22 38 Q18 44 16 42Z" fill="rgba(212,175,55,0.45)" />
      <path d="M16 48 Q19 42 23 45 Q19 50 16 48Z" fill="rgba(212,175,55,0.40)" />
      {/* Laurel right */}
      <path d="M56 42 Q54 36 50 38 Q54 44 56 42Z" fill="rgba(212,175,55,0.45)" />
      <path d="M56 48 Q53 42 49 45 Q53 50 56 48Z" fill="rgba(212,175,55,0.40)" />
      <text x="36" y="64" textAnchor="middle" fontSize="8" fontWeight="900" fill={`${GOLD}CC`} fontFamily="'Inter',sans-serif" letterSpacing="1">IV</text>
    </svg>
  );
}

/* ── Level data ── */
const LEVELS = [
  {
    id: "novice" as GBTier,
    num: 1,
    badge: <FlameEmblem />,
    title: "NOVICE",
    sub: "THE BEGINNING",
    color: "#C84010",
    glow: "rgba(200,64,16,0.35)",
    desc: "You're learning the basics. Every decision builds your foundation.",
    skills: ["Learn cigar basics", "Identify simple flavors", "Complete intro challenges"],
    xpRange: "0 – 999 XP",
    xpMin: 0, xpMax: 999,
  },
  {
    id: "enthusiast" as GBTier,
    num: 2,
    badge: <TorchEmblem />,
    title: "ENTHUSIAST",
    sub: "FUELED BY PASSION",
    color: AMBER,
    glow: `rgba(196,134,10,0.35)`,
    desc: "You understand more. Your palate is growing. Your choices matter.",
    skills: ["Understand regions", "Master pairings", "Score higher to climb"],
    xpRange: "1,000 – 4,999 XP",
    xpMin: 1000, xpMax: 4999,
  },
  {
    id: "connoisseur" as GBTier,
    num: 3,
    badge: <GemEmblem />,
    title: "CONNOISSEUR",
    sub: "REFINED & FOCUSED",
    color: "#9040D0",
    glow: "rgba(140,60,200,0.35)",
    desc: "You appreciate complexity. You see what others overlook.",
    skills: ["Identify flavor transitions", "Know aging & construction", "Compete at a higher level"],
    xpRange: "5,000 – 14,999 XP",
    xpMin: 5000, xpMax: 14999,
  },
  {
    id: "aficionado" as GBTier,
    num: 4,
    badge: <LionEmblem />,
    title: "AFICIONADO",
    sub: "THE ULTIMATE STATUS",
    color: GOLD,
    glow: `rgba(212,175,55,0.40)`,
    desc: "You live the culture. You don't just smoke — you understand the leaf.",
    skills: ["Master sensory analysis", "Lead & mentor others", "Top of the leaderboard"],
    xpRange: "15,000+ XP",
    xpMin: 15000, xpMax: Infinity,
  },
];

const RULES = [
  { icon: "⊙", label: "Score Points",  desc: "Complete actions & challenges" },
  { icon: "◈", label: "Climb Ranks",   desc: "Earn XP to level up" },
  { icon: "⬡", label: "Unlock Rewards", desc: "Badges, blends, gear & more" },
  { icon: "♛", label: "Earn Respect",  desc: "Compete. Be recognized. Lead." },
];

/* ── Cigar Box art ── */
function CigarBoxArt() {
  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "72%", borderRadius: 12, overflow: "hidden" }}>
      {/* Box body */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(145deg, #3A2408 0%, #1E0C04 40%, #2A1606 70%, #160A02 100%)",
        borderRadius: 12,
        border: `1px solid ${GOLD}55`,
        boxShadow: `inset 0 0 40px rgba(0,0,0,0.60), 0 0 40px rgba(212,175,55,0.15)`,
      }}>
        {/* Wood grain lines */}
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: 0, right: 0,
            top: `${(i + 1) * 7}%`, height: 1,
            background: `rgba(212,175,55,${0.04 + (i % 3) * 0.02})`,
          }} />
        ))}
        {/* Gold corner ornament top-left */}
        <svg style={{ position: "absolute", top: 8, left: 8 }} width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M2 2 L12 2 L2 12 Z" fill={`${GOLD}55`} />
          <path d="M2 2 L8 2 L2 8 Z" fill={`${GOLD}88`} />
        </svg>
        {/* Gold corner ornament top-right */}
        <svg style={{ position: "absolute", top: 8, right: 8 }} width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M26 2 L16 2 L26 12 Z" fill={`${GOLD}55`} />
          <path d="M26 2 L20 2 L26 8 Z" fill={`${GOLD}88`} />
        </svg>
        {/* Center medallion */}
        <div style={{
          position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)",
          width: "45%", aspectRatio: "1",
          borderRadius: "50%",
          border: `1px solid ${GOLD}44`,
          background: `radial-gradient(ellipse at 40% 35%, rgba(212,175,55,0.12) 0%, rgba(0,0,0,0.20) 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 24px ${GOLD}22`,
        }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>🦁</div>
        </div>
        {/* Label band */}
        <div style={{
          position: "absolute", bottom: "28%", left: "8%", right: "8%",
          background: `linear-gradient(90deg, rgba(212,175,55,0.06), rgba(212,175,55,0.14), rgba(212,175,55,0.06))`,
          border: `1px solid ${GOLD}33`, borderRadius: 6,
          padding: "6px 10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: GOLD, letterSpacing: "0.28em", fontFamily: "'Inter',sans-serif" }}>SMOKECRAFT 360</div>
          <div style={{ fontSize: 8, color: `${GOLD}88`, letterSpacing: "0.18em", marginTop: 2 }}>RESERVE BLEND</div>
        </div>
        {/* Cigars row */}
        <div style={{ position: "absolute", bottom: "8%", left: "10%", right: "10%", display: "flex", gap: 4, justifyContent: "center" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 14, borderRadius: 7,
              background: `linear-gradient(90deg, #3A1E06, #5A2E10, #3A1E06)`,
              border: `1px solid rgba(212,175,55,0.20)`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   GOLDEN BOX PAGE — Full contest levels screen
══════════════════════════════════════════════ */
interface GoldenBoxPageProps {
  onBack: () => void;
}

const CHALLENGES = [
  { id: "c1", title: "The First Draw",       xp: 50,   desc: "Experience your first cigar blend",     diff: "NOVICE",       locked: false },
  { id: "c2", title: "The Blend Master",     xp: 250,  desc: "Create a custom wrapper + filler combo", diff: "ENTHUSIAST",   locked: false },
  { id: "c3", title: "Spirit Harmony",       xp: 500,  desc: "Match a cigar with a premium spirit",    diff: "CONNOISSEUR",  locked: false },
  { id: "c4", title: "Reserve Collection",   xp: 1200, desc: "Sample 3 rare reserve blends",           diff: "CONNOISSEUR",  locked: false },
  { id: "c5", title: "The Grand Aficionado", xp: 3000, desc: "Complete all VIP experience challenges", diff: "AFICIONADO",   locked: true  },
  { id: "c6", title: "Founder's Trial",      xp: 5000, desc: "Invitation only — summit-level mastery", diff: "EXCLUSIVE",    locked: true  },
];

const STAT_COMPARE = [
  { label: "Blends Tried",    you: 12,  avg: 7,   unit: ""    },
  { label: "Pairings Saved",  you: 5,   avg: 3,   unit: ""    },
  { label: "XP Earned",       you: 840, avg: 520, unit: " XP" },
  { label: "Sessions",        you: 9,   avg: 5,   unit: ""    },
  { label: "Match Score",     you: 88,  avg: 71,  unit: "%"   },
  { label: "Rare Blends",     you: 3,   avg: 1,   unit: ""    },
];

export default function GoldenBoxPage({ onBack }: GoldenBoxPageProps) {
  const { guestProfile } = useGuestProfile();
  const xp          = guestProfile?.totalMastery ?? 0;
  const tier        = getTier(xp);
  const milestone   = getNextMilestone(xp);
  const tierLabel   = LEVELS.find(l => l.id === tier)?.title ?? "NOVICE";

  const [challengeOpen, setChallengeOpen] = useState(false);
  const [statsOpen,     setStatsOpen]     = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

  const xpPercent = (() => {
    if (tier === "novice")       return Math.round((xp / 1000) * 100);
    if (tier === "enthusiast")   return Math.round(((xp - 1000) / 4000) * 100);
    if (tier === "connoisseur")  return Math.round(((xp - 5000) / 10000) * 100);
    return 100;
  })();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      background: "#060400",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
    }}>
      {/* Ambient smoke bg */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 10%, rgba(212,175,55,0.07) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196,134,10,0.08) 0%, transparent 70%)" }} />
        {/* Grain overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.016) 1px, transparent 2px, transparent 12px)", opacity: 0.5 }} />
      </div>

      {/* ── HEADER ── */}
      <div style={{ position: "relative", zIndex: 10, padding: "14px 24px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid rgba(212,175,55,0.14)`, flexShrink: 0 }}>
        {/* Back */}
        <motion.button
          type="button"
          onClick={onBack}
          whileTap={{ scale: 0.94 }}
          style={{
            padding: "8px 18px", borderRadius: 8,
            background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}44`,
            color: GOLD, fontSize: 13, fontWeight: 800, cursor: "pointer",
            letterSpacing: "0.16em", textTransform: "uppercase" as const,
          }}
        >
          ← BACK
        </motion.button>
        {/* Title center */}
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.48em", color: `${GOLD}66`, textTransform: "uppercase" as const, marginBottom: 2 }}>
            SMOKECRAFT 360 · KIOSK EDITION
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 32, fontWeight: 700, color: GOLD, lineHeight: 1.0, textShadow: `0 0 40px ${GOLD}44, 0 0 12px ${GOLD}22` }}>
            THE GOLDEN BOX
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontStyle: "italic", color: "rgba(240,232,212,0.50)", marginTop: 2, letterSpacing: "0.12em" }}>
            Compete. Learn. Ascend.
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setStatsOpen(true)}
            style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${GOLD}55`, background: "rgba(212,175,55,0.08)", color: GOLD, fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase" as const }}>
            ◈ COMPARE STATS
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setChallengeOpen(true)}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, color: DARK, fontSize: 14, fontWeight: 900, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase" as const, boxShadow: `0 0 18px ${GOLD}44` }}>
            ⬡ OPEN CHALLENGE
          </motion.button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT — Rules of Play */}
        <div style={{ width: 200, flexShrink: 0, padding: "18px 16px", borderRight: `1px solid rgba(212,175,55,0.10)`, display: "flex", flexDirection: "column", gap: 0, overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.38em", color: GOLD, textTransform: "uppercase" as const, marginBottom: 16, borderBottom: `1px solid ${GOLD}22`, paddingBottom: 8 }}>
            — RULES OF PLAY —
          </div>
          <p style={{ fontSize: 11, color: "rgba(240,232,212,0.50)", lineHeight: 1.6, margin: "0 0 16px 0" }}>
            Every action is scored. Learn the system before you build your blend.
          </p>
          {RULES.map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 16, color: GOLD, flexShrink: 0, marginTop: 1 }}>{r.icon}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: CREAM, marginBottom: 2, letterSpacing: "0.06em" }}>{r.label}</div>
                <div style={{ fontSize: 10, color: "rgba(240,232,212,0.45)", lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            </div>
          ))}
          {/* TIP */}
          <div style={{ marginTop: "auto", padding: "12px 10px", borderRadius: 8, background: `rgba(212,175,55,0.06)`, border: `1px solid ${GOLD}22` }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: GOLD, letterSpacing: "0.24em", marginBottom: 5 }}> TIP</div>
            <div style={{ fontSize: 10, color: "rgba(240,232,212,0.50)", lineHeight: 1.55 }}>The better your decisions, the higher you climb.</div>
          </div>
        </div>

        {/* CENTER — Contest Levels */}
        <div style={{ flex: 1, padding: "18px 20px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: CREAM, letterSpacing: "0.28em", textTransform: "uppercase" as const }}>CONTEST LEVELS</div>
            <div style={{ fontSize: 11, color: "rgba(240,232,212,0.45)", marginTop: 3, letterSpacing: "0.10em" }}>Progress through the ranks. Master the leaf.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flex: 1 }}>
            {LEVELS.map((lv, i) => {
              const isActive = lv.id === tier;
              const isPast   = xp >= lv.xpMin;
              return (
                <motion.div
                  key={lv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.10 + i * 0.08, duration: 0.55, ease: EASE }}
                  style={{
                    borderRadius: 12,
                    border: isActive ? `1.5px solid ${lv.color}88` : `1px solid rgba(212,175,55,${isPast ? "0.22" : "0.10"})`,
                    background: isActive
                      ? `linear-gradient(160deg, rgba(0,0,0,0.96) 0%, ${lv.color}0D 100%)`
                      : "linear-gradient(160deg, rgba(10,7,3,0.97) 0%, rgba(6,4,1,0.99) 100%)",
                    boxShadow: isActive ? `0 0 30px ${lv.glow}, inset 0 0 20px ${lv.color}08` : "none",
                    padding: "16px 14px",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    position: "relative",
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{ position: "absolute", top: -1, left: "20%", right: "20%", height: 2, background: `linear-gradient(90deg, transparent, ${lv.color}, transparent)`, boxShadow: `0 0 8px ${lv.color}` }} />
                  )}
                  {/* Number */}
                  <div style={{ fontSize: 11, fontWeight: 900, color: `${lv.color}88`, letterSpacing: "0.22em", marginBottom: 8 }}>{lv.num}</div>
                  {/* Badge */}
                  <div style={{ marginBottom: 10 }}>{lv.badge}</div>
                  {/* Title */}
                  <div style={{ fontSize: 14, fontWeight: 900, color: isActive ? lv.color : "rgba(240,232,212,0.75)", letterSpacing: "0.14em", textAlign: "center", marginBottom: 2 }}>{lv.title}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: `${lv.color}88`, letterSpacing: "0.24em", textAlign: "center", marginBottom: 8 }}>{lv.sub}</div>
                  {/* Description */}
                  <div style={{ fontSize: 10, color: "rgba(240,232,212,0.45)", textAlign: "center", lineHeight: 1.55, marginBottom: 10 }}>{lv.desc}</div>
                  {/* Skills checklist */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                    {lv.skills.map(s => (
                      <div key={s} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span style={{ color: isPast ? lv.color : "rgba(212,175,55,0.30)", fontSize: 10, marginTop: 0.5, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 10, color: isPast ? "rgba(240,232,212,0.65)" : "rgba(240,232,212,0.35)", lineHeight: 1.4 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  {/* XP range */}
                  <div style={{ marginTop: "auto", padding: "5px 10px", borderRadius: 20, border: `1px solid ${lv.color}44`, background: `${lv.color}0D` }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: lv.color, letterSpacing: "0.08em" }}>{lv.xpRange}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Cigar Box art */}
        <div style={{ width: 180, flexShrink: 0, padding: "18px 14px", borderLeft: `1px solid rgba(212,175,55,0.10)`, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.32em", color: GOLD, textTransform: "uppercase" as const, textAlign: "center" }}>THE GOLDEN CIGAR BOX</div>
          <CigarBoxArt />
          {/* Prompt label */}
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}22` }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: GOLD, marginBottom: 4, letterSpacing: "0.16em" }}>PROMPT</div>
            <p style={{ fontSize: 9, color: "rgba(240,232,212,0.45)", margin: 0, lineHeight: 1.55 }}>
              Design a premium, cinematic UI for a cigar lifestyle contest platform. Luxurious, masculine, black &amp; gold primary theme, plus deep accent colors.
            </p>
          </div>
        </div>
      </div>

      {/* ── BOTTOM PROGRESS BAR ── */}
      <div style={{
        position: "relative", zIndex: 10,
        flexShrink: 0,
        borderTop: `1px solid rgba(212,175,55,0.16)`,
        background: "linear-gradient(180deg, rgba(8,5,1,0.98) 0%, rgba(4,2,0,0.99) 100%)",
        display: "flex", alignItems: "center",
        padding: "10px 20px", gap: 20,
      }}>
        {/* Avatar + rank */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
            {guestProfile?.firstName ? guestProfile.firstName[0].toUpperCase() : "G"}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: GOLD, letterSpacing: "0.12em" }}>{tierLabel}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: CREAM }}>{xp.toLocaleString()} XP</div>
          </div>
        </div>

        {/* Progress bar to next */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "rgba(240,232,212,0.45)", letterSpacing: "0.10em" }}>NEXT MILESTONE</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: AMBER, letterSpacing: "0.10em" }}>
              {milestone.needed > 0 ? `${milestone.needed.toLocaleString()} XP TO ${milestone.label}` : "PEAK ACHIEVED"}
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: "rgba(212,175,55,0.12)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(xpPercent, 100)}%` }}
              transition={{ duration: 1.2, ease: EASE }}
              style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${AMBER}, ${GOLD})`, boxShadow: `0 0 8px ${GOLD}44` }}
            />
          </div>
        </div>

        {/* Badges earned */}
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(240,232,212,0.40)", letterSpacing: "0.20em", marginBottom: 5 }}>EARN BADGES</div>
          <div style={{ display: "flex", gap: 4 }}>
            {LEVELS.slice(0, 4).map(lv => (
              <div key={lv.id} style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${xp >= lv.xpMin ? lv.color + "66" : "rgba(212,175,55,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, opacity: xp >= lv.xpMin ? 1 : 0.30 }}>
                {["\uD83D\uDD25","🕯️","","👑"][LEVELS.indexOf(lv)]}
              </div>
            ))}
          </div>
        </div>

        {/* Unlock rewards */}
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(240,232,212,0.40)", letterSpacing: "0.20em", marginBottom: 5 }}>UNLOCK REWARDS</div>
          <div style={{ fontSize: 9, color: "rgba(240,232,212,0.35)", lineHeight: 1.4 }}>Exclusive blends,<br />gear, and experiences<br />await…</div>
        </div>

        {/* CTA */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          style={{
            flexShrink: 0,
            padding: "10px 20px",
            borderRadius: 8,
            background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`,
            border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 900, color: DARK,
            letterSpacing: "0.22em", textTransform: "uppercase" as const,
            boxShadow: `0 0 20px ${GOLD}44`,
          }}
        >
           VIEW LEADERBOARD
        </motion.button>
      </div>

      {/* ── CHALLENGE MODAL ── */}
      <AnimatePresence>
        {challengeOpen && (
          <motion.div key="challenge-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
            onClick={() => setChallengeOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22,1,0.36,1] }}
              style={{ width: "min(720px, 95vw)", background: "linear-gradient(160deg, #0E0900 0%, #060400 100%)", borderRadius: 18, border: `1px solid ${GOLD}44`, boxShadow: `0 0 60px ${GOLD}22`, overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em" }}>AVAILABLE CHALLENGES</div>
                  <div style={{ fontSize: 13, color: `${GOLD}60`, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>Select a challenge to begin your ascent</div>
                </div>
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => setChallengeOpen(false)}
                  style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.08)", color: GOLD, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</motion.button>
              </div>
              <div style={{ padding: "18px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {CHALLENGES.map(ch => {
                  const isActive = activeChallenge === ch.id;
                  return (
                    <motion.div key={ch.id} whileTap={ch.locked ? {} : { scale: 0.98 }}
                      onClick={() => !ch.locked && setActiveChallenge(isActive ? null : ch.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderRadius: 12,
                        background: isActive ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? GOLD + "66" : ch.locked ? "rgba(255,255,255,0.06)" : GOLD + "22"}`,
                        cursor: ch.locked ? "not-allowed" : "pointer", opacity: ch.locked ? 0.45 : 1,
                        boxShadow: isActive ? `0 0 18px ${GOLD}22` : "none",
                      }}>
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: ch.locked ? "rgba(255,255,255,0.04)" : `rgba(212,175,55,0.12)`, border: `1px solid ${ch.locked ? "rgba(255,255,255,0.08)" : GOLD + "33"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 22 }}>{ch.locked ? "🔒" : "⬡"}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: ch.locked ? "rgba(240,232,212,0.40)" : CREAM, letterSpacing: "0.06em", marginBottom: 3 }}>{ch.title}</div>
                        <div style={{ fontSize: 13, color: ch.locked ? "rgba(240,232,212,0.25)" : "rgba(240,232,212,0.55)", lineHeight: 1.4 }}>{ch.desc}</div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div style={{ fontSize: 11, letterSpacing: "0.18em", color: ch.locked ? "rgba(212,175,55,0.30)" : `${GOLD}77`, textTransform: "uppercase", marginBottom: 4 }}>{ch.diff}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: ch.locked ? "rgba(212,175,55,0.30)" : GOLD }}>+{ch.xp.toLocaleString()} XP</div>
                      </div>
                    </motion.div>
                  );
                })}
                {activeChallenge && (
                  <motion.button type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setChallengeOpen(false); setActiveChallenge(null); }}
                    style={{ marginTop: 8, padding: "16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, color: DARK, fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase", boxShadow: `0 4px 24px ${GOLD}44` }}>
                    BEGIN CHALLENGE — {CHALLENGES.find(c => c.id === activeChallenge)?.title}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STATS COMPARISON MODAL ── */}
      <AnimatePresence>
        {statsOpen && (
          <motion.div key="stats-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
            onClick={() => setStatsOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22,1,0.36,1] }}
              style={{ width: "min(580px, 95vw)", background: "linear-gradient(160deg, #0E0900 0%, #060400 100%)", borderRadius: 18, border: `1px solid ${GOLD}44`, boxShadow: `0 0 60px ${GOLD}22`, overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em" }}>YOUR STATS</div>
                  <div style={{ fontSize: 13, color: `${GOLD}60`, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>vs. Average Member — {tierLabel}</div>
                </div>
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => setStatsOpen(false)}
                  style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.08)", color: GOLD, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</motion.button>
              </div>
              <div style={{ padding: "20px 24px 28px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 14, padding: "8px 12px" }}>
                  {(["METRIC", "YOU", "AVG"] as const).map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 900, color: `${GOLD}55`, letterSpacing: "0.22em", textTransform: "uppercase", textAlign: h === "METRIC" ? "left" : "center" }}>{h}</div>
                  ))}
                </div>
                {STAT_COMPARE.map((s, i) => {
                  const better = s.you >= s.avg;
                  return (
                    <motion.div key={s.label}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.35 }}
                      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: "12px 12px", borderRadius: 8, marginBottom: 4, background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", alignItems: "center" }}>
                      <div style={{ fontSize: 15, color: "rgba(240,232,212,0.72)", letterSpacing: "0.04em" }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: better ? "#32B45A" : GOLD, textAlign: "center" }}>{s.you}{s.unit}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(240,232,212,0.40)", textAlign: "center" }}>{s.avg}{s.unit}</div>
                    </motion.div>
                  );
                })}
                <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 10, background: `rgba(50,180,90,0.07)`, border: "1px solid rgba(50,180,90,0.20)" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#32B45A", letterSpacing: "0.14em", marginBottom: 5 }}>YOUR STANDING</div>
                  <div style={{ fontSize: 16, color: "rgba(240,232,212,0.70)", lineHeight: 1.5 }}>You are performing above average in {STAT_COMPARE.filter(s => s.you >= s.avg).length} of {STAT_COMPARE.length} categories. Keep ascending.</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
