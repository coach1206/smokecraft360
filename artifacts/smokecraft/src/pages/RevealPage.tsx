/**
 * RevealPage — Cinematic recommendation reveal after swipe session.
 * Route: /reveal/:sessionId
 *
 * - Animated entrance sequence for each card
 * - Taste match bar, stock status, pairing notes
 * - Real Add-to-Order wiring via POST /api/swipe-orders
 * - Cinematic confirmation modal on successful order
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, ShoppingBag, Star, Check, Package, AlertTriangle } from "lucide-react";
import { getCraftTheme } from "@/lib/craftThemes";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { useOrchestratorSafe } from "@/contexts/OrchestratorContext";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import {
  computeBlendChemistry, blendSummaryLabel,
  detectEvolution, detectDeviation,
  type BlendChemistry,
} from "@/lib/mentorIntelligence";
import { socket } from "@/lib/socket";
import LevelUpCeremony from "@/components/LevelUpCeremony";
import RegionalLeaderboard from "@/components/RegionalLeaderboard";

// ── Organic reveal stagger ────────────────────────────────────────────────────

/**
 * revealCardDelay — non-uniform stagger delays for recommendation cards.
 * First card enters at 0.38s, subsequent cards ~0.17s apart with micro-variance.
 * Deterministic per index so it's stable across re-renders.
 *
 * pacing 0–100: 0 = fastest (×0.5), 100 = most dramatic (×1.5).
 */
