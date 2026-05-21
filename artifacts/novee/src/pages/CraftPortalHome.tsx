import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone } from "@/hooks/useHaptic";
import { restoreSession, SessionCheckpoint } from "@/lib/sessionRestore";

const EASE_CINEMA = [0.22, 1, 0.36, 1] as const;

const GOLDEN_BOX_RULES = [
  {
    num: "§ I",
    title: "ONE RITUAL PER GUEST",
    body: "Each session begins fresh. Your blend, your story — never someone else's.",
  },
  {
    num: "§ II",
    title: "TRUST THE PROCESS",
    body: "Four stages, each essential. No skipping. Your palate reveals itself in sequence.",
  },
  {
    num: "§ III",
    title: "YOUR MENTOR GUIDES YOU",
    body: "Follow your guide. Their expertise becomes your competitive advantage on the floor.",
  },
  {
    num: "§ IV",
    title: "YOUR LEGACY RESERVE AWAITS",
    body: "Complete the full experience to unlock your signature cigar profile — kept in the vault.",
  },
];

const MENTOR_PORTFOLIO = [
  {
    key:     "rosa",
    name:    "DOÑA ROSA",
    role:    "Wrapper Artistry",
    origin:  "Jalapa Valley, Nicaragua",
    flag:    "🇳🇮",
    tier:    "SOVEREIGN",
    img:     "mentor_nicaraguan.jpg",
    accent:  "#C8964A",
    note:    "34 years curing volcanic-grown Jalapa wrappers.",
  },
  {
    key:     "cruz",
    name:    "MAESTRO CRUZ",
    role:    "Filler Architecture",
    origin:  "Santiago, Dominican Republic",
    flag:    "🇩🇴",
    tier:    "MASTER",
    img:     "mentor_dominican.jpg",
    accent:  "#D4AF37",
    note:    "Champion blender of long-leaf Dominican ligero.",
  },
  {
    key:     "hiroshi",
    name:    "SENSEI HIROSHI",
    role:    "Binder Selection",
    origin:  "Danlí, Honduras",
    flag:    "🇭🇳",
    tier:    "ARTISAN",
    img:     "mentor_honduran.jpg",
    accent:  "#9BB8D4",
    note:    "Specialist in dark Honduran binder structure.",
  },
  {
    key:     "valdez",
    name:    "MAESTRÍA VALDEZ",
    role:    "Vintage Curating",
    origin:  "Vuelta Abajo, Cuba",
    flag:    "🇨🇺",
    tier:    "LEGENDARY",
    img:     "",
    accent:  "#C84A4A",
    note:    "Guardian of pre-embargo Habano seed lineage.",
  },
];

const GOLD = "#D4AF37";
const IMG  = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

function playTactile() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 3400; o.type = "sine";
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.10);
  } catch { /* */ }
}

/* ── Pillar icons ── */
function IconCompass() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>; }
function IconChart()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconCraft()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 014 13C4 9 7.5 5 12 5c2.5 0 5 2 6 5-2 0-5 1-7 4"/><path d="M12 5v4M7 9c0 5 3 9 7 11"/></svg>; }
function IconStar()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }

const PILLARS = [
  { Icon: IconCompass, label: "DISCOVER",   sub: "Learn the leaf"     },
  { Icon: IconChart,   label: "ANALYZE",    sub: "Decode the blend"   },
  { Icon: IconCraft,   label: "CRAFT",      sub: "Build your profile" },
  { Icon: IconStar,    label: "EXPERIENCE", sub: "Score & refine"     },
];

/* ── Craft module switcher ── */
interface CraftModule { id: string; label: string; tag: string; accent: string; live: boolean; }
const CRAFT_MODULES: CraftModule[] = [
  { id: "smoke", label: "SmokeCraft 360", tag: "SC", accent: GOLD,      live: true  },
  { id: "pour",  label: "PourCraft 360",  tag: "PC", accent: "#C87941", live: false },
  { id: "beer",  label: "BeerCraft 360",  tag: "BC", accent: "#C8A041", live: false },
  { id: "vape",  label: "VapeCraft 360",  tag: "VC", accent: "#6A9FD8", live: false },
];

/* ── DOÑA ROSA mentor config ── */
const MENTOR = {
  name:    "DOÑA ROSA",
  role:    "WRAPPER ARTISTRY MENTOR",
  origin:  "Jalapa Valley, Nicaragua",
  note:    "Master of Maduro leaf selection, 34 years curing volcanic-grown Jalapa wrappers for the world's most discerning lounges.",
  accent:  "#C8964A",
  tier:    "SOVEREIGN MENTOR",
};

