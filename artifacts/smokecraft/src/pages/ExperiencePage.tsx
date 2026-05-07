/**
 * ExperiencePage — Universal Swipe Experience Engine.
 * Route: /experience/:type
 *
 * Cinematic Tinder-style card swiping for smoke, pour, brew, vape.
 * - Swipe right = ADD, swipe left = SKIP
 * - Drag physics with rotation, glow trails, ADD/SKIP overlays
 * - CraftRealism ambient animations per craft type
 * - 60fps transform-only animations throughout
 */

import { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, animate,
} from "framer-motion";
import { ArrowLeft, Sparkles, Check, X } from "lucide-react";
import { playClick, playAmbientHum } from "@/lib/audioEngine";
import { getCraftTheme, type CraftTheme } from "@/lib/craftThemes";
import { CraftRealism } from "@/components/CraftRealism";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { useOrchestratorSafe } from "@/contexts/OrchestratorContext";
import { SessionReturnBanner } from "@/components/CinematicTransition";
import { CraftEntryChamber } from "@/components/CraftEntryChamber";
import MentorCommentary from "@/components/MentorCommentary";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { generateMentorLine, generateWhyThisWorks } from "@/lib/mentorIntelligence";

// ── Ambient particles — same visual language as CraftHub ──────────────────────

const EXP_PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id:  i,
  x:   Math.random() * 100,
  y:   Math.random() * 100,
  r:   0.8 + Math.random() * 1.8,
  dur: 10 + Math.random() * 14,
  del: Math.random() * 9,
  op:  0.04 + Math.random() * 0.11,
}));

