import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { fetchRecommendations, type RecommendResponse, type ProductResult } from "@/services/api";
import ExperienceFrame from "@/components/ExperienceFrame";
import loungeBg from "@assets/locked_cards/experience_smokecraft.png";

/**
 * BrewCraft — beer-led pairing flow.
 *
 * 3-column kiosk layout (cigar-lounge background, dark overlay):
 *   - Left  (260px): step indicator (Pick → Pair → Elevate)
 *   - Center (flex): four beer style cards
 *   - Right (360px): mode-synced context panel (BrewCraft / PourCraft)
 *
 * Hooks the existing recommendation engine via POST /api/recommend
 * (category="beer"). Each style card maps to a flavor / strength / mood
 * preset; engine returns top beer + cigar pairing via cross-category
 * rules in api-server engine/pairing.ts.
 *
 * After a beer is picked, a PourCraft upsell unlocks on a 3-second timer
 * (not instant) — second engine call with category="alcohol" using the
 * same flavor / strength preset, so the upsell respects venue inventory.
 *
 * No new backend endpoints, no menus, no mock data — thin UI funnel on
 * top of the production engine.
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
  /** Single iconographic char rendered in the hero — text-only so the
   *  page is fully offline / locked-asset friendly. */
  glyph:     string;
  /** Strength label rendered in the right context panel. */
  strengthLabel: string;
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
    strengthLabel: "Easy",
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
    strengthLabel: "Medium",
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
    strengthLabel: "Bold",
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
    strengthLabel: "Heavy",
  },
];

interface PairingResult {
  style:    BrewStyle;
  beer:     ProductResult | null;
  cigar:    ProductResult | null;
}

const UPSELL_DELAY_MS = 3000;

