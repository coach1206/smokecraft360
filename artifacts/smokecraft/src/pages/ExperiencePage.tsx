/**
 * ExperiencePage — Universal Swipe Experience Engine.
 * Route: /experience/:type
 *
 * Tinder-style card swiping for smoke, pour, brew, vape.
 * Swipe right = ADD, swipe left = SKIP.
 * Every swipe updates taste memory and re-scores next cards.
 * After all cards are swiped, navigates to /reveal/:sessionId.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowLeft, ChevronRight, ChevronLeft, Sparkles, Check, X } from "lucide-react";
import { getCraftTheme, type CraftTheme } from "@/lib/craftThemes";

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

// ── Single swipe card ─────────────────────────────────────────────────────────

interface SwipeCardProps {
  item:         ExperienceItem;
  theme:        CraftTheme;
  isTop:        boolean;
  stackIndex:   number;
  onSwipeRight: () => void;
  onSwipeLeft:  () => void;
}

function SwipeCard({ item, theme, isTop, stackIndex, onSwipeRight, onSwipeLeft }: SwipeCardProps) {
  const x        = useMotionValue(isTop ? 300 : 0);
  const rotate   = useTransform(x, [-300, 300], [-18, 18]);
  const addOp    = useTransform(x, [20, 100], [0, 1]);
  const skipOp   = useTransform(x, [-100, -20], [1, 0]);
  const exiting  = useRef(false);

  useEffect(() => {
    if (isTop) {
      animate(x, 0, { duration: 0.42, ease: [0.22, 1, 0.36, 1] });
    }
  }, [isTop, x]);

  function triggerRight() {
    if (exiting.current || !isTop) return;
    exiting.current = true;
    animate(x, 700, { duration: 0.32, ease: [0.4, 0, 1, 1] }).then(onSwipeRight);
  }

  function triggerLeft() {
    if (exiting.current || !isTop) return;
    exiting.current = true;
    animate(x, -700, { duration: 0.32, ease: [0.4, 0, 1, 1] }).then(onSwipeLeft);
  }

  function onDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x > 90 || info.velocity.x > 500)       triggerRight();
    else if (info.offset.x < -90 || info.velocity.x < -500) triggerLeft();
    else animate(x, 0, { duration: 0.3, ease: [0.22, 1, 0.36, 1] });
  }

  const scale  = 1 - stackIndex * 0.05;
  const yShift = stackIndex * 14;

  return (
    <motion.div
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale,
        y:        isTop ? 0 : yShift,
        position: "absolute",
        inset:    0,
        cursor:   isTop ? "grab" : "default",
        zIndex:   10 - stackIndex,
        touchAction: "pan-y",
      }}
    >
      {/* Card */}
      <div style={{
        position:     "absolute",
        inset:        0,
        borderRadius: 24,
        overflow:     "hidden",
        background:   theme.cardBg,
        border:       `1px solid rgba(255,255,255,0.08)`,
        boxShadow:    "0 16px 64px rgba(0,0,0,0.6)",
      }}>
        {/* Background image */}
        {item.image && (
          <div style={{
            position:           "absolute",
            inset:              0,
            backgroundImage:    `url(${item.image})`,
            backgroundSize:     "cover",
            backgroundPosition: "center",
          }} />
        )}

        {/* Dark gradient overlay — always applied for readability */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)",
        }} />

        {/* Badge */}
        <div style={{
          position:    "absolute",
          top:         20,
          left:        20,
          background:  `rgba(0,0,0,0.5)`,
          border:      `1px solid ${theme.accent}40`,
          borderRadius: 8,
          padding:     "4px 12px",
          fontSize:    11,
          fontWeight:  700,
          letterSpacing: "0.14em",
          color:       theme.accent,
          backdropFilter: "blur(8px)",
        }}>
          {theme.badgeLabel}
        </div>

        {/* Intensity dots */}
        <div style={{
          position: "absolute",
          top: 20,
          right: 20,
          display: "flex",
          gap: 4,
        }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i < Math.round(item.intensity / 2)
                ? theme.accent
                : "rgba(255,255,255,0.2)",
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          padding:    "28px 24px 32px",
        }}>
          <h2 style={{
            fontSize:   28,
            fontWeight: 700,
            color:      "#f0e8d8",
            margin:     "0 0 8px",
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1.2,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}>{item.title}</h2>

          {item.description && (
            <p style={{
              fontSize:   14,
              color:      "rgba(240,232,216,0.75)",
              margin:     "0 0 16px",
              lineHeight: 1.5,
            }}>{item.description}</p>
          )}

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {item.tags.slice(0, 4).map(tag => (
              <span key={tag} style={{
                padding:      "4px 10px",
                borderRadius: 20,
                background:   `${theme.accent}18`,
                border:       `1px solid ${theme.accent}30`,
                fontSize:     11,
                color:        theme.accent,
                fontWeight:   500,
                letterSpacing: "0.05em",
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* ADD overlay */}
        {isTop && (
          <motion.div style={{
            position:      "absolute",
            top:           24,
            left:          24,
            opacity:       addOp,
            background:    "rgba(52,211,153,0.15)",
            border:        "2px solid #34d399",
            borderRadius:  12,
            padding:       "8px 16px",
            display:       "flex",
            alignItems:    "center",
            gap:           6,
            fontSize:      14,
            fontWeight:    700,
            color:         "#34d399",
            letterSpacing: "0.1em",
            backdropFilter: "blur(4px)",
          }}>
            <Check size={16} />
            ADD
          </motion.div>
        )}

        {/* SKIP overlay */}
        {isTop && (
          <motion.div style={{
            position:      "absolute",
            top:           24,
            right:         24,
            opacity:       skipOp,
            background:    "rgba(239,68,68,0.15)",
            border:        "2px solid #ef4444",
            borderRadius:  12,
            padding:       "8px 16px",
            display:       "flex",
            alignItems:    "center",
            gap:           6,
            fontSize:      14,
            fontWeight:    700,
            color:         "#ef4444",
            letterSpacing: "0.1em",
            backdropFilter: "blur(4px)",
          }}>
            SKIP
            <X size={16} />
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

  const [sessionId,  setSessionId]  = useState<string | null>(null);
  const [cards,      setCards]      = useState<ExperienceItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [swiping,    setSwiping]    = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [feedback,   setFeedback]   = useState<string | null>(null);
  const [done,       setDone]       = useState(false);

  // Start session on mount
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
        if (sid) await loadCards(sid);
      } catch {
        // fallback to seed cards offline
        setCards(FALLBACK_CARDS[type] ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [type]);

  async function loadCards(sid: string) {
    try {
      const data = await apiGet(`/api/swipe-experience/${type}/cards?sessionId=${sid}`);
      setCards(data.cards ?? []);
    } catch {
      setCards(FALLBACK_CARDS[type] ?? []);
    }
  }

  async function handleSwipe(action: "add" | "skip") {
    if (swiping || !cards.length) return;
    const card = cards[0]!;
    setSwiping(true);

    // Optimistic UI — pop card
    setCards(prev => prev.slice(1));
    setSwipeCount(c => c + 1);
    setFeedback(action === "add" ? "Added to your taste profile" : "Skipped");
    setTimeout(() => setFeedback(null), 1800);

    // Record swipe
    if (sessionId) {
      try {
        await apiPost("/api/swipe-experience/swipe", {
          sessionId,
          itemId:         card.id,
          experienceType: type,
          action,
          tags:           card.tags,
        });
        // Reload cards if running low
        if (cards.length <= 3) {
          const data = await apiGet(`/api/swipe-experience/${type}/cards?sessionId=${sessionId}`);
          if (data.cards?.length) setCards(prev => [...prev.slice(1), ...data.cards]);
        }
      } catch { /* silent — offline support */ }
    }

    setSwiping(false);

    // Minimum 6 swipes before we can finish
    if (cards.length <= 1 && swipeCount >= 5) {
      setDone(true);
    }
  }

  async function handleFinish() {
    if (!sessionId) { navigate("/"); return; }
    try {
      await apiPost(`/api/swipe-experience/session/${sessionId}/complete`, {});
    } catch { /* silent */ }
    navigate(`/reveal/${sessionId}`);
  }

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#0a0806",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: `3px solid ${theme.accent}30`,
          borderTop: `3px solid ${theme.accent}`,
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "rgba(240,232,216,0.5)", fontSize: 14 }}>Preparing your experience…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      background: "#0a0806",
      display:    "flex",
      flexDirection: "column",
      overflow:   "hidden",
    }}>
      {/* Background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${theme.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.15,
        filter: "blur(3px)",
        transform: "scale(1.05)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(10,8,6,0.6) 0%, rgba(10,8,6,0.4) 50%, rgba(10,8,6,0.8) 100%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        position:   "relative",
        zIndex:     20,
        display:    "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding:    "16px 20px",
        flexShrink: 0,
      }}>
        <motion.button
          onClick={() => navigate("/")}
          whileTap={{ scale: 0.94 }}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        6,
            background: "rgba(255,255,255,0.06)",
            border:     "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding:    "8px 14px",
            color:      "rgba(240,232,216,0.7)",
            fontSize:   13,
            cursor:     "pointer",
          }}
        >
          <ArrowLeft size={15} />
          Back
        </motion.button>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
            color: theme.accent, textTransform: "uppercase",
          }}>{theme.label}</div>
          <div style={{ fontSize: 12, color: "rgba(240,232,216,0.4)" }}>{theme.tagline}</div>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 12,
          color: "rgba(240,232,216,0.5)",
        }}>
          {swipeCount} swiped
        </div>
      </div>

      {/* Swipe instruction */}
      <div style={{
        position: "relative",
        zIndex: 20,
        textAlign: "center",
        padding: "4px 0 8px",
        fontSize: 12,
        color: "rgba(240,232,216,0.35)",
        letterSpacing: "0.06em",
        flexShrink: 0,
      }}>
        ← Skip &nbsp;&nbsp; Swipe &nbsp;&nbsp; Add →
      </div>

      {/* Card stack */}
      <div style={{
        position: "relative",
        flex: 1,
        margin: "0 20px 16px",
        zIndex: 10,
      }}>
        <AnimatePresence>
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
              }}
            >
              <div style={{
                width: 80, height: 80,
                borderRadius: "50%",
                background: `${theme.accent}18`,
                border: `2px solid ${theme.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Sparkles size={36} color={theme.accent} />
              </div>
              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#f0e8d8",
                fontFamily: "'Playfair Display', serif",
                textAlign: "center",
                margin: 0,
              }}>Profile complete</h2>
              <p style={{
                color: "rgba(240,232,216,0.55)",
                fontSize: 14,
                textAlign: "center",
                margin: 0,
              }}>We've learned your preferences.<br />Let's reveal your perfect match.</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFinish}
                style={{
                  padding: "16px 40px",
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                  border: "none",
                  color: "#0a0806",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.08em",
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
              <p style={{ color: "rgba(240,232,216,0.4)", fontSize: 14, textAlign: "center" }}>
                No more cards available.<br />Tap below to see your matches.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFinish}
                style={{
                  padding: "14px 32px",
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                  border: "none",
                  color: "#0a0806",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
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
            key={feedback}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{
              position: "absolute",
              bottom: 120,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              background: feedback.includes("Added")
                ? "rgba(52,211,153,0.12)"
                : "rgba(239,68,68,0.1)",
              border: `1px solid ${feedback.includes("Added") ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: feedback.includes("Added") ? "#34d399" : "rgba(240,232,216,0.6)",
              whiteSpace: "nowrap",
              backdropFilter: "blur(8px)",
            }}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!done && cards.length > 0 && (
        <div style={{
          position: "relative",
          zIndex: 20,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          padding: "0 20px 32px",
          flexShrink: 0,
        }}>
          {/* Skip button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe("skip")}
            disabled={swiping}
            style={{
              width: 64, height: 64,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.1)",
              border: "2px solid rgba(239,68,68,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={28} color="#ef4444" />
          </motion.button>

          {/* Finish early (if ≥6 swipes) */}
          {swipeCount >= 6 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFinish}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                border: "none",
                color: "#0a0806",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              See My Match
            </motion.button>
          )}

          {/* Add button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe("add")}
            disabled={swiping}
            style={{
              width: 64, height: 64,
              borderRadius: "50%",
              background: "rgba(52,211,153,0.1)",
              border: "2px solid rgba(52,211,153,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={28} color="#34d399" />
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ── Fallback offline cards ────────────────────────────────────────────────────

const FALLBACK_CARDS: Record<string, ExperienceItem[]> = {
  smoke: [
    { id: "s1", title: "Smoky & Bold",     description: "Rich, full-bodied with deep smoke notes", image: "/images/smoke/smoke_lounge.png", type: "smoke", tags: ["smoky","bold","earthy"],    intensity: 8, baseScore: 70 },
    { id: "s2", title: "Creamy & Smooth",  description: "Buttery finish with hints of cream",       image: "/images/smoke/smoke_solo.png",   type: "smoke", tags: ["creamy","smooth","sweet"],   intensity: 4, baseScore: 50 },
    { id: "s3", title: "Spicy & Complex",  description: "Pepper-forward with layered complexity",   image: "/images/smoke/smoke_woman.png",  type: "smoke", tags: ["spicy","complex","bold"],     intensity: 7, baseScore: 65 },
    { id: "s4", title: "Cedar & Wood",     description: "Natural wood with aromatic finish",        image: "/images/smoke/smoke_urban.png",  type: "smoke", tags: ["cedar","woody","aromatic"],   intensity: 5, baseScore: 52 },
    { id: "s5", title: "Sweet & Mild",     description: "Light, approachable with gentle sweetness", image: null,                            type: "smoke", tags: ["sweet","mild","light"],       intensity: 2, baseScore: 40 },
    { id: "s6", title: "Earthy & Natural", description: "Grounded, medium-bodied with cedar",       image: null,                            type: "smoke", tags: ["earthy","cedar","medium"],     intensity: 5, baseScore: 55 },
  ],
  pour: [
    { id: "p1", title: "Oak & Vanilla",    description: "Classic barrel-aged sweetness",            image: "/images/pour/pour_bar.png",      type: "pour",  tags: ["oak","vanilla","sweet"],      intensity: 5, baseScore: 60 },
    { id: "p2", title: "Peated & Smoky",   description: "Rich Scottish peat with lingering smoke",  image: null,                            type: "pour",  tags: ["peat","smoky","bold"],        intensity: 8, baseScore: 72 },
    { id: "p3", title: "Caramel & Spice",  description: "Warm caramel with a spiced finish",        image: null,                            type: "pour",  tags: ["caramel","spiced","warm"],    intensity: 6, baseScore: 63 },
    { id: "p4", title: "Citrus & Bright",  description: "Lively citrus with a clean finish",        image: null,                            type: "pour",  tags: ["citrus","light","crisp"],      intensity: 3, baseScore: 45 },
    { id: "p5", title: "Rich & Full",      description: "Full-bodied with dark fruit and tannins",  image: null,                            type: "pour",  tags: ["rich","bold","dark"],          intensity: 7, baseScore: 68 },
    { id: "p6", title: "Floral & Delicate", description: "Light floral notes, easy to enjoy",      image: null,                            type: "pour",  tags: ["floral","light","delicate"],   intensity: 2, baseScore: 40 },
  ],
  brew: [
    { id: "b1", title: "Hoppy & Bitter",   description: "Bold hop character with bitter finish",    image: null, type: "brew", tags: ["hoppy","crisp","bitter"],     intensity: 7, baseScore: 62 },
    { id: "b2", title: "Crisp & Light",    description: "Easy-drinking and refreshing",             image: null, type: "brew", tags: ["crisp","light","smooth"],     intensity: 2, baseScore: 40 },
    { id: "b3", title: "Malty & Toasted",  description: "Deep malt with toasted notes",            image: null, type: "brew", tags: ["malty","toasted","smooth"],   intensity: 5, baseScore: 55 },
    { id: "b4", title: "Dark Roast",       description: "Roasted coffee and chocolate",             image: null, type: "brew", tags: ["dark roast","chocolate","roasted"], intensity: 8, baseScore: 70 },
    { id: "b5", title: "Fruity & Juicy",   description: "Fresh tropical hop haze",                 image: null, type: "brew", tags: ["fruity","tropical","juicy"],  intensity: 4, baseScore: 52 },
    { id: "b6", title: "Wheat & Smooth",   description: "Classic wheat, light and sessionable",    image: null, type: "brew", tags: ["smooth","wheat","light"],     intensity: 3, baseScore: 45 },
  ],
  vape: [
    { id: "v1", title: "Mint & Cool",      description: "Crisp menthol, icy-clean finish",         image: null, type: "vape", tags: ["mint","cool","crisp"],        intensity: 6, baseScore: 60 },
    { id: "v2", title: "Berry & Sweet",    description: "Ripe mixed berry, dessert-like",          image: null, type: "vape", tags: ["berry","sweet","fruity"],     intensity: 5, baseScore: 55 },
    { id: "v3", title: "Cream & Smooth",   description: "Silky vanilla cream",                    image: null, type: "vape", tags: ["cream","smooth","vanilla"],   intensity: 4, baseScore: 50 },
    { id: "v4", title: "Tropical Burst",   description: "Mango, pineapple and exotic blend",      image: null, type: "vape", tags: ["tropical","fruity","exotic"], intensity: 6, baseScore: 58 },
    { id: "v5", title: "Dense Cloud",      description: "Maximum vapor, subtle taste",             image: null, type: "vape", tags: ["dense cloud","smooth","cool"], intensity: 7, baseScore: 65 },
    { id: "v6", title: "Cool Citrus",      description: "Bright citrus with cooling menthol",     image: null, type: "vape", tags: ["citrus","cool","fresh"],      intensity: 5, baseScore: 52 },
  ],
};
