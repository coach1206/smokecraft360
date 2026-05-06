/**
 * RevealPage — Cinematic recommendation reveal after swipe session.
 * Route: /reveal/:sessionId
 *
 * - Animated entrance sequence for each card
 * - Taste match bar, stock status, pairing notes
 * - Real Add-to-Order wiring via POST /api/swipe-orders
 * - Cinematic confirmation modal on successful order
 */

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, ShoppingBag, Star, Check, Package, AlertTriangle } from "lucide-react";
import { getCraftTheme } from "@/lib/craftThemes";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { useOrchestratorSafe } from "@/contexts/OrchestratorContext";

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

  const theme = getCraftTheme(craftType);

  // Signal reveal climax to environment engine on mount
  useEffect(() => {
    envCtx?.onRevealStart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch recommendations ─────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const data = await apiGet(`/api/swipe-experience/session/${sessionId}/recommendations`);
        setRecs(data.recommendations ?? []);
        const cat = data.recommendations?.[0]?.item?.category;
        if (cat === "cigar")   setCraftType("smoke");
        else if (cat === "alcohol") setCraftType("pour");
        else if (cat === "beer")    setCraftType("brew");
      } catch { /* use empty */ }
      setLoading(false);
    })();
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
        background: "#0a0806",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 18,
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid rgba(212,175,55,0.18)",
            borderTop: "3px solid #d4af37",
          }}
        />
        <p style={{ color: "rgba(240,232,216,0.45)", fontSize: 14 }}>
          Crafting your perfect match…
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:     "100dvh",
      background:    "#0a0806",
      color:         "#f0e8d8",
      display:       "flex",
      flexDirection: "column",
    }}>
      {/* Background */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: `url(${theme.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.06,
        filter: "blur(5px)",
        transform: "scale(1.06)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(180deg, rgba(10,8,6,0.7) 0%, rgba(10,8,6,0.5) 50%, rgba(10,8,6,0.9) 100%)",
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
            background: "radial-gradient(ellipse at 50% 65%, rgba(212,175,55,0.18) 0%, transparent 68%)",
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
            background: "rgba(255,255,255,0.05)",
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
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(240,232,216,0.42)",
            fontSize: 13, cursor: "pointer",
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
    </div>
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
        background:   "rgba(18,12,8,0.88)",
        border:       `1px solid ${isTopPick ? `${theme.accent}45` : "rgba(255,255,255,0.07)"}`,
        borderRadius: 22,
        overflow:     "hidden",
        backdropFilter: "blur(16px)",
        boxShadow:    isTopPick
          ? `0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px ${theme.accent}18 inset`
          : "0 6px 24px rgba(0,0,0,0.35)",
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
            background: "linear-gradient(180deg, rgba(0,0,0,0.08) 30%, rgba(18,12,8,0.98) 100%)",
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
                color: "#0a0806", letterSpacing: "0.12em",
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
              : "rgba(255,255,255,0.06)",
            border: `1px solid ${isTopPick ? "transparent" : "rgba(255,255,255,0.1)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            color: isTopPick ? "#0a0806" : "rgba(240,232,216,0.4)",
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
            fontSize: 11, color: "rgba(240,232,216,0.38)",
            marginBottom: 5, letterSpacing: "0.06em",
          }}>
            <span>Taste Match</span>
            <span style={{ color: theme.accent, fontWeight: 600 }}>{rec.tasteMatch}%</span>
          </div>
          <div style={{
            height: 5, borderRadius: 4,
            background: "rgba(255,255,255,0.07)",
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
          fontSize: 13, color: "rgba(240,232,216,0.58)",
          lineHeight: 1.55, margin: "0 0 10px",
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
              ? "rgba(52,211,153,0.12)"
              : rec.stockStatus === "out"
              ? "rgba(255,255,255,0.04)"
              : `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
            color:          ordered
              ? "#34d399"
              : rec.stockStatus === "out"
              ? "rgba(240,232,216,0.25)"
              : "#0a0806",
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
                  border: "2px solid rgba(10,8,6,0.3)",
                  borderTop: "2px solid #0a0806",
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
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <ShoppingBag size={30} color="rgba(240,232,216,0.25)" />
      </div>
      <p style={{ color: "rgba(240,232,216,0.38)", textAlign: "center", lineHeight: 1.65, maxWidth: 280, fontSize: 14 }}>
        No stocked inventory matched your profile yet.<br />
        <span style={{ fontSize: 12, color: "rgba(240,232,216,0.25)" }}>
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
        background: "rgba(8,6,4,0.85)",
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(8px)",
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
          background: "rgba(18,12,8,0.98)",
          border: `1px solid ${theme.accent}35`,
          borderRadius: 24,
          padding: "40px 32px 32px",
          maxWidth: 360, width: "100%",
          textAlign: "center",
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 60px ${theme.accent}20`,
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
          fontSize: 20, fontWeight: 700, color: "#f0e8d8",
          fontFamily: "'Playfair Display', serif", margin: "0 0 8px",
        }}>
          Added to Order
        </h3>
        <p style={{ fontSize: 14, color: "rgba(240,232,216,0.55)", margin: "0 0 6px" }}>
          {confirm.itemName}
        </p>
        {confirm.priceCents > 0 && (
          <p style={{ fontSize: 16, color: theme.accent, fontWeight: 700, margin: "0 0 24px" }}>
            ${(confirm.priceCents / 100).toFixed(2)}
          </p>
        )}
        <p style={{ fontSize: 12, color: "rgba(240,232,216,0.3)", margin: "0 0 24px" }}>
          A reservation has been held. Complete your order at the counter.
        </p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          style={{
            width: "100%", padding: "14px",
            borderRadius: 12,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
            border: "none", color: "#0a0806",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