function revealCardDelay(idx: number, pacing = 70): number {
  const scale  = 0.5 + (pacing / 100);
  const base   = (0.38 + idx * 0.17) * scale;
  const r      = Math.sin(idx * 127.1 + 42 * 311.7) * 43758.5453;
  const jitter = (r - Math.floor(r) - 0.5) * 0.09;
  return Math.max(0.14, base + jitter);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Recommendation {
  item: {
    id:          string;
    name:        string;
    image?:      string | null;
    tags:        string[];
    priceCents?: number | null;
    category?:   string;
    description?: string;
  };
  score:        number;
  reason:       string;
  tasteMatch:   number;
  marginPct:    number;
  stockStatus:  "ok" | "low" | "out";
  pairingNote?: string;
}

interface OrderConfirmation {
  itemName:   string;
  itemId:     string;
  priceCents: number;
}

// ── API helpers ───────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string) {
  const token = localStorage.getItem("auth_token");
  const res   = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const token = localStorage.getItem("auth_token");
  const res   = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RevealPage() {
  const params     = useParams<{ sessionId: string }>();
  const sessionId  = params.sessionId;
  const [, navigate] = useLocation();
  const envCtx       = useEnvironmentSafe();
  const orchestrator = useOrchestratorSafe();

  const [recs,      setRecs]      = useState<Recommendation[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [craftType, setCraftType] = useState("smoke");
  const [ordering,  setOrdering]  = useState<Set<string>>(new Set());
  const [ordered,   setOrdered]   = useState<Set<string>>(new Set());
  const [orderError, setOrderError] = useState<Record<string, string>>({});
  const [confirm,   setConfirm]   = useState<OrderConfirmation | null>(null);
  const [chemistry, setChemistry] = useState<BlendChemistry | null>(null);
  const [intelInsight, setIntelInsight] = useState<string | null>(null);

  // Neural Bridge — level-up ceremony state
  interface LevelUpPayload {
    oldTier:      string;
    newTier:      string;
    masteryGain:  number;
    goldenBoxPct: number;
    newBadges:    { badgeId: string; label?: string }[];
  }
  const [levelUp,     setLevelUp]     = useState<LevelUpPayload | null>(null);
  const evolvedRef    = useRef(false);

  const { guestProfile, mentor, evolveMastery } = useGuestProfile();

  const theme = getCraftTheme(craftType);

  // Signal reveal climax to environment engine on mount
  useEffect(() => {
    envCtx?.onRevealStart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Neural Bridge: socket listener for neural:identity_evolved ───────────

  useEffect(() => {
    function onEvolved(payload: {
      guestId:    string;
      newTier:    string;
      oldTier:    string;
      masteryGain: number;
      newTotal:   number;
    }) {
      if (!guestProfile || payload.guestId !== guestProfile.id) return;
      if (payload.newTier !== payload.oldTier) {
        setLevelUp(prev => prev ?? {
          oldTier:      payload.oldTier,
          newTier:      payload.newTier,
          masteryGain:  payload.masteryGain,
          goldenBoxPct: Math.min(100, payload.newTotal),
          newBadges:    [],
        });
      }
    }
    socket.on("neural:identity_evolved", onEvolved);
    return () => { socket.off("neural:identity_evolved", onEvolved); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestProfile?.id]);

  // ── Fetch recommendations + Neural Bridge closure ─────────────────────────

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const data = await apiGet(`/api/swipe-experience/session/${sessionId}/recommendations`);
        const loaded: Recommendation[] = data.recommendations ?? [];
        setRecs(loaded);
        const cat = data.recommendations?.[0]?.item?.category;
        const ct = cat === "cigar" ? "smoke"
                 : cat === "alcohol" ? "pour"
                 : cat === "beer"    ? "brew"
                 : "smoke";
        setCraftType(ct);

        // Compute blend intelligence from recommendation tags
        const allTags = loaded.flatMap(r => r.item.tags);
        if (allTags.length > 0) {
          const chem = computeBlendChemistry(allTags, ct);
          setChemistry(chem);
          if (guestProfile) {
            const dev = detectDeviation(allTags, guestProfile);
            const evo = !dev ? detectEvolution(guestProfile.flavorHistory, allTags) : null;
            setIntelInsight(dev ?? evo);
          }
        }

        // ── Neural Bridge: evolve mastery + trigger BOH_PULSE ──────────────
        if (guestProfile && !evolvedRef.current) {
          evolvedRef.current = true;

          // Read session score stored by ExperiencePage
          let nbScore = 50;
          let topTags: string[] = [];
          try {
            const raw = sessionStorage.getItem("nb_session");
            if (raw) {
              const parsed = JSON.parse(raw) as { sessionScore?: number; topTags?: string[] };
              nbScore  = parsed.sessionScore ?? nbScore;
              topTags  = parsed.topTags      ?? [];
              sessionStorage.removeItem("nb_session");
            }
          } catch { /* ignore */ }

          // Fallback: use top rec's taste match
          if (nbScore === 50 && loaded.length > 0) {
            nbScore = Math.round(loaded[0]!.tasteMatch);
          }

          const oldTier = guestProfile.masteryTier;
          const result  = await evolveMastery(nbScore);
          if (result && result.newTier !== oldTier) {
            setLevelUp({
              oldTier,
              newTier:      result.newTier,
              masteryGain:  result.masteryGain,
              goldenBoxPct: Math.min(100, (guestProfile.totalMastery ?? 0) + result.masteryGain),
              newBadges:    (result.newBadges ?? []).map((b: string) => ({ badgeId: b })),
            });
          }

          // Trigger BOH_PULSE via pairing engine (non-blocking)
          const tags = topTags.length > 0 ? topTags : allTags.slice(0, 4);
          if (tags.length > 0) {
            const params = new URLSearchParams();
            tags.forEach(t => params.append("tags", t));
            if (guestProfile.id)     params.set("guestId",   guestProfile.id);
            if (guestProfile.region) params.set("region",    guestProfile.region);
            apiGet(`/api/pairing-engine/suggest?${params.toString()}`).catch(() => {});
          }
        }
      } catch { /* use empty */ }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Add to order ──────────────────────────────────────────────────────────

  async function handleOrder(rec: Recommendation) {
    const itemId = rec.item.id;
    if (ordering.has(itemId) || ordered.has(itemId)) return;

    setOrdering(prev => new Set([...prev, itemId]));
    setOrderError(prev => { const n = { ...prev }; delete n[itemId]; return n; });

    try {
      const result = await apiPost("/api/swipe-orders", {
        sessionId,
        inventoryId:   itemId,
        inventoryName: rec.item.name,
        quantity:      1,
        priceCents:    rec.item.priceCents ?? 0,
        tags:          rec.item.tags,
        craftType,
      });

      if (result.error) {
        setOrderError(prev => ({ ...prev, [itemId]: result.error }));
      } else {
        setOrdered(prev => new Set([...prev, itemId]));
        setConfirm({
          itemName:   rec.item.name,
          itemId,
          priceCents: rec.item.priceCents ?? 0,
        });
        envCtx?.onOrderConfirm();
      }
    } catch {
      setOrderError(prev => ({ ...prev, [itemId]: "Failed to add — please try again" }));
    } finally {
      setOrdering(prev => { const n = new Set(prev); n.delete(itemId); return n; });
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#050505",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 18,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,135,51,0.07) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "2px solid rgba(200,135,51,0.14)",
            borderTop: "2px solid #C88733",
          }}
        />
        <p style={{ color: "rgba(232,220,200,0.40)", fontSize: 13, letterSpacing: "0.1em" }}>
          Crafting your perfect match…
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:     "100dvh",
      background:    "#050505",
      color:         "#E8DCC8",
      display:       "flex",
      flexDirection: "column",
    }}>
      {/* Background — faint craft image, deeply shadowed */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: `url(${theme.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.05,
        filter: "blur(8px) saturate(0.4)",
        transform: "scale(1.08)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      {/* Obsidian overlay — deep lounge atmosphere */}
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(180deg, rgba(5,5,5,0.82) 0%, rgba(5,5,5,0.60) 40%, rgba(5,5,5,0.90) 100%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      {/* Ambient whiskey warmth — top glow */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(200,135,51,0.08) 0%, transparent 60%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Orchestrator spotlight — richer glow for immersed/premium users */}
      {orchestrator?.isImmersive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.4, ease: "easeIn" }}
          style={{
            position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
            background: "radial-gradient(ellipse at 50% 65%, rgba(212,139,0,0.18) 0%, transparent 68%)",
          }}
        />
      )}

      {/* Cinematic hush — brief dark veil that clears as the reveal breathes in */}
      <motion.div
        initial={{ opacity: 0.60 }}
        animate={{ opacity: 0 }}
        transition={{ duration: orchestrator?.isPremium ? 2.4 : 1.8, delay: 0.25, ease: "easeOut" }}
        style={{
          position:      "fixed", inset: 0,
          zIndex:        8,
          background:    "#070504",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center",
        padding: "18px 24px 0", flexShrink: 0,
      }}>
        <motion.button
          onClick={() => navigate("/")}
          whileTap={{ scale: 0.94 }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(26,26,27,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "8px 14px",
            color: "rgba(240,232,216,0.55)", fontSize: 13, cursor: "pointer",
          }}
        >
          <ArrowLeft size={14} /> Back
        </motion.button>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.90, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative", zIndex: 10,
          textAlign: "center",
          padding: "24px 24px 20px",
          flexShrink: 0,
        }}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "inline-flex", alignItems: "center",
            gap: 8, marginBottom: 14,
            padding: "6px 18px", borderRadius: 20,
            background: `${theme.accent}14`,
            border: `1px solid ${theme.accent}30`,
          }}
        >
          <Sparkles size={14} color={theme.accent} />
          <span style={{
            fontSize: 11, fontWeight: 800,
            color: theme.accent, letterSpacing: "0.14em",
          }}>
            YOUR CRAFTED MATCH
          </span>
        </motion.div>

        <h1 style={{
          fontSize: 28, fontWeight: 700,
          color: "#f0e8d8", margin: "0 0 6px",
          fontFamily: "'Playfair Display', serif",
        }}>
          Selected for you
        </h1>
        <p style={{ fontSize: 14, color: "rgba(240,232,216,0.4)", margin: 0 }}>
          Based on your swipe profile — curated for your taste
        </p>
      </motion.div>

      {/* Mentor Intelligence — blend chemistry + insight */}
      {chemistry && (
        <MentorIntelSection
          chemistry={chemistry}
          mentorName={mentor?.name ?? null}
          intelInsight={intelInsight}
          accentColor={theme.accent}
        />
      )}

      {/* Cards */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, overflowY: "auto",
        padding: "0 20px 24px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {recs.length === 0 ? (
          <EmptyState theme={theme} navigate={navigate} craftType={craftType} />
        ) : (
          recs.map((rec, idx) => (
            <RevealCard
              key={rec.item.id}
              rec={rec}
              rank={idx + 1}
              theme={theme}
              ordering={ordering.has(rec.item.id)}
              ordered={ordered.has(rec.item.id)}
              error={orderError[rec.item.id]}
              onOrder={() => handleOrder(rec)}
              delay={revealCardDelay(idx, envCtx?.env?.revealPacing ?? 70)}
            />
          ))
        )}
      </div>

      {/* Regional Leaderboard — live position for enrolled guests */}
      {guestProfile && (
        <RegionalLeaderboard
          guestId={guestProfile.id}
          region={guestProfile.region ?? null}
          accentColor={theme.accent}
        />
      )}

      {/* Start over */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "0 20px 36px", textAlign: "center",
        flexShrink: 0,
      }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(`/experience/${craftType}`)}
          style={{
            width: "100%", maxWidth: 380, padding: "13px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(232,220,200,0.35)",
            fontSize: 13, cursor: "pointer", letterSpacing: "0.05em",
          }}
        >
          Refine my profile — swipe again
        </motion.button>
      </div>

      {/* Order confirmation modal */}
      <AnimatePresence>
        {confirm && (
          <OrderConfirmModal
            confirm={confirm}
            theme={theme}
            onClose={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>

      {/* Level-Up Ceremony — full-screen tier elevation celebration */}
      <AnimatePresence>
        {levelUp && guestProfile && (
          <LevelUpCeremony
            oldTier={levelUp.oldTier}
            newTier={levelUp.newTier}
            masteryGain={levelUp.masteryGain}
            goldenBoxPct={levelUp.goldenBoxPct}
            guestName={guestProfile.firstName}
            newBadges={levelUp.newBadges}
            onDismiss={() => setLevelUp(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mentor intelligence section ───────────────────────────────────────────────

interface MentorIntelProps {
  chemistry:    BlendChemistry;
  mentorName:   string | null;
  intelInsight: string | null;
  accentColor:  string;
}

function ChemMeter({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{
          fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          color: "rgba(232,220,200,0.30)", fontWeight: 600,
        }}>{label}</span>
        <span style={{ fontSize: 9, color: accent, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
      </div>
      <div style={{ height: 2, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.1, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${accent}44, ${accent})`,
          }}
        />
      </div>
    </div>
  );
}

