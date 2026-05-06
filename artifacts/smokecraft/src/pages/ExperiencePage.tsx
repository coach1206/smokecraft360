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
import { ArrowLeft, ChevronRight, ChevronLeft, Sparkles, Check, X } from "lucide-react";
import { getCraftTheme, type CraftTheme } from "@/lib/craftThemes";
import { CraftRealism } from "@/components/CraftRealism";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { useOrchestratorSafe } from "@/contexts/OrchestratorContext";
import { SessionReturnBanner } from "@/components/CinematicTransition";

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

function SwipeCard({ item, theme, isTop, stackIndex, onSwipeRight, onSwipeLeft }: SwipeCardProps) {
  const x       = useMotionValue(isTop ? 280 : 0);
  const rotate  = useTransform(x, [-300, 300], [-16, 16]);
  const addOp   = useTransform(x, [30, 110], [0, 1]);
  const skipOp  = useTransform(x, [-110, -30], [1, 0]);
  // Glow trail: warm gold on right drag, cool white-blue on left drag
  const glowBg  = useTransform(
    x,
    [-120, 0, 120],
    ["rgba(148,163,184,0.10)", "rgba(0,0,0,0)", "rgba(201,168,76,0.14)"],
  );
  const exiting = useRef(false);

  useEffect(() => {
    if (isTop) {
      animate(x, 0, { duration: 0.44, ease: [0.22, 1, 0.36, 1] });
    }
  }, [isTop, x]);

  function triggerRight() {
    if (exiting.current || !isTop) return;
    exiting.current = true;
    animate(x, 750, { duration: 0.3, ease: [0.4, 0, 1, 1] }).then(onSwipeRight);
  }
  function triggerLeft() {
    if (exiting.current || !isTop) return;
    exiting.current = true;
    animate(x, -750, { duration: 0.3, ease: [0.4, 0, 1, 1] }).then(onSwipeLeft);
  }

  function onDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x > 85 || info.velocity.x > 450)        triggerRight();
    else if (info.offset.x < -85 || info.velocity.x < -450) triggerLeft();
    else animate(x, 0, { duration: 0.32, ease: [0.22, 1, 0.36, 1] });
  }

  const scale  = 1 - stackIndex * 0.045;
  const yShift = stackIndex * 16;

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
        y:        isTop ? 0 : yShift,
        position: "absolute",
        inset:    0,
        cursor:   isTop ? "grab" : "default",
        zIndex:   10 - stackIndex,
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

      {/* Card body */}
      <div style={{
        position:     "absolute",
        inset:        0,
        borderRadius: 24,
        overflow:     "hidden",
        background:   theme.cardBg,
        border:       `1px solid rgba(255,255,255,${stackIndex === 0 ? 0.1 : 0.05})`,
        boxShadow:    stackIndex === 0
          ? "0 20px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset"
          : "0 8px 32px rgba(0,0,0,0.5)",
      }}>

        {/* Background image */}
        {item.image ? (
          <div style={{
            position:           "absolute",
            inset:              0,
            backgroundImage:    `url(${item.image})`,
            backgroundSize:     "cover",
            backgroundPosition: "center",
            willChange:         "transform",
          }} />
        ) : (
          /* Gradient placeholder for no-image cards */
          <div style={{
            position:   "absolute",
            inset:      0,
            background: `linear-gradient(135deg, ${theme.cardBg} 0%, ${theme.accent}18 100%)`,
          }} />
        )}

        {/* Cinematic gradient overlay */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.88) 100%)",
        }} />

        {/* CraftRealism ambient overlay — only on top card */}
        {stackIndex === 0 && (
          <CraftRealism type={item.type} accent={theme.accent} />
        )}

        {/* Badge */}
        <div style={{
          position:     "absolute",
          top:          20, left: 20,
          background:   "rgba(0,0,0,0.55)",
          border:       `1px solid ${theme.accent}40`,
          borderRadius: 8,
          padding:      "4px 12px",
          fontSize:     11, fontWeight: 700,
          letterSpacing: "0.14em",
          color:        theme.accent,
          backdropFilter: "blur(10px)",
        }}>
          {theme.badgeLabel}
        </div>

        {/* Intensity dots */}
        <div style={{
          position: "absolute", top: 20, right: 20,
          display: "flex", gap: 4,
        }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: i < Math.round(item.intensity / 2)
                ? theme.accent : "rgba(255,255,255,0.18)",
              boxShadow: i < Math.round(item.intensity / 2)
                ? `0 0 4px ${theme.accent}` : "none",
              transition: "background 0.2s",
            }} />
          ))}
        </div>

        {/* Bottom content */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          padding: "0 24px 32px",
        }}>
          <h2 style={{
            fontSize:   26,
            fontWeight: 700,
            color:      "#f0e8d8",
            margin:     "0 0 8px",
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1.2,
            textShadow: "0 2px 16px rgba(0,0,0,0.6)",
          }}>{item.title}</h2>

          {item.description && (
            <p style={{
              fontSize:   13,
              color:      "rgba(240,232,216,0.72)",
              margin:     "0 0 14px",
              lineHeight: 1.5,
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }}>{item.description}</p>
          )}

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {item.tags.slice(0, 4).map(tag => (
              <span key={tag} style={{
                padding:      "4px 10px",
                borderRadius: 20,
                background:   `${theme.accent}1A`,
                border:       `1px solid ${theme.accent}35`,
                fontSize:     11,
                color:        theme.accent,
                fontWeight:   600,
                letterSpacing: "0.05em",
                backdropFilter: "blur(4px)",
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* DISCOVER overlay — warm gold, premium feel */}
        {isTop && (
          <motion.div style={{
            position:      "absolute",
            top:           24, left: 24,
            opacity:       addOp,
            background:    "rgba(201,168,76,0.14)",
            border:        "1.5px solid rgba(201,168,76,0.7)",
            borderRadius:  12,
            padding:       "8px 18px",
            display:       "flex",
            alignItems:    "center",
            gap:           7,
            fontSize:      12, fontWeight: 800,
            color:         "#c9a84c",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            backdropFilter: "blur(10px)",
            boxShadow:     "0 0 16px rgba(201,168,76,0.18)",
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
        }
      } catch {
        if (!cancelled) setCards(FALLBACK_CARDS[type] ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [type]);

  // ── Swipe handler ─────────────────────────────────────────────────────────

  async function handleSwipe(action: "add" | "skip") {
    if (swiping || cards.length === 0) return;
    const card = cards[0]!;
    setSwiping(true);
    setCards(prev => prev.slice(1));
    const newCount = swipeCount + 1;
    setSwipeCount(newCount);
    setFeedback({
      text: action === "add" ? "Added to your taste profile" : "Skipped",
      type: action,
    });
    setTimeout(() => setFeedback(null), 1800);

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

  // ── Render: Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#0a0806",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 18,
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            border: `3px solid ${theme.accent}25`,
            borderTop: `3px solid ${theme.accent}`,
          }}
        />
        <p style={{ color: "rgba(240,232,216,0.45)", fontSize: 14 }}>
          Preparing your {theme.label} experience…
        </p>
      </div>
    );
  }

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
        opacity: 0.10,
        filter: "blur(4px)",
        transform: "scale(1.06)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(8,6,4,0.75) 0%, rgba(8,6,4,0.5) 50%, rgba(8,6,4,0.85) 100%)",
        pointerEvents: "none",
      }} />

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
            background: "rgba(255,255,255,0.06)",
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
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "8px 14px",
          fontSize: 11, color: "rgba(240,232,216,0.4)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {swipeCount} swiped
        </div>
      </div>

      {/* Swipe hint */}
      <div style={{
        position: "relative", zIndex: 20,
        textAlign: "center", padding: "2px 0 6px",
        fontSize: 11, color: "rgba(240,232,216,0.28)",
        letterSpacing: "0.08em", flexShrink: 0,
      }}>
        ← Pass &nbsp;&nbsp;·&nbsp;&nbsp; Discover →
      </div>

      {/* Card stack */}
      <div style={{
        position: "relative",
        flex: 1,
        margin: "0 20px 14px",
        zIndex: 10,
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
                  border: "none", color: "#0a0806",
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
                  border: "none", color: "#0a0806",
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
      </div>

      {/* Feedback toast */}
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
                ? "rgba(201,168,76,0.12)"
                : "rgba(148,163,184,0.08)",
              border: `1px solid ${feedback.type === "add" ? "rgba(201,168,76,0.4)" : "rgba(148,163,184,0.25)"}`,
              borderRadius: 12, padding: "10px 22px",
              fontSize: 13, fontWeight: 600,
              color: feedback.type === "add" ? "#c9a84c" : "rgba(203,213,225,0.65)",
              whiteSpace: "nowrap",
              backdropFilter: "blur(10px)",
            }}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action row */}
      {!done && cards.length > 0 && (
        <div style={{
          position: "relative", zIndex: 20,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          padding: "0 20px 36px",
          flexShrink: 0,
        }}>
          {/* Pass */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("skip")}
            disabled={swiping}
            style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "rgba(148,163,184,0.07)",
              border: "1.5px solid rgba(148,163,184,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            }}
          >
            <ChevronLeft size={26} color="rgba(203,213,225,0.7)" strokeWidth={2} />
          </motion.button>

          {/* Finish early — appears after 6 swipes */}
          <AnimatePresence>
            {swipeCount >= 6 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleFinish}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                  border: "none", color: "#0a0806",
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.06em",
                  boxShadow: `0 4px 20px ${theme.accent}35`,
                }}
              >
                See Match
              </motion.button>
            )}
          </AnimatePresence>

          {/* Discover */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("add")}
            disabled={swiping}
            style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "rgba(201,168,76,0.12)",
              border: "1.5px solid rgba(201,168,76,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(201,168,76,0.22)",
            }}
          >
            <ChevronRight size={26} color="#c9a84c" strokeWidth={2} />
          </motion.button>
        </div>
      )}
    </div>
    </>
  );
}

