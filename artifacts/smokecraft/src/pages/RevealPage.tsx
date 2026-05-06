/**
 * RevealPage — shows final 3 recommendations after swipe session.
 * Route: /reveal/:sessionId
 */

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, ShoppingBag, Star } from "lucide-react";
import { getCraftTheme } from "@/lib/craftThemes";

interface Recommendation {
  item: {
    id:        string;
    name:      string;
    image?:    string | null;
    tags:      string[];
    priceCents?: number | null;
    category?: string;
  };
  score:       number;
  reason:      string;
  tasteMatch:  number;
  marginPct:   number;
  stockStatus: "ok" | "low" | "out";
  pairingNote?: string;
}

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

export default function RevealPage() {
  const params     = useParams<{ sessionId: string }>();
  const sessionId  = params.sessionId;
  const [, navigate] = useLocation();

  const [recs,     setRecs]     = useState<Recommendation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [craftType, setCraftType] = useState("smoke");
  const [ordered,  setOrdered]  = useState<Set<string>>(new Set());

  const theme = getCraftTheme(craftType);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const data = await apiGet(`/api/swipe-experience/session/${sessionId}/recommendations`);
        setRecs(data.recommendations ?? []);
        // Infer craft type from first rec's category
        const cat = data.recommendations?.[0]?.item?.category;
        if (cat === "cigar")   setCraftType("smoke");
        else if (cat === "alcohol") setCraftType("pour");
        else if (cat === "beer")    setCraftType("brew");
      } catch { /* use empty state */ }
      setLoading(false);
    })();
  }, [sessionId]);

  function handleOrder(itemId: string) {
    setOrdered(prev => new Set([...prev, itemId]));
  }

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#0a0806",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          border: "3px solid rgba(212,175,55,0.2)",
          borderTop: "3px solid #d4af37",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "rgba(240,232,216,0.5)", fontSize: 14 }}>
          Crafting your perfect match…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:     "100dvh",
      background:    "#0a0806",
      color:         "#f0e8d8",
      display:       "flex",
      flexDirection: "column",
      overflow:      "hidden",
    }}>
      {/* Background */}
      <div style={{
        position:   "fixed",
        inset:      0,
        backgroundImage: `url(${theme.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity:    0.07,
        filter:     "blur(4px)",
        transform:  "scale(1.05)",
        pointerEvents: "none",
        zIndex:     0,
      }} />

      {/* Header */}
      <div style={{
        position:   "relative",
        zIndex:     10,
        display:    "flex",
        alignItems: "center",
        gap:        16,
        padding:    "20px 24px 0",
        flexShrink: 0,
      }}>
        <motion.button
          onClick={() => navigate("/")}
          whileTap={{ scale: 0.94 }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "8px 14px",
            color: "rgba(240,232,216,0.6)", fontSize: 13,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={15} />
          Back
        </motion.button>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position:   "relative",
          zIndex:     10,
          textAlign:  "center",
          padding:    "28px 24px 24px",
          flexShrink: 0,
        }}
      >
        <div style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            8,
          marginBottom:   12,
          padding:        "6px 16px",
          borderRadius:   20,
          background:     `${theme.accent}14`,
          border:         `1px solid ${theme.accent}30`,
        }}>
          <Sparkles size={14} color={theme.accent} />
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.accent, letterSpacing: "0.1em" }}>
            YOUR CRAFTED MATCH
          </span>
        </div>
        <h1 style={{
          fontSize:   28,
          fontWeight: 700,
          color:      "#f0e8d8",
          margin:     0,
          fontFamily: "'Playfair Display', serif",
        }}>
          Selected for you
        </h1>
        <p style={{
          fontSize:   14,
          color:      "rgba(240,232,216,0.45)",
          marginTop:  8,
        }}>
          Based on your swipe profile — curated just for your taste
        </p>
      </motion.div>

      {/* Cards */}
      <div style={{
        position:   "relative",
        zIndex:     10,
        flex:       1,
        overflowY:  "auto",
        padding:    "0 20px 32px",
        display:    "flex",
        flexDirection: "column",
        gap:        16,
      }}>
        {recs.length === 0 ? (
          <div style={{
            flex:          1,
            display:       "flex",
            flexDirection: "column",
            alignItems:    "center",
            justifyContent: "center",
            gap:           16,
            padding:       "40px 0",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ShoppingBag size={32} color="rgba(240,232,216,0.3)" />
            </div>
            <p style={{ color: "rgba(240,232,216,0.4)", textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>
              No stocked matches found.<br />
              <span style={{ fontSize: 12 }}>Add inventory tags in the dashboard to improve recommendations.</span>
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              style={{
                padding: "12px 28px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(240,232,216,0.7)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Back to Craft Hub
            </motion.button>
          </div>
        ) : (
          recs.map((rec, idx) => (
            <RecommendationCard
              key={rec.item.id}
              rec={rec}
              rank={idx + 1}
              theme={theme}
              ordered={ordered.has(rec.item.id)}
              onOrder={() => handleOrder(rec.item.id)}
              delay={idx * 0.12}
            />
          ))
        )}
      </div>

      {/* Start over */}
      <div style={{
        position:   "relative",
        zIndex:     10,
        padding:    "0 20px 32px",
        flexShrink: 0,
        textAlign:  "center",
      }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(`/experience/${craftType}`)}
          style={{
            width:        "100%",
            maxWidth:     380,
            padding:      "14px",
            borderRadius: 12,
            background:   "rgba(255,255,255,0.04)",
            border:       "1px solid rgba(255,255,255,0.08)",
            color:        "rgba(240,232,216,0.5)",
            fontSize:     14,
            cursor:       "pointer",
          }}
        >
          Refine my profile — start over
        </motion.button>
      </div>
    </div>
  );
}

// ── Recommendation card ───────────────────────────────────────────────────────

interface CardProps {
  rec:     Recommendation;
  rank:    number;
  theme:   ReturnType<typeof getCraftTheme>;
  ordered: boolean;
  onOrder: () => void;
  delay:   number;
}

function RecommendationCard({ rec, rank, theme, ordered, onOrder, delay }: CardProps) {
  const price = rec.item.priceCents
    ? `$${(rec.item.priceCents / 100).toFixed(0)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:   "rgba(22,16,10,0.85)",
        border:       `1px solid ${rank === 1 ? `${theme.accent}40` : "rgba(255,255,255,0.07)"}`,
        borderRadius: 20,
        overflow:     "hidden",
        backdropFilter: "blur(12px)",
        boxShadow:    rank === 1
          ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${theme.accent}20 inset`
          : "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* Image strip */}
      {rec.item.image && (
        <div style={{
          height:             160,
          backgroundImage:    `url(${rec.item.image})`,
          backgroundSize:     "cover",
          backgroundPosition: "center",
          position:           "relative",
        }}>
          <div style={{
            position:   "absolute",
            inset:      0,
            background: "linear-gradient(180deg, transparent 40%, rgba(22,16,10,0.95) 100%)",
          }} />
          {rank === 1 && (
            <div style={{
              position:     "absolute",
              top:          12,
              right:        12,
              background:   `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
              borderRadius: 8,
              padding:      "4px 10px",
              fontSize:     11,
              fontWeight:   700,
              color:        "#0a0806",
              letterSpacing: "0.1em",
            }}>
              TOP PICK
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: "20px 20px 16px" }}>
        {/* Rank + name */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: "50%",
            background: rank === 1 ? `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})` : "rgba(255,255,255,0.06)",
            border: `1px solid ${rank === 1 ? "transparent" : "rgba(255,255,255,0.1)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            color: rank === 1 ? "#0a0806" : "rgba(240,232,216,0.5)",
            flexShrink: 0,
          }}>
            {rank}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f0e8d8",
              margin: "0 0 2px",
              fontFamily: "'Playfair Display', serif",
            }}>{rec.item.name}</h3>
            {price && (
              <div style={{ fontSize: 14, color: theme.accent, fontWeight: 600 }}>{price}</div>
            )}
          </div>
        </div>

        {/* Score bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 11, color: "rgba(240,232,216,0.4)",
            marginBottom: 5, letterSpacing: "0.06em",
          }}>
            <span>Taste Match</span>
            <span style={{ color: theme.accent }}>{rec.tasteMatch}%</span>
          </div>
          <div style={{
            height: 4, borderRadius: 4,
            background: "rgba(255,255,255,0.06)",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rec.tasteMatch}%` }}
              transition={{ duration: 0.8, delay: delay + 0.3 }}
              style={{
                height: "100%",
                borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.accentSoft}, ${theme.accent})`,
              }}
            />
          </div>
        </div>

        {/* Reason */}
        <p style={{
          fontSize: 13,
          color: "rgba(240,232,216,0.6)",
          lineHeight: 1.5,
          margin: "0 0 12px",
        }}>
          {rec.reason}
        </p>

        {/* Pairing note */}
        {rec.pairingNote && (
          <p style={{
            fontSize: 12,
            color: `${theme.accent}90`,
            lineHeight: 1.4,
            margin: "0 0 14px",
            fontStyle: "italic",
          }}>
            {rec.pairingNote}
          </p>
        )}

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
          {rec.item.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{
              padding: "3px 9px",
              borderRadius: 20,
              background: `${theme.accent}12`,
              border: `1px solid ${theme.accent}25`,
              fontSize: 11,
              color: theme.accent,
              fontWeight: 500,
            }}>{tag}</span>
          ))}
          {rec.stockStatus === "low" && (
            <span style={{
              padding: "3px 9px",
              borderRadius: 20,
              background: "rgba(251,146,60,0.1)",
              border: "1px solid rgba(251,146,60,0.25)",
              fontSize: 11,
              color: "#fb923c",
              fontWeight: 600,
            }}>Low stock</span>
          )}
        </div>

        {/* Order button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onOrder}
          style={{
            width:        "100%",
            padding:      "14px",
            borderRadius: 12,
            border:       "none",
            background:   ordered
              ? "rgba(52,211,153,0.12)"
              : `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`,
            color:        ordered ? "#34d399" : "#0a0806",
            fontSize:     14,
            fontWeight:   700,
            cursor:       "pointer",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            gap:          8,
            transition:   "all 0.2s ease",
          }}
        >
          {ordered ? (
            <>
              <Star size={16} fill="#34d399" color="#34d399" />
              Added to Order
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              Add to Order
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
