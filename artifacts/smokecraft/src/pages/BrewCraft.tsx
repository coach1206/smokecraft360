import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { fetchRecommendations, type RecommendResponse, type ProductResult } from "@/services/api";

/**
 * BrewCraft — beer-led pairing flow.
 *
 * A four-card quick-pick entry point that funnels into the existing
 * recommendation engine (POST /api/recommend with category="beer"). Each
 * style card maps to a flavor / strength / mood preset; the engine returns
 * the best-fit beer plus a cigar pairing via the cross-category rules in
 * api-server engine/pairing.ts.
 *
 * No new backend endpoints, no menus, no mock data — this page is a thin
 * UI funnel on top of the production engine. If a venue has inventory
 * configured, in-stock filtering applies automatically.
 */

interface BrewStyle {
  id:        string;
  title:     string;
  subtitle:  string;
  flavors:   string[];
  strength:  number;
  mood:      string;
  /** Background gradient for the card hero (no remote images). */
  gradient:  string;
  /** Accent color used for borders, glow, and section dividers. */
  accent:    string;
  /** Single iconographic char rendered in the hero — kept text-only so
   *  the page is fully offline / locked-asset friendly. */
  glyph:     string;
}

const STYLES: BrewStyle[] = [
  {
    id:       "light",
    title:    "Light & Easy",
    subtitle: "Crisp · Citrus · Sessionable",
    flavors:  ["light", "crisp", "citrus", "sweet"],
    strength: 1,
    mood:     "relaxed",
    gradient: "linear-gradient(155deg, #f5e8a0 0%, #e6c76a 45%, #8a6a1e 100%)",
    accent:   "#E6C76A",
    glyph:    "◐",
  },
  {
    id:       "amber",
    title:    "Toasted & Balanced",
    subtitle: "Caramel · Oak · Smooth",
    flavors:  ["caramel", "oak", "nutty", "toasted", "sweet"],
    strength: 2,
    mood:     "social",
    gradient: "linear-gradient(155deg, #d49555 0%, #9c5a1e 50%, #4a2810 100%)",
    accent:   "#D49555",
    glyph:    "◑",
  },
  {
    id:       "ipa",
    title:    "Bold & Hoppy",
    subtitle: "Citrus · Spice · Adventurous",
    flavors:  ["citrus", "fruity", "spicy", "floral"],
    strength: 3,
    mood:     "bold",
    gradient: "linear-gradient(155deg, #e8a04a 0%, #b8651a 50%, #5a2c08 100%)",
    accent:   "#E8A04A",
    glyph:    "◒",
  },
  {
    id:       "dark",
    title:    "Dark & Heavy",
    subtitle: "Roasted · Cocoa · Deep",
    flavors:  ["dark-chocolate", "cocoa", "smoky", "cream"],
    strength: 4,
    mood:     "focused",
    gradient: "linear-gradient(155deg, #3a2412 0%, #1a0d06 60%, #050202 100%)",
    accent:   "#A06b3a",
    glyph:    "●",
  },
];

interface PairingResult {
  style:    BrewStyle;
  beer:     ProductResult | null;
  cigar:    ProductResult | null;
}

