import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  fetchRecommendations,
  trackPreferences,
  type RecommendResponse, type ProductResult,
} from "@/services/api";
import ExperienceFrame from "@/components/ExperienceFrame";
import VoicePanel from "@/components/AIPanel/VoicePanel";
import SuggestedMenu from "@/components/AIPanel/SuggestedMenu";
import loungeBg from "@assets/locked_cards/experience_pourcraft.png";

/**
 * PourCraft — whisky / spirit-led pairing flow.
 *
 * Mirrors BrewCraft's 3-column kiosk layout (left step nav, center cards,
 * right AI voice panel) but pivots the engine on category="alcohol".
 * Four whisky styles map to flavor/strength/mood presets; the engine
 * returns the matching pour plus a cigar pairing via cross-category rules.
 *
 * Reuses every shared primitive so adding GrillCraft / WineCraft later
 * is a 4-card data file, not a new layout: ExperienceFrame, VoicePanel,
 * SuggestedMenu, fetchRecommendations.
 */

interface PourStyle {
  id:        string;
  title:     string;
  subtitle:  string;
  flavors:   string[];
  strength:  number;
  mood:      string;
  gradient:  string;
  accent:    string;
  glyph:     string;
}

const STYLES: PourStyle[] = [
  {
    id:       "smooth",
    title:    "Smooth & Mellow",
    subtitle: "Honey · Vanilla · Easy",
    flavors:  ["sweet", "vanilla", "honey", "smooth"],
    strength: 2,
    mood:     "relaxed",
    gradient: "linear-gradient(155deg, #f0d68a 0%, #c89548 50%, #5a3818 100%)",
    accent:   "#E8C870",
    glyph:    "◐",
  },
  {
    id:       "spicy",
    title:    "Spicy & Warm",
    subtitle: "Rye · Pepper · Caramel",
    flavors:  ["spicy", "caramel", "oak", "warm"],
    strength: 3,
    mood:     "social",
    gradient: "linear-gradient(155deg, #d88848 0%, #a04818 50%, #4a2008 100%)",
    accent:   "#E89858",
    glyph:    "◑",
  },
  {
    id:       "smoky",
    title:    "Smoky & Bold",
    subtitle: "Peat · Earth · Adventurous",
    flavors:  ["smoky", "earthy", "peaty", "bold"],
    strength: 4,
    mood:     "bold",
    gradient: "linear-gradient(155deg, #6a4828 0%, #3a2410 50%, #100804 100%)",
    accent:   "#A08858",
    glyph:    "◒",
  },
  {
    id:       "rich",
    title:    "Rich & Sweet",
    subtitle: "Cognac · Dried fruit · Deep",
    flavors:  ["sweet", "rich", "fruity", "dark-chocolate"],
    strength: 4,
    mood:     "focused",
    gradient: "linear-gradient(155deg, #6a2818 0%, #3a1008 60%, #100404 100%)",
    accent:   "#C8704A",
    glyph:    "●",
  },
];

interface PairingResult {
  style:   PourStyle;
  spirit:  ProductResult | null;
  cigar:   ProductResult | null;
  /** Pairing tags passed to the menu suggestion endpoint. */
  tags:    string[];
}

