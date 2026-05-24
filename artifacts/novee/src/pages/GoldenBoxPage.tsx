import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useGuest } from "@/context/GuestProfileContext";
import { getVenueLeaderboard } from "@/lib/leaderboardEngine";

const GOLD  = "#D4AF37";
const AMBER = "#C4860A";
const CREAM = "#F0E8D4";
const DARK  = "#0A0700";
const EASE  = [0.22, 1, 0.36, 1] as const;

export type GBTier = "novice" | "enthusiast" | "connoisseur" | "aficionado" | "expert";

function getTier(xp: number): GBTier {
  if (xp >= 20000) return "expert";
  if (xp >= 15000) return "aficionado";
  if (xp >= 5000)  return "connoisseur";
  if (xp >= 1000)  return "enthusiast";
  return "novice";
}

function getNextMilestone(xp: number): { label: string; needed: number } {
  if (xp >= 20000) return { label: "PINNACLE", needed: 0 };
  if (xp >= 15000) return { label: "EXPERT",      needed: 20000 - xp };
  if (xp >= 5000)  return { label: "AFICIONADO",  needed: 15000 - xp };
  if (xp >= 1000)  return { label: "CONNOISSEUR", needed: 5000  - xp };
  return                  { label: "ENTHUSIAST",  needed: 1000  - xp };
}

function FlameEmblem() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke="rgba(200,80,20,0.60)" strokeWidth="1.5" fill="rgba(200,80,20,0.08)" />
      <circle cx="36" cy="36" r="28" stroke="rgba(200,80,20,0.35)" strokeWidth="1" fill="none" />
      <path d="M36 16 C36 16 44 26 44 34 C44 40 40 44 36 46 C32 44 28 40 28 34 C28 26 36 16 36 16Z" fill="url(#nflame1)" opacity="0.9" />
      <path d="M36 26 C36 26 40 32 40 36 C40 39 38 41 36 42 C34 41 32 39 32 36 C32 32 36 26 36 26Z" fill="rgba(255,200,80,0.80)" />
      <defs>
        <linearGradient id="nflame1" x1="36" y1="16" x2="36" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6020" /><stop offset="1" stopColor="#C84010" />
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
      <path d="M36 18 C36 18 42 26 42 31 C42 35 39 37 36 37 C33 37 30 35 30 31 C30 26 36 18 36 18Z" fill="url(#ntorch1)" />
      <path d="M36 24 C36 24 39 29 39 31.5 C39 33 37.5 34 36 34 C34.5 34 33 33 33 31.5 C33 29 36 24 36 24Z" fill="rgba(255,220,100,0.85)" />
      <defs>
        <linearGradient id="ntorch1" x1="36" y1="18" x2="36" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFA040" /><stop offset="1" stopColor="#C06810" />
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
      <path d="M36 18 L50 30 L44 50 L28 50 L22 30 Z" fill="url(#ngem1)" opacity="0.90" />
      <path d="M36 18 L50 30 L36 26 Z" fill="rgba(200,160,255,0.50)" />
      <path d="M28 50 L36 26 L44 50 Z" fill="rgba(160,80,220,0.30)" />
      <defs>
        <linearGradient id="ngem1" x1="36" y1="18" x2="36" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C080FF" /><stop offset="1" stopColor="#7020C0" />
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
      <path d="M24 32 L24 28 L29 31 L36 24 L43 31 L48 28 L48 32 Z" fill={GOLD} opacity="0.90" />
      <rect x="24" y="32" width="24" height="10" rx="2" fill={GOLD} opacity="0.70" />
      <path d="M16 42 Q18 36 22 38 Q18 44 16 42Z" fill="rgba(212,175,55,0.45)" />
      <path d="M16 48 Q19 42 23 45 Q19 50 16 48Z" fill="rgba(212,175,55,0.40)" />
      <path d="M56 42 Q54 36 50 38 Q54 44 56 42Z" fill="rgba(212,175,55,0.45)" />
      <path d="M56 48 Q53 42 49 45 Q53 50 56 48Z" fill="rgba(212,175,55,0.40)" />
      <text x="36" y="64" textAnchor="middle" fontSize="8" fontWeight="900" fill={`${GOLD}CC`} fontFamily="'Inter',sans-serif" letterSpacing="1">IV</text>
    </svg>
  );
}