function MentorIntelSection({ chemistry, mentorName, intelInsight, accentColor }: MentorIntelProps) {
  const label    = blendSummaryLabel(chemistry);
  const initials = mentorName
    ? mentorName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.38 }}
      style={{
        position:        "relative",
        zIndex:          10,
        margin:          "0 20px 16px",
        background:      "rgba(10,7,4,0.78)",
        border:          `1px solid ${accentColor}18`,
        borderRadius:    16,
        padding:         "15px 16px",
        backdropFilter:  "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {initials && (
            <div style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: `${accentColor}12`,
              border: `1px solid ${accentColor}32`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 10, color: accentColor, letterSpacing: "0.04em",
            }}>
              {initials}
            </div>
          )}
          <span style={{
            fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
            color: `${accentColor}65`, fontWeight: 600,
          }}>
            Session Intelligence
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: "0.06em",
          padding: "3px 10px", borderRadius: 20,
          background: `${accentColor}0E`,
          border: `1px solid ${accentColor}28`,
        }}>
          {label}
        </span>
      </div>

      {/* Chemistry meters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 12 }}>
        <ChemMeter label="Harmony"    value={chemistry.harmony}    accent={accentColor} />
        <ChemMeter label="Warmth"     value={chemistry.warmth}     accent={accentColor} />
        <ChemMeter label="Complexity" value={chemistry.complexity} accent={accentColor} />
      </div>

      {/* Mentor note */}
      {chemistry.mentorNote && (
        <p style={{
          margin: 0, fontSize: 12,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic", fontWeight: 300, lineHeight: 1.52,
          color: "rgba(232,220,200,0.45)",
          borderLeft: `1.5px solid ${accentColor}22`,
          paddingLeft: 10,
        }}>
          {chemistry.mentorNote}
        </p>
      )}

      {/* Evolution / deviation insight */}
      {intelInsight && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          style={{
            margin: "9px 0 0", fontSize: 11, lineHeight: 1.55,
            color: "rgba(232,220,200,0.25)", fontStyle: "italic",
          }}
        >
          {intelInsight}
        </motion.p>
      )}
    </motion.div>
  );
}

