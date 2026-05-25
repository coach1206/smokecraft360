import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useGuest } from "@/context/GuestProfileContext";
import { socket } from "@/lib/socket";
import {
  ArrowUp,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Crown,
  Flame,
  Gem,
  Gift,
  HelpCircle,
  Home,
  LockKeyhole,
  Medal,
  Menu,
  Settings,
  Shield,
  Swords,
  Trophy,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

const GOLD = "#D4AF37";
const AMBER = "#C4860A";
const CREAM = "#F2E7CC";
const MUTED = "rgba(242,231,204,0.62)";
const PANEL = "rgba(10,11,10,0.72)";
const LINE = "rgba(212,175,55,0.22)";
const PURPLE = "#A85CFF";
const GREEN = "#38D978";
const RED = "#D8452F";
const EASE = [0.22, 1, 0.36, 1] as const;
const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

export type GBTier = "initiate" | "novice" | "enthusiast" | "connoisseur" | "aficionado" | "expert";

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
  { rank: 1, guestProfileId: "d1", firstName: "TheCigarLion",  lastInitial: "", craftScore: 100, totalXp: 18750, achievementCnt: 3, tier: "expert",      tierLabel: "Expert",      tierColor: GOLD },
  { rank: 2, guestProfileId: "d2", firstName: "Aficionado_D",  lastInitial: "", craftScore:  92, totalXp: 16420, achievementCnt: 4, tier: "aficionado", tierLabel: "Aficionado", tierColor: PURPLE },
  { rank: 3, guestProfileId: "d3", firstName: "SmoothDraws",   lastInitial: "", craftScore:  86, totalXp: 14980, achievementCnt: 3, tier: "connoisseur",tierLabel: "Connoisseur",tierColor: "#5B7CFF" },
  { rank: 4, guestProfileId: "d4", firstName: "LeafScholar",   lastInitial: "", craftScore:  72, totalXp: 7800,  achievementCnt: 2, tier: "enthusiast", tierLabel: "Enthusiast", tierColor: AMBER },
];

const TIERS = [
  { id: "novice",      num: 1, title: "NOVICE",      xpMin: 0,     color: RED,     Icon: Medal,  desc: "Learn the basics. Score points and build your foundation." },
  { id: "enthusiast",  num: 2, title: "ENTHUSIAST",  xpMin: 1000,  color: GOLD,    Icon: Flame, desc: "Sharpen your skills. Take on more challenges." },
  { id: "connoisseur", num: 3, title: "CONNOISSEUR", xpMin: 5000,  color: PURPLE,  Icon: Crown, desc: "Refine your knowledge. Compete with skilled minds." },
  { id: "aficionado",  num: 4, title: "AFICIONADO",  xpMin: 12000, color: "#FF9E18", Icon: Gem, desc: "Master advanced techniques. Earn exclusive rewards." },
  { id: "expert",      num: 5, title: "EXPERT",      xpMin: 20000, color: GOLD,    Icon: Trophy, desc: "Reach the top. Become a true SmokeCraft legend." },
] as const;

const NAV_ITEMS = [
  { key: "dashboard", Icon: Home,       label: "Dashboard" },
  { key: "learn",     Icon: BookOpen,   label: "Learn" },
  { key: "challenges",Icon: Swords,     label: "Challenges" },
  { key: "leaderboard", Icon: Trophy,   label: "Leaderboard" },
  { key: "rewards",   Icon: Gift,       label: "Rewards" },
  { key: "badges",    Icon: Shield,     label: "Badges" },
  { key: "progress",  Icon: TrendingUp, label: "My Progress" },
  { key: "settings",  Icon: Settings,   label: "Settings" },
] as { key: string; Icon: LucideIcon; label: string }[];

const HOW = [
  { Icon: BadgeCheck, label: "EARN POINTS", desc: "Complete actions & challenges to earn XP." },
  { Icon: ArrowUp, label: "CLIMB RANKS", desc: "Gain XP to move up and unlock new levels." },
  { Icon: LockKeyhole, label: "UNLOCK REWARDS", desc: "New blends, gear, and experiences await." },
  { Icon: Trophy, label: "WIN", desc: "Reach the top and earn exclusive status." },
] as { Icon: LucideIcon; label: string; desc: string }[];