function ExpertEmblem() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke={`${GOLD}BB`} strokeWidth="1.5" fill={`${GOLD}12`} />
      <circle cx="36" cy="36" r="28" stroke={`${GOLD}66`} strokeWidth="1" fill="none" />
      <path d="M36 18 L39.2 28.2 L50 28.2 L41.4 34.4 L44.6 44.6 L36 38.4 L27.4 44.6 L30.6 34.4 L22 28.2 L32.8 28.2 Z" fill="url(#nexpert1)" opacity="0.90" />
      <defs>
        <linearGradient id="nexpert1" x1="36" y1="18" x2="36" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE080" /><stop offset="1" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <text x="36" y="64" textAnchor="middle" fontSize="8" fontWeight="900" fill={`${GOLD}CC`} fontFamily="'Inter',sans-serif" letterSpacing="1">V</text>
    </svg>
  );
}

const LEVELS = [
  {
    id: "novice" as GBTier, num: 1, badge: <FlameEmblem />,
    title: "NOVICE", sub: "THE BEGINNING", color: "#C84010", glow: "rgba(200,64,16,0.35)",
    desc: "Learn the basics. Score points and build your foundation.",
    skills: ["Learn cigar basics", "Identify simple flavors", "Complete intro challenges"],
    xpRange: "0 – 999 XP", xpMin: 0, xpMax: 999,
  },
  {
    id: "enthusiast" as GBTier, num: 2, badge: <TorchEmblem />,
    title: "ENTHUSIAST", sub: "THE APPRENTICE", color: AMBER, glow: `rgba(196,134,10,0.35)`,
    desc: "Sharpen your skills. Take on more challenges.",
    skills: ["Complete 5 challenges", "Build your first blend", "Beat the daily record"],
    xpRange: "1,000 – 4,999 XP", xpMin: 1000, xpMax: 4999,
  },
  {
    id: "connoisseur" as GBTier, num: 3, badge: <GemEmblem />,
    title: "CONNOISSEUR", sub: "THE REFINED", color: "#9B59B6", glow: "rgba(155,89,182,0.35)",
    desc: "Refine your knowledge. Compete with skilled minds.",
    skills: ["Master pairing notes", "Top-10 leaderboard", "Unlock rare blends"],
    xpRange: "5,000 – 14,999 XP", xpMin: 5000, xpMax: 14999,
  },
  {
    id: "aficionado" as GBTier, num: 4, badge: <LionEmblem />,
    title: "AFICIONADO", sub: "THE MASTER", color: GOLD, glow: `rgba(212,175,55,0.40)`,
    desc: "Master advanced techniques. Earn exclusive rewards.",
    skills: ["Lead the leaderboard", "Mentor a Novice", "Unlock VIP experiences"],
    xpRange: "15,000 – 19,999 XP", xpMin: 15000, xpMax: 19999,
  },
  {
    id: "expert" as GBTier, num: 5, badge: <ExpertEmblem />,
    title: "EXPERT", sub: "THE PINNACLE", color: GOLD, glow: `rgba(212,175,55,0.55)`,
    desc: "Reach the top. Become a true SmokeCraft legend.",
    skills: ["Hold #1 rank", "Earn Founder's Badge", "Invitation-only access"],
    xpRange: "20,000+ XP", xpMin: 20000, xpMax: Infinity,
  },
];