// ── Reveal card ───────────────────────────────────────────────────────────────

interface RevealCardProps {
  rec:      Recommendation;
  rank:     number;
  theme:    ReturnType<typeof getCraftTheme>;
  ordering: boolean;
  ordered:  boolean;
  error?:   string;
  onOrder:  () => void;
  delay:    number;
}

function RevealCard({ rec, rank, theme, ordering, ordered, error, onOrder, delay }: RevealCardProps) {
  const price = rec.item.priceCents
    ? `$${(rec.item.priceCents / 100).toFixed(0)}`
    : null;

  const isTopPick = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:   "linear-gradient(160deg, rgba(22,16,10,0.92) 0%, rgba(12,9,5,0.96) 100%)",
        border:       `1px solid ${isTopPick ? `${theme.accent}40` : "rgba(255,255,255,0.06)"}`,
        borderRadius: 22,
        overflow:     "hidden",
        backdropFilter: "blur(20px)",
        boxShadow:    isTopPick
          ? `0 20px 60px rgba(0,0,0,0.70), 0 0 40px ${theme.accent}10`
          : "0 10px 40px rgba(0,0,0,0.55)",
      }}
    >
      {/* Image banner */}
      {rec.item.image ? (
        <div style={{
          height:             180,
          backgroundImage:    `url(${rec.item.image})`,
          backgroundSize:     "cover",
          backgroundPosition: "center",
          position:           "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(26,26,27,0.02) 30%, rgba(18,12,8,0.98) 100%)",
          }} />
          {isTopPick && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.25 }}
              style={{
                position: "absolute", top: 14, right: 14,
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
                borderRadius: 8, padding: "5px 12px",
                fontSize: 10, fontWeight: 800,
                color: "#050505", letterSpacing: "0.12em",
              }}
            >
              TOP PICK
            </motion.div>
          )}
        </div>
      ) : (
        /* No-image gradient banner */
        <div style={{
          height: 80,
          background: `linear-gradient(135deg, ${theme.accent}12, ${theme.accent}05)`,
          position: "relative",
        }}>
          {isTopPick && (
            <div style={{
              position: "absolute", top: 14, right: 14,
              background: `${theme.accent}22`,
              border: `1px solid ${theme.accent}40`,
              borderRadius: 8, padding: "4px 12px",
              fontSize: 10, fontWeight: 800,
              color: theme.accent, letterSpacing: "0.12em",
            }}>
              TOP PICK
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: "18px 20px 20px" }}>
        {/* Rank + name + price */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: isTopPick
              ? `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${isTopPick ? "transparent" : "rgba(255,255,255,0.08)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            color: isTopPick ? "#050505" : "rgba(232,220,200,0.35)",
          }}>
            {rank}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: 18, fontWeight: 700, color: "#f0e8d8",
              margin: "0 0 3px", fontFamily: "'Playfair Display', serif",
            }}>{rec.item.name}</h3>
            {price && (
              <span style={{ fontSize: 14, color: theme.accent, fontWeight: 600 }}>{price}</span>
            )}
          </div>
          {/* Stock status indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600,
            color: rec.stockStatus === "ok" ? "#34d399"
              : rec.stockStatus === "low" ? "#fb923c"
              : "#ef4444",
          }}>
            {rec.stockStatus === "ok"  ? <Package size={12} /> :
             rec.stockStatus === "low" ? <AlertTriangle size={12} /> :
             <AlertTriangle size={12} />}
            {rec.stockStatus === "ok"  ? "In Stock" :
             rec.stockStatus === "low" ? "Low Stock" :
             "Out of Stock"}
          </div>
        </div>

        {/* Taste match bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 11, color: "rgba(232,220,200,0.32)",
            marginBottom: 5, letterSpacing: "0.06em",
          }}>
            <span>Taste Match</span>
            <span style={{ color: theme.accent, fontWeight: 600 }}>{rec.tasteMatch}%</span>
          </div>
          <div style={{
            height: 4, borderRadius: 4,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rec.tasteMatch}%` }}
              transition={{ duration: 0.9, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: "100%", borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.accentSoft}, ${theme.accent})`,
              }}
            />
          </div>
        </div>

        {/* Reason */}
        <p style={{
          fontSize: 13, color: "rgba(232,220,200,0.55)",
          lineHeight: 1.60, margin: "0 0 10px",
        }}>
          {rec.reason}
        </p>

        {/* Pairing note */}
        {rec.pairingNote && (
          <p style={{
            fontSize: 12, color: `${theme.accent}85`,
            lineHeight: 1.5, margin: "0 0 14px",
            fontStyle: "italic",
          }}>
            {rec.pairingNote}
          </p>
        )}

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
          {rec.item.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{
              padding: "3px 10px", borderRadius: 20,
              background: `${theme.accent}10`,
              border: `1px solid ${theme.accent}22`,
              fontSize: 11, color: theme.accent, fontWeight: 500,
            }}>{tag}</span>
          ))}
          {rec.stockStatus === "low" && (
            <span style={{
              padding: "3px 10px", borderRadius: 20,
              background: "rgba(251,146,60,0.10)",
              border: "1px solid rgba(251,146,60,0.22)",
              fontSize: 11, color: "#fb923c", fontWeight: 600,
            }}>Limited availability</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 10px" }}>{error}</p>
        )}

        {/* CTA */}
        <motion.button
          whileHover={!ordered && !ordering ? { scale: 1.01 } : {}}
          whileTap={!ordered && !ordering ? { scale: 0.98 } : {}}
          onClick={!ordered && !ordering ? onOrder : undefined}
          disabled={ordering || rec.stockStatus === "out"}
          style={{
            width:          "100%",
            padding:        "15px",
            borderRadius:   13,
            border:         "none",
            background:     ordered
              ? "rgba(52,211,153,0.10)"
              : rec.stockStatus === "out"
              ? "rgba(255,255,255,0.04)"
              : `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
            color:          ordered
              ? "#4ade80"
              : rec.stockStatus === "out"
              ? "rgba(232,220,200,0.20)"
              : "#050505",
            fontSize:       14,
            fontWeight:     700,
            cursor:         ordered || rec.stockStatus === "out" ? "default" : "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            8,
            transition:     "all 0.22s ease",
            boxShadow:      !ordered && rec.stockStatus !== "out"
              ? `0 4px 20px ${theme.accent}30` : "none",
          }}
        >
          {ordering ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(5,5,5,0.25)",
                  borderTop: "2px solid #050505",
                }}
              />
              Adding…
            </>
          ) : ordered ? (
            <><Check size={16} strokeWidth={3} /> Added to Order</>
          ) : rec.stockStatus === "out" ? (
            <><AlertTriangle size={15} /> Out of Stock</>
          ) : (
            <><ShoppingBag size={15} /> Add to Order</>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  theme, navigate, craftType,
}: { theme: ReturnType<typeof getCraftTheme>; navigate: (p: string) => void; craftType: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 18, padding: "48px 24px",
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <ShoppingBag size={30} color="rgba(232,220,200,0.22)" />
      </div>
      <p style={{ color: "rgba(232,220,200,0.36)", textAlign: "center", lineHeight: 1.65, maxWidth: 280, fontSize: 14 }}>
        No stocked inventory matched your profile yet.<br />
        <span style={{ fontSize: 12, color: "rgba(232,220,200,0.22)" }}>
          Add product tags in the inventory dashboard to improve recommendations.
        </span>
      </p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate(`/experience/${craftType}`)}
        style={{
          padding: "12px 28px", borderRadius: 12,
          background: `${theme.accent}16`,
          border: `1px solid ${theme.accent}30`,
          color: theme.accent, fontSize: 14, cursor: "pointer", fontWeight: 600,
        }}
      >
        Swipe again
      </motion.button>
    </motion.div>
  );
}

