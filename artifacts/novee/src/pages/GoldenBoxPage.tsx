import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useGuest } from "@/context/GuestProfileContext";
import { socket } from "@/lib/socket";
import {
  Award,
  Badge,
  BookOpen,
  Box,
  Crown,
  Flame,
  Gift,
  LockKeyhole,
  Medal,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const GOLD  = "#D4AF37";
const AMBER = "#C4860A";
const CREAM = "#F0E8D4";
const DARK  = "#060400";
const EASE  = [0.22, 1, 0.36, 1] as const;

export type GBTier = "initiate" | "novice" | "enthusiast" | "connoisseur" | "aficionado" | "master";

interface LeaderEntry {
  rank: number;
  guestProfileId: string | null;
  firstName: string;
  lastInitial: string;
  craftScore: number;
  totalXp: number;
  achievementCnt: number;
  tier: string;
  tierLabel: string;
  tierColor: string;
}

const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL?.replace(/\/$/, "") ?? "";

const DEMO_LEADER: LeaderEntry[] = [
  { rank: 1, guestProfileId: "d1", firstName: "TheCigarLion",  lastInitial: "",  craftScore: 100, totalXp: 38750, achievementCnt: 7, tier: "master",     tierLabel: "Master",     tierColor: "#FFD700" },
  { rank: 2, guestProfileId: "d2", firstName: "AficionadoD",   lastInitial: "D", craftScore:  87, totalXp: 26420, achievementCnt: 6, tier: "aficionado",  tierLabel: "Aficionado", tierColor: GOLD      },
  { rank: 3, guestProfileId: "d3", firstName: "SmoothDraws",   lastInitial: "",  craftScore:  76, totalXp: 18980, achievementCnt: 8, tier: "connoisseur", tierLabel: "Connoisseur",tierColor: "#CE93D8" },
  { rank: 4, guestProfileId: "d4", firstName: "Ash & Oak",     lastInitial: "",  craftScore:  67, totalXp: 13250, achievementCnt: 5, tier: "connoisseur", tierLabel: "Connoisseur",tierColor: "#CE93D8" },
  { rank: 5, guestProfileId: "d5", firstName: "LeafScholar",   lastInitial: "",  craftScore:  63, totalXp:  7760, achievementCnt: 6, tier: "enthusiast",  tierLabel: "Enthusiast", tierColor: AMBER     },
  { rank: 6, guestProfileId: "d6", firstName: "CigarSensei",   lastInitial: "",  craftScore:  58, totalXp:  6200, achievementCnt: 4, tier: "enthusiast",  tierLabel: "Enthusiast", tierColor: AMBER     },
  { rank: 7, guestProfileId: "d7", firstName: "PuffProfessor", lastInitial: "",  craftScore:  51, totalXp:  3800, achievementCnt: 3, tier: "novice",      tierLabel: "Novice",     tierColor: "#C84010" },
  { rank: 8, guestProfileId: "d8", firstName: "VintageVisions",lastInitial: "",  craftScore:  44, totalXp:  2100, achievementCnt: 2, tier: "novice",      tierLabel: "Novice",     tierColor: "#C84010" },
];

const JOURNEY = [
  { id: "initiate",    num: 1, title: "INITIATE",          sub: "The Beginning",       xpMin: 0,     color: "#6B8A9A", glow: "rgba(107,138,154,0.40)", Icon: Medal,    desc: "Begin your mastery journey", xpLabel: "Start" },
  { id: "novice",      num: 2, title: "NOVICE",            sub: "Learn the Leaf",      xpMin: 1000,  color: "#C84010", glow: "rgba(200,64,16,0.40)",   Icon: Flame,    desc: "Build your foundation",      xpLabel: "1,000 XP" },
  { id: "enthusiast",  num: 3, title: "ENTHUSIAST",        sub: "Sharpen Your Craft",  xpMin: 5000,  color: AMBER,     glow: "rgba(196,134,10,0.40)",  Icon: Sparkles, desc: "Deepen your knowledge",     xpLabel: "5,000 XP" },
  { id: "connoisseur", num: 4, title: "CONNOISSEUR",       sub: "Refine Your Palate",  xpMin: 12000, color: "#9B59B6", glow: "rgba(155,89,182,0.40)",  Icon: Award,    desc: "Compete with the elite",    xpLabel: "12,000 XP" },
  { id: "aficionado",  num: 5, title: "AFICIONADO",        sub: "Command the Lounge",  xpMin: 20000, color: GOLD,      glow: "rgba(212,175,55,0.45)",  Icon: Crown,    desc: "Earn exclusive privileges", xpLabel: "20,000 XP" },
  { id: "master",      num: 6, title: "MASTER OF THE LEAF",sub: "Legendary Status",    xpMin: 35000, color: "#FFD700", glow: "rgba(255,215,0,0.55)",   Icon: Trophy,   desc: "Become a NOVEE OS legend",  xpLabel: "35,000 XP" },
];

const HOW_STEPS = [
  { num: 1, Icon: Swords,     title: "Complete Challenges",   desc: "Take on daily & weekly challenges across the NOVEE OS platform" },
  { num: 2, Icon: Sparkles,   title: "Earn XP",               desc: "Every action, pairing, and tasting note awards you XP" },
  { num: 3, Icon: TrendingUp, title: "Rank Up",               desc: "Rise through 6 prestige tiers from Initiate to Master" },
  { num: 4, Icon: Gift,       title: "Unlock Rewards",        desc: "Exclusive collections, badges, and lounge privileges" },
  { num: 5, Icon: Trophy,     title: "Compete",               desc: "Climb the live leaderboard and prove your mastery" },
];

const XP_ACTIONS = [
  { Icon: Sparkles, label: "DAILY LOGIN",           xp: 50,  color: AMBER,     cta: "CLAIM" },
  { Icon: Award,    label: "COMPLETE PAIRING",       xp: 300, color: "#9B59B6", cta: "GO"    },
  { Icon: BookOpen, label: "SUBMIT TASTING NOTES",   xp: 150, color: "#2ECC71", cta: "GO"    },
  { Icon: Trophy,   label: "WIN WEEKLY CHALLENGE",   xp: 500, color: GOLD,      cta: "GO"    },
];

const REWARDS = [
  { Icon: Badge,   title: "Collectible Card",    desc: "First prestige card",       unlockAt: "NOVICE",            color: "#C84010", locked: false },
  { Icon: Medal,   title: "Mentor Unlock",       desc: "Your personal cigar guide", unlockAt: "ENTHUSIAST",        color: AMBER,     locked: true  },
  { Icon: Box,     title: "Elite Cigar Box",     desc: "Curated reserve collection",unlockAt: "CONNOISSEUR",       color: "#9B59B6", locked: true  },
  { Icon: Shield,  title: "Rare Badge Set",      desc: "Collector tier emblems",    unlockAt: "CONNOISSEUR",       color: "#9B59B6", locked: true  },
  { Icon: Crown,   title: "Private Lounge Pass", desc: "VIP lounge access",         unlockAt: "AFICIONADO",        color: GOLD,      locked: true  },
  { Icon: Sparkles,title: "Seasonal Collection", desc: "Limited edition blends",    unlockAt: "MASTER OF THE LEAF",color: "#FFD700", locked: true  },
];

const CHALLENGES = [
  { id: "c1", title: "The First Draw",       xp: 50,   desc: "Experience your first cigar blend",     diff: "INITIATE",   locked: false },
  { id: "c2", title: "The Blend Master",     xp: 250,  desc: "Create a custom wrapper + filler combo", diff: "NOVICE",     locked: false },
  { id: "c3", title: "Spirit Harmony",       xp: 500,  desc: "Match a cigar with a premium spirit",    diff: "ENTHUSIAST", locked: false },
  { id: "c4", title: "Reserve Collection",   xp: 1200, desc: "Sample 3 rare reserve blends",           diff: "CONNOISSEUR",locked: false },
  { id: "c5", title: "The Grand Aficionado", xp: 3000, desc: "Complete all VIP experience challenges", diff: "AFICIONADO", locked: true  },
  { id: "c6", title: "Founder's Trial",      xp: 5000, desc: "Invitation only — summit-level mastery", diff: "EXCLUSIVE",  locked: true  },
];

function getTier(xp: number): GBTier {
  if (xp >= 35000) return "master";
  if (xp >= 20000) return "aficionado";
  if (xp >= 12000) return "connoisseur";
  if (xp >= 5000)  return "enthusiast";
  if (xp >= 1000)  return "novice";
  return "initiate";
}

function getXpPercent(xp: number, tier: GBTier): number {
  if (tier === "initiate")    return Math.round((xp / 1000) * 100);
  if (tier === "novice")      return Math.round(((xp - 1000)  / 4000)  * 100);
  if (tier === "enthusiast")  return Math.round(((xp - 5000)  / 7000)  * 100);
  if (tier === "connoisseur") return Math.round(((xp - 12000) / 8000)  * 100);
  if (tier === "aficionado")  return Math.round(((xp - 20000) / 15000) * 100);
  return 100;
}

function getNextLabel(tier: GBTier): string {
  if (tier === "initiate")    return "NOVICE";
  if (tier === "novice")      return "ENTHUSIAST";
  if (tier === "enthusiast")  return "CONNOISSEUR";
  if (tier === "connoisseur") return "AFICIONADO";
  if (tier === "aficionado")  return "MASTER OF THE LEAF";
  return "PINNACLE";
}

function getXpNeeded(xp: number, tier: GBTier): number {
  if (tier === "initiate")    return 1000  - xp;
  if (tier === "novice")      return 5000  - xp;
  if (tier === "enthusiast")  return 12000 - xp;
  if (tier === "connoisseur") return 20000 - xp;
  if (tier === "aficionado")  return 35000 - xp;
  return 0;
}

interface GoldenBoxPageProps { onBack: () => void; }

export default function GoldenBoxPage({ onBack }: GoldenBoxPageProps) {
  const { profile } = useGuest();
  const xp       = profile.points ?? 183;
  const tier     = getTier(xp);
  const tierData = JOURNEY.find(j => j.id === tier) ?? JOURNEY[0];
  const xpPct    = getXpPercent(xp, tier);
  const xpNeeded = getXpNeeded(xp, tier);
  const nextLabel = getNextLabel(tier);

  const [activeNav,      setActiveNav]      = useState<"dashboard" | "leaderboard">("dashboard");
  const [challengeOpen,  setChallengeOpen]  = useState(false);
  const [leaderEntries,  setLeaderEntries]  = useState<LeaderEntry[]>([]);
  const [leaderLoading,  setLeaderLoading]  = useState(true);
  const [leaderUpdated,  setLeaderUpdated]  = useState("just now");
  const prevRanks = useRef<Map<string, number>>(new Map());

  function applyEntries(incoming: LeaderEntry[]) {
    incoming.forEach(e => { if (e.guestProfileId) prevRanks.current.set(e.guestProfileId, e.rank); });
    setLeaderEntries(incoming.slice(0, 20));
    setLeaderUpdated("just now");
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchLeaderboard() {
      try {
        const res  = await fetch(`${BASE_URL}/api/leaderboard?limit=20`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as { entries?: LeaderEntry[] };
        applyEntries(data.entries ?? []);
      } catch { /* use demo */ }
      finally { if (!cancelled) setLeaderLoading(false); }
    }
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    function onUpdate(data: { entries?: LeaderEntry[] }) {
      if (!cancelled) applyEntries(data.entries ?? []);
    }
    socket.on("leaderboard_update", onUpdate);
    return () => { cancelled = true; clearInterval(interval); socket.off("leaderboard_update", onUpdate); };
  }, []);

  const displayEntries = leaderEntries.length > 0 ? leaderEntries : DEMO_LEADER;

  function handleBack() {
    if (activeNav !== "dashboard") { setActiveNav("dashboard"); return; }
    onBack();
  }

  const NAV_ITEMS = [
    { key: "dashboard",   Icon: Box,        label: "Dashboard"   },
    { key: "leaderboard", Icon: Trophy,     label: "Leaderboard" },
    { key: "challenges",  Icon: Swords,     label: "Challenges"  },
    { key: "rewards",     Icon: Gift,       label: "Rewards"     },
    { key: "badges",      Icon: Shield,     label: "Badges"      },
    { key: "progress",    Icon: TrendingUp, label: "My Progress"  },
  ] as { key: string; Icon: LucideIcon; label: string }[];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      background: DARK,
      display: "flex",
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
      overflow: "hidden",
    }}>
      {/* ── AMBIENT BACKGROUND ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${GOLD}0B 0%, transparent 65%)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", background: `radial-gradient(ellipse 100% 80% at 50% 100%, ${AMBER}09 0%, transparent 70%)` }} />
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: "10%", left: "20%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}06 0%, transparent 70%)`, filter: "blur(40px)" }} />
        <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{ position: "absolute", top: "30%", right: "15%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${AMBER}08 0%, transparent 70%)`, filter: "blur(30px)" }} />
      </div>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: 176, flexShrink: 0,
        background: "rgba(0,0,0,0.72)",
        borderRight: `1px solid rgba(212,175,55,0.13)`,
        display: "flex", flexDirection: "column",
        zIndex: 10, position: "relative",
      }}>
        <div style={{ padding: "22px 16px 16px", borderBottom: `1px solid rgba(212,175,55,0.10)` }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: GOLD, letterSpacing: "0.05em", lineHeight: 1.1 }}>NOVEE</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: CREAM, letterSpacing: "0.05em" }}>OS</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: `${GOLD}50`, textTransform: "uppercase", marginTop: 5 }}>KIOSK EDITION</div>
        </div>
        {NAV_ITEMS.map(item => {
          const isActive = item.key === activeNav;
          return (
            <motion.div key={item.key} whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (item.key === "challenges") { setChallengeOpen(true); return; }
                if (item.key === "leaderboard") { setActiveNav("leaderboard"); return; }
                setActiveNav("dashboard");
              }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px", cursor: "pointer",
                background: isActive ? `rgba(212,175,55,0.10)` : "transparent",
                borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
                transition: "background 0.2s",
              }}>
              <item.Icon size={16} color={isActive ? GOLD : "rgba(240,232,212,0.42)"} style={{ width: 20 }} />
              <span style={{ fontSize: 14, fontWeight: isActive ? 800 : 500, color: isActive ? GOLD : "rgba(240,232,212,0.50)", letterSpacing: "0.03em" }}>{item.label}</span>
            </motion.div>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ margin: "0 12px 16px", padding: "14px 12px", borderRadius: 10, background: `rgba(212,175,55,0.05)`, border: `1px solid ${GOLD}1A` }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: GOLD, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>THE GOLDEN BOX</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Trophy size={28} color={GOLD} strokeWidth={1.8} /></div>
          <div style={{ fontSize: 10, color: "rgba(240,232,212,0.38)", lineHeight: 1.6, textAlign: "center" }}>Study the leaf.<br />Earn your place.</div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 10 }}>

        {/* ── TOP HEADER BAR ── */}
        <div style={{
          padding: "12px 24px", borderBottom: `1px solid rgba(212,175,55,0.12)`,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          background: "rgba(0,0,0,0.40)",
        }}>
          <motion.button type="button" onClick={handleBack} whileTap={{ scale: 0.94 }}
            style={{ padding: "10px 20px", borderRadius: 8, background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}44`, color: GOLD, fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase", minHeight: 44 }}>
            {activeNav === "dashboard" ? "← BACK" : "← DASHBOARD"}
          </motion.button>
          <div style={{ flex: 1 }} />
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setChallengeOpen(true)}
            style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.07)", color: GOLD, fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", textTransform: "uppercase", minHeight: 44 }}>
            RESET BLEND
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }}
            style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.07)", color: GOLD, fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", textTransform: "uppercase", minHeight: 44 }}>
            COACH HELP
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, color: DARK, fontSize: 14, fontWeight: 900, cursor: "pointer", letterSpacing: "0.12em", textTransform: "uppercase", boxShadow: `0 0 16px ${GOLD}40`, minHeight: 44 }}>
            LAUNCH TERMINAL (POS 3)
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }}
            style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid rgba(255,100,100,0.30)`, background: "rgba(255,100,100,0.06)", color: "rgba(255,140,140,0.80)", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", textTransform: "uppercase", minHeight: 44 }}>
            PROFILE RESET
          </motion.button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: DARK }}>
              {profile.firstName?.[0]?.toUpperCase() ?? "G"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{profile.firstName ?? "Guest"}</div>
              <div style={{ fontSize: 11, color: `${GOLD}88`, fontWeight: 600 }}>{tierData.title}</div>
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════
                DASHBOARD VIEW
            ═══════════════════════════════════════ */}
            {activeNav === "dashboard" && (
              <motion.div key="dashboard"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}>

                {/* ── HERO SECTION ── */}
                <div style={{ position: "relative", padding: "52px 40px 44px", textAlign: "center", overflow: "hidden", borderBottom: `1px solid rgba(212,175,55,0.10)` }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(212,175,55,0.05) 0%, transparent 100%)", pointerEvents: "none" }} />
                  <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 500, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.40em", color: `${GOLD}80`, textTransform: "uppercase", marginBottom: 16 }}>NOVEE OS — KIOSK EDITION</div>
                    <div style={{ fontSize: 68, fontWeight: 900, color: GOLD, letterSpacing: "0.06em", lineHeight: 1.0, textTransform: "uppercase",
                      textShadow: `0 0 60px ${GOLD}50, 0 0 120px ${GOLD}20`,
                      fontFamily: "'Cormorant Garamond','Georgia',serif" }}>
                      THE GOLDEN BOX
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 300, color: "rgba(240,232,212,0.65)", letterSpacing: "0.30em", textTransform: "uppercase", marginTop: 14 }}>
                      Compete. Learn. Ascend.
                    </div>
                  </motion.div>
                </div>

                {/* ── RANK PROGRESS BAR ── */}
                <div style={{ padding: "24px 40px", background: "rgba(0,0,0,0.30)", borderBottom: `1px solid rgba(212,175,55,0.10)`, display: "flex", alignItems: "center", gap: 28 }}>
                  <div style={{ textAlign: "center", minWidth: 140 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: `${GOLD}66`, letterSpacing: "0.24em", textTransform: "uppercase", marginBottom: 4 }}>YOUR RANK</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: tierData.color, letterSpacing: "0.04em", textShadow: `0 0 20px ${tierData.color}60` }}>{tierData.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(240,232,212,0.50)", marginTop: 2 }}>{xp.toLocaleString()} XP</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(240,232,212,0.55)" }}>{tierData.title}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{xpNeeded > 0 ? `${xpNeeded.toLocaleString()} XP to ${nextLabel}` : "MAX RANK ACHIEVED"}</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 5, background: "rgba(212,175,55,0.10)", overflow: "hidden" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(xpPct, 100)}%` }}
                        transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
                        style={{ height: "100%", background: `linear-gradient(90deg, ${AMBER}, ${GOLD})`, borderRadius: 5, boxShadow: `0 0 12px ${GOLD}60` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 140 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: `${GOLD}66`, letterSpacing: "0.24em", textTransform: "uppercase", marginBottom: 4 }}>NEXT RANK</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(240,232,212,0.40)", letterSpacing: "0.04em" }}>{nextLabel}</div>
                  </div>
                  <motion.button type="button" whileTap={{ scale: 0.96 }}
                    style={{ padding: "16px 28px", borderRadius: 10, border: `1px solid ${GOLD}55`, background: `linear-gradient(135deg, rgba(212,175,55,0.12), rgba(196,134,10,0.06))`, color: GOLD, fontSize: 14, fontWeight: 900, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase", minHeight: 56, whiteSpace: "nowrap" }}>
                    SELECT MENTOR →
                  </motion.button>
                </div>

                {/* ── YOUR JOURNEY — HORIZONTAL PATHWAY ── */}
                <div style={{ padding: "40px 40px 36px" }}>
                  <div style={{ marginBottom: 28, textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.36em", textTransform: "uppercase", marginBottom: 6 }}>YOUR MASTERY JOURNEY</div>
                    <div style={{ fontSize: 34, fontWeight: 900, color: CREAM, letterSpacing: "0.02em" }}>THE PATH TO ELITE STATUS</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                    {JOURNEY.map((lv, idx) => {
                      const isActive   = lv.id === tier;
                      const isUnlocked = xp >= lv.xpMin;
                      const isLocked   = !isUnlocked;
                      return (
                        <div key={lv.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                          {idx < JOURNEY.length - 1 && (
                            <div style={{ position: "absolute", top: 52, left: "50%", width: "100%", height: 3, zIndex: 0,
                              background: isUnlocked && xp >= JOURNEY[idx + 1].xpMin
                                ? `linear-gradient(90deg, ${lv.color}, ${JOURNEY[idx + 1].color})`
                                : isUnlocked ? `linear-gradient(90deg, ${lv.color}, rgba(212,175,55,0.15))` : "rgba(212,175,55,0.08)" }} />
                          )}
                          <motion.div animate={isActive ? { boxShadow: [`0 0 0 0 ${lv.color}60`, `0 0 0 12px ${lv.color}00`] } : {}}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              width: 104, height: 104, borderRadius: "50%", zIndex: 1,
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              background: isActive ? `radial-gradient(circle, ${lv.color}30, ${lv.color}10)` : isUnlocked ? `rgba(50,180,90,0.08)` : "rgba(212,175,55,0.05)",
                              border: isActive ? `2px solid ${lv.color}` : isUnlocked ? `2px solid rgba(50,180,90,0.50)` : `2px solid rgba(212,175,55,0.15)`,
                              opacity: isLocked ? 0.45 : 1,
                              filter: isLocked ? "blur(0.3px)" : "none",
                              transition: "all 0.3s",
                            }}>
                            <lv.Icon size={36} color={isActive ? lv.color : isUnlocked ? "#32B45A" : "rgba(212,175,55,0.40)"} strokeWidth={1.7} />
                            <div style={{ fontSize: 11, fontWeight: 900, color: isActive ? lv.color : isUnlocked ? "#32B45A" : "rgba(212,175,55,0.40)", letterSpacing: "0.08em", marginTop: 2 }}>{lv.num}</div>
                          </motion.div>
                          <div style={{ textAlign: "center", marginTop: 14, padding: "0 6px" }}>
                            <div style={{ fontSize: lv.id === "master" ? 11 : 13, fontWeight: 900, color: isActive ? lv.color : isUnlocked ? CREAM : "rgba(240,232,212,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2, marginBottom: 4 }}>
                              {lv.title}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(240,232,212,0.40)", letterSpacing: "0.06em", marginBottom: 6 }}>{lv.sub}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? lv.color : isUnlocked ? "#32B45A" : "rgba(212,175,55,0.30)", letterSpacing: "0.05em" }}>
                              {lv.xpMin === 0 ? "START" : lv.xpMin.toLocaleString() + " XP"}
                            </div>
                            {isActive && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                                style={{ marginTop: 6, padding: "3px 10px", borderRadius: 20, background: `${lv.color}22`, border: `1px solid ${lv.color}55`, display: "inline-block", fontSize: 10, fontWeight: 900, color: lv.color, letterSpacing: "0.14em" }}>
                                CURRENT
                              </motion.div>
                            )}
                            {isLocked && (
                              <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                                <LockKeyhole size={14} color="rgba(212,175,55,0.38)" strokeWidth={1.8} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── HOW IT WORKS ── */}
                <div style={{ padding: "0 40px 40px", borderTop: `1px solid rgba(212,175,55,0.08)` }}>
                  <div style={{ paddingTop: 40, marginBottom: 28, textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.36em", textTransform: "uppercase", marginBottom: 6 }}>THE SYSTEM</div>
                    <div style={{ fontSize: 34, fontWeight: 900, color: CREAM }}>HOW IT WORKS</div>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {HOW_STEPS.map((step, idx) => (
                      <motion.div key={idx}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.5, ease: EASE }}
                        whileHover={{ y: -4, boxShadow: `0 8px 32px ${GOLD}22` }}
                        style={{
                          flex: 1, padding: "28px 20px 24px", borderRadius: 14,
                          background: "rgba(0,0,0,0.45)",
                          border: `1px solid rgba(212,175,55,0.15)`,
                          textAlign: "center", cursor: "default",
                          transition: "all 0.25s",
                        }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: `rgba(212,175,55,0.10)`, border: `1px solid ${GOLD}30`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>
                          <step.Icon size={24} color={GOLD} strokeWidth={1.8} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.28em", marginBottom: 8 }}>STEP {step.num}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: CREAM, letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: 10 }}>{step.title}</div>
                        <div style={{ fontSize: 13, color: "rgba(240,232,212,0.50)", lineHeight: 1.6 }}>{step.desc}</div>
                        <div style={{ width: 28, height: 2, background: `linear-gradient(90deg, ${AMBER}, ${GOLD})`, margin: "14px auto 0", borderRadius: 1 }} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* ── XP ACTION CENTER + REWARD PREVIEW ── */}
                <div style={{ padding: "0 40px 40px", display: "flex", gap: 24 }}>

                  {/* XP ACTION CENTER */}
                  <div style={{ flex: 1.2, borderRadius: 14, background: "rgba(0,0,0,0.45)", border: `1px solid rgba(212,175,55,0.14)`, overflow: "hidden" }}>
                    <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid rgba(212,175,55,0.09)` }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.30em", textTransform: "uppercase", marginBottom: 4 }}>LIVE XP ACTION CENTER</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: CREAM }}>EARN XP RIGHT NOW</div>
                    </div>
                    {XP_ACTIONS.map((action, idx) => (
                      <div key={idx} style={{ padding: "18px 24px", borderBottom: idx < XP_ACTIONS.length - 1 ? `1px solid rgba(212,175,55,0.07)` : "none", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${action.color}15`, border: `1px solid ${action.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <action.Icon size={22} color={action.color} strokeWidth={1.8} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: CREAM, letterSpacing: "0.04em", marginBottom: 3 }}>{action.label}</div>
                          <div style={{ height: 4, borderRadius: 2, background: "rgba(212,175,55,0.08)", overflow: "hidden" }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${20 + idx * 15}%` }}
                              transition={{ duration: 1.2, delay: 0.4 + idx * 0.1, ease: EASE }}
                              style={{ height: "100%", background: `linear-gradient(90deg, ${action.color}88, ${action.color})`, borderRadius: 2 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: action.color, letterSpacing: "0.02em" }}>+{action.xp} XP</div>
                        </div>
                        <motion.button type="button" whileTap={{ scale: 0.94 }}
                          style={{ padding: "10px 20px", minWidth: 72, minHeight: 44, borderRadius: 9, border: `1px solid ${action.color}50`, background: `${action.color}12`, color: action.color, fontSize: 13, fontWeight: 900, cursor: "pointer", letterSpacing: "0.16em", textTransform: "uppercase", flexShrink: 0 }}>
                          {action.cta}
                        </motion.button>
                      </div>
                    ))}
                  </div>

                  {/* REWARD PREVIEW */}
                  <div style={{ flex: 1, borderRadius: 14, background: "rgba(0,0,0,0.45)", border: `1px solid rgba(212,175,55,0.14)`, overflow: "hidden" }}>
                    <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid rgba(212,175,55,0.09)` }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.30em", textTransform: "uppercase", marginBottom: 4 }}>EXCLUSIVE REWARDS</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: CREAM }}>WHAT YOU'RE CHASING</div>
                    </div>
                    <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {REWARDS.map((rw, idx) => (
                        <motion.div key={idx} whileHover={{ scale: 1.02 }}
                          style={{
                            padding: "14px 12px", borderRadius: 10,
                            background: rw.locked ? "rgba(0,0,0,0.30)" : `${rw.color}10`,
                            border: `1px solid ${rw.locked ? "rgba(212,175,55,0.10)" : rw.color + "40"}`,
                            filter: rw.locked ? "brightness(0.60)" : "none",
                            cursor: rw.locked ? "default" : "pointer",
                            transition: "all 0.2s",
                          }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <rw.Icon size={26} color={rw.locked ? "rgba(240,232,212,0.36)" : rw.color} strokeWidth={1.8} />
                            {rw.locked && <LockKeyhole size={14} color="rgba(212,175,55,0.38)" strokeWidth={1.8} />}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: rw.locked ? "rgba(240,232,212,0.40)" : CREAM, marginTop: 8, marginBottom: 3, lineHeight: 1.2 }}>{rw.title}</div>
                          <div style={{ fontSize: 10, color: "rgba(240,232,212,0.35)", marginBottom: 6, lineHeight: 1.4 }}>{rw.desc}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: rw.locked ? "rgba(212,175,55,0.35)" : rw.color, letterSpacing: "0.10em" }}>
                            {rw.locked ? `Unlock at ${rw.unlockAt}` : "✓ AVAILABLE"}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── TOP LEADERBOARD ── */}
                <div style={{ padding: "0 40px 48px" }}>
                  <div style={{ borderRadius: 14, background: "rgba(0,0,0,0.45)", border: `1px solid rgba(212,175,55,0.14)`, overflow: "hidden" }}>
                    <div style={{ padding: "24px 32px 20px", borderBottom: `1px solid rgba(212,175,55,0.09)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.30em", textTransform: "uppercase", marginBottom: 4 }}>LIVE LEADERBOARD</div>
                        <div style={{ fontSize: 30, fontWeight: 900, color: CREAM }}>TOP COMPETITORS</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 12, color: "rgba(240,232,212,0.40)" }}>Updated {leaderUpdated}</div>
                        {leaderLoading && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                          style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${GOLD}`, borderTopColor: "transparent" }} />}
                        <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setActiveNav("leaderboard")}
                          style={{ padding: "12px 24px", minHeight: 48, borderRadius: 9, border: `1px solid ${GOLD}55`, background: `linear-gradient(135deg, ${GOLD}18, ${AMBER}0A)`, color: GOLD, fontSize: 14, fontWeight: 900, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                          VIEW FULL LEADERBOARD →
                        </motion.button>
                      </div>
                    </div>
                    {displayEntries.slice(0, 5).map((entry, idx) => {
                      const rankColors: string[] = ["#FFD700", "#C0C0C0", "#CD7F32", GOLD, "rgba(240,232,212,0.60)"];
                      const rc = rankColors[idx] ?? "rgba(240,232,212,0.50)";
                      return (
                        <motion.div key={entry.guestProfileId ?? idx}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.06, duration: 0.4, ease: EASE }}
                          style={{
                            display: "flex", alignItems: "center", gap: 24, padding: "20px 32px",
                            borderBottom: idx < 4 ? `1px solid rgba(212,175,55,0.07)` : "none",
                            background: idx === 0 ? `linear-gradient(90deg, rgba(255,215,0,0.05), transparent)` : "transparent",
                          }}>
                          <div style={{ fontSize: 36, fontWeight: 900, color: rc, minWidth: 56, textAlign: "center", textShadow: idx < 3 ? `0 0 16px ${rc}80` : "none" }}>
                            {entry.rank}
                          </div>
                          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${entry.tierColor ?? GOLD}55, ${entry.tierColor ?? AMBER}22)`, border: `2px solid ${entry.tierColor ?? GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: DARK, flexShrink: 0 }}>
                            {entry.firstName[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: CREAM, letterSpacing: "0.02em" }}>{entry.firstName}{entry.lastInitial ? ` ${entry.lastInitial}.` : ""}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: entry.tierColor ?? GOLD, letterSpacing: "0.08em", marginTop: 2 }}>{entry.tierLabel}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: GOLD }}>{entry.totalXp.toLocaleString()} XP</div>
                            {entry.achievementCnt > 0 && (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: 13, color: "rgba(240,232,212,0.45)", marginTop: 2 }}>
                                <Medal size={13} color="rgba(240,232,212,0.45)" strokeWidth={1.8} />
                                <span>{entry.achievementCnt} badges</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

              </motion.div>
            )}

            {/* ═══════════════════════════════════════
                FULL LEADERBOARD VIEW
            ═══════════════════════════════════════ */}
            {activeNav === "leaderboard" && (
              <motion.div key="leaderboard"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}
                style={{ padding: "32px 40px 48px" }}>

                <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.36em", textTransform: "uppercase", marginBottom: 6 }}>LIVE RANKINGS</div>
                    <div style={{ fontSize: 42, fontWeight: 900, color: CREAM }}>FULL LEADERBOARD</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(240,232,212,0.40)" }}>
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}>●</motion.div>
                    LIVE · Updated {leaderUpdated}
                  </div>
                </div>

                <div style={{ borderRadius: 14, background: "rgba(0,0,0,0.45)", border: `1px solid rgba(212,175,55,0.14)`, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 60px 1fr 160px 140px 80px", gap: 16, padding: "16px 28px", borderBottom: `1px solid rgba(212,175,55,0.12)`, background: "rgba(212,175,55,0.05)" }}>
                    {["RANK", "LEVEL", "COMPETITOR", "TIER", "XP", "BADGES"].map(h => (
                      <div key={h} style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.24em", textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {displayEntries.map((entry, idx) => {
                    const prev  = prevRanks.current.get(entry.guestProfileId ?? "") ?? entry.rank;
                    const moved = prev - entry.rank;
                    return (
                      <motion.div key={entry.guestProfileId ?? idx}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.35, ease: EASE }}
                        style={{
                          display: "grid", gridTemplateColumns: "80px 60px 1fr 160px 140px 80px", gap: 16,
                          padding: "18px 28px", alignItems: "center",
                          borderBottom: idx < displayEntries.length - 1 ? `1px solid rgba(212,175,55,0.06)` : "none",
                          background: idx < 3 ? `rgba(212,175,55,${0.04 - idx * 0.01})` : "transparent",
                        }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "rgba(240,232,212,0.55)" }}>
                          #{entry.rank}
                        </div>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${entry.tierColor ?? GOLD}22`, border: `1.5px solid ${entry.tierColor ?? GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: DARK }}>
                          {entry.firstName[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: CREAM }}>{entry.firstName}{entry.lastInitial ? ` ${entry.lastInitial}.` : ""}</div>
                          {moved !== 0 && (
                            <div style={{ fontSize: 12, color: moved > 0 ? "#32B45A" : "#E74C3C", fontWeight: 700, marginTop: 2 }}>
                              {moved > 0 ? `▲ +${moved}` : `▼ ${moved}`}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: entry.tierColor ?? GOLD, letterSpacing: "0.06em" }}>{entry.tierLabel}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>{entry.totalXp.toLocaleString()}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, color: "rgba(240,232,212,0.60)", fontWeight: 700 }}>
                          <Medal size={16} color="rgba(240,232,212,0.60)" strokeWidth={1.8} />
                          <span>{entry.achievementCnt}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{
        width: 258, flexShrink: 0,
        background: "rgba(0,0,0,0.60)",
        borderLeft: `1px solid rgba(212,175,55,0.12)`,
        display: "flex", flexDirection: "column",
        zIndex: 10, position: "relative",
        overflowY: "auto",
      }}>
        {/* Current Rank Card */}
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid rgba(212,175,55,0.10)` }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: `${GOLD}66`, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 12 }}>YOUR CURRENT RANK</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: `radial-gradient(circle, ${tierData.color}30, ${tierData.color}08)`, border: `2px solid ${tierData.color}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
              <tierData.Icon size={28} color={tierData.color} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: tierData.color, letterSpacing: "0.04em", textShadow: `0 0 16px ${tierData.color}60`, lineHeight: 1.1 }}>{tier === "master" ? "MASTER" : tierData.title}</div>
              <div style={{ fontSize: 12, color: "rgba(240,232,212,0.50)", marginTop: 3 }}>{xp.toLocaleString()} XP earned</div>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "rgba(240,232,212,0.50)" }}>Progress to {nextLabel}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{Math.min(xpPct, 100)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(212,175,55,0.10)", overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(xpPct, 100)}%` }}
                transition={{ duration: 1.4, ease: EASE, delay: 0.5 }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${AMBER}, ${GOLD})`, borderRadius: 4, boxShadow: `0 0 8px ${GOLD}50` }} />
            </div>
            <div style={{ fontSize: 12, color: "rgba(240,232,212,0.40)", marginTop: 5 }}>
              {xpNeeded > 0 ? `${xpNeeded.toLocaleString()} XP needed` : "Max rank achieved"}
            </div>
          </div>
        </div>

        {/* Next Reward */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid rgba(212,175,55,0.10)` }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: `${GOLD}66`, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 12 }}>NEXT REWARD UNLOCKS AT</div>
          {REWARDS.filter(r => r.locked)[0] && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(212,175,55,0.06)", border: `1px solid rgba(212,175,55,0.15)` }}>
              {(() => {
                const nextReward = REWARDS.filter(r => r.locked)[0];
                const NextIcon = nextReward.Icon;
                return <NextIcon size={28} color={nextReward.color} strokeWidth={1.8} />;
              })()}
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: CREAM, marginBottom: 3 }}>{REWARDS.filter(r => r.locked)[0].title}</div>
                <div style={{ fontSize: 11, color: `${GOLD}90`, fontWeight: 700 }}>{REWARDS.filter(r => r.locked)[0].unlockAt}</div>
              </div>
            </div>
          )}
        </div>

        {/* Current Streak */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid rgba(212,175,55,0.10)` }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: `${GOLD}66`, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 12 }}>CURRENT STREAK</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Flame size={40} color={AMBER} strokeWidth={1.7} />
            <div>
              <div style={{ fontSize: 34, fontWeight: 900, color: AMBER, lineHeight: 1 }}>3</div>
              <div style={{ fontSize: 13, color: "rgba(240,232,212,0.50)", marginTop: 2 }}>days in a row</div>
            </div>
          </div>
        </div>

        {/* Weekly Challenge */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid rgba(212,175,55,0.10)` }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: `${GOLD}66`, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 12 }}>WEEKLY CHALLENGE</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: `rgba(212,175,55,0.10)`, border: `1px solid ${GOLD}2A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Swords size={22} color={GOLD} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: CREAM, marginBottom: 4 }}>Blend Master</div>
              <div style={{ fontSize: 12, color: "rgba(240,232,212,0.50)", lineHeight: 1.5 }}>Complete 5 challenges this week</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(212,175,55,0.10)", overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: "40%" }} transition={{ duration: 1.2, ease: EASE }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${AMBER}, ${GOLD})`, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 12, color: "rgba(240,232,212,0.45)", flexShrink: 0 }}>2 / 5</div>
          </div>
          <div style={{ fontSize: 12, color: `${GOLD}70`, fontWeight: 700, marginBottom: 14 }}>+500 XP on completion</div>
          <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setChallengeOpen(true)}
            style={{ width: "100%", padding: "14px", minHeight: 52, borderRadius: 9, border: `1px solid ${GOLD}44`, background: "rgba(212,175,55,0.08)", color: GOLD, fontSize: 14, fontWeight: 900, cursor: "pointer", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            VIEW CHALLENGES
          </motion.button>
        </div>

        {/* View Leaderboard CTA */}
        {activeNav === "dashboard" && (
          <div style={{ padding: "18px 20px" }}>
            <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => setActiveNav("leaderboard")}
              style={{ width: "100%", padding: "18px", minHeight: 64, borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, color: DARK, fontSize: 16, fontWeight: 900, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase", boxShadow: `0 4px 24px ${GOLD}40` }}>
              VIEW LEADERBOARD →
            </motion.button>
          </div>
        )}
      </div>

      {/* ── CHALLENGE MODAL ── */}
      <AnimatePresence>
        {challengeOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}
            onClick={() => setChallengeOpen(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 680, maxHeight: "85vh", overflowY: "auto", background: "#0D0B06", borderRadius: 18, border: `1px solid ${GOLD}33`, padding: 36 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: `${GOLD}70`, letterSpacing: "0.30em", textTransform: "uppercase", marginBottom: 6 }}>GOLDEN BOX</div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: CREAM }}>CHALLENGES</div>
                </div>
                <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => setChallengeOpen(false)}
                  style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid rgba(240,232,212,0.15)`, background: "transparent", color: "rgba(240,232,212,0.55)", fontSize: 14, cursor: "pointer" }}>
                  ✕ CLOSE
                </motion.button>
              </div>
              {CHALLENGES.map((ch, idx) => (
                <motion.div key={ch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.35 }}
                  style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 22px", borderRadius: 12, background: ch.locked ? "rgba(255,255,255,0.02)" : "rgba(212,175,55,0.05)", border: `1px solid ${ch.locked ? "rgba(255,255,255,0.06)" : GOLD + "22"}`, marginBottom: 12, opacity: ch.locked ? 0.55 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: ch.locked ? "rgba(240,232,212,0.50)" : CREAM }}>{ch.title}</div>
                      {ch.locked && <LockKeyhole size={14} color="rgba(212,175,55,0.42)" strokeWidth={1.8} />}
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(240,232,212,0.45)", marginBottom: 6 }}>{ch.desc}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.10em" }}>{ch.diff}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: GOLD }}>+{ch.xp.toLocaleString()} XP</div>
                    {!ch.locked && (
                      <motion.button type="button" whileTap={{ scale: 0.94 }}
                        style={{ marginTop: 8, padding: "10px 20px", minHeight: 44, borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, color: DARK, fontSize: 13, fontWeight: 900, cursor: "pointer", letterSpacing: "0.12em" }}>
                        START
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