const CHALLENGES = [
  { id: "c1", title: "The First Draw",       xp: 50,   desc: "Experience your first cigar blend",      diff: "NOVICE",      locked: false },
  { id: "c2", title: "The Blend Master",     xp: 250,  desc: "Create a custom wrapper + filler combo",  diff: "ENTHUSIAST",  locked: false },
  { id: "c3", title: "Spirit Harmony",       xp: 500,  desc: "Match a cigar with a premium spirit",     diff: "CONNOISSEUR", locked: false },
  { id: "c4", title: "Reserve Collection",   xp: 1200, desc: "Sample 3 rare reserve blends",            diff: "CONNOISSEUR", locked: false },
  { id: "c5", title: "The Grand Aficionado", xp: 3000, desc: "Complete all VIP experience challenges",  diff: "AFICIONADO",  locked: true  },
  { id: "c6", title: "Founder's Trial",      xp: 5000, desc: "Invitation only — summit-level mastery", diff: "EXCLUSIVE",   locked: true  },
];

const STAT_COMPARE = [
  { label: "Blends Tried",   you: 12,  avg: 7,   unit: ""    },
  { label: "Pairings Saved", you: 5,   avg: 3,   unit: ""    },
  { label: "XP Earned",      you: 840, avg: 520, unit: " XP" },
  { label: "Sessions",       you: 9,   avg: 5,   unit: ""    },
  { label: "Match Score",    you: 88,  avg: 71,  unit: "%"   },
  { label: "Rare Blends",    you: 3,   avg: 1,   unit: ""    },
];

const DEMO_TOP = [
  { name: "TheCigarLion",  score: 18750 },
  { name: "Aficionado_D",  score: 16420 },
  { name: "SmoothDraws",   score: 14980 },
];

interface GoldenBoxPageProps { onBack: () => void; }