export default function BrewCraft() {
  const [, navigate]               = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<PairingResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  async function handleSelect(style: BrewStyle) {
    if (loading) return;
    setSelectedId(style.id);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp: RecommendResponse = await fetchRecommendations({
        category:          "beer",
        flavorPreferences: style.flavors,
        strength:          style.strength,
        mood:              style.mood,
      });
      setResult({
        style,
        beer:  resp.recommendations[0] ?? null,
        cigar: resp.pairings[0]        ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pairing");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSelectedId(null);
    setResult(null);
    setError(null);
  }

  return (
    <div
      data-testid="brewcraft-page"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, rgba(60,30,10,0.4), transparent 60%)," +
          "linear-gradient(135deg, #0a0604 0%, #050202 100%)",
        color: "#F5EBDD",
        padding: "5vh 4vw",
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          maxWidth: 1400, margin: "0 auto 4vh",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => navigate("/")}
            data-testid="brewcraft-back"
            style={{
              background: "transparent",
              color: "rgba(245,235,221,0.6)",
              border: "1px solid rgba(212,175,55,0.25)",
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1
            style={{
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize: "clamp(28px, 3vw, 44px)",
              margin: 0, fontWeight: 600,
              color: "#F5EBDD",
              letterSpacing: "0.02em",
            }}
          >
            BrewCraft
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "rgba(212,175,55,0.7)",
            }}
          >
            Pick your beer · We'll pair the cigar
          </p>
        </div>
      </motion.header>

      {/* Cards grid */}
      <div
        style={{
          maxWidth: 1400, margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
        }}
      >
        {STYLES.map((style, i) => {
          const isSel       = selectedId === style.id;
          const isOther     = selectedId !== null && !isSel;
          return (
            <motion.button
              key={style.id}
              type="button"
              data-testid={`brew-card-${style.id}`}
              onClick={() => handleSelect(style)}
              disabled={loading}
              initial={{ opacity: 0, y: 24 }}
              animate={{
                opacity: isOther ? 0.35 : 1,
                y: 0,
                scale: isSel ? 1.03 : 1,
              }}
              whileHover={loading ? undefined : { scale: 1.04, y: -4 }}
              whileTap={loading ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
              style={{
                position: "relative", overflow: "hidden",
                minHeight: 320, borderRadius: 22,
                border: `1px solid ${style.accent}55`,
                cursor: loading ? "default" : "pointer",
                padding: 0, color: "inherit",
                background: style.gradient,
                boxShadow: isSel
                  ? `0 0 0 2px ${style.accent}, 0 30px 80px ${style.accent}55`
                  : "0 18px 50px rgba(0,0,0,0.55)",
                textAlign: "left",
              }}
            >
              {/* Dark vignette overlay so text reads cleanly on any tone */}
              <div
                style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)",
                  pointerEvents: "none",
                }}
              />
              {/* Big glyph in the corner */}
              <div
                style={{
                  position: "absolute", top: 18, right: 22,
                  fontSize: 64, lineHeight: 1,
                  color: "rgba(255,255,255,0.18)",
                }}
                aria-hidden
              >
                {style.glyph}
              </div>

              {/* Content */}
              <div
                style={{
                  position: "relative", height: "100%",
                  display: "flex", flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "28px 26px",
                  minHeight: 320,
                }}
              >
                <div
                  style={{
                    width: 32, height: 2, marginBottom: 14,
                    background: `linear-gradient(90deg, ${style.accent}, transparent)`,
                  }}
                />
                <h2
                  style={{
                    fontFamily: "var(--app-font-serif, Georgia, serif)",
                    fontSize: "clamp(20px, 1.8vw, 26px)",
                    fontWeight: 600, margin: 0,
                    color: "#F5EBDD",
                  }}
                >
                  {style.title}
                </h2>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "rgba(245,235,221,0.78)",
                  }}
                >
                  {style.subtitle}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Status / result */}
      <div style={{ maxWidth: 1000, margin: "5vh auto 0" }}>
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              data-testid="brewcraft-loading"
              style={{
                textAlign: "center",
                color: "rgba(212,175,55,0.7)",
                fontSize: 12,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              Crafting your pairing…
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              data-testid="brewcraft-error"
              style={{
                textAlign: "center",
                color: "#E5818F",
                fontSize: 14,
              }}
            >
              {error}
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              data-testid="brewcraft-result"
              style={{
                background: "rgba(20,12,4,0.6)",
                border: `1px solid ${result.style.accent}33`,
                borderRadius: 20,
                padding: "28px 32px",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div
                  style={{
                    width: 28, height: 2,
                    background: `linear-gradient(90deg, ${result.style.accent}, transparent)`,
                  }}
                />
                <h3
                  style={{
                    margin: 0,
                    fontSize: 11,
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    color: result.style.accent,
                  }}
                >
                  {result.style.title} Pairing
                </h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 24,
                }}
              >
                {/* Beer */}
                <div data-testid="brewcraft-beer">
                  <p
                    style={{
                      margin: "0 0 6px", fontSize: 10,
                      letterSpacing: "0.28em", textTransform: "uppercase",
                      color: "rgba(245,235,221,0.55)",
                    }}
                  >
                    The Beer
                  </p>
                  <h4
                    style={{
                      fontFamily: "var(--app-font-serif, Georgia, serif)",
                      margin: 0, fontSize: 22, fontWeight: 600,
                      color: "#F5EBDD",
                    }}
                  >
                    {result.beer?.name ?? "No match found"}
                  </h4>
                  {result.beer && (
                    <p
                      style={{
                        margin: "8px 0 0", fontSize: 13,
                        color: "rgba(245,235,221,0.65)",
                        lineHeight: 1.5,
                      }}
                    >
                      {result.beer.flavorNotes.join(" · ")}
                    </p>
                  )}
                </div>

                {/* Cigar pairing */}
                <div data-testid="brewcraft-cigar">
                  <p
                    style={{
                      margin: "0 0 6px", fontSize: 10,
                      letterSpacing: "0.28em", textTransform: "uppercase",
                      color: "rgba(245,235,221,0.55)",
                    }}
                  >
                    Paired Cigar
                  </p>
                  <h4
                    style={{
                      fontFamily: "var(--app-font-serif, Georgia, serif)",
                      margin: 0, fontSize: 22, fontWeight: 600,
                      color: "#F5EBDD",
                    }}
                  >
                    {result.cigar?.name ?? "—"}
                  </h4>
                  {result.cigar && (
                    <p
                      style={{
                        margin: "8px 0 0", fontSize: 13,
                        color: "rgba(245,235,221,0.65)",
                        lineHeight: 1.5,
                      }}
                    >
                      {result.cigar.flavorNotes.join(" · ")}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={reset}
                  data-testid="brewcraft-try-another"
                  style={{
                    background: "transparent",
                    color: "rgba(245,235,221,0.8)",
                    border: "1px solid rgba(212,175,55,0.4)",
                    padding: "10px 22px",
                    borderRadius: 999,
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Try another style
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/smokecraft")}
                  data-testid="brewcraft-full-experience"
                  style={{
                    background: result.style.accent,
                    color: "#0a0604",
                    border: "none",
                    padding: "10px 22px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Full SmokeCraft Experience →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
