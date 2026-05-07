/**
 * IdentityLedger — Connoisseur Resume & Golden Box Tracker
 *
 * Route: /identity-ledger
 *
 * Shows:
 *   - Mastery tier + Golden Box progress toward 100%
 *   - Visual aura (Obsidian → Radiant Gold glow intensity by tier)
 *   - Earned badge collection
 *   - Flavor history heatmap
 *   - Session log (last 20)
 *   - All unearned badges (greyed out)
 */

import { useState, useEffect }    from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Trophy, Award, Sparkles, Lock, RotateCcw } from "lucide-react";
import { useGuestProfile, MASTERY_TIER_LABELS } from "@/contexts/GuestProfileContext";
import { useLocation }             from "wouter";

const C = {
  bg:      "#F5F2ED",
  bgDark:  "#0A0704",
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.55)",
  border:  "rgba(212,139,0,0.18)",
  text:    "#1A1A1B",
  muted:   "rgba(26,26,27,0.45)",
  card:    "rgba(245,242,237,0.9)",
};

// Mastery tier → glow intensity configuration
const TIER_AURA: Record<string, { glow: string; ring: string; intensity: number }> = {
  explorer:    { glow: "rgba(26,26,27,0.12)",    ring: "#3a3a3b",  intensity: 0.15 },
  apprentice:  { glow: "rgba(180,140,60,0.18)",  ring: "#b48c3c",  intensity: 0.30 },
  craftsman:   { glow: "rgba(212,139,0,0.28)",   ring: "#D48B00",  intensity: 0.55 },
  sommelier:   { glow: "rgba(212,139,0,0.45)",   ring: "#D48B00",  intensity: 0.80 },
  grand_master:{ glow: "rgba(255,215,0,0.60)",   ring: "#FFD700",  intensity: 1.00 },
};

const BADGE_ICONS: Record<string, React.ReactNode> = {
  first_draft:    <Star size={18} />,
  bold_five:      <Sparkles size={18} />,
  rare_palate:    <Award size={18} />,
  golden_box:     <Crown size={18} />,
  regional_top10: <Trophy size={18} />,
  prestige_pick:  <Star size={18} />,
};

interface LedgerData {
  profile:          Record<string, unknown>;
  tierLabel:        string;
  goldenBoxProgress: number;
  badges:           { id: string; badgeId: string; label: string; desc: string; earnedAt: string }[];
  sessions:         { id: string; craftType: string; createdAt: string }[];
  allBadgeDefs:     { id: string; label: string; desc: string }[];
}

// ── Mastery Aura avatar ───────────────────────────────────────────────────────

