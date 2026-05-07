/**
 * PairingEngine — Post-Draft AI Sage Pairing Suggestions.
 *
 * Shown after a draft is finalised (e.g. on RevealPage or after session close).
 * Calls /api/pairing-engine/suggest with the session's dominant flavor tags,
 * shows the top 3 inventory matches with affinity score + mastery boost label.
 *
 * Also triggers Server Pulse (BOH_PULSE) on the backend.
 *
 * Props:
 *   tags      — flavor/style tags from the current session
 *   venueId?  — for venue-scoped inventory lookup
 *   tableId?  — for BOH pulse message ("Table 4 just drafted…")
 *   mentor    — mentor name for the "Your sage recommends" copy
 */

import { useState, useEffect }    from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap }       from "lucide-react";
import { useGuestProfile }         from "@/contexts/GuestProfileContext";

const C = {
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.55)",
  border:  "rgba(212,139,0,0.18)",
  text:    "#1A1A1B",
  muted:   "rgba(26,26,27,0.45)",
  bg:      "rgba(245,242,237,0.97)",
};

interface Suggestion {
  id:            string;
  name:          string;
  category:      string | null;
  price:         string | null;
  affinityScore: number;
}

interface PairingEngineProps {
  tags:      string[];
  venueId?:  string;
  tableId?:  string;
  mentor?:   string;
  onDismiss?: () => void;
}

export default function PairingEngine({ tags, venueId, tableId, mentor, onDismiss }: PairingEngineProps) {
  const { guestProfile }             = useGuestProfile();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [pulseSent, setPulseSent]     = useState(false);

  useEffect(() => {
    if (tags.length === 0) { setLoading(false); return; }

    const params = new URLSearchParams({ tags: tags.join(",") });
    if (venueId)                   params.set("venueId", venueId);
    if (tableId)                   params.set("tableId", tableId);
    if (guestProfile?.id)          params.set("guestId", guestProfile.id);

    fetch(`/api/pairing-engine/suggest?${params}`)
      .then(r => r.json())
      .then(data => {
        setSuggestions(data.suggestions ?? []);
        setPulseSent(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tags.join(","), venueId, tableId, guestProfile?.id]);

  const mentorName = mentor ?? "Your Sage";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background:   C.bg,
        border:       `1px solid ${C.border}`,
        borderRadius: 16,
        padding:      "24px 22px",
        position:     "relative",
        maxWidth:     520,
        width:        "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Sparkles size={14} color={C.gold} />
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      "0.62rem",
              fontWeight:    600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         C.goldDim,
            }}>
              {mentorName} Recommends
            </p>
          </div>
          <h3 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "1.3rem",
            fontWeight:    300,
            color:         C.text,
            letterSpacing: "-0.01em",
          }}>
            Perfect pairings for your draft
          </h3>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: "none", border: "none",
              color: C.muted, cursor: "pointer", padding: 4,
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Server Pulse badge */}
      {pulseSent && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           6,
            background:    "rgba(212,139,0,0.06)",
            border:        `1px solid rgba(212,139,0,0.2)`,
            borderRadius:  6,
            padding:       "5px 10px",
            marginBottom:  16,
          }}
        >
          <Zap size={10} color={C.gold} />
          <span style={{
            fontFamily:    "'Inter', sans-serif",
            fontSize:      "0.62rem",
            color:         C.goldDim,
            letterSpacing: "0.08em",
          }}>
            Server pulse sent — your staff has been notified
          </span>
        </motion.div>
      )}

      {/* Suggestions */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize:   "0.75rem",
              color:      C.muted,
            }}
          >
            Analysing your draft…
          </motion.div>
        </div>
      ) : suggestions.length === 0 ? (
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize:   "0.75rem",
          color:      C.muted,
          textAlign:  "center",
          padding:    "16px 0",
        }}>
          No matches in the current inventory.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suggestions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                background:   i === 0 ? "rgba(212,139,0,0.06)" : "rgba(26,26,27,0.025)",
                border:       `1px solid ${i === 0 ? "rgba(212,139,0,0.28)" : "rgba(26,26,27,0.08)"}`,
                borderRadius: 10,
                padding:      "14px 16px",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "space-between",
                gap:          12,
              }}
            >
              <div>
                {i === 0 && (
                  <p style={{
                    fontFamily:    "'Inter', sans-serif",
                    fontSize:      "0.58rem",
                    fontWeight:    600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color:         C.gold,
                    marginBottom:  3,
                  }}>
                    Top Match · +15 Mastery Boost
                  </p>
                )}
                <p style={{
                  fontFamily:    "'Cormorant Garamond', Georgia, serif",
                  fontSize:      "1rem",
                  fontWeight:    500,
                  color:         C.text,
                  marginBottom:  2,
                }}>
                  {s.name}
                </p>
                {s.category && (
                  <p style={{
                    fontFamily:    "'Inter', sans-serif",
                    fontSize:      "0.68rem",
                    color:         C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}>
                    {s.category}
                  </p>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {s.price && (
                  <p style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize:   "1.1rem",
                    fontWeight: 500,
                    color:      i === 0 ? C.gold : C.text,
                  }}>
                    {s.price}
                  </p>
                )}
                {s.affinityScore > 0 && (
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize:   "0.6rem",
                    color:      C.muted,
                  }}>
                    {s.affinityScore}pt affinity
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