export default function PourCraft() {
  const [, navigate]                = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<PairingResult | null>(null);
  const [resp, setResp]             = useState<RecommendResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

  async function handleSelect(style: PourStyle) {
    if (loading) return;
    setSelectedId(style.id);
    setLoading(true);
    setError(null);
    setResult(null);
    setResp(null);

    /* Snapshot the preference for trend analytics — fire-and-forget so
     * a slow /api/preferences call never blocks the pairing. */
    trackPreferences({
      category:          "alcohol",
      flavorPreferences: style.flavors,
      strength:          style.strength,
      mood:              style.mood,
    });

    try {
      const r: RecommendResponse = await fetchRecommendations({
        category:          "alcohol",
        flavorPreferences: style.flavors,
        strength:          style.strength,
        mood:              style.mood,
      });
      setResp(r);
      const top = r.recommendations[0] ?? null;
      const cig = r.pairings[0]        ?? null;
      const tags = r.commentary?.pairingTags
                ?? Array.from(new Set([...(top?.flavorNotes ?? []), ...(top?.pairingTags ?? [])]));
      setResult({ style, spirit: top, cigar: cig, tags });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pairing");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSelectedId(null);
    setResult(null);
    setResp(null);
    setError(null);
  }

  // Re-render trigger after style change clears resp; nothing else needed
  useEffect(() => undefined, []);

  return (
    <div data-testid="pourcraft-page" style={{ position: "relative", minHeight: "100vh", color: "#FFFFFF" }}>
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0,
          backgroundImage: `url(${loungeBg})`,
          backgroundSize:  "cover",
          backgroundPosition: "center",
          filter: "saturate(0.85)",
          zIndex: -2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(80,30,10,0.35), transparent 55%)," +
            "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)",
          zIndex: -1,
        }}
      />

      <header
        style={{
          maxWidth: 1640, margin: "0 auto",
          padding:  "28px 32px 16px",
          display:  "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Inline back button removed — replaced by GlobalBackButton mounted
            once in App.tsx (history-based navigation). */}
        <div />
        <div style={{ textAlign: "right", textShadow: "0 2px 8px rgba(0,0,0,0.85)" }}>
          <h1
            style={{
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize:   "clamp(28px, 3.2vw, 44px)",
              margin:     0, fontWeight: 600,
              color:      "#FFFFFF",
              letterSpacing: "0.02em",
            }}
          >
            PourCraft
          </h1>
          <p
            style={{
              margin: "4px 0 0", fontSize: 12,
              letterSpacing: "0.32em", textTransform: "uppercase",
              color: "#D4AF37", fontWeight: 600,
            }}
          >
            Pick your pour · We'll pair the cigar
          </p>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1640, margin: "0 auto",
          padding: "12px 32px 60px",
          display: "grid", gap: 24,
          gridTemplateColumns: "260px 1fr 360px",
        }}
      >
        {/* LEFT — step nav */}
        <aside style={{ opacity: 0.78 }}>
          <ExperienceFrame padding="22px 20px" testId="pourcraft-stepnav">
            <p
              style={{
                margin: "0 0 16px", fontSize: 10,
                letterSpacing: "0.3em", textTransform: "uppercase",
                color: "#D4AF37", fontWeight: 600,
              }}
            >
              Experience
            </p>
            <StepRow num={1} label="Pick a style" active={!result} done={!!result} />
            <StepRow num={2} label="See the pair" active={!!result}              done={false} />
            <StepRow num={3} label="Order"        active={false}                 done={false} />
          </ExperienceFrame>
        </aside>

        {/* CENTER — cards + result */}
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
                  data-testid={`pour-card-${style.id}`}
                  onClick={() => handleSelect(style)}
                  disabled={loading}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: isOther ? 0.4 : 1, y: 0, scale: isSel ? 1.03 : 1 }}
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
                      fontSize: 56, lineHeight: 1, color: "rgba(255,255,255,0.2)",
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
                      padding: "24px 22px", minHeight: 280,
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
                        fontSize: 22, fontWeight: 600, margin: 0,
                        color: "#FFFFFF",
                        textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                      }}
                    >
                      {style.title}
                    </h2>
                    <p
                      style={{
                        margin: "8px 0 0", fontSize: 11,
                        letterSpacing: "0.24em", textTransform: "uppercase",
                        color: "#E5E5E5", fontWeight: 500,
                      }}
                    >
                      {style.subtitle}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div style={{ marginTop: 28 }}>
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  data-testid="pourcraft-loading"
                  style={{
                    textAlign: "center", color: "#D4AF37",
                    fontSize: 12, letterSpacing: "0.3em",
                    textTransform: "uppercase", padding: "20px 0",
                  }}
                >
                  Pouring your pairing…
                </motion.div>
              )}

              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  data-testid="pourcraft-error"
                  style={{ textAlign: "center", color: "#E5818F", fontSize: 14, padding: "20px 0" }}
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
                  data-testid="pourcraft-result"
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
                      <ResultBlock label="The Pour"     product={result.spirit} testId="pourcraft-spirit" />
                      <ResultBlock label="Paired Cigar" product={result.cigar}  testId="pourcraft-cigar"  />
                    </div>

                    <SuggestedMenu tags={result.tags} testId="pourcraft-menu" />

                    <div style={{ marginTop: 20 }}>
                      <button
                        type="button"
                        data-testid="pourcraft-reset"
                        onClick={reset}
                        style={{
                          background: "transparent",
                          color:      "#D4AF37",
                          border:     "1px solid rgba(212,175,55,0.4)",
                          padding:    "10px 22px",
                          borderRadius: 999,
                          fontSize:   11,
                          letterSpacing: "0.28em",
                          textTransform: "uppercase",
                          cursor:     "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Try another
                      </button>
                    </div>
                  </ExperienceFrame>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* RIGHT — AI voice panel */}
        <aside>
          <VoicePanel
            commentary={resp?.commentary}
            accent="rgba(232,152,88,0.55)"
            testId="pourcraft-voice"
          />
        </aside>
      </div>
    </div>
  );
}

function StepRow({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  const color = done ? "#7A9A6A" : active ? "#D4AF37" : "#6A6258";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span
        style={{
          width: 24, height: 24, borderRadius: "50%",
          border: `1px solid ${color}`,
          color, fontSize: 11, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {done ? "✓" : num}
      </span>
      <span style={{ fontSize: 13, color, fontWeight: active ? 600 : 500 }}>{label}</span>
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
          letterSpacing: "0.32em", textTransform: "uppercase",
          color: "#D4AF37", fontWeight: 600,
        }}
      >
        {label}
      </p>
      <h4
        style={{
          fontFamily: "var(--app-font-serif, Georgia, serif)",
          margin: "0 0 6px", fontSize: 22, fontWeight: 600,
          color: "#FFFFFF",
        }}
      >
        {product?.name ?? "—"}
      </h4>
      <p style={{ margin: 0, fontSize: 12, color: "#C8C0B0", lineHeight: 1.5 }}>
        {product?.flavorNotes.join(" · ") ?? "No match available"}
      </p>
    </div>
  );
}