// ── Order confirmation modal ──────────────────────────────────────────────────

function OrderConfirmModal({
  confirm, theme, onClose,
}: {
  confirm: OrderConfirmation;
  theme:   ReturnType<typeof getCraftTheme>;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(5,5,5,0.82)",
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(20px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, rgba(26,18,10,0.98) 0%, rgba(10,7,4,1) 100%)",
          border: `1px solid ${theme.accent}30`,
          borderRadius: 24,
          padding: "40px 32px 32px",
          maxWidth: 360, width: "100%",
          textAlign: "center",
          boxShadow: `0 40px 100px rgba(0,0,0,0.90), 0 0 80px ${theme.accent}12`,
        }}
      >
        {/* Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
          style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(52,211,153,0.12)",
            border: "2px solid #34d399",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <motion.div
            animate={{ boxShadow: ["0 0 0px #34d39900", "0 0 28px #34d39960", "0 0 0px #34d39900"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Check size={32} color="#34d399" strokeWidth={3} />
          </motion.div>
        </motion.div>

        <h3 style={{
          fontSize: 20, fontWeight: 700, color: "#E8DCC8",
          fontFamily: "'Playfair Display', serif", margin: "0 0 8px",
        }}>
          Added to Order
        </h3>
        <p style={{ fontSize: 14, color: "rgba(232,220,200,0.52)", margin: "0 0 6px" }}>
          {confirm.itemName}
        </p>
        {confirm.priceCents > 0 && (
          <p style={{ fontSize: 16, color: theme.accent, fontWeight: 700, margin: "0 0 24px" }}>
            ${(confirm.priceCents / 100).toFixed(2)}
          </p>
        )}
        <p style={{ fontSize: 12, color: "rgba(232,220,200,0.25)", margin: "0 0 24px", letterSpacing: "0.04em" }}>
          A reservation has been held. Complete your order at the counter.
        </p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          style={{
            width: "100%", padding: "14px",
            borderRadius: 12,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
            border: "none", color: "#050505",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