export default function CraftPortalHome() {
  const { setPhase, updateProfile, profile } = useGuest();
  const [activeCraft,    setActiveCraft]    = useState("smoke");
  const [showReturn,     setShowReturn]     = useState(false);
  const [retLast,        setRetLast]        = useState("");
  const [retPin,         setRetPin]         = useState("");
  const [mentorOpen,     setMentorOpen]     = useState(false);
  const [goldenBoxSeen,  setGoldenBoxSeen]  = useState<boolean>(() => {
    try { return sessionStorage.getItem("novee_golden_box_seen") === "1"; } catch { return false; }
  });
  const [showGoldenBox,  setShowGoldenBox]  = useState(false);
  const [showMentorPort, setShowMentorPort] = useState(false);
  const [checkpoint, setCheckpoint] = useState<SessionCheckpoint | null>(null);

  useEffect(() => {
    const cp = restoreSession();
    if (cp) {
      setCheckpoint(cp);
    }
  }, []);

  function handleRestore() {
    if (checkpoint) {
      updateProfile(checkpoint.profile);
      setPhase(checkpoint.phase);
      setCheckpoint(null);
    }
  }

  function dismissGoldenBox() {
    playTactile(); hapticMilestone();
    try { sessionStorage.setItem("novee_golden_box_seen", "1"); } catch { /* */ }
    setGoldenBoxSeen(true);
    setShowGoldenBox(false);
    setShowMentorPort(true);
  }

  function dismissMentorPort() { playTactile(); setShowMentorPort(false); setPhase("s1_demo"); }

  function beginNew() {
    playTactile(); hapticMilestone();
    setShowMentorPort(true);
  }
  function resumeSession() { setShowReturn(true); }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", background: "#040200", fontFamily: "'Inter',-apple-system,sans-serif", position: "relative" }}>

      {/* ══════════ FULL-BLEED HERO ══════════ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Cinematic cigar hero */}
        <img src={IMG("cigar_hero.png")} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 36%" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />

        {/* Obsidian glass preparation mat overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(4,2,0,0.22) 0%, rgba(4,2,0,0.40) 48%, rgba(4,2,0,0.10) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "64%", background: "linear-gradient(0deg, rgba(2,1,0,0.98) 0%, rgba(2,1,0,0.78) 36%, transparent 100%)" }} />
        {/* Volcanic soil texture grain */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(135deg, transparent 0px, rgba(180,120,30,0.025) 1px, transparent 2px, transparent 18px)`, pointerEvents: "none" }} />

        {/* ── Craft module switcher ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", flexDirection: "row", alignItems: "center",
          padding: "14px 32px", gap: 10,
          background: "linear-gradient(180deg, rgba(4,2,0,0.88) 0%, transparent 100%)",
        }}>
          {CRAFT_MODULES.map(mod => {
            const active = activeCraft === mod.id;
            return (
              <motion.button
                key={mod.id} type="button"
                onPointerDown={() => { if (mod.live) { playTactile(); setActiveCraft(mod.id); } }}
                whileTap={mod.live ? { scale: 0.95 } : {}}
                animate={{ background: active ? `rgba(212,175,55,0.18)` : "rgba(0,0,0,0.35)" }}
                transition={{ duration: 0.20 }}
                style={{
                  border: `1.5px solid ${active ? mod.accent + "99" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 9, padding: "8px 18px",
                  display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
                  cursor: mod.live ? "pointer" : "default",
                  opacity: mod.live ? 1 : 0.42,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: active ? `0 0 18px ${mod.accent}33` : "none",
                  position: "relative",
                }}
              >
                {active && <div style={{ position: "absolute", bottom: -1, left: "15%", right: "15%", height: 2, background: mod.accent, borderRadius: 2, boxShadow: `0 0 8px ${mod.accent}` }} />}
                <div style={{ width: 26, height: 26, borderRadius: 6, background: active ? `${mod.accent}33` : "rgba(255,255,255,0.08)", border: `1px solid ${active ? mod.accent + "66" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: active ? mod.accent : "rgba(255,255,255,0.55)" }}>{mod.tag}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? mod.accent : "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{mod.label}</span>
                {!mod.live && <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "2px 6px" }}>SOON</span>}
              </motion.button>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.32em", color: `${GOLD}99`, fontWeight: 800, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>SmokeCraft 360</span>
            <span style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>Kiosk Edition · NOVEE OS</span>
          </div>
        </div>

        {/* ── Bottom-anchored hero content ── */}
        <motion.div
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.80, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, padding: "0 52px 20px", maxHeight: "82%", overflowY: "auto" }}
        >
          {/* Title */}
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 40, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.06, marginBottom: 2 }}>
            Welcome To
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 60, fontWeight: 700, color: GOLD, lineHeight: 0.96, marginBottom: 12, textShadow: `0 0 70px ${GOLD}44` }}>
            Smokecraft 360
          </div>

          {/* Gold ornament divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <div style={{ height: 1, width: 36, background: `linear-gradient(90deg, transparent, ${GOLD}88)` }} />
            <svg width="14" height="14" viewBox="0 0 20 20" fill={GOLD} opacity={0.70}>
              <path d="M10 2C10 2 4 6 4 12c0 2.2 1.4 3.8 3.4 4.7 0-2.2 1.1-4.4 2.6-5.5-.6 2.3-.6 4.5 0 6.3.3.1.7.3 1 .3V2z"/>
              <path d="M10 2c0 0 6 4 6 10 0 2.2-1.4 3.8-3.4 4.7 0-2.2-1.1-4.4-2.6-5.5.6 2.3.6 4.5 0 6.3-.3.1-.7.3-1 .3V2z" opacity="0.6"/>
            </svg>
            <div style={{ height: 1, width: 52, background: `${GOLD}44` }} />
          </div>

          {/* Description */}
          <p style={{ fontSize: 18, color: "rgba(240,232,212,0.55)", lineHeight: 1.5, margin: "0 0 16px", fontWeight: 300 }}>
            A 4-session luxury cigar science journey. Build your blend, earn your rank.
          </p>

          {/* 4 Pillars */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 18 }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 86 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: `1.5px solid rgba(212,175,55,0.45)`, backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px rgba(212,175,55,0.12)` }}><p.Icon /></div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center" }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(240,232,212,0.38)", textAlign: "center", lineHeight: 1.3 }}>{p.sub}</div>
                </div>
                {i < PILLARS.length - 1 && <div style={{ marginTop: 20, padding: "0 8px", fontSize: 16, color: "rgba(212,175,55,0.30)", lineHeight: 1 }}>·</div>}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 460 }}>
            {checkpoint && (
              <motion.button type="button" onPointerDown={handleRestore} whileTap={{ scale: 0.97 }}
                style={{ width: "100%", padding: "18px 28px", background: `linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)`, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 22, fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.20em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: `0 6px 36px rgba(74,144,226,0.40), 0 2px 0 rgba(255,255,255,0.14) inset` }}>
                <span>RESTORE SESSION</span>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>↺</div>
              </motion.button>
            )}
            <motion.button type="button" onPointerDown={beginNew} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "18px 28px", background: `linear-gradient(135deg, ${GOLD} 0%, #C8960A 100%)`, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 22, fontWeight: 800, color: "#090600", letterSpacing: "0.20em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: `0 6px 36px rgba(212,175,55,0.40), 0 2px 0 rgba(255,255,255,0.14) inset` }}>
              <span>BEGIN NEW SESSION</span>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>→</div>
            </motion.button>
            <motion.button type="button" onPointerDown={resumeSession} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "15px 28px", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: `1px solid rgba(212,175,55,0.42)`, borderRadius: 6, cursor: "pointer", fontSize: 20, fontWeight: 700, color: "rgba(240,232,212,0.70)", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", textAlign: "center" }}>
              RESUME SESSION
            </motion.button>
          </div>
        </motion.div>

        {/* ══════════ DOÑA ROSA — WRAPPER ARTISTRY MENTOR TILE ══════════ */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55, duration: 0.70, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute", top: "50%", right: 36, transform: "translateY(-50%)",
            zIndex: 20, width: 230,
          }}
        >
          {/* Smoked chrome / obsidian glass tile */}
          <div
            style={{
              background: "linear-gradient(145deg, rgba(18,12,6,0.96) 0%, rgba(10,7,3,0.99) 100%)",
              border: `1px solid rgba(200,150,74,0.55)`,
              borderRadius: 14,
              padding: "20px 18px 16px",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              boxShadow: `0 0 40px rgba(200,150,74,0.14), 0 12px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Titanium brush grain */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(95deg, transparent 0px, rgba(255,255,255,0.014) 1px, transparent 2px, transparent 14px)`, pointerEvents: "none" }} />

            {/* Top accent bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${MENTOR.accent}99, transparent)` }} />

            {/* Tier badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.28em", color: `${MENTOR.accent}88`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
                {MENTOR.tier}
              </span>
              {/* Comms active dot */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <style>{`
                  @keyframes mentorPing { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.65); } }
                `}</style>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A", animation: "mentorPing 2.4s ease-in-out infinite" }} />
                <span style={{ fontSize: 7.5, letterSpacing: "0.20em", color: "#32B45A99", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>ACTIVE</span>
              </div>
            </div>

            {/* Mentor avatar placeholder — obsidian circle */}
            <div style={{
              width: 54, height: 54, borderRadius: "50%", marginBottom: 12,
              background: `radial-gradient(circle, rgba(200,150,74,0.22) 0%, rgba(10,7,3,0.95) 70%)`,
              border: `1.5px solid ${MENTOR.accent}66`,
              boxShadow: `0 0 20px rgba(200,150,74,0.22)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: MENTOR.accent }}>DR</span>
            </div>

            {/* Name & role */}
            <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 20, fontWeight: 700, color: "#F0E8D4", letterSpacing: "0.04em", marginBottom: 2, lineHeight: 1.1 }}>
              {MENTOR.name}
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.22em", color: `${MENTOR.accent}CC`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", marginBottom: 10 }}>
              {MENTOR.role}
            </div>

            {/* Origin */}
            <div style={{ fontSize: 11, color: "rgba(240,232,212,0.38)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", marginBottom: 10 }}>
              {MENTOR.origin}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${MENTOR.accent}44, transparent)`, marginBottom: 10 }} />

            {/* Mentor note */}
            <p style={{ fontSize: 11.5, color: "rgba(240,232,212,0.58)", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.55, margin: "0 0 14px", fontStyle: "italic" }}>
              {MENTOR.note}
            </p>

            {/* Expand / communicate CTA */}
            <motion.button
              type="button"
              onPointerDown={() => setMentorOpen(m => !m)}
              whileTap={{ scale: 0.95 }}
              style={{
                width: "100%", padding: "9px 12px",
                background: `rgba(200,150,74,0.12)`,
                border: `1px solid ${MENTOR.accent}55`,
                borderRadius: 7, cursor: "pointer",
                fontSize: 9.5, fontWeight: 900, letterSpacing: "0.22em",
                color: MENTOR.accent, textTransform: "uppercase",
                fontFamily: "'Inter',sans-serif", textAlign: "center",
              }}
            >
              {mentorOpen ? "CLOSE CHANNEL" : "OPEN COMM CHANNEL"}
            </motion.button>

            <AnimatePresence>
              {mentorOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                    {["Request leaf consultation", "Flag wrapper defect", "Escalate to floor"].map(action => (
                      <button key={action} type="button" style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(240,232,212,0.65)", fontSize: 11, fontFamily: "'Inter',sans-serif", textAlign: "left", cursor: "pointer", letterSpacing: "0.04em" }}>
                        {action}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ══════════ GOLDEN BOX RULES DISCLOSURE ══════════ */}
      <AnimatePresence>
        {showGoldenBox && (
          <motion.div key="golden-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.90, ease: EASE_CINEMA }}
            style={{
              position: "fixed", inset: 0, zIndex: 8000,
              background: "rgba(0,0,0,0.88)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Ambient gold glow */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse 55% 40% at 50% 50%, rgba(212,175,55,0.12) 0%, transparent 70%)` }} />

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.15, ease: EASE_CINEMA }}
              style={{
                width: "min(720px, 88vw)",
                background: "linear-gradient(145deg, rgba(14,10,3,0.99) 0%, rgba(8,5,1,0.99) 100%)",
                border: `1px solid rgba(212,175,55,0.45)`,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: `0 0 80px rgba(212,175,55,0.18), 0 32px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)`,
                position: "relative",
              }}
            >
              {/* Titanium grain */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(96deg,transparent 0px,rgba(255,255,255,0.014) 1px,transparent 2px,transparent 16px)" }} />

              {/* Top gold bar */}
              <div style={{ height: 3,
                background: `linear-gradient(90deg,transparent,${GOLD}88,${GOLD},${GOLD}88,transparent)`,
                boxShadow: `0 0 28px ${GOLD}55` }} />

              {/* Header */}
              <div style={{ padding: "32px 40px 24px", textAlign: "center",
                borderBottom: `1px solid rgba(212,175,55,0.14)` }}>
                <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: "0.55em",
                  color: `${GOLD}66`, fontFamily: "'Inter',sans-serif",
                  textTransform: "uppercase", marginBottom: 10 }}>
                  CRAFTHUB · MANDATORY DISCLOSURE
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: 48, fontWeight: 700, color: GOLD, lineHeight: 1.0,
                  textShadow: `0 0 50px ${GOLD}44` }}>
                  The Golden Box
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: 22, fontWeight: 400, color: "rgba(240,232,212,0.55)", marginTop: 6, fontStyle: "italic" }}>
                  Rules of the Ritual
                </div>
              </div>

              {/* Rules grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
                margin: "0", background: "rgba(212,175,55,0.08)" }}>
                {GOLDEN_BOX_RULES.map((rule, i) => (
                  <motion.div key={rule.num}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.30 + i * 0.10, duration: 0.55, ease: EASE_CINEMA }}
                    style={{
                      background: "linear-gradient(145deg, rgba(14,10,3,0.98) 0%, rgba(8,5,1,0.99) 100%)",
                      padding: "24px 28px",
                      borderRight: i % 2 === 0 ? "1px solid rgba(212,175,55,0.09)" : "none",
                      borderBottom: i < 2 ? "1px solid rgba(212,175,55,0.09)" : "none",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.30em",
                      color: `${GOLD}88`, fontFamily: "'Cormorant Garamond',serif",
                      marginBottom: 6 }}>
                      {rule.num}
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: 19, fontWeight: 700, color: "#F0E8D4", marginBottom: 8, lineHeight: 1.15 }}>
                      {rule.title}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(240,232,212,0.50)",
                      fontFamily: "'Inter',sans-serif", lineHeight: 1.58 }}>
                      {rule.body}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ padding: "28px 40px 32px", textAlign: "center" }}>
                <motion.button
                  type="button"
                  onPointerDown={dismissGoldenBox}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.72, duration: 0.50, ease: EASE_CINEMA }}
                  style={{
                    width: "100%", padding: "22px 32px",
                    background: `linear-gradient(135deg, ${GOLD} 0%, #C8960A 100%)`,
                    border: "none", borderRadius: 8, cursor: "pointer",
                    fontSize: 22, fontWeight: 900, color: "#0A0700",
                    letterSpacing: "0.24em", textTransform: "uppercase",
                    fontFamily: "'Inter',sans-serif",
                    boxShadow: `0 6px 36px rgba(212,175,55,0.40), 0 2px 0 rgba(255,255,255,0.14) inset`,
                  }}
                >
                  I UNDERSTAND THE CODE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ MENTOR PORTFOLIO OVERLAY ══════════ */}
      <AnimatePresence>
        {showMentorPort && (
          <motion.div key="mentor-portfolio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.75, ease: EASE_CINEMA }}
            style={{
              position: "fixed", inset: 0, zIndex: 7500,
              background: "rgba(0,0,0,0.82)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "0 32px",
            }}
          >
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(180,100,20,0.09) 0%, transparent 65%)` }} />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.12, ease: EASE_CINEMA }}
              style={{ width: "100%", maxWidth: 1040 }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: "0.50em",
                  color: `${GOLD}55`, fontFamily: "'Inter',sans-serif",
                  textTransform: "uppercase", marginBottom: 10 }}>
                  CRAFTHUB · MENTOR PORTFOLIO
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: 52, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.0,
                  textShadow: `0 0 60px rgba(212,175,55,0.20)` }}>
                  Your Guides
                </div>
                <div style={{ height: 1,
                  background: `linear-gradient(90deg,transparent,${GOLD}44,transparent)`,
                  width: 280, margin: "16px auto 0" }} />
              </div>

              {/* Mentor cards row */}
              <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
                {MENTOR_PORTFOLIO.map((m, i) => (
                  <motion.div key={m.key}
                    initial={{ opacity: 0, y: 22, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.20 + i * 0.09, duration: 0.65,
                      type: "spring", mass: 0.9, stiffness: 260, damping: 28 }}
                    style={{
                      flex: 1, position: "relative", borderRadius: 14, overflow: "hidden",
                      background: "linear-gradient(145deg, rgba(18,12,6,0.97) 0%, rgba(8,5,1,0.99) 100%)",
                      border: `1.5px solid ${m.accent}44`,
                      boxShadow: `0 0 28px ${m.accent}11, 0 8px 32px rgba(0,0,0,0.55)`,
                      minHeight: 300,
                    }}
                  >
                    {/* Mentor image */}
                    {m.img ? (
                      <div style={{ position: "relative", height: 170, overflow: "hidden" }}>
                        <img src={IMG(m.img)} alt={m.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover",
                            objectPosition: "center 20%" }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <div style={{ position: "absolute", inset: 0,
                          background: `linear-gradient(0deg, rgba(8,5,1,0.95) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)` }} />
                      </div>
                    ) : (
                      <div style={{ height: 170, display: "flex", alignItems: "center", justifyContent: "center",
                        background: `radial-gradient(circle, ${m.accent}18 0%, rgba(8,5,1,0.97) 70%)` }}>
                        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 52,
                          fontWeight: 700, color: m.accent, opacity: 0.70 }}>
                          {m.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                        </span>
                      </div>
                    )}

                    {/* Top accent */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg,transparent,${m.accent}88,transparent)` }} />

                    {/* Content */}
                    <div style={{ padding: "14px 18px 18px" }}>
                      {/* Country flag + tier */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 22, lineHeight: 1 }}>{m.flag}</span>
                          <span style={{ fontSize: 9.5, color: "rgba(240,232,212,0.40)",
                            fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em" }}>
                            {m.origin}
                          </span>
                        </div>
                        <span style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: "0.26em",
                          color: m.accent, fontFamily: "'Inter',sans-serif",
                          background: `${m.accent}14`,
                          border: `1px solid ${m.accent}33`,
                          borderRadius: 3, padding: "2px 7px" }}>
                          {m.tier}
                        </span>
                      </div>

                      {/* Name */}
                      <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                        fontSize: 22, fontWeight: 700, color: "#F0E8D4", marginBottom: 3, lineHeight: 1.1 }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
                        color: `${m.accent}CC`, fontFamily: "'Inter',sans-serif",
                        textTransform: "uppercase", marginBottom: 10 }}>
                        {m.role}
                      </div>

                      <div style={{ height: 1,
                        background: `linear-gradient(90deg,transparent,${m.accent}33,transparent)`,
                        marginBottom: 10 }} />

                      <p style={{ fontSize: 12, color: "rgba(240,232,212,0.48)",
                        fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.55,
                        margin: 0, fontStyle: "italic" }}>
                        {m.note}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Dismiss */}
              <div style={{ textAlign: "center", marginTop: 32 }}>
                <motion.button
                  type="button"
                  onPointerDown={dismissMentorPort}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65, duration: 0.50, ease: EASE_CINEMA }}
                  style={{
                    padding: "18px 52px",
                    background: `linear-gradient(135deg, ${GOLD} 0%, #C8960A 100%)`,
                    border: "none", borderRadius: 8, cursor: "pointer",
                    fontSize: 22, fontWeight: 900, color: "#0A0700",
                    letterSpacing: "0.22em", textTransform: "uppercase",
                    fontFamily: "'Inter',sans-serif",
                    boxShadow: `0 4px 28px rgba(212,175,55,0.38)`,
                  }}
                >
                  ENTER THE RITUAL →
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ RESUME SESSION DRAWER ══════════ */}
      <AnimatePresence>
        {showReturn && (
          <motion.div key="return-drawer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.30 }}
            onClick={() => setShowReturn(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(20px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 520, background: "rgba(8,5,2,0.98)", border: `1px solid rgba(212,175,55,0.24)`, borderRadius: "16px 16px 0 0", padding: "32px 32px 44px" }}>
              <div style={{ fontSize: 12, letterSpacing: "0.40em", color: `${GOLD}60`, textTransform: "uppercase", textAlign: "center", marginBottom: 10, fontFamily: "'Inter',sans-serif" }}>Returning Guest</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, color: "#F0E8D4", textAlign: "center", margin: "0 0 24px" }}>Welcome Back</h3>
              {[
                { ph: "LAST NAME",     val: retLast, fn: setRetLast,  type: "text" },
                { ph: "LAST 4 DIGITS", val: retPin,  fn: (v: string) => setRetPin(v.replace(/\D/g,"").slice(0,4)), type: "tel" },
              ].map(f => (
                <input key={f.ph} type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.fn(e.target.value)}
                  style={{ width: "100%", padding: "18px 20px", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(212,175,55,0.22)`, borderRadius: 6, color: "#F0E8D4", fontSize: 20, outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }} />
              ))}
              <button type="button" onClick={() => { setShowReturn(false); setPhase("s1_demo"); }}
                style={{ width: "100%", padding: "20px", background: "rgba(212,175,55,0.16)", border: `1.5px solid ${GOLD}55`, borderRadius: 6, color: GOLD, fontSize: 22, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                Find My Session →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