export default function GoldenBoxPage({ onBack }: GoldenBoxPageProps) {
  const { profile } = useGuest();
  const xp        = profile.points ?? 0;
  const tier      = getTier(xp);
  const milestone = getNextMilestone(xp);
  const tierLabel = LEVELS.find(l => l.id === tier)?.title ?? "NOVICE";

  const [challengeOpen,   setChallengeOpen]   = useState(false);
  const [statsOpen,       setStatsOpen]       = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

  const xpPercent = (() => {
    if (tier === "novice")      return Math.round((xp / 1000) * 100);
    if (tier === "enthusiast")  return Math.round(((xp - 1000)  / 4000)  * 100);
    if (tier === "connoisseur") return Math.round(((xp - 5000)  / 10000) * 100);
    if (tier === "aficionado")  return Math.round(((xp - 15000) / 5000)  * 100);
    return 100;
  })();

  const liveEntries = getVenueLeaderboard("00000000-0000-0000-0000-000000000001");
  const topThree = (liveEntries.length > 0 ? liveEntries.slice(0, 3) : DEMO_TOP) as Array<{ name: string; score: number }>;

  const NAV_ITEMS = [
    { icon: "⊞", label: "Dashboard", active: true },
    { icon: "📖", label: "Learn" },
    { icon: "⬡",  label: "Challenges" },
    { icon: "◈",  label: "Leaderboard" },
    { icon: "🎁", label: "Rewards" },
    { icon: "🛡",  label: "Badges" },
    { icon: "↑",  label: "My Progress" },
    { icon: "⚙",  label: "Settings" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      background: "#060400",
      display: "flex",
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
      overflow: "hidden",
    }}>
      {/* ── AMBIENT BG ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 55% at 50% 0%, ${GOLD}09 0%, transparent 60%)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: `radial-gradient(ellipse 100% 80% at 50% 100%, ${AMBER}0A 0%, transparent 70%)` }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.012) 1px, transparent 2px, transparent 14px)", opacity: 0.4 }} />
      </div>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: 162, flexShrink: 0,
        background: "rgba(0,0,0,0.68)",
        borderRight: `1px solid rgba(212,175,55,0.11)`,
        display: "flex", flexDirection: "column",
        zIndex: 10, position: "relative",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "18px 14px 14px", borderBottom: `1px solid rgba(212,175,55,0.09)` }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: GOLD, letterSpacing: "0.04em", lineHeight: 1.1 }}>SMOKECRAFT <span style={{ color: CREAM }}>360</span></div>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.32em", color: `${GOLD}44`, textTransform: "uppercase", marginTop: 4 }}>KIOSK EDITION</div>
        </div>
        {/* Nav */}
        {NAV_ITEMS.map(item => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 14px",
            background: item.active ? `rgba(212,175,55,0.09)` : "transparent",
            borderLeft: item.active ? `3px solid ${GOLD}` : "3px solid transparent",
            cursor: "pointer",
          }}>
            <span style={{ fontSize: 14, color: item.active ? GOLD : "rgba(240,232,212,0.38)", width: 18, textAlign: "center" }}>{item.icon}</span>
            <span style={{ fontSize: 13, fontWeight: item.active ? 800 : 500, color: item.active ? GOLD : "rgba(240,232,212,0.50)", letterSpacing: "0.03em" }}>{item.label}</span>
          </div>
        ))}
        {/* Mini Golden Box teaser */}
        <div style={{ margin: "auto 12px 14px", padding: "12px 10px", borderRadius: 10, background: `rgba(212,175,55,0.05)`, border: `1px solid ${GOLD}1A` }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 4 }}>THE GOLDEN BOX</div>
          <div style={{ fontSize: 8, color: `${GOLD}50`, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>COMPETE. LEARN. ASCEND.</div>
          <div style={{ width: "100%", height: 56, borderRadius: 8, background: `linear-gradient(160deg, ${GOLD}14, ${AMBER}09)`, border: `1px solid ${GOLD}1A`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 9, color: "rgba(240,232,212,0.38)", lineHeight: 1.55, textAlign: "center" }}>Every decision builds your mastery. Earn your place.</div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 10 }}>

        {/* TOP HEADER BAR */}
        <div style={{ padding: "11px 20px", borderBottom: `1px solid rgba(212,175,55,0.11)`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "rgba(0,0,0,0.35)" }}>
          <motion.button type="button" onClick={onBack} whileTap={{ scale: 0.94 }}
            style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}44`, color: GOLD, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            ← BACK
          </motion.button>
          <div style={{ flex: 1 }} />
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setStatsOpen(true)}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.07)", color: GOLD, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.13em", textTransform: "uppercase" }}>
            ◈ COMPARE STATS
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setChallengeOpen(true)}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, color: DARK, fontSize: 12, fontWeight: 900, cursor: "pointer", letterSpacing: "0.13em", textTransform: "uppercase", boxShadow: `0 0 14px ${GOLD}33` }}>
            ⬡ OPEN CHALLENGE
          </motion.button>
          {/* Profile chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: DARK, flexShrink: 0 }}>
              {profile.firstName?.[0]?.toUpperCase() ?? "G"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: CREAM, lineHeight: 1, letterSpacing: "0.02em" }}>{profile.firstName || "Guest"}</div>
              <div style={{ fontSize: 9, color: `${GOLD}66`, letterSpacing: "0.12em", marginTop: 1 }}>Rank Contestant</div>
            </div>
          </div>
        </div>

        {/* RANK BAR */}
        <div style={{ padding: "13px 20px", borderBottom: `1px solid rgba(212,175,55,0.09)`, display: "flex", alignItems: "center", gap: 0, flexShrink: 0, background: "rgba(0,0,0,0.38)" }}>
          {/* YOUR RANK */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 22, borderRight: `1px solid rgba(212,175,55,0.13)`, marginRight: 22 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}20, ${AMBER}0E)`, border: `1.5px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>♛</div>
            <div>
              <div style={{ fontSize: 9, color: "rgba(240,232,212,0.40)", letterSpacing: "0.24em", textTransform: "uppercase", marginBottom: 1 }}>Your Rank</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: GOLD, letterSpacing: "0.07em", lineHeight: 1 }}>{tierLabel}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,232,212,0.50)", marginTop: 2 }}>{xp.toLocaleString()} XP</div>
              <div style={{ marginTop: 5, height: 3, width: 110, borderRadius: 2, background: "rgba(212,175,55,0.13)", overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(xpPercent, 100)}%` }} transition={{ duration: 1.2, ease: EASE }}
                  style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${AMBER}, ${GOLD})` }} />
              </div>
              <div style={{ fontSize: 9, color: "rgba(240,232,212,0.32)", marginTop: 3, letterSpacing: "0.09em" }}>Next Rank: <span style={{ color: `${GOLD}99` }}>{milestone.label}</span></div>
            </div>
          </div>
          {/* NEXT RANK */}
          <div style={{ paddingRight: 22, borderRight: `1px solid rgba(212,175,55,0.13)`, marginRight: 22 }}>
            <div style={{ fontSize: 9, color: "rgba(240,232,212,0.38)", letterSpacing: "0.24em", textTransform: "uppercase", marginBottom: 3 }}>Next Rank</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#9B59B6", letterSpacing: "0.05em" }}>{milestone.label}</div>
            <div style={{ fontSize: 11, color: "rgba(240,232,212,0.45)", marginTop: 2 }}>
              {milestone.needed > 0 ? `${milestone.needed.toLocaleString()} XP to go` : "PEAK ACHIEVED"}
            </div>
          </div>
          {/* REWARDS */}
          <div style={{ paddingRight: 22, borderRight: `1px solid rgba(212,175,55,0.13)`, marginRight: 22, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🎁</div>
            <div style={{ fontSize: 11, color: `${GOLD}77`, letterSpacing: "0.11em", cursor: "pointer" }}>View rewards</div>
          </div>
          {/* BADGES */}
          <div style={{ paddingRight: 22, borderRight: `1px solid rgba(212,175,55,0.13)`, marginRight: 22, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🛡️</div>
            <div style={{ fontSize: 11, color: `${GOLD}77`, letterSpacing: "0.11em", cursor: "pointer" }}>View badges</div>
          </div>
          <div style={{ flex: 1 }} />
          {/* SELECT MENTOR CTA */}
          <motion.div whileTap={{ scale: 0.97 }} style={{ padding: "12px 20px", borderRadius: 10, background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, cursor: "pointer", textAlign: "center", boxShadow: `0 0 22px ${GOLD}2A` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: DARK, letterSpacing: "0.11em", textTransform: "uppercase" }}>SELECT MENTOR →</div>
            <div style={{ fontSize: 9, color: `${DARK}88`, marginTop: 3, letterSpacing: "0.10em" }}>Get guidance. Climb faster.</div>
          </motion.div>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 16px", display: "flex", gap: 16 }}>

          {/* CENTER MAIN */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* CONTEST LEVELS */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 13 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: CREAM, letterSpacing: "0.22em", textTransform: "uppercase" }}>CONTEST LEVELS</div>
                <div style={{ fontSize: 11, color: "rgba(240,232,212,0.38)", letterSpacing: "0.10em" }}>Progress through the ranks. Master the leaf.</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {LEVELS.map((lv, i) => {
                  const isActive = lv.id === tier;
                  const isPast   = xp >= lv.xpMin;
                  return (
                    <motion.div key={lv.id}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + i * 0.07, duration: 0.48, ease: EASE }}
                      style={{
                        borderRadius: 12,
                        border: isActive ? `1.5px solid ${lv.color}88` : `1px solid rgba(212,175,55,${isPast ? "0.20" : "0.08"})`,
                        background: isActive ? `linear-gradient(160deg, rgba(0,0,0,0.97), ${lv.color}0E)` : "rgba(8,5,1,0.80)",
                        boxShadow: isActive ? `0 0 22px ${lv.glow}` : "none",
                        padding: "14px 10px 12px",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        position: "relative",
                      }}>
                      {isActive && <div style={{ position: "absolute", top: -1, left: "18%", right: "18%", height: 2, background: `linear-gradient(90deg, transparent, ${lv.color}, transparent)` }} />}
                      <div style={{ fontSize: 11, fontWeight: 900, color: `${lv.color}88`, letterSpacing: "0.20em", marginBottom: 8 }}>{lv.num}</div>
                      <div style={{ marginBottom: 8, transform: "scale(0.60)", transformOrigin: "center" }}>{lv.badge}</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: isActive ? lv.color : "rgba(240,232,212,0.72)", letterSpacing: "0.09em", textAlign: "center", marginBottom: 4 }}>{lv.title}</div>
                      <div style={{ fontSize: 9, color: "rgba(240,232,212,0.38)", textAlign: "center", lineHeight: 1.55, marginBottom: isActive ? 10 : 0 }}>{lv.desc}</div>
                      {isActive && (
                        <div style={{ width: "100%", height: 3, borderRadius: 2, background: "rgba(212,175,55,0.14)", overflow: "hidden", marginTop: "auto" }}>
                          <div style={{ width: `${Math.min(xpPercent, 100)}%`, height: "100%", background: `linear-gradient(90deg, ${lv.color}88, ${lv.color})`, borderRadius: 2 }} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* HOW IT WORKS */}
            <div style={{ padding: "15px 18px", borderRadius: 12, background: "rgba(0,0,0,0.42)", border: `1px solid rgba(212,175,55,0.09)` }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: GOLD, letterSpacing: "0.26em", textTransform: "uppercase", marginBottom: 14 }}>HOW IT WORKS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
                {[
                  { icon: "XP", label: "Earn Points",    desc: "Complete actions & challenges to earn XP." },
                  { icon: "↑",  label: "Climb Ranks",    desc: "Gain XP to move up and unlock new levels." },
                  { icon: "🔓", label: "Unlock Rewards", desc: "New blends, gear, and experiences await." },
                  { icon: "🏆", label: "Win",            desc: "Reach the top and earn exclusive status." },
                ].map(step => (
                  <div key={step.label} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `rgba(212,175,55,0.09)`, border: `1px solid ${GOLD}2A`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: GOLD, flexShrink: 0 }}>{step.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: CREAM, marginBottom: 3, letterSpacing: "0.03em" }}>{step.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(240,232,212,0.42)", lineHeight: 1.55 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 158px", gap: 14 }}>

              {/* LIVE LEADERBOARD */}
              <div style={{ padding: "15px 16px", borderRadius: 12, background: "rgba(0,0,0,0.50)", border: `1px solid rgba(212,175,55,0.11)` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 5px #32B45A" }} />
                    <div style={{ fontSize: 13, fontWeight: 900, color: CREAM, letterSpacing: "0.15em", textTransform: "uppercase" }}>Live Leaderboard</div>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(240,232,212,0.28)", letterSpacing: "0.14em" }}>
                    {liveEntries.length > 0 ? `${liveEntries.length} ranked` : "Updated Just Now"}
                  </div>
                </div>
                {topThree.map((entry, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: i < 2 ? `1px solid rgba(212,175,55,0.07)` : "none" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : "rgba(212,175,55,0.10)", border: `1px solid ${i === 0 ? GOLD : "rgba(212,175,55,0.22)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: i === 0 ? DARK : GOLD, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: `rgba(212,175,55,0.14)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: GOLD, flexShrink: 0 }}>{entry.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: CREAM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, flexShrink: 0 }}>{entry.score.toLocaleString()} XP</div>
                  </div>
                ))}
                <motion.button type="button" whileTap={{ scale: 0.97 }}
                  style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${GOLD}3A`, background: "rgba(212,175,55,0.05)", color: GOLD, fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  VIEW FULL LEADERBOARD
                </motion.button>
              </div>

              {/* EARN XP TODAY */}
              <div style={{ padding: "15px 16px", borderRadius: 12, background: "rgba(0,0,0,0.50)", border: `1px solid rgba(212,175,55,0.11)` }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: CREAM, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 13 }}>EARN XP TODAY</div>
                {[
                  { label: "Complete a Challenge",  xp: 250, done: false },
                  { label: "Submit a Tasting Note", xp: 100, done: false },
                  { label: "Daily Login",            xp: 50,  done: true  },
                  { label: "Help Another Member",    xp: 75,  done: false },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: i < 3 ? `1px solid rgba(212,175,55,0.07)` : "none" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(255,255,255,0.03)", border: `1px solid rgba(212,175,55,0.16)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: GOLD }}>⬡</div>
                    <div style={{ flex: 1, fontSize: 12, color: "rgba(240,232,212,0.68)", letterSpacing: "0.01em" }}>{item.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, flexShrink: 0 }}>+{item.xp} XP</div>
                    {item.done ? (
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(50,180,90,0.14)", border: "1px solid rgba(50,180,90,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#32B45A", flexShrink: 0 }}>✓</div>
                    ) : (
                      <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => setChallengeOpen(true)}
                        style={{ width: 26, height: 26, borderRadius: 6, background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, border: "none", color: DARK, fontSize: 9, fontWeight: 900, cursor: "pointer", flexShrink: 0 }}>GO</motion.button>
                    )}
                  </div>
                ))}
              </div>

              {/* YOUR PROGRESS circle */}
              <div style={{ padding: "15px 12px", borderRadius: 12, background: "rgba(0,0,0,0.50)", border: `1px solid rgba(212,175,55,0.11)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: CREAM, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>YOUR PROGRESS</div>
                <div style={{ position: "relative", width: 108, height: 108 }}>
                  <svg width="108" height="108" viewBox="0 0 108 108">
                    <circle cx="54" cy="54" r="43" fill="none" stroke="rgba(212,175,55,0.10)" strokeWidth="8" />
                    <circle cx="54" cy="54" r="43" fill="none" stroke={GOLD} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.min(xpPercent, 100) * 2.703} 270.3`}
                      strokeDashoffset="67.6"
                      style={{ filter: `drop-shadow(0 0 5px ${GOLD}55)`, transition: "stroke-dasharray 1.2s ease" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{xp.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: "rgba(240,232,212,0.42)", letterSpacing: "0.18em", marginTop: 3 }}>XP</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: GOLD, textAlign: "center", letterSpacing: "0.07em" }}>{tierLabel}</div>
                {milestone.needed > 0 && (
                  <div style={{ fontSize: 10, color: "rgba(240,232,212,0.38)", textAlign: "center", marginTop: 4, lineHeight: 1.45 }}>
                    {milestone.needed.toLocaleString()} XP<br />to {milestone.label}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 238, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* YOUR JOURNEY */}
            <div style={{ padding: "15px 15px", borderRadius: 12, background: "rgba(0,0,0,0.55)", border: `1px solid rgba(212,175,55,0.11)` }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: GOLD, letterSpacing: "0.26em", textTransform: "uppercase", marginBottom: 14 }}>YOUR JOURNEY</div>
              {LEVELS.slice().reverse().map((lv, i) => {
                const isActive = lv.id === tier;
                const isPast   = xp >= lv.xpMin && !isActive;
                return (
                  <div key={lv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < LEVELS.length - 1 ? `1px solid rgba(212,175,55,0.07)` : "none" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: isActive ? `linear-gradient(135deg, ${lv.color}CC, ${lv.color}77)` : isPast ? "rgba(50,180,90,0.14)" : "rgba(212,175,55,0.07)",
                      border: `1.5px solid ${isActive ? lv.color : isPast ? "rgba(50,180,90,0.38)" : "rgba(212,175,55,0.18)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900,
                      color: isActive ? "#000" : isPast ? "#32B45A" : "rgba(212,175,55,0.40)",
                    }}>
                      {LEVELS.length - i}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 900 : 600, color: isActive ? lv.color : isPast ? CREAM : "rgba(240,232,212,0.40)", letterSpacing: "0.05em" }}>{lv.title}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? `${GOLD}88` : "rgba(240,232,212,0.28)", letterSpacing: "0.05em" }}>
                      {isActive ? `${xp.toLocaleString()} XP` : lv.xpMin > 0 ? `${lv.xpMin.toLocaleString()} XP` : "0 XP"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NEXT REWARD */}
            <div style={{ padding: "15px 15px", borderRadius: 12, background: "rgba(0,0,0,0.55)", border: `1px solid rgba(212,175,55,0.11)` }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: GOLD, letterSpacing: "0.26em", textTransform: "uppercase", marginBottom: 3 }}>NEXT REWARD</div>
              <div style={{ fontSize: 10, color: "rgba(240,232,212,0.38)", letterSpacing: "0.14em", marginBottom: 13 }}>At {milestone.label} Rank</div>
              <div style={{ width: "100%", height: 78, borderRadius: 9, background: `linear-gradient(160deg, ${GOLD}12, ${AMBER}07)`, border: `1px solid ${GOLD}1A`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 12 }}>🎁</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: CREAM, marginBottom: 4, letterSpacing: "0.03em" }}>Premium Tasting Kit</div>
              <div style={{ fontSize: 11, color: "rgba(240,232,212,0.46)", lineHeight: 1.55, marginBottom: 13 }}>Exclusive blend collection &amp; accessories.</div>
              {milestone.needed > 0 && (
                <>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(212,175,55,0.10)", overflow: "hidden", marginBottom: 5 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(xpPercent, 100)}%` }} transition={{ duration: 1.2, ease: EASE }}
                      style={{ height: "100%", background: `linear-gradient(90deg, ${AMBER}, ${GOLD})`, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(240,232,212,0.36)", textAlign: "right", letterSpacing: "0.10em" }}>{milestone.needed.toLocaleString()} to go</div>
                </>
              )}
            </div>

            {/* VIEW LEADERBOARD */}
            <motion.button type="button" whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "13px", borderRadius: 10, border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.07)", color: GOLD, fontSize: 12, fontWeight: 900, cursor: "pointer", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              VIEW LEADERBOARD
            </motion.button>
          </div>
        </div>

        {/* STATUS BAR */}
        <div style={{ flexShrink: 0, borderTop: `1px solid rgba(212,175,55,0.09)`, padding: "7px 18px", background: "rgba(0,0,0,0.58)", display: "flex", alignItems: "center", gap: 22, overflow: "hidden" }}>
          {[
            { icon: "⚙",  label: "E.A.T. INTELLIGENCE", sub: "Environmental · Asset · Transaction" },
            { icon: "🌡", label: "LOUNGE TEMP",          sub: "68°F" },
            { icon: "💧", label: "HUMIDITY",             sub: "72%" },
            { icon: "⬡",  label: "HUMIDOR COUNT",        sub: "145 Puros" },
            { icon: "✓",  label: "LOUNGE MODE",          sub: "Active" },
            { icon: "⚡", label: "POS TRANSACTION",      sub: "Authenticated" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: GOLD }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 7, fontWeight: 900, color: `${GOLD}55`, letterSpacing: "0.24em", textTransform: "uppercase" }}>{item.label}</div>
                <div style={{ fontSize: 10, color: "rgba(240,232,212,0.50)", letterSpacing: "0.07em" }}>{item.sub}</div>
              </div>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, color: `${GOLD}44`, letterSpacing: "0.16em", cursor: "pointer", flexShrink: 0 }}>OPEN COMMAND CENTER ›</div>
        </div>
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

      {/* ── STATS MODAL ── */}
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