const XP_ACTIONS = [
  { Icon: Swords, label: "Complete a Challenge", xp: 250, done: false },
  { Icon: ClipboardList, label: "Submit a Tasting Note", xp: 100, done: false },
  { Icon: CalendarDays, label: "Daily Login", xp: 50, done: true },
  { Icon: Users, label: "Help Another Member", xp: 75, done: false },
] as { Icon: LucideIcon; label: string; xp: number; done: boolean }[];

const CHALLENGES = [
  { id: "c1", title: "The First Draw", xp: 50, desc: "Begin the Golden Box ritual.", diff: "INITIATE", locked: false },
  { id: "c2", title: "The Blend Master", xp: 250, desc: "Build a wrapper and filler profile.", diff: "ENTHUSIAST", locked: false },
  { id: "c3", title: "Spirit Harmony", xp: 500, desc: "Pair a cigar with a premium pour.", diff: "CONNOISSEUR", locked: false },
  { id: "c4", title: "Reserve Collection", xp: 1200, desc: "Unlock rare lounge selections.", diff: "AFICIONADO", locked: true },
];

function getTier(xp: number): GBTier {
  if (xp >= 20000) return "expert";
  if (xp >= 12000) return "aficionado";
  if (xp >= 5000) return "connoisseur";
  if (xp >= 1000) return "enthusiast";
  return "novice";
}

function getNextLabel(tier: GBTier): string {
  if (tier === "novice") return "ENTHUSIAST";
  if (tier === "enthusiast") return "CONNOISSEUR";
  if (tier === "connoisseur") return "AFICIONADO";
  if (tier === "aficionado") return "EXPERT";
  return "LEGEND";
}

function getXpNeeded(xp: number, tier: GBTier): number {
  if (tier === "novice") return 1000 - xp;
  if (tier === "enthusiast") return 5000 - xp;
  if (tier === "connoisseur") return 12000 - xp;
  if (tier === "aficionado") return 20000 - xp;
  return 0;
}

interface GoldenBoxPageProps { onBack: () => void; }

export default function GoldenBoxPage({ onBack }: GoldenBoxPageProps) {
  const { profile } = useGuest();
  const xp = Math.max(profile.points || 827, 827);
  const tier = getTier(xp);
  const tierData = TIERS.find(t => t.id === tier) ?? TIERS[1];
  const nextLabel = getNextLabel(tier);
  const xpNeeded = getXpNeeded(xp, tier);
  const xpPct = tier === "novice" ? (xp / 1000) * 100 : tier === "enthusiast" ? ((xp - 1000) / 4000) * 100 : tier === "connoisseur" ? ((xp - 5000) / 7000) * 100 : 72;
  const [activeNav, setActiveNav] = useState("dashboard");
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [leaderEntries, setLeaderEntries] = useState<LeaderEntry[]>([]);
  const [leaderUpdated, setLeaderUpdated] = useState("just now");
  const prevRanks = useRef<Map<string, number>>(new Map());
  const displayEntries = leaderEntries.length > 0 ? leaderEntries : DEMO_LEADER;

  useEffect(() => {
    let cancelled = false;
    async function fetchLeaderboard() {
      try {
        const res = await fetch(`${BASE_URL}/api/leaderboard?limit=20`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as { entries?: LeaderEntry[] };
        const entries = data.entries ?? [];
        entries.forEach(e => { if (e.guestProfileId) prevRanks.current.set(e.guestProfileId, e.rank); });
        setLeaderEntries(entries.slice(0, 20));
        setLeaderUpdated("just now");
      } catch { /* demo fallback */ }
    }
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    function onUpdate(data: { entries?: LeaderEntry[] }) {
      if (!cancelled && data.entries) setLeaderEntries(data.entries.slice(0, 20));
    }
    socket.on("leaderboard_update", onUpdate);
    return () => { cancelled = true; clearInterval(interval); socket.off("leaderboard_update", onUpdate); };
  }, []);

  function navAction(key: string) {
    if (key === "leaderboard") { setActiveNav("leaderboard"); return; }
    if (key === "challenges") { setChallengeOpen(true); return; }
    setActiveNav("dashboard");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", overflow: "hidden", color: CREAM, fontFamily: "'Inter','Helvetica Neue',sans-serif", background: "#050706" }}>
      <SceneBackground />
      <LeftNav activeNav={activeNav} onNav={navAction} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 2 }}>
        <TopBar onBack={onBack} name={profile.firstName || "TheCigarLion"} tier={tierData.title} />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 376px", gap: 16, padding: 16, overflow: "hidden" }}>
          {activeNav === "leaderboard" ? (
            <LeaderboardFull entries={displayEntries} updated={leaderUpdated} />
          ) : (
            <>
              <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
                <RankSummary xp={xp} tierData={tierData} nextLabel={nextLabel} xpNeeded={xpNeeded} xpPct={xpPct} />
                <ContestLevels tier={tier} />
                <HowItWorks />
                <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 170px", gap: 10, minHeight: 196 }}>
                  <LiveLeaderboard entries={displayEntries.slice(0, 3)} onOpen={() => setActiveNav("leaderboard")} />
                  <EarnXpToday />
                  <ProgressDial xp={xp} />
                </div>
              </main>
              <RightStoryPanel xp={xp} tierData={tierData} nextLabel={nextLabel} xpNeeded={xpNeeded} onLeaderboard={() => setActiveNav("leaderboard")} />
            </>
          )}
        </div>
      </div>
      <ChallengeModal open={challengeOpen} onClose={() => setChallengeOpen(false)} />
    </div>
  );
}

function SceneBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <img src={IMG("leaderboard_bg.png")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.16, filter: "saturate(0.72) contrast(1.2)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(110deg, rgba(5,7,6,0.96) 0%, rgba(8,9,8,0.90) 48%, rgba(4,5,5,0.97) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(212,175,55,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.035) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      <motion.div animate={{ opacity: [0.12, 0.26, 0.12], x: [-20, 28, -20] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "18%", left: "34%", width: 780, height: 420, background: `radial-gradient(ellipse, ${GOLD}22 0%, transparent 67%)`, filter: "blur(42px)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 20%, transparent 0%, rgba(0,0,0,0.42) 72%, rgba(0,0,0,0.80) 100%)" }} />
    </div>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative", borderRadius: 12, border: `1px solid ${LINE}`, background: `linear-gradient(145deg, ${PANEL}, rgba(5,6,5,0.82))`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035), 0 14px 36px rgba(0,0,0,0.26)", overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 12% 0%, ${GOLD}12 0%, transparent 42%)` }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function LeftNav({ activeNav, onNav }: { activeNav: string; onNav: (key: string) => void }) {
  return (
    <aside style={{ width: 306, flexShrink: 0, position: "relative", zIndex: 3, borderRight: `1px solid ${LINE}`, background: "rgba(5,7,7,0.74)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 82, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: `1px solid ${LINE}` }}>
        <div>
          <div style={{ fontSize: 25, fontWeight: 950, letterSpacing: "0.10em", color: "#F8F3E8" }}>SMOKECRAFT <span style={{ color: GOLD }}>360</span></div>
          <div style={{ marginTop: 5, fontSize: 10, letterSpacing: "0.48em", color: `${GOLD}AA`, textAlign: "center" }}>KIOSK EDITION</div>
        </div>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {NAV_ITEMS.map(item => {
          const active = item.key === activeNav || (activeNav === "dashboard" && item.key === "dashboard");
          return (
            <motion.button key={item.key} whileTap={{ scale: 0.97 }} onClick={() => onNav(item.key)}
              style={{ minHeight: 54, borderRadius: 6, border: active ? `1px solid ${GOLD}88` : "1px solid transparent", background: active ? `linear-gradient(90deg, ${GOLD}28, ${GOLD}0A)` : "transparent", color: active ? GOLD : "rgba(242,231,204,0.82)", cursor: "pointer", display: "flex", alignItems: "center", gap: 18, padding: "0 16px", fontSize: 16, fontWeight: active ? 800 : 600, textAlign: "left" }}>
              <item.Icon size={22} strokeWidth={1.8} color={active ? GOLD : "rgba(212,175,55,0.84)"} />
              <span>{item.label}</span>
              {item.key === "learn" && <ChevronDown size={16} style={{ marginLeft: "auto" }} />}
            </motion.button>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <Panel style={{ margin: "0 18px 22px", padding: 24, minHeight: 365 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 27, fontWeight: 900, color: GOLD, letterSpacing: "0.06em" }}>THE GOLDEN BOX</div>
        <div style={{ marginTop: 14, fontSize: 13, letterSpacing: "0.14em", color: MUTED }}>COMPETE. LEARN. ASCEND.</div>
        <div style={{ margin: "28px 0 22px", position: "relative", height: 126 }}>
          <img src={IMG("golden_box.png")} alt="Golden Box reward chest" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: `drop-shadow(0 18px 34px ${GOLD}55)` }} />
          <div style={{ position: "absolute", left: 22, right: 22, bottom: -12, height: 28, background: `radial-gradient(ellipse, ${GOLD}55, transparent 70%)`, filter: "blur(12px)" }} />
        </div>
        <p style={{ margin: 0, color: "rgba(242,231,204,0.74)", fontSize: 14, lineHeight: 1.55 }}>Every decision builds your mastery. Earn your place as the box unlocks new challenges, lounge status, and reserve rewards.</p>
      </Panel>
    </aside>
  );
}

function TopBar({ onBack, name, tier }: { onBack: () => void; name: string; tier: string }) {
  return (
    <header style={{ height: 82, flexShrink: 0, display: "flex", alignItems: "center", gap: 16, padding: "0 28px", borderBottom: `1px solid ${LINE}`, background: "rgba(4,6,6,0.76)", backdropFilter: "blur(18px)" }}>
      <button type="button" onClick={onBack} style={{ width: 40, height: 40, border: "none", background: "transparent", color: CREAM, cursor: "pointer" }}><Menu size={24} /></button>
      <div style={{ flex: 1 }} />
      <TopButton>RESET BLEND</TopButton>
      <TopButton><HelpCircle size={15} /> COACH HELP</TopButton>
      <TopButton filled><Zap size={15} /> LAUNCH TERMINAL (POS 3)</TopButton>
      <div style={{ flex: 1 }} />
      <HelpCircle size={22} color={CREAM} />
      <Bell size={22} color={CREAM} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220, justifyContent: "flex-end" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(145deg, ${GOLD}, #7A4A1F)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#0B0906", fontWeight: 950, fontSize: 18, boxShadow: `0 0 18px ${GOLD}33` }}>{name[0]?.toUpperCase() ?? "G"}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{name}</div>
          <div style={{ fontSize: 13, color: MUTED }}>Rank {tier[0] + tier.slice(1).toLowerCase()}</div>
        </div>
        <ChevronDown size={18} />
      </div>
    </header>
  );
}

function TopButton({ children, filled }: { children: React.ReactNode; filled?: boolean }) {
  return (
    <button type="button" style={{ minHeight: 40, padding: "0 26px", borderRadius: 5, border: `1px solid ${GOLD}AA`, background: filled ? `linear-gradient(180deg, ${GOLD}22, ${GOLD}0A)` : "rgba(0,0,0,0.22)", color: GOLD, fontSize: 12, fontWeight: 950, letterSpacing: "0.18em", display: "flex", alignItems: "center", gap: 8 }}>
      {children}
    </button>
  );
}

function RankSummary({ xp, tierData, nextLabel, xpNeeded, xpPct }: { xp: number; tierData: typeof TIERS[number]; nextLabel: string; xpNeeded: number; xpPct: number }) {
  return (
    <Panel style={{ minHeight: 158, padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.12fr 1fr 0.55fr 0.55fr", height: "100%" }}>
        <RankBlock title="YOUR RANK" name={tierData.title} points={`${xp} XP`} line={`Next Rank: ${nextLabel}`} color={GOLD} Icon={BadgeLionIcon} pct={Math.min(100, Math.max(0, xpPct))} />
        <RankBlock title="NEXT RANK" name={nextLabel} points={`${Math.max(0, xpNeeded).toLocaleString()} XP to go`} line="" color={PURPLE} Icon={CrownIcon} pct={72} />
        <MiniAction Icon={Gift} title="REWARDS" sub="View rewards" />
        <MiniAction Icon={Shield} title="BADGES" sub="View badges" />
      </div>
    </Panel>
  );
}

function RankBlock({ title, name, points, line, color, Icon, pct }: { title: string; name: string; points: string; line: string; color: string; Icon: LucideIcon; pct: number }) {
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", borderRight: `1px solid ${LINE}`, paddingRight: 24 }}>
      <HexBadge color={color}><Icon size={48} color={color} strokeWidth={1.6} /></HexBadge>
      <div style={{ flex: 1 }}>
        <Label>{title}</Label>
        <div style={{ fontSize: 26, fontWeight: 950, color, letterSpacing: "0.06em" }}>{name}</div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700 }}>{points}</div>
        <Progress color={color} pct={pct} />
        {line && <div style={{ marginTop: 8, color: MUTED, fontSize: 14 }}>{line.split(":")[0]}: <span style={{ color: PURPLE, fontWeight: 900 }}>{line.split(":")[1]}</span></div>}
      </div>
    </div>
  );
}

function MiniAction({ Icon, title, sub }: { Icon: LucideIcon; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, borderRight: title === "REWARDS" ? `1px solid ${LINE}` : "none" }}>
      <Label>{title}</Label>
      <Icon size={39} color={GOLD} strokeWidth={1.7} />
      <span style={{ color: GOLD, fontSize: 14, textDecoration: "underline", textUnderlineOffset: 4 }}>{sub}</span>
    </div>
  );
}

function ContestLevels({ tier }: { tier: GBTier }) {
  return (
    <Panel style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22, padding: "4px 22px 16px" }}>
        <h2 style={{ margin: 0, fontSize: 25, letterSpacing: "0.18em" }}>CONTEST LEVELS</h2>
        <span style={{ color: MUTED, fontSize: 15 }}>Progress through the ranks. Master the leaf.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", minHeight: 255, borderRadius: 10, overflow: "hidden", border: `1px solid ${LINE}`, background: "rgba(255,255,255,0.025)" }}>
        {TIERS.map((item, idx) => {
          const active = item.id === tier || (tier === "novice" && item.id === "enthusiast");
          return (
            <div key={item.id} style={{ position: "relative", padding: "22px 26px 20px", textAlign: "center", borderRight: idx < TIERS.length - 1 ? `1px solid ${LINE}` : "none" }}>
              <div style={{ position: "absolute", top: 48, left: idx === 0 ? "50%" : 0, right: idx === TIERS.length - 1 ? "50%" : 0, height: 2, background: `linear-gradient(90deg, ${item.color}55, ${item.color})` }} />
              <div style={{ position: "relative", margin: "0 auto 24px", width: 58, height: 58, borderRadius: "50%", background: `radial-gradient(circle at 30% 20%, #FFE8A0, ${item.color})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#160F08", fontSize: 27, fontWeight: 950, boxShadow: `0 0 24px ${item.color}77` }}>{item.num}</div>
              <item.Icon size={38} color={active ? item.color : "rgba(242,231,204,0.72)"} strokeWidth={1.6} />
              <div style={{ marginTop: 12, fontSize: 20, fontWeight: 950, letterSpacing: "0.08em", color: active ? item.color : CREAM }}>{item.title}</div>
              <p style={{ margin: "10px auto 0", maxWidth: 160, color: MUTED, fontSize: 15, lineHeight: 1.38 }}>{item.desc}</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function HowItWorks() {
  return (
    <Panel style={{ padding: "16px 32px", minHeight: 106 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {HOW.map((item, idx) => (
          <div key={item.label} style={{ display: "flex", gap: 18, alignItems: "center", borderRight: idx < HOW.length - 1 ? `1px solid ${LINE}` : "none" }}>
            <HexBadge small color={GOLD}><item.Icon size={27} color={GOLD} strokeWidth={1.7} /></HexBadge>
            <div>
              <div style={{ color: CREAM, fontSize: 14, fontWeight: 950, letterSpacing: "0.12em" }}>{item.label}</div>
              <div style={{ marginTop: 6, color: MUTED, fontSize: 13, lineHeight: 1.35 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LiveLeaderboard({ entries, onOpen }: { entries: LeaderEntry[]; onOpen: () => void }) {
  return (
    <Panel style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div><h3 style={{ margin: 0, fontSize: 18, letterSpacing: "0.12em" }}>LIVE LEADERBOARD</h3><div style={{ fontSize: 11, color: MUTED }}>Updated just now</div></div>
        <button onClick={onOpen} style={{ border: `1px solid ${GOLD}66`, background: `${GOLD}12`, color: GOLD, borderRadius: 5, padding: "8px 18px", fontSize: 11, fontWeight: 950, letterSpacing: "0.12em" }}>VIEW FULL LEADERBOARD</button>
      </div>
      {entries.map((entry, idx) => <LeaderRow key={entry.guestProfileId ?? idx} entry={entry} compact />)}
    </Panel>
  );
}

function LeaderRow({ entry, compact }: { entry: LeaderEntry; compact?: boolean }) {
  const colors = [GOLD, "#C9D0D8", "#D35D2E"];
  const color = colors[entry.rank - 1] ?? MUTED;
  return (
    <div style={{ minHeight: compact ? 48 : 60, display: "grid", gridTemplateColumns: "48px 42px 1fr 100px 82px", alignItems: "center", gap: 10, border: `1px solid rgba(212,175,55,${entry.rank === 1 ? "0.32" : "0.14"})`, borderRadius: 8, background: entry.rank === 1 ? `${GOLD}10` : "rgba(255,255,255,0.025)", marginBottom: 7, padding: "0 10px" }}>
      <HexBadge tiny color={color}><span style={{ color, fontSize: 20, fontWeight: 950 }}>{entry.rank}</span></HexBadge>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(145deg, ${color}, #362315)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#070706", fontWeight: 950 }}>{entry.firstName[0]}</div>
      <div style={{ fontWeight: 900 }}>{entry.firstName}</div>
      <div style={{ color: entry.rank === 1 ? GOLD : PURPLE, fontWeight: 950 }}>{entry.totalXp.toLocaleString()} XP</div>
      <div style={{ display: "flex", gap: 5 }}><Shield size={17} color={GOLD} /><Medal size={17} color={PURPLE} /><Zap size={17} color={AMBER} /></div>
    </div>
  );
}

function EarnXpToday() {
  return (
    <Panel style={{ padding: 14 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 18, letterSpacing: "0.12em" }}>EARN XP TODAY</h3>
      {XP_ACTIONS.map(item => (
        <div key={item.label} style={{ minHeight: 38, display: "grid", gridTemplateColumns: "28px 1fr 70px 44px", gap: 8, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
          <item.Icon size={20} color={GOLD} />
          <span style={{ color: MUTED, fontSize: 14 }}>{item.label}</span>
          <span style={{ color: PURPLE, fontWeight: 950 }}>+{item.xp} XP</span>
          <span style={{ justifySelf: "end", border: `1px solid ${item.done ? GREEN : GOLD}66`, color: item.done ? GREEN : GOLD, borderRadius: 5, padding: "4px 9px", fontSize: 11, fontWeight: 950 }}>{item.done ? "OK" : "GO"}</span>
        </div>
      ))}
    </Panel>
  );
}

function ProgressDial({ xp }: { xp: number }) {
  return (
    <Panel style={{ padding: 16, textAlign: "center" }}>
      <h3 style={{ margin: "0 0 18px", fontSize: 16, letterSpacing: "0.12em" }}>YOUR PROGRESS</h3>
      <div style={{ width: 122, height: 122, borderRadius: "50%", margin: "0 auto", background: `conic-gradient(${PURPLE} 0deg 260deg, rgba(255,255,255,0.08) 260deg 360deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 93, height: 93, borderRadius: "50%", background: "#090A09", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 30, fontWeight: 950 }}>{xp}</span>
          <span style={{ fontSize: 13, letterSpacing: "0.18em" }}>XP</span>
        </div>
      </div>
    </Panel>
  );
}

function RightStoryPanel({ xp, tierData, nextLabel, xpNeeded, onLeaderboard }: { xp: number; tierData: typeof TIERS[number]; nextLabel: string; xpNeeded: number; onLeaderboard: () => void }) {
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, overflow: "hidden" }}>
      <Panel style={{ padding: 22, minHeight: 158, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <button style={{ width: "100%", minHeight: 78, border: `1px solid ${GOLD}CC`, borderRadius: 5, background: `linear-gradient(180deg, #F0B62E, ${AMBER})`, color: "#120B04", fontSize: 22, fontWeight: 950, letterSpacing: "0.28em" }}>SELECT MENTOR</button>
        <div style={{ marginTop: 13, color: GOLD, fontWeight: 800 }}>Get guidance. Climb faster.</div>
      </Panel>
      <Panel style={{ padding: 22 }}>
        <h3 style={{ margin: "0 0 18px", color: GOLD, letterSpacing: "0.16em" }}>YOUR JOURNEY</h3>
        <JourneyLine xp={xp} tierData={tierData} xpNeeded={xpNeeded} />
      </Panel>
      <Panel style={{ padding: 22, flex: 1 }}>
        <h3 style={{ margin: "0 0 14px", color: GOLD, letterSpacing: "0.16em" }}>NEXT REWARD</h3>
        <div style={{ color: CREAM, marginBottom: 16 }}>At {nextLabel[0] + nextLabel.slice(1).toLowerCase()} Rank</div>
        <div style={{ display: "grid", gridTemplateColumns: "86px 1fr 86px", gap: 14, alignItems: "center" }}>
          <img src={IMG("golden_box.png")} alt="Premium tasting kit" style={{ width: 86, height: 76, objectFit: "contain", filter: `drop-shadow(0 8px 18px ${GOLD}55)` }} />
          <div>
            <div style={{ fontWeight: 950 }}>Premium Tasting Kit</div>
            <div style={{ color: MUTED, fontSize: 13, marginTop: 6, lineHeight: 1.35 }}>Exclusive blend collection & accessories.</div>
          </div>
          <img src={IMG("cedar_box.png")} alt="Reserve cigar box" style={{ width: 86, height: 76, objectFit: "contain", filter: `drop-shadow(0 8px 18px ${GOLD}44)` }} />
        </div>
        <Progress color={PURPLE} pct={54} />
        <div style={{ marginTop: 10, color: MUTED, textAlign: "right" }}>{Math.max(0, xpNeeded).toLocaleString()} XP to go</div>
        <button onClick={onLeaderboard} style={{ marginTop: 24, width: "100%", minHeight: 54, borderRadius: 5, border: `1px solid ${GOLD}88`, background: `linear-gradient(180deg, ${GOLD}18, ${GOLD}08)`, color: GOLD, fontWeight: 950, letterSpacing: "0.16em" }}>VIEW LEADERBOARD</button>
      </Panel>
    </aside>
  );
}

function JourneyLine({ xp, tierData, xpNeeded }: { xp: number; tierData: typeof TIERS[number]; xpNeeded: number }) {
  const rows = [
    { n: 5, label: "ENTHUSIAST", value: `${xp} XP`, color: GOLD, active: true },
    { n: 4, label: "CONNOISSEUR", value: `${Math.max(0, xpNeeded).toLocaleString()} XP to go`, color: PURPLE },
    { n: 3, label: "AFICIONADO", value: "12,000 XP", color: "#FF9E18" },
    { n: 2, label: "APPRENTICE", value: "5,000 XP", color: GREEN },
    { n: 1, label: "INITIATE", value: "0 XP", color: MUTED },
  ];
  void tierData;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(row => (
        <div key={row.n} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 12, alignItems: "center" }}>
          <HexBadge tiny color={row.color}><span style={{ color: row.color, fontSize: 18, fontWeight: 950 }}>{row.n}</span></HexBadge>
          <div style={{ borderBottom: `1px solid rgba(255,255,255,0.09)`, paddingBottom: 8, background: row.active ? `${GOLD}10` : "transparent", borderRadius: row.active ? 6 : 0, paddingLeft: row.active ? 10 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: row.color, fontWeight: 950, letterSpacing: "0.09em" }}><span>{row.label}</span><span style={{ fontSize: 13 }}>{row.value}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardFull({ entries, updated }: { entries: LeaderEntry[]; updated: string }) {
  return (
    <main style={{ gridColumn: "1 / -1", overflow: "auto" }}>
      <Panel style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div><Label>LIVE RANKINGS</Label><h2 style={{ margin: "8px 0 0", fontSize: 38 }}>FULL LEADERBOARD</h2></div>
          <div style={{ color: MUTED }}>Updated {updated}</div>
        </div>
        {entries.map(entry => <LeaderRow key={entry.guestProfileId ?? entry.rank} entry={entry} />)}
      </Panel>
    </main>
  );
}

function ChallengeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 720, maxHeight: "86vh", overflowY: "auto", borderRadius: 14, border: `1px solid ${LINE}`, background: "#090A08", padding: 30 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <div><Label>GOLDEN BOX</Label><h2 style={{ margin: "8px 0 0", fontSize: 34 }}>CHALLENGES</h2></div>
              <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${LINE}`, color: MUTED, borderRadius: 6, padding: "10px 18px" }}>CLOSE</button>
            </div>
            {CHALLENGES.map(ch => (
              <div key={ch.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 18, padding: 18, marginBottom: 10, borderRadius: 10, border: `1px solid ${ch.locked ? "rgba(255,255,255,0.08)" : LINE}`, background: ch.locked ? "rgba(255,255,255,0.025)" : `${GOLD}09`, opacity: ch.locked ? 0.58 : 1 }}>
                <div><div style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 950 }}>{ch.title}{ch.locked && <LockKeyhole size={15} color={GOLD} />}</div><div style={{ color: MUTED, marginTop: 6 }}>{ch.desc}</div><div style={{ color: GOLD, fontSize: 12, fontWeight: 900, marginTop: 6 }}>{ch.diff}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontWeight: 950, fontSize: 20 }}>+{ch.xp} XP</div>{!ch.locked && <button style={{ marginTop: 10, padding: "9px 18px", border: "none", borderRadius: 5, background: GOLD, color: "#080604", fontWeight: 950 }}>START</button>}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ color: GOLD, fontSize: 12, fontWeight: 950, letterSpacing: "0.16em" }}>{children}</div>;
}

function Progress({ color, pct }: { color: string; pct: number }) {
  return (
    <div style={{ marginTop: 8, height: 7, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }} transition={{ duration: 1.1, ease: EASE }}
        style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}CC)`, boxShadow: `0 0 14px ${color}77` }} />
    </div>
  );
}

function HexBadge({ children, color, small, tiny }: { children: React.ReactNode; color: string; small?: boolean; tiny?: boolean }) {
  const size = tiny ? 42 : small ? 54 : 78;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, clipPath: "polygon(50% 3%, 93% 26%, 93% 74%, 50% 97%, 7% 74%, 7% 26%)", background: `linear-gradient(145deg, ${color}88, rgba(0,0,0,0.72))`, padding: 2, filter: `drop-shadow(0 0 12px ${color}55)` }}>
      <div style={{ width: "100%", height: "100%", clipPath: "inherit", background: "#0B0D0C", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function makeIcon(path: React.ReactNode): LucideIcon {
  return function CustomIcon({ size = 24, color = "currentColor", strokeWidth = 1.8 }: { size?: string | number; color?: string; strokeWidth?: string | number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
  } as LucideIcon;
}

const FlameIcon = makeIcon(<><path d="M12 22c4 0 7-3 7-7 0-3-1.5-5.2-4.5-8.5.2 2.9-1 4.2-2.1 5-1.3-2-1.8-4.8-.3-8.2C8.4 6.1 5 9.8 5 15c0 4 3 7 7 7Z" /><path d="M12 22c1.8 0 3.2-1.4 3.2-3.2 0-1.4-.7-2.4-2.2-4-.1 1.4-.7 2.1-1.4 2.6-.7-1-.9-2.3-.2-4-1.9 1.5-3.3 3.4-3.3 5.4 0 1.8 1.4 3.2 3.9 3.2Z" /></>);
const CrownIcon = makeIcon(<><path d="m3 8 4 3 5-6 5 6 4-3-2 10H5L3 8Z" /><path d="M5 21h14" /></>);
const GemIcon = makeIcon(<><path d="M6 3h12l4 6-10 12L2 9l4-6Z" /><path d="M2 9h20M6 3l6 18 6-18" /></>);
const LaurelIcon = makeIcon(<><path d="M8 17c-3-2-4-5-3-9M16 17c3-2 4-5 3-9" /><path d="M8 17c1 2 2.4 3 4 3s3-1 4-3M7 9l-3-2M7 12l-4-1M8 15l-3 1M17 9l3-2M17 12l4-1M16 15l3 1" /></>);
const BadgeLionIcon = makeIcon(<><path d="M12 3 4.5 6.5v5.7c0 4.2 3 7.4 7.5 8.8 4.5-1.4 7.5-4.6 7.5-8.8V6.5L12 3Z" /><path d="M8 11c1-2 3-3 4-3s3 1 4 3M8.8 13.8c1.6 2 4.8 2 6.4 0M10 12h.01M14 12h.01" /></>);
const GearIcon = makeIcon(<><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" /></>);
const XPIcon = makeIcon(<><path d="M5 4h14v16H5z" /><path d="m8 8 3 4-3 4M16 8h-3v8" /></>);
const UpIcon = makeIcon(<><path d="M12 20V5" /><path d="m6 11 6-6 6 6" /><path d="M5 20h14" /></>);
const ClipboardIcon = makeIcon(<><path d="M8 4h8l1 2h3v15H4V6h3l1-2Z" /><path d="M8 11h8M8 15h6" /></>);
const CalendarIcon = makeIcon(<><path d="M4 5h16v15H4z" /><path d="M8 3v4M16 3v4M4 10h16" /></>);
const MembersIcon = makeIcon(<><path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M2 21c.8-4 3-6 6-6s5.2 2 6 6M10 21c.8-3.5 2.8-5.5 6-5.5 2.8 0 4.8 1.8 6 5.5" /></>);