function ExpParticles({ accent }: { accent: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 1 }}>
      {EXP_PARTICLES.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.r * 2, height: p.r * 2,
            borderRadius: "50%",
            background: accent,
            opacity: p.op,
          }}
          animate={{
            y:       [0, -28, 8, -18, 0],
            x:       [0, 9, -8, 13, 0],
            opacity: [p.op, p.op * 2.2, p.op * 0.3, p.op * 1.7, p.op],
          }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

const PREMIUM_TAGS_SET = new Set([
  "bold", "reserve", "aged", "single malt", "limited", "rare", "vintage",
  "premium", "luxury", "full body", "rich", "complex", "oaky", "robust",
]);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExperienceItem {
  id:          string;
  title:       string;
  description: string | null;
  image:       string | null;
  type:        string;
  tags:        string[];
  intensity:   number;
  baseScore:   number;
}

// ── API helpers ───────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiPost(path: string, body: unknown) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path: string) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

// ── Swipe Card ────────────────────────────────────────────────────────────────

interface SwipeCardProps {
  item:         ExperienceItem;
  theme:        CraftTheme;
  isTop:        boolean;
  stackIndex:   number;
  onSwipeRight: () => void;
  onSwipeLeft:  () => void;
}

// Micro-particles that breathe inside the card (embers / smoke wisps)
const CARD_EMBERS = [
  { x: 16, y:  6, size: 2.4, drift: 62, op: 0.52, dur: 3.2, delay: 0.0 },
  { x: 32, y:  9, size: 1.4, drift: 80, op: 0.36, dur: 4.2, delay: 0.7 },
  { x: 50, y:  4, size: 2.9, drift: 54, op: 0.46, dur: 2.9, delay: 1.4 },
  { x: 66, y: 11, size: 1.7, drift: 72, op: 0.38, dur: 3.7, delay: 0.3 },
  { x: 80, y:  7, size: 2.1, drift: 66, op: 0.43, dur: 3.9, delay: 1.1 },
  { x: 26, y: 14, size: 1.1, drift: 46, op: 0.28, dur: 4.6, delay: 2.0 },
  { x: 58, y:  3, size: 1.8, drift: 58, op: 0.32, dur: 5.0, delay: 2.7 },
];

function SwipeCard({ item, theme, isTop, stackIndex, onSwipeRight, onSwipeLeft }: SwipeCardProps) {
  const x       = useMotionValue(isTop ? 280 : 0);
  const rotate  = useTransform(x, [-300, 300], [-16, 16]);
  const addOp   = useTransform(x, [30, 110], [0, 1]);
  const skipOp  = useTransform(x, [-110, -30], [1, 0]);

  // 2-second image failsafe — if the asset doesn't resolve in time, fall back
  // to the craft gradient so the card is never blank.
  const [imgError, setImgError] = useState(false);
  const imgTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!item.image) return;
    setImgError(false);
    imgTimeoutRef.current = setTimeout(() => setImgError(true), 2000);
    return () => clearTimeout(imgTimeoutRef.current);
  }, [item.image]);
  // Glow trail: warm gold on right drag, cool white-blue on left drag
  const glowBg  = useTransform(
    x,
    [-120, 0, 120],
    ["rgba(148,163,184,0.10)", "rgba(0,0,0,0)", "rgba(212,139,0,0.14)"],
  );
  // DISCOVER responsiveness: image brightens + card lifts as user drags right
  const imgOp       = useTransform(x, [-80, 0, 110], [0.64, 0.76, 0.90]);
  const discoverLift = useTransform(x, [-60, 0, 110], [2, 0, -5]);
  const exiting = useRef(false);

  useEffect(() => {
    if (isTop) {
      animate(x, 0, { duration: 0.44, ease: [0.22, 1, 0.36, 1] });
    }
  }, [isTop, x]);

  function triggerRight() {
    if (exiting.current || !isTop) return;
    exiting.current = true;
    playClick();
    animate(x, 750, { duration: 0.3, ease: [0.4, 0, 1, 1] }).then(onSwipeRight);
  }
  function triggerLeft() {
    if (exiting.current || !isTop) return;
    exiting.current = true;
    playClick();
    animate(x, -750, { duration: 0.3, ease: [0.4, 0, 1, 1] }).then(onSwipeLeft);
  }

  function onDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x > 85 || info.velocity.x > 450)        triggerRight();
    else if (info.offset.x < -85 || info.velocity.x < -450) triggerLeft();
    else animate(x, 0, { duration: 0.32, ease: [0.22, 1, 0.36, 1] });
  }

  const scale   = 1 - stackIndex * 0.05;
  const yShift  = stackIndex * 14;
  const opacity = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.52 : 0.26;
  const vigRgb  = theme.type === "vape" ? "3,0,10" : "6,4,1";

  return (
    <motion.div
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.65}
      onDragEnd={onDragEnd}
      style={{
        x:        isTop ? x : 0,
        rotate:   isTop ? rotate : 0,
        scale,
        y:        isTop ? discoverLift : yShift,
        opacity,
        position: "absolute",
        inset:    0,
        cursor:   isTop ? "grab" : "default",
        zIndex:   50 - stackIndex,
        touchAction: "pan-y",
      }}
    >
      {/* Glow trail overlay */}
      {isTop && (
        <motion.div
          style={{
            position: "absolute", inset: 0,
            background: glowBg,
            borderRadius: 24,
            zIndex: 20,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Card body — matte-black collectible glass */}
      <div style={{
        position:     "absolute",
        inset:        0,
        borderRadius: 20,
        overflow:     "hidden",
        background:   theme.cardBg,
        border:       `1px solid ${theme.accent}${stackIndex === 0 ? "38" : "18"}`,
        boxShadow: stackIndex === 0
          ? `0 44px 110px rgba(0,0,0,0.94), 0 0 0 1px ${theme.accent}10, 0 0 56px ${theme.accent}08, inset 0 1px 0 rgba(26,26,27,0.07)`
          : "0 14px 40px rgba(26,26,27,0.34)",
      }}>

        {/* ── Sensory background image — with 2-second load failsafe ── */}
        {item.image && !imgError ? (
          <>
            {/* Hidden probe: resolves timeout on load, sets error flag on failure */}
            <img
              src={item.image}
              alt=""
              onLoad={() => clearTimeout(imgTimeoutRef.current)}
              onError={() => { clearTimeout(imgTimeoutRef.current); setImgError(true); }}
              style={{ display: "none" }}
            />
            <motion.div style={{
              position: "absolute", inset: 0,
              backgroundImage:    `url(${item.image})`,
              backgroundSize:     "cover",
              backgroundPosition: "center top",
              opacity:            isTop ? imgOp : 0.72,
              willChange:         "transform",
            }} />
          </>
        ) : (
          <div style={{
            position:   "absolute",
            inset:      0,
            background: theme.type === "vape"
              ? `linear-gradient(160deg, rgba(3,0,10,1) 0%, ${theme.accent}32 55%, #06b6d428 100%)`
              : `linear-gradient(160deg, rgba(14,9,3,1) 0%, ${theme.accent}26 100%)`,
          }} />
        )}

        {/* ── Cinematic vignette — strong top + bottom frame ── */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(180deg,
            rgba(${vigRgb},0.70) 0%,
            rgba(${vigRgb},0.08) 22%,
            rgba(${vigRgb},0.06) 55%,
            rgba(${vigRgb},0.88) 100%)`,
        }} />

        {/* ── Holographic shimmer sweep (top card only) ── */}
        {stackIndex === 0 && (
          <motion.div
            style={{
              position: "absolute",
              top: 0, bottom: 0, width: "55%",
              background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.042) 50%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 15,
            }}
            animate={{ left: ["-55%", "115%"] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "linear", repeatDelay: 2.2 }}
          />
        )}

        {/* ── CraftRealism ambient (top card only) ── */}
        {stackIndex === 0 && (
          <CraftRealism type={item.type} accent={theme.accent} />
        )}

        {/* ── Card micro-particles: embers / wisps breathing inside card ── */}
        {stackIndex === 0 && CARD_EMBERS.map((e, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              width: e.size, height: e.size,
              borderRadius: "50%",
              background: theme.accent,
              left: `${e.x}%`,
              bottom: `${e.y}%`,
              pointerEvents: "none",
              zIndex: 16,
              filter: "blur(0.7px)",
            }}
            animate={{ y: [0, -e.drift], opacity: [0, e.op, e.op * 0.55, 0] }}
            transition={{ duration: e.dur, repeat: Infinity, delay: e.delay, ease: "easeOut" }}
          />
        ))}

        {/* ── Top strip: category chips + intensity dots ── */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          padding: "13px 14px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(6,4,1,0.72) 0%, transparent 100%)",
          zIndex: 10,
        }}>
          <div style={{ display: "flex", gap: 5 }}>
            {item.tags.slice(0, 2).map(tag => (
              <span key={tag} style={{
                padding: "3px 7px",
                borderRadius: 4,
                background: `${theme.accent}14`,
                border: `1px solid ${theme.accent}48`,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: theme.accent,
              }}>{tag}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: i < Math.round(item.intensity / 2) ? theme.accent : "rgba(26,26,27,0.16)",
                boxShadow: i < Math.round(item.intensity / 2) ? `0 0 4px ${theme.accent}` : "none",
              }} />
            ))}
          </div>
        </div>

        {/* ── Bottom: title, atmospheric description, card-level actions ── */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          padding: "20px 16px 14px",
          background: "linear-gradient(0deg, rgba(5,3,1,0.97) 0%, rgba(5,3,1,0.82) 65%, transparent 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 10,
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18,
            fontWeight: 700,
            color: "rgba(240,232,212,0.96)",
            lineHeight: 1.18,
            textShadow: "0 2px 12px rgba(26,26,27,0.40)",
          }}>{item.title}</div>

          {item.description && (
            <p style={{
              fontSize: 11,
              color: "rgba(240,232,212,0.48)",
              margin: 0,
              lineHeight: 1.55,
              fontStyle: "italic",
              letterSpacing: "0.01em",
            }}>{item.description}</p>
          )}

          {/* Card-level PASS / DISCOVER strip */}
          {isTop && (
            <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.91 }}
                onClick={(e) => { e.stopPropagation(); triggerLeft(); }}
                style={{
                  flex: 1, padding: "8px 0",
                  borderRadius: 9,
                  background: "rgba(148,163,184,0.07)",
                  border: "1px solid rgba(148,163,184,0.22)",
                  color: "rgba(203,213,225,0.58)",
                  fontSize: 9, fontWeight: 800,
                  letterSpacing: "0.2em", textTransform: "uppercase" as const,
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                }}
              >← Pass</motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.91 }}
                onClick={(e) => { e.stopPropagation(); triggerRight(); }}
                style={{
                  flex: 1, padding: "8px 0",
                  borderRadius: 9,
                  background: `${theme.accent}12`,
                  border: `1px solid ${theme.accent}40`,
                  color: theme.accent,
                  fontSize: 9, fontWeight: 800,
                  letterSpacing: "0.2em", textTransform: "uppercase" as const,
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  boxShadow: `0 0 14px ${theme.accent}10`,
                }}
              >Discover →</motion.button>
            </div>
          )}
        </div>

        {/* DISCOVER overlay — warm gold, premium feel */}
        {isTop && (
          <motion.div style={{
            position:      "absolute",
            top:           24, left: 24,
            opacity:       addOp,
            background:    "rgba(212,139,0,0.14)",
            border:        "1.5px solid rgba(212,139,0,0.7)",
            borderRadius:  12,
            padding:       "8px 18px",
            display:       "flex",
            alignItems:    "center",
            gap:           7,
            fontSize:      12, fontWeight: 800,
            color:         "#D48B00",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            backdropFilter: "blur(10px)",
            boxShadow:     "0 0 16px rgba(212,139,0,0.18)",
          }}>
            <Check size={14} strokeWidth={2.5} /> Discover
          </motion.div>
        )}

        {/* PASS overlay — soft cool tone, understated */}
        {isTop && (
          <motion.div style={{
            position:      "absolute",
            top:           24, right: 24,
            opacity:       skipOp,
            background:    "rgba(148,163,184,0.10)",
            border:        "1.5px solid rgba(148,163,184,0.45)",
            borderRadius:  12,
            padding:       "8px 18px",
            display:       "flex",
            alignItems:    "center",
            gap:           7,
            fontSize:      12, fontWeight: 800,
            color:         "rgba(203,213,225,0.85)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            backdropFilter: "blur(10px)",
          }}>
            Pass <X size={14} strokeWidth={2.5} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ExperiencePage ───────────────────────────────────────────────────────

export default function ExperiencePage() {
  const params    = useParams<{ type: string }>();
  const type      = params.type ?? "smoke";
  const [, navigate] = useLocation();
  const theme     = getCraftTheme(type);
  const envCtx           = useEnvironmentSafe();
  const orchestratorCtx  = useOrchestratorSafe();
  const lastSwipeRef     = useRef<number>(0);

  const [sessionId,    setSessionId]    = useState<string | null>(null);
  const [cards,        setCards]        = useState<ExperienceItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [swiping,      setSwiping]      = useState(false);
  const [swipeCount,   setSwipeCount]   = useState(0);
  const [feedback,     setFeedback]     = useState<{ text: string; type: "add" | "skip" } | null>(null);
  const [done,         setDone]         = useState(false);
  const [returnBanner, setReturnBanner] = useState(false);
  // Entry chamber: shows cinematic intro before swipe discovery begins.
  // Session bootstrap runs in background while chamber is displayed.
  const [showChamber,  setShowChamber]  = useState(true);

  // ── Intelligence layer — mentor commentary on ADD swipes ─────────────────
  const { guestProfile, mentor }     = useGuestProfile();
  const [addedTags,   setAddedTags]   = useState<string[]>([]);
  const [addedCount,  setAddedCount]  = useState(0);
  const [commentary,  setCommentary]  = useState<{ line: string; whyNote: string | null } | null>(null);
  const commentaryTimer               = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Signal craft type to environment engine on mount; reset orchestrator session
  useEffect(() => {
    if (!envCtx) return;
    const craftType = (["smoke","pour","brew","vape"].includes(type) ? type : "smoke") as import("@/lib/environmentEngine").CraftType;
    envCtx.setCraft(craftType);
    orchestratorCtx?.resetSession(craftType);
    lastSwipeRef.current = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (envCtx.env.returnVisit && envCtx.env.lastCraftSeen === craftType) {
      setReturnBanner(true);
      timer = setTimeout(() => setReturnBanner(false), 4500);
    }
    return () => { if (timer !== undefined) clearTimeout(timer); };
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session + cards bootstrap ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiPost("/api/swipe-experience/session/start", {
          experienceType: type,
        });
        if (cancelled) return;
        const sid = data.session?.id;
        setSessionId(sid);
        if (sid) {
          const cardData = await apiGet(`/api/swipe-experience/${type}/cards?sessionId=${sid}`);
          if (!cancelled) setCards(cardData.cards?.length ? cardData.cards : FALLBACK_CARDS[type] ?? []);
        } else {
          if (!cancelled) setCards(FALLBACK_CARDS[type] ?? []);
        }
      } catch {
        if (!cancelled) setCards(FALLBACK_CARDS[type] ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [type]);

  // ── Ambient hum — starts when experience mounts, fades on leave ──────────
  useEffect(() => playAmbientHum(), []);

  // ── Swipe handler ─────────────────────────────────────────────────────────

  async function handleSwipe(action: "add" | "skip") {
    if (swiping || cards.length === 0) return;
    const card = cards[0]!;
    setSwiping(true);
    setCards(prev => prev.slice(1));
    const newCount = swipeCount + 1;
    setSwipeCount(newCount);

    if (action === "skip") {
      setFeedback({ text: "Skipped", type: "skip" });
      setTimeout(() => setFeedback(null), 1600);
    } else {
      // ADD — show mentor commentary instead of generic toast
      if (mentor) {
        const newTags      = card.tags ?? [];
        const nextAddCount = addedCount + 1;
        const whyNote      = addedTags.length > 0 ? generateWhyThisWorks(newTags, addedTags) : null;
        const line = generateMentorLine({
          mentorStyle:     mentor.style as "balanced" | "bold" | "smooth" | "aromatic",
          mentorId:        mentor.id,
          newTags,
          allAddedTags:    [...addedTags, ...newTags],
          addedCount:      nextAddCount,
          craftType:       type,
          guestBoldness:   guestProfile?.boldnessPreference ?? null,
          guestAtmosphere: guestProfile?.atmospherePreference ?? null,
          flavorHistory:   guestProfile?.flavorHistory ?? [],
        });
        setCommentary({ line, whyNote });
        if (commentaryTimer.current !== undefined) clearTimeout(commentaryTimer.current);
        commentaryTimer.current = setTimeout(() => setCommentary(null), 3600);
        setAddedTags(prev => [...prev, ...newTags]);
        setAddedCount(nextAddCount);
      } else {
        // Fallback if no mentor (anonymous)
        setFeedback({ text: "Added to your taste profile", type: "add" });
        setTimeout(() => setFeedback(null), 1600);
      }
    }

    // Signal environment engine
    if (envCtx && card.tags?.length) {
      if (action === "add") envCtx.onSwipeAdd(card.tags);
      else                  envCtx.onSwipeSkip(card.tags);
    }

    // Signal orchestrator (behavioral analysis — non-blocking)
    const now = Date.now();
    const swipeMs = lastSwipeRef.current > 0 ? now - lastSwipeRef.current : 2000;
    lastSwipeRef.current = now;
    const isPremium = (card.baseScore ?? 0) > 75 || card.tags.some(t => PREMIUM_TAGS_SET.has(t.toLowerCase()));
    orchestratorCtx?.addSignal({
      direction:    action,
      swipeMs:      Math.min(swipeMs, 30000),
      hesitationMs: Math.min(swipeMs, 30000),
      tags:         card.tags ?? [],
      marginPct:    Math.min(100, card.baseScore ?? 50),
      isPremium,
    });

    if (sessionId) {
      apiPost("/api/swipe-experience/swipe", {
        sessionId,
        itemId:         card.id,
        experienceType: type,
        action,
        tags:           card.tags,
      }).then(async () => {
        // Reload if low
        if (cards.length <= 2) {
          const data = await apiGet(`/api/swipe-experience/${type}/cards?sessionId=${sessionId}`);
          if (data.cards?.length) setCards(prev => [...prev, ...data.cards.filter(
            (c: ExperienceItem) => !prev.some(p => p.id === c.id)
          )]);
        }
      }).catch(() => {});
    }

    setSwiping(false);
    if (cards.length <= 1 && newCount >= 5) setDone(true);
  }

  async function handleFinish() {
    if (!sessionId) { navigate("/"); return; }
    apiPost(`/api/swipe-experience/session/${sessionId}/complete`, {}).catch(() => {});
    envCtx?.onRevealStart();
    navigate(`/reveal/${sessionId}`);
  }

  // ── Render: Entry chamber sits above everything, hides until dismissed ───────
  // (Loading runs in background — chamber provides atmospheric buffer time)

  // ── Render: Main ─────────────────────────────────────────────────────────

  return (
    <>
    <SessionReturnBanner
      visible={returnBanner}
      craftType={type}
      accentColor={theme.accent}
      onDismiss={() => setReturnBanner(false)}
    />
    <div style={{
      position:   "fixed",
      inset:      0,
      background: "#080604",
      display:    "flex",
      flexDirection: "column",
      overflow:   "hidden",
    }}>
      {/* Ambient background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${theme.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.18,
        filter: "blur(4px)",
        transform: "scale(1.06)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(8,6,4,0.72) 0%, rgba(8,6,4,0.42) 50%, rgba(8,6,4,0.82) 100%)",
        pointerEvents: "none",
      }} />
      {/* Ambient particles — same visual DNA as CraftHub */}
      <ExpParticles accent={theme.accent} />

      {/* Header */}
      <div style={{
        position:   "relative",
        zIndex:     20,
        display:    "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding:    "16px 20px 8px",
        flexShrink: 0,
      }}>
        <motion.button
          onClick={() => navigate("/")}
          whileTap={{ scale: 0.93 }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(26,26,27,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "8px 14px",
            color: "rgba(240,232,216,0.65)",
            fontSize: 13, cursor: "pointer",
          }}
        >
          <ArrowLeft size={14} /> Back
        </motion.button>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: "0.2em",
            color: theme.accent, textTransform: "uppercase",
          }}>{theme.label}</div>
          <div style={{ fontSize: 11, color: "rgba(240,232,216,0.35)", marginTop: 1 }}>
            {theme.tagline}
          </div>
        </div>

        <div style={{
          background: "rgba(26,26,27,0.07)",
          border: "1px solid rgba(26,26,27,0.10)",
          borderRadius: 10, padding: "8px 14px",
          fontSize: 11, color: "rgba(240,232,216,0.4)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {swipeCount} swiped
        </div>
      </div>

      {/* Card stack — floating collectible cards centered in the environment */}
      <div style={{
        position: "relative",
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        zIndex: 10,
      }}>
        {/* Fixed-size inner box — this is the collectible card footprint */}
        <div style={{
          position: "relative",
          width: "min(400px, 86vw)",
          height: "70vh",
          flexShrink: 0,
        }}>
        <AnimatePresence mode="sync">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 22,
              }}
            >
              <motion.div
                animate={{ boxShadow: [`0 0 0px ${theme.accent}00`, `0 0 40px ${theme.accent}50`, `0 0 0px ${theme.accent}00`] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: `${theme.accent}12`,
                  border: `2px solid ${theme.accent}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Sparkles size={38} color={theme.accent} />
              </motion.div>
              <div style={{ textAlign: "center" }}>
                <h2 style={{
                  fontSize: 24, fontWeight: 700, color: "#f0e8d8",
                  fontFamily: "'Playfair Display', serif", margin: "0 0 8px",
                }}>Profile complete</h2>
                <p style={{ color: "rgba(240,232,216,0.48)", fontSize: 14, margin: 0 }}>
                  We've learned your preferences.<br />Let's reveal your perfect match.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleFinish}
                style={{
                  padding: "16px 44px", borderRadius: 14,
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                  border: "none", color: "#F5F2ED",
                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                  letterSpacing: "0.08em",
                  boxShadow: `0 8px 32px ${theme.accent}40`,
                }}
              >
                See Your Match
              </motion.button>
            </motion.div>

          ) : cards.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 16,
              }}
            >
              <p style={{ color: "rgba(240,232,216,0.38)", fontSize: 14, textAlign: "center" }}>
                No more cards available.
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleFinish}
                style={{
                  padding: "14px 32px", borderRadius: 12,
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                  border: "none", color: "#F5F2ED",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                See Recommendations
              </motion.button>
            </motion.div>

          ) : (
            cards.slice(0, 3).map((card, i) => (
              <SwipeCard
                key={card.id}
                item={card}
                theme={theme}
                isTop={i === 0}
                stackIndex={i}
                onSwipeRight={() => handleSwipe("add")}
                onSwipeLeft={()  => handleSwipe("skip")}
              />
            ))
          )}
        </AnimatePresence>
        </div>{/* /fixed-size inner box */}
      </div>

      {/* Mentor commentary — appears on each ADD swipe */}
      <AnimatePresence>
        {commentary && mentor && (
          <MentorCommentary
            mentor={mentor}
            line={commentary.line}
            whyNote={commentary.whyNote}
            accentColor={theme.accent}
          />
        )}
      </AnimatePresence>

      {/* Feedback toast — SKIP only */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              bottom: 120, left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              background: feedback.type === "add"
                ? "rgba(212,139,0,0.12)"
                : "rgba(148,163,184,0.08)",
              border: `1px solid ${feedback.type === "add" ? "rgba(212,139,0,0.4)" : "rgba(148,163,184,0.25)"}`,
              borderRadius: 12, padding: "10px 22px",
              fontSize: 13, fontWeight: 600,
              color: feedback.type === "add" ? "#D48B00" : "rgba(203,213,225,0.65)",
              whiteSpace: "nowrap",
              backdropFilter: "blur(10px)",
            }}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar — See Match (appears after 6 swipes) */}
      <div style={{
        position: "relative", zIndex: 20,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "8px 20px 32px",
        flexShrink: 0,
        minHeight: 64,
      }}>
        <AnimatePresence>
          {!done && swipeCount >= 6 && (
            <motion.button
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.93 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleFinish}
              style={{
                padding: "13px 36px",
                borderRadius: 13,
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                border: "none", color: "#F5F2ED",
                fontSize: 13, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.08em",
                boxShadow: `0 6px 28px ${theme.accent}40`,
              }}
            >
              See Your Match →
            </motion.button>
          )}
          {!done && swipeCount < 6 && (
            <motion.span
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 10,
                color: "rgba(26,26,27,0.18)",
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
              }}
            >
              Drag or tap card to explore
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* ── Entry chamber — full-screen cinematic intro, dismisses on begin ── */}
    <AnimatePresence>
      {showChamber && (
        <CraftEntryChamber
          type={type}
          theme={theme}
          onBegin={() => setShowChamber(false)}
          onBack={() => navigate("/")}
        />
      )}
    </AnimatePresence>
    </>
  );
}