export default function BrewCraft() {
  const [, navigate]                = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<PairingResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // PourCraft upsell — timed reveal, second engine call
  const [upsell, setUpsell]              = useState<ProductResult | null>(null);
  const [upsellLoading, setUpsellLoading] = useState(false);
  const [upsellVisible, setUpsellVisible] = useState(false);
  const upsellTimer                       = useRef<number | null>(null);

  useEffect(() => () => {
    if (upsellTimer.current) window.clearTimeout(upsellTimer.current);
  }, []);

  // Tracks the in-flight upsell fetch so a stale one (user picked A, then B
  // before A's upsell resolved) cannot overwrite the current selection.
  const upsellRequestId = useRef(0);

  async function loadUpsell(style: BrewStyle) {
    const reqId = ++upsellRequestId.current;
    setUpsellLoading(true);
    try {
      const resp: RecommendResponse = await fetchRecommendations({
        category:          "alcohol",
        flavorPreferences: style.flavors,
        // bump strength one notch for the "elevate" framing
        strength:          Math.min(style.strength + 1, 5),
        mood:              style.mood,
      });
      if (reqId !== upsellRequestId.current) return; // stale, drop
      setUpsell(resp.recommendations[0] ?? null);
    } catch {
      if (reqId !== upsellRequestId.current) return; // stale, drop
      // Upsell is non-critical — hide it rather than leave a stuck spinner.
      setUpsell(null);
      setUpsellVisible(false);
      if (upsellTimer.current) window.clearTimeout(upsellTimer.current);
    } finally {
      if (reqId === upsellRequestId.current) setUpsellLoading(false);
    }
  }

  async function handleSelect(style: BrewStyle) {
    if (loading) return;
    setSelectedId(style.id);
    setLoading(true);
    setError(null);
    setResult(null);
    setUpsell(null);
    setUpsellVisible(false);
    if (upsellTimer.current) window.clearTimeout(upsellTimer.current);

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

      // Kick off the PourCraft upsell pre-fetch immediately, but only
      // reveal the panel after the user has had a moment to absorb the
      // primary pairing. Per brief: timed, not instant.
      void loadUpsell(style);
      upsellTimer.current = window.setTimeout(
        () => setUpsellVisible(true),
        UPSELL_DELAY_MS,
      );
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
    setUpsell(null);
    setUpsellVisible(false);
    if (upsellTimer.current) window.clearTimeout(upsellTimer.current);
  }

  // Right-panel mode mirrors the engine response category. Beer = BrewCraft,
  // anything else (the upsell or future variants) = PourCraft.
  const mode: "beer" | "spirit" =
    upsell && upsellVisible ? "spirit" : "beer";

  const currentStyle = result?.style ?? null;

  return (
    <div data-testid="brewcraft-page" style={{ position: "relative", minHeight: "100vh", color: "#FFFFFF" }}>
      {/* Lounge background — fixed so it doesn't scroll under the kiosk content */}
      <div
        aria-hidden
        style={{
          position:        "fixed",
          inset:           0,
          backgroundImage: `url(${loungeBg})`,
          backgroundSize:  "cover",
          backgroundPosition: "center",
          filter:          "saturate(0.85)",
          zIndex:          -2,
        }}
      />
      <div
        aria-hidden
        style={{
          position:   "fixed",
          inset:      0,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(60,30,10,0.35), transparent 55%)," +
            "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.88) 100%)",
          zIndex:     -1,
        }}
      />

      {/* Header bar */}
      <header
        style={{
          maxWidth: 1640, margin: "0 auto",
          padding: "28px 32px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          data-testid="brewcraft-back"
          style={{
            background:    "rgba(0,0,0,0.55)",
            color:         "#E5E5E5",
            border:        "1px solid rgba(212,175,55,0.3)",
            padding:       "10px 18px",
            borderRadius:  999,
            fontSize:      12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor:        "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          ← Back
        </button>
        <div style={{ textAlign: "right", textShadow: "0 2px 8px rgba(0,0,0,0.85)" }}>
          <h1
            style={{
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize:   "clamp(28px, 3.2vw, 44px)",
              margin:     0,
              fontWeight: 600,
              color:      "#FFFFFF",
              letterSpacing: "0.02em",
            }}
          >
            BrewCraft
          </h1>
          <p
            style={{
              margin:        "4px 0 0",
              fontSize:      12,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color:         "#D4AF37",
              fontWeight:    600,
            }}
          >
            Pick your beer · We'll pair the cigar
          </p>
        </div>
      </header>

      {/* 3-column grid — collapses to single column on narrow screens */}
      <div
        style={{
          maxWidth: 1640, margin: "0 auto",
          padding: "12px 32px 60px",
          display: "grid",
          gap: 24,
          gridTemplateColumns: "260px 1fr 360px",
        }}
        className="brewcraft-grid"
      >
        {/* ---------------- LEFT: step nav (dimmed) ---------------- */}
        <aside style={{ opacity: 0.78 }}>
          <ExperienceFrame padding="22px 20px" testId="brewcraft-stepnav">
            <p
              style={{
                margin: "0 0 16px", fontSize: 10,
                letterSpacing: "0.3em", textTransform: "uppercase",
                color: "#D4AF37", fontWeight: 600,
              }}
            >
              Experience
            </p>
            <StepRow num={1} label="Pick a style"   active={!result} done={!!result} />
            <StepRow num={2} label="See the pair"   active={!!result && !upsellVisible} done={upsellVisible} />
            <StepRow num={3} label="Elevate it"     active={upsellVisible}              done={false} />
          </ExperienceFrame>
        </aside>

        {/* ---------------- CENTER: BrewCraft cards (brightest) ---------------- */}
        <main>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            {STYLES.map((style, i) => {
              const isSel   = selectedId === style.id;
              const isOther = selectedId !== null && !isSel;
              return (
                <motion.button
                  key={style.id}
                  type="button"
                  data-testid={`brew-card-${style.id}`}
                  onClick={() => handleSelect(style)}
                  disabled={loading}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{
                    opacity: isOther ? 0.4 : 1,
                    y: 0,
                    scale: isSel ? 1.03 : 1,
                  }}
                  whileHover={loading ? undefined : { scale: 1.04, y: -4 }}
                  whileTap={loading ? undefined : { scale: 0.97 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                  style={{
                    position: "relative", overflow: "hidden",
                    minHeight: 280, borderRadius: 22,
                    border: `1px solid ${style.accent}66`,
                    cursor: loading ? "default" : "pointer",
                    padding: 0, color: "inherit",
                    background: style.gradient,
                    boxShadow: isSel
                      ? `0 0 0 2px ${style.accent}, 0 30px 80px ${style.accent}55`
                      : "0 18px 50px rgba(0,0,0,0.55)",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.7) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute", top: 16, right: 20,
                      fontSize: 56, lineHeight: 1,
                      color: "rgba(255,255,255,0.2)",
                    }}
                    aria-hidden
                  >
                    {style.glyph}
                  </div>
                  <div
                    style={{
                      position: "relative", height: "100%",
                      display: "flex", flexDirection: "column",
                      justifyContent: "flex-end",
                      padding: "24px 22px",
                      minHeight: 280,
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
                        fontSize: 22,
                        fontWeight: 600, margin: 0,
                        color: "#FFFFFF",
                        textShadow: "0 2px 8px rgba(0,0,0,0.7)",
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
                        color: "#E5E5E5",
                        fontWeight: 500,
                      }}
                    >
                      {style.subtitle}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Result panel sits below the cards */}
          <div style={{ marginTop: 28 }}>
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  data-testid="brewcraft-loading"
                  style={{
                    textAlign: "center",
                    color: "#D4AF37",
                    fontSize: 12,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    padding: "20px 0",
                  }}
                >
                  Crafting your pairing…
                </motion.div>
              )}

              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  data-testid="brewcraft-error"
                  style={{
                    textAlign: "center",
                    color: "#E5818F",
                    fontSize: 14,
                    padding: "20px 0",
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
                >
                  <ExperienceFrame accent={`${result.style.accent}55`} padding="26px 30px">
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                      <div
                        style={{
                          width: 28, height: 2,
                          background: `linear-gradient(90deg, ${result.style.accent}, transparent)`,
                        }}
                      />
                      <h3
                        style={{
                          margin: 0, fontSize: 11,
                          letterSpacing: "0.32em", textTransform: "uppercase",
                          color: result.style.accent, fontWeight: 600,
                        }}
                      >
                        {result.style.title} Pairing
                      </h3>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: 24,
                      }}
                    >
                      <ResultBlock label="The Beer"     product={result.beer}  testId="brewcraft-beer"  />
                      <ResultBlock label="Paired Cigar" product={result.cigar} testId="brewcraft-cigar" />
                    </div>

                    {/* Timed PourCraft upsell */}
                    <AnimatePresence>
                      {upsellVisible && (
                        <motion.div
                          key="upsell"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          data-testid="brewcraft-upsell"
                          style={{
                            marginTop: 24, paddingTop: 20,
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 4px", fontSize: 10,
                              letterSpacing: "0.32em", textTransform: "uppercase",
                              color: "#D4AF37", fontWeight: 600,
                            }}
                          >
                            Take it further
                          </p>
                          <h3
                            style={{
                              fontFamily: "var(--app-font-serif, Georgia, serif)",
                              margin: "0 0 4px", fontSize: 22,
                              fontWeight: 600, color: "#FFFFFF",
                            }}
                          >
                            {upsellLoading || !upsell
                              ? "Curating a premium pour…"
                              : `Add ${upsell.name}`}
                          </h3>
                          <p
                            style={{
                              margin: "0 0 14px", fontSize: 13,
                              color: "#E5E5E5", lineHeight: 1.5,
                            }}
                          >
                            {upsell
                              ? upsell.flavorNotes.join(" · ")
                              : "A premium spirit to elevate this pairing."}
                          </p>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              data-testid="brewcraft-upsell-add"
                              disabled={!upsell}
                              onClick={() => navigate("/pourcraft")}
                              style={{
                                background: upsell ? "#D4AF37" : "rgba(212,175,55,0.3)",
                                color: "#0a0604",
                                border: "none",
                                padding: "10px 22px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.24em",
                                textTransform: "uppercase",
                                cursor: upsell ? "pointer" : "default",
                              }}
                            >
                              Add Whiskey
                            </button>
                            <button
                              type="button"
                              data-testid="brewcraft-upsell-skip"
                              onClick={() => setUpsellVisible(false)}
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                color: "#E5E5E5",
                                border: "1px solid rgba(255,255,255,0.12)",
                                padding: "10px 22px",
                                borderRadius: 999,
                                fontSize: 11,
                                letterSpacing: "0.24em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                              }}
                            >
                              Maybe later
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={reset}
                        data-testid="brewcraft-try-another"
                        style={{
                          background: "transparent",
                          color: "#E5E5E5",
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
                          fontWeight: 700,
                          letterSpacing: "0.24em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Full SmokeCraft Experience →
                      </button>
                    </div>
                  </ExperienceFrame>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* ---------------- RIGHT: mode-synced context panel ---------------- */}
        <aside>
          <ExperienceFrame padding="22px 22px" testId="brewcraft-context">
            <p
              style={{
                margin: "0 0 4px", fontSize: 10,
                letterSpacing: "0.3em", textTransform: "uppercase",
                color: "#E5E5E5", fontWeight: 500,
              }}
            >
              Mode
            </p>
            <h3
              data-testid="brewcraft-mode-label"
              style={{
                margin: "0 0 18px",
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                fontSize: 24, fontWeight: 600,
                color: "#D4AF37",
              }}
            >
              {mode === "beer" ? "BrewCraft" : "PourCraft"}
            </h3>

            <ContextRow label="Strength" value={currentStyle?.strengthLabel ?? "—"} />
            <ContextRow label="Mood"     value={currentStyle?.mood ? cap(currentStyle.mood) : "—"} />
            <ContextRow
              label="Pairing"
              value={
                result
                  ? (result.cigar?.name ?? "No pairing")
                  : "Pick a beer →"
              }
            />

            <div
              style={{
                marginTop: 20, paddingTop: 16,
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                style={{
                  margin: 0, fontSize: 12,
                  color: "#E5E5E5", lineHeight: 1.6,
                }}
              >
                {mode === "beer"
                  ? "Cards on the left match a beer style to its ideal cigar via our pairing engine."
                  : "We've curated a premium pour to elevate the pairing — add it to the round."}
              </p>
            </div>
          </ExperienceFrame>
        </aside>
      </div>

      {/* Single-column collapse for narrow screens */}
      <style>{`
        @media (max-width: 1100px) {
          .brewcraft-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* --------------------------------------------------------------- */
/*                          subcomponents                           */
/* --------------------------------------------------------------- */

function StepRow({
  num, label, active, done,
}: { num: number; label: string; active: boolean; done: boolean }) {
  const color = done ? "#D4AF37" : active ? "#FFFFFF" : "#9a9a9a";
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 0",
        opacity: active || done ? 1 : 0.6,
      }}
    >
      <span
        style={{
          width: 24, height: 24, borderRadius: 999,
          background: done ? "#D4AF37" : "transparent",
          border: `1px solid ${done ? "#D4AF37" : "rgba(212,175,55,0.45)"}`,
          color: done ? "#0a0604" : color,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {done ? "✓" : num}
      </span>
      <span
        style={{
          fontSize: 13,
          color,
          fontWeight: active ? 600 : 400,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          margin: "0 0 2px", fontSize: 10,
          letterSpacing: "0.28em", textTransform: "uppercase",
          color: "#E5E5E5", fontWeight: 500, opacity: 0.7,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0, fontSize: 15,
          color: "#FFFFFF", fontWeight: 500, lineHeight: 1.4,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ResultBlock({
  label, product, testId,
}: { label: string; product: ProductResult | null; testId: string }) {
  return (
    <div data-testid={testId}>
      <p
        style={{
          margin: "0 0 6px", fontSize: 10,
          letterSpacing: "0.28em", textTransform: "uppercase",
          color: "#E5E5E5", opacity: 0.75, fontWeight: 500,
        }}
      >
        {label}
      </p>
      <h4
        style={{
          fontFamily: "var(--app-font-serif, Georgia, serif)",
          margin: 0, fontSize: 22, fontWeight: 600,
          color: "#FFFFFF",
        }}
      >
        {product?.name ?? "No match found"}
      </h4>
      {product && (
        <p
          style={{
            margin: "8px 0 0", fontSize: 13,
            color: "#E5E5E5", lineHeight: 1.5, opacity: 0.85,
          }}
        >
          {product.flavorNotes.join(" · ")}
        </p>
      )}
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