function MasteryAura({ tier, name, score }: { tier: string; name: string; score: number }) {
  const aura      = TIER_AURA[tier] ?? TIER_AURA.explorer!;
  const initials  = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 16px" }}>
      {/* Outer glow ring — intensity scales with tier */}
      <motion.div
        animate={{
          scale:   [1, 1.08 + aura.intensity * 0.1, 1],
          opacity: [aura.intensity * 0.5, aura.intensity, aura.intensity * 0.5],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          inset:        -12,
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${aura.glow} 0%, transparent 70%)`,
          pointerEvents:"none",
        }}
      />
      {/* Ring */}
      <motion.div
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity }}
        style={{
          position:     "absolute",
          inset:        -2,
          borderRadius: "50%",
          border:       `2px solid ${aura.ring}`,
          opacity:      aura.intensity,
        }}
      />
      {/* Avatar circle */}
      <div style={{
        width:          "100%",
        height:         "100%",
        borderRadius:   "50%",
        background:     `radial-gradient(135deg, ${aura.glow} 0%, rgba(245,242,237,0.7) 100%)`,
        border:         `1px solid ${aura.ring}50`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "2rem",
          fontWeight:    300,
          color:         aura.ring,
          letterSpacing: "0.05em",
        }}>
          {initials}
        </span>
      </div>

      {/* Mastery score badge */}
      <div style={{
        position:   "absolute",
        bottom:     0, right: 0,
        background: aura.ring,
        color:      "#000",
        borderRadius: "50%",
        width:      28, height: 28,
        display:    "flex", alignItems: "center", justifyContent: "center",
        fontSize:   "0.6rem", fontWeight: 700,
        border:     "2px solid white",
      }}>
        {Math.round(score)}%
      </div>
    </div>
  );
}

// ── Golden Box tracker ────────────────────────────────────────────────────────

function GoldenBoxTracker({ progress }: { progress: number }) {
  const segments = 20;
  const filled   = Math.round((progress / 100) * segments);

  return (
    <div style={{
      background:   "rgba(212,139,0,0.05)",
      border:       `1px solid ${C.border}`,
      borderRadius: 14,
      padding:      "20px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <p style={{
            fontFamily:    "'Inter', sans-serif",
            fontSize:      "0.6rem",
            fontWeight:    600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         C.goldDim,
            marginBottom:  4,
          }}>
            Golden Box Progress
          </p>
          <p style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "1.15rem",
            fontWeight:    500,
            color:         C.text,
          }}>
            {progress >= 100
              ? "Your label is ready."
              : `${(100 - progress).toFixed(1)}% remaining to unlock your proprietary label`}
          </p>
        </div>
        <Crown size={22} color={progress >= 100 ? C.gold : C.muted} />
      </div>

      {/* Segment bar */}
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {Array.from({ length: segments }, (_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.02, duration: 0.3 }}
            style={{
              flex:         1,
              height:       8,
              borderRadius: 3,
              background:   i < filled
                ? `linear-gradient(90deg, ${C.gold} 0%, #c8a850 100%)`
                : "rgba(212,139,0,0.12)",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.68rem", color: C.muted }}>Explorer</span>
        <span style={{ fontSize: "0.68rem", color: progress >= 100 ? C.gold : C.muted, fontWeight: 600 }}>
          {progress.toFixed(1)}% — Grand Master
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IdentityLedger() {
  const { guestProfile }     = useGuestProfile();
  const [, navigate]          = useLocation();
  const [ledger, setLedger]   = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guestProfile?.id) { setLoading(false); return; }
    fetch(`/api/mastery/${guestProfile.id}/ledger`)
      .then(r => r.json())
      .then(data => { setLedger(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [guestProfile?.id]);

  if (!guestProfile) {
    return (
      <div style={{
        minHeight:   "100dvh",
        background:  C.bg,
        display:     "flex",
        alignItems:  "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.4rem", color: C.muted }}>
          No identity found.
        </p>
        <button
          onClick={() => navigate("/craft-hub")}
          style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "8px 20px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
            color: C.goldDim, letterSpacing: "0.1em", textTransform: "uppercase",
          }}
        >
          Go to CraftHub
        </button>
      </div>
    );
  }

  const tier         = guestProfile.masteryTier ?? "explorer";
  const tierLabel    = MASTERY_TIER_LABELS[tier] ?? "Explorer";
  const totalMastery = guestProfile.totalMastery ?? 0;
  const aura         = TIER_AURA[tier] ?? TIER_AURA.explorer!;

  const earnedIds     = new Set(ledger?.badges.map(b => b.badgeId) ?? []);
  const unearnedBadges = (ledger?.allBadgeDefs ?? []).filter(d => !earnedIds.has(d.id));

  return (
    <div style={{
      minHeight:   "100dvh",
      background:  C.bg,
      overflowY:   "auto",
    }}>
      {/* Header */}
      <div style={{
        background:     `radial-gradient(ellipse at 50% 0%, ${aura.glow} 0%, transparent 60%), ${C.bgDark}`,
        padding:        "40px 24px 32px",
        textAlign:      "center",
        position:       "relative",
      }}>
        <button
          onClick={() => navigate(-1 as unknown as string)}
          style={{
            position:      "absolute",
            top: 18, left: 20,
            background:    "none",
            border:        "1px solid rgba(255,255,255,0.1)",
            borderRadius:  8,
            padding:       "6px 12px",
            color:         "rgba(255,255,255,0.35)",
            cursor:        "pointer",
            fontSize:      "0.7rem",
            letterSpacing: "0.08em",
            display:       "flex", alignItems: "center", gap: 5,
          }}
        >
          <RotateCcw size={11} /> Back
        </button>

        {loading ? (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ color: "rgba(212,139,0,0.4)", fontFamily: "'Inter', sans-serif", fontSize: "0.8rem" }}
          >
            Loading ledger…
          </motion.div>
        ) : (
          <>
            <MasteryAura tier={tier} name={guestProfile.firstName} score={totalMastery} />

            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      "0.62rem",
              fontWeight:    600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         `${aura.ring}70`,
              marginBottom:  6,
            }}>
              Connoisseur Resume · {tierLabel}
            </p>

            <h1 style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontSize:      "clamp(2rem, 5vw, 2.8rem)",
              fontWeight:    300,
              color:         "rgba(240,232,212,0.95)",
              letterSpacing: "-0.02em",
              marginBottom:  6,
            }}>
              {guestProfile.firstName} {guestProfile.lastInitial}.
            </h1>

            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize:   "0.75rem",
              color:      "rgba(240,232,212,0.35)",
            }}>
              {guestProfile.sessionCount} sessions · {guestProfile.region ?? "Region unset"}
            </p>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 48px" }}>

        {/* Golden Box tracker */}
        {ledger && <GoldenBoxTracker progress={ledger.goldenBoxProgress} />}

        {/* Earned badges */}
        {(ledger?.badges.length ?? 0) > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      "0.62rem",
              fontWeight:    600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         C.goldDim,
              marginBottom:  14,
            }}>
              Earned Badges
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(ledger?.badges ?? []).map(badge => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background:   "rgba(212,139,0,0.06)",
                    border:       `1px solid rgba(212,139,0,0.3)`,
                    borderRadius: 12,
                    padding:      "14px 16px",
                    display:      "flex",
                    gap:          12,
                    alignItems:   "flex-start",
                  }}
                >
                  <div style={{ color: C.gold, flexShrink: 0, marginTop: 2 }}>
                    {BADGE_ICONS[badge.badgeId] ?? <Award size={18} />}
                  </div>
                  <div>
                    <p style={{
                      fontFamily:    "'Cormorant Garamond', Georgia, serif",
                      fontSize:      "0.95rem",
                      fontWeight:    500,
                      color:         C.text,
                      marginBottom:  3,
                    }}>
                      {badge.label}
                    </p>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize:   "0.68rem",
                      color:      C.muted,
                      lineHeight: 1.45,
                    }}>
                      {badge.desc}
                    </p>
                    <p style={{ fontSize: "0.6rem", color: "rgba(212,139,0,0.35)", marginTop: 5 }}>
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Unearned badges (locked) */}
        {unearnedBadges.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      "0.62rem",
              fontWeight:    600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         "rgba(26,26,27,0.22)",
              marginBottom:  14,
            }}>
              Locked Achievements
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {unearnedBadges.map(def => (
                <div
                  key={def.id}
                  style={{
                    background:   "rgba(26,26,27,0.025)",
                    border:       "1px solid rgba(26,26,27,0.07)",
                    borderRadius: 12,
                    padding:      "14px 16px",
                    display:      "flex",
                    gap:          12,
                    alignItems:   "flex-start",
                    opacity:      0.45,
                  }}
                >
                  <Lock size={16} color={C.muted} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize:   "0.95rem",
                      fontWeight: 500,
                      color:      C.text,
                      marginBottom: 3,
                    }}>
                      {def.label}
                    </p>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize:   "0.68rem",
                      color:      C.muted,
                      lineHeight: 1.45,
                    }}>
                      {def.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flavor history */}
        {guestProfile.flavorHistory && guestProfile.flavorHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      "0.62rem",
              fontWeight:    600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         C.goldDim,
              marginBottom:  14,
            }}>
              Flavor History
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[...guestProfile.flavorHistory]
                .sort((a, b) => b.count - a.count)
                .slice(0, 20)
                .map(f => (
                  <div
                    key={f.tag}
                    style={{
                      background:    `rgba(212,139,0,${Math.min(0.06 + (f.count / 10) * 0.2, 0.3)})`,
                      border:        `1px solid rgba(212,139,0,${Math.min(0.1 + (f.count / 10) * 0.3, 0.5)})`,
                      borderRadius:  20,
                      padding:       "4px 12px",
                      fontFamily:    "'Inter', sans-serif",
                      fontSize:      "0.7rem",
                      color:         C.text,
                      display:       "flex",
                      alignItems:    "center",
                      gap:           5,
                    }}
                  >
                    {f.tag}
                    <span style={{ fontSize: "0.58rem", color: C.goldDim }}>×{f.count}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Session log */}
        {(ledger?.sessions.length ?? 0) > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      "0.62rem",
              fontWeight:    600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         C.goldDim,
              marginBottom:  14,
            }}>
              Session History
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(ledger?.sessions ?? []).map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          12,
                    padding:      "8px 14px",
                    background:   "rgba(26,26,27,0.03)",
                    border:       "1px solid rgba(26,26,27,0.06)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{
                    fontSize:   "0.65rem",
                    color:      C.goldDim,
                    fontWeight: 600,
                    minWidth:   20,
                  }}>
                    #{i + 1}
                  </span>
                  <span style={{
                    fontFamily:    "'Inter', sans-serif",
                    fontSize:      "0.72rem",
                    color:         C.text,
                    textTransform: "capitalize",
                    flex:          1,
                  }}>
                    {s.craftType}Craft Session
                  </span>
                  <span style={{ fontSize: "0.62rem", color: C.muted }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