// ── Fallback offline cards ────────────────────────────────────────────────────

const FALLBACK_CARDS: Record<string, ExperienceItem[]> = {
  smoke: [
    { id: "s1", title: "Smoky & Bold",     description: "Rich, full-bodied with deep smoke notes",    image: "/images/smoke/smoke_lounge.png", type: "smoke", tags: ["smoky","bold","earthy"],    intensity: 8, baseScore: 70 },
    { id: "s2", title: "Creamy & Smooth",  description: "Buttery finish with hints of cream",          image: "/images/smoke/smoke_solo.png",   type: "smoke", tags: ["creamy","smooth","sweet"],   intensity: 4, baseScore: 50 },
    { id: "s3", title: "Spicy & Complex",  description: "Pepper-forward with layered complexity",      image: "/images/smoke/smoke_woman.png",  type: "smoke", tags: ["spicy","complex","bold"],     intensity: 7, baseScore: 65 },
    { id: "s4", title: "Cedar & Wood",     description: "Natural wood with aromatic finish",           image: null,                            type: "smoke", tags: ["cedar","woody","aromatic"],   intensity: 5, baseScore: 52 },
    { id: "s5", title: "Sweet & Mild",     description: "Light, approachable sweetness",               image: null,                            type: "smoke", tags: ["sweet","mild","light"],       intensity: 2, baseScore: 40 },
    { id: "s6", title: "Earthy & Natural", description: "Grounded, medium-bodied with cedar",          image: null,                            type: "smoke", tags: ["earthy","cedar","medium"],     intensity: 5, baseScore: 55 },
  ],
  pour: [
    { id: "p1", title: "Oak & Vanilla",    description: "Classic barrel-aged sweetness",               image: "/images/pour/pour_bar.png",      type: "pour",  tags: ["oak","vanilla","sweet"],      intensity: 5, baseScore: 60 },
    { id: "p2", title: "Peated & Smoky",   description: "Rich Scottish peat with lingering smoke",     image: null,                            type: "pour",  tags: ["peat","smoky","bold"],        intensity: 8, baseScore: 72 },
    { id: "p3", title: "Caramel & Spice",  description: "Warm caramel with a spiced finish",           image: null,                            type: "pour",  tags: ["caramel","spiced","warm"],    intensity: 6, baseScore: 63 },
    { id: "p4", title: "Citrus & Bright",  description: "Lively citrus with a clean finish",           image: null,                            type: "pour",  tags: ["citrus","light","crisp"],      intensity: 3, baseScore: 45 },
    { id: "p5", title: "Rich & Full",      description: "Full-bodied with dark fruit and tannins",     image: null,                            type: "pour",  tags: ["rich","bold","dark"],          intensity: 7, baseScore: 68 },
    { id: "p6", title: "Floral & Delicate",description: "Light floral notes, easy to enjoy",           image: null,                            type: "pour",  tags: ["floral","light","delicate"],   intensity: 2, baseScore: 40 },
  ],
  brew: [
    { id: "b1", title: "Hoppy & Bitter",   description: "Bold hop character with a clean bitter finish", image: null, type: "brew", tags: ["hoppy","crisp","bitter"],     intensity: 7, baseScore: 62 },
    { id: "b2", title: "Crisp & Light",    description: "Easy-drinking, refreshing and clean",          image: null, type: "brew", tags: ["crisp","light","smooth"],     intensity: 2, baseScore: 40 },
    { id: "b3", title: "Malty & Toasted",  description: "Deep malt backbone with toasted notes",        image: null, type: "brew", tags: ["malty","toasted","smooth"],   intensity: 5, baseScore: 55 },
    { id: "b4", title: "Dark Roast",       description: "Roasted coffee and chocolate",                 image: null, type: "brew", tags: ["dark roast","chocolate"],      intensity: 8, baseScore: 70 },
    { id: "b5", title: "Fruity & Juicy",   description: "Fresh tropical hop haze",                     image: null, type: "brew", tags: ["fruity","tropical","juicy"],  intensity: 4, baseScore: 52 },
    { id: "b6", title: "Wheat & Smooth",   description: "Classic wheat, light and sessionable",         image: null, type: "brew", tags: ["smooth","wheat","light"],     intensity: 3, baseScore: 45 },
  ],
  vape: [
    { id: "v1", title: "Mint & Cool",      description: "Crisp menthol, icy-clean finish",              image: null, type: "vape", tags: ["mint","cool","crisp"],        intensity: 6, baseScore: 60 },
    { id: "v2", title: "Berry & Sweet",    description: "Ripe mixed berry, dessert-like",               image: null, type: "vape", tags: ["berry","sweet","fruity"],     intensity: 5, baseScore: 55 },
    { id: "v3", title: "Cream & Smooth",   description: "Silky vanilla cream",                         image: null, type: "vape", tags: ["cream","smooth","vanilla"],   intensity: 4, baseScore: 50 },
    { id: "v4", title: "Tropical Burst",   description: "Mango, pineapple and exotic blend",            image: null, type: "vape", tags: ["tropical","fruity","exotic"], intensity: 6, baseScore: 58 },
    { id: "v5", title: "Dense Cloud",      description: "Maximum vapor, subtle taste",                  image: null, type: "vape", tags: ["dense cloud","smooth","cool"], intensity: 7, baseScore: 65 },
    { id: "v6", title: "Cool Citrus",      description: "Bright citrus with cooling menthol",           image: null, type: "vape", tags: ["citrus","cool","fresh"],      intensity: 5, baseScore: 52 },
  ],
};