// ── Fallback offline cards ────────────────────────────────────────────────────

const FALLBACK_CARDS: Record<string, ExperienceItem[]> = {
  smoke: [
    { id: "s1", title: "Smoky & Bold",     description: "The kind of smoke that stays long after midnight.",          image: "/images/smoke/smoke_lounge.png", type: "smoke", tags: ["smoky","bold","earthy"],    intensity: 8, baseScore: 70 },
    { id: "s2", title: "Creamy & Smooth",  description: "Smooth enough to make silence feel luxurious.",              image: "/images/smoke/smoke_solo.png",   type: "smoke", tags: ["creamy","smooth","sweet"],   intensity: 4, baseScore: 50 },
    { id: "s3", title: "Spicy & Complex",  description: "Bold enough to interrupt a conversation.",                   image: "/images/smoke/smoke_woman.png",  type: "smoke", tags: ["spicy","complex","bold"],     intensity: 7, baseScore: 65 },
    { id: "s4", title: "Cedar & Wood",     description: "Aged cedar and slow warmth. The room changes when it opens.",image: null,                            type: "smoke", tags: ["cedar","woody","aromatic"],   intensity: 5, baseScore: 52 },
    { id: "s5", title: "Sweet & Mild",     description: "Easy enough to forget you're being seduced.",               image: null,                            type: "smoke", tags: ["sweet","mild","light"],       intensity: 2, baseScore: 40 },
    { id: "s6", title: "Earthy & Natural", description: "Grounded. Deep. The kind you return to.",                   image: null,                            type: "smoke", tags: ["earthy","cedar","medium"],     intensity: 5, baseScore: 55 },
  ],
  pour: [
    { id: "p1", title: "Oak & Vanilla",    description: "Barrel-kissed warmth. Meant to be lingered over.",          image: "/images/pour/pour_bar.png",      type: "pour",  tags: ["oak","vanilla","sweet"],      intensity: 5, baseScore: 60 },
    { id: "p2", title: "Peated & Smoky",   description: "Peat and old leather. Something you remember years later.", image: null,                            type: "pour",  tags: ["peat","smoky","bold"],        intensity: 8, baseScore: 72 },
    { id: "p3", title: "Caramel & Spice",  description: "Spiced heat that warms from the inside out.",               image: null,                            type: "pour",  tags: ["caramel","spiced","warm"],    intensity: 6, baseScore: 63 },
    { id: "p4", title: "Citrus & Bright",  description: "Bright enough to wake the room.",                           image: null,                            type: "pour",  tags: ["citrus","light","crisp"],      intensity: 3, baseScore: 45 },
    { id: "p5", title: "Rich & Full",      description: "Dark fruit and depth. The pour that earns its glass.",      image: null,                            type: "pour",  tags: ["rich","bold","dark"],          intensity: 7, baseScore: 68 },
    { id: "p6", title: "Floral & Delicate",description: "Barely there. Which is exactly why it stays with you.",    image: null,                            type: "pour",  tags: ["floral","light","delicate"],   intensity: 2, baseScore: 40 },
  ],
  brew: [
    { id: "b1", title: "Hoppy & Bitter",   description: "Bitter with intention. The kind that grows on you.",        image: null, type: "brew", tags: ["hoppy","crisp","bitter"],     intensity: 7, baseScore: 62 },
    { id: "b2", title: "Crisp & Light",    description: "Cold and clean. Let the moment do the work.",              image: null, type: "brew", tags: ["crisp","light","smooth"],     intensity: 2, baseScore: 40 },
    { id: "b3", title: "Malty & Toasted",  description: "Toasted malt and quiet warmth. Something worth slowing down for.", image: null, type: "brew", tags: ["malty","toasted","smooth"],   intensity: 5, baseScore: 55 },
    { id: "b4", title: "Dark Roast",       description: "Coffee and chocolate in the same breath. Unapologetically heavy.", image: null, type: "brew", tags: ["dark roast","chocolate"],      intensity: 8, baseScore: 70 },
    { id: "b5", title: "Fruity & Juicy",   description: "Tropical haze and fresh pull. Summer in a glass.",         image: null, type: "brew", tags: ["fruity","tropical","juicy"],  intensity: 4, baseScore: 52 },
    { id: "b6", title: "Wheat & Smooth",   description: "Light enough for afternoon. Rich enough to remember.",     image: null, type: "brew", tags: ["smooth","wheat","light"],     intensity: 3, baseScore: 45 },
  ],
  vape: [
    { id: "v1", title: "Mint & Cool",      description: "Icy-clean. Like stepping outside after a long night.",     image: null, type: "vape", tags: ["mint","cool","crisp"],        intensity: 6, baseScore: 60 },
    { id: "v2", title: "Berry & Sweet",    description: "Ripe and deep. Dessert you can carry with you.",           image: null, type: "vape", tags: ["berry","sweet","fruity"],     intensity: 5, baseScore: 55 },
    { id: "v3", title: "Cream & Smooth",   description: "Velvet smooth. No edges, no apologies.",                  image: null, type: "vape", tags: ["cream","smooth","vanilla"],   intensity: 4, baseScore: 50 },
    { id: "v4", title: "Tropical Burst",   description: "Mango and heat. Somewhere you've never been but recognize.", image: null, type: "vape", tags: ["tropical","fruity","exotic"], intensity: 6, baseScore: 58 },
    { id: "v5", title: "Dense Cloud",      description: "Maximum presence. Minimum explanation needed.",            image: null, type: "vape", tags: ["dense cloud","smooth","cool"], intensity: 7, baseScore: 65 },
    { id: "v6", title: "Cool Citrus",      description: "Citrus edge with a cooling pull. Sharp and honest.",       image: null, type: "vape", tags: ["citrus","cool","fresh"],      intensity: 5, baseScore: 52 },
  ],
};
