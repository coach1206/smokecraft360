import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchRecommendations,
  trackPreferences,
  type RecommendResponse, type ProductResult,
} from "@/services/api";
import ExperienceFrame from "@/components/ExperienceFrame";
import VoicePanel from "@/components/AIPanel/VoicePanel";
import SuggestedMenu from "@/components/AIPanel/SuggestedMenu";
import vapeBg from "@assets/locked_cards/experience_vapecraft.png";
/* Per-style vape hero photos — mirrors PourCraft / BrewCraft per-style
 * imagery. Live in `generated_images/` so the locked-photography set
 * stays untouched; swap to a real photograph by replacing the file at
 * the same path. */
import vapeFruitImg   from "@assets/generated_images/vape_fruit.png";
import vapeDessertImg from "@assets/generated_images/vape_dessert.png";
import vapeMentholImg from "@assets/generated_images/vape_menthol.png";
import vapeTobaccoImg from "@assets/generated_images/vape_tobacco.png";

/**
 * VapeCraft — vapor / e-liquid pairing flow.
 *
 * Mirrors PourCraft's 3-column kiosk layout (left step nav, center cards,
 * right AI voice panel) and reuses every shared primitive: ExperienceFrame,
 * VoicePanel, SuggestedMenu, fetchRecommendations.
 *
 * Engine wiring uses category="vape". The product table currently has no
 * vape rows, so the engine returns an empty pairing — the result block
 * degrades gracefully ("No match available") exactly like BrewCraft did
 * before beer inventory was seeded. Once a venue stocks vape SKUs with
 * matching flavorNotes / strength, every card lights up automatically.
 *
 * Cigar pairing is intentionally suppressed for vape — the cross-category
 * pour↔cigar rules in engine/pairing.ts don't define vape↔cigar bridges
 * yet, and surfacing an irrelevant cigar as the "pair" would mislead. The
 * single-product result block reads cleaner than a forced two-column
 * spirit/cigar layout for a category that's still being filled in.
 */

interface VapeStyle {
  id:        string;
  title:     string;
  subtitle: string;
  flavors:  string[];
  strength: number;
  mood:     string;
  gradient: string;
  accent:   string;
  glyph:    string;
  /** Per-style vape hero photo, bundled at build time via Vite. */
  image:    string;
}

const STYLES: VapeStyle[] = [
  {
    id:       "fruit",
    title:    "Fruit & Bright",
    subtitle: "Berry · Citrus · Tropical",
    flavors:  ["fruity", "sweet", "citrus", "bright"],
    strength: 1,
    mood:     "social",
    gradient: "linear-gradient(155deg, #ff7ab8 0%, #c0408c 50%, #3a0a30 100%)",
    accent:   "#FF7AB8",
    glyph:    "◐",
    image:    vapeFruitImg,
  },
  {
    id:       "dessert",
    title:    "Dessert & Sweet",
    subtitle: "Vanilla · Custard · Caramel",
    flavors:  ["sweet", "vanilla", "caramel", "creamy"],
    strength: 2,
    mood:     "relaxed",
    gradient: "linear-gradient(155deg, #f0d68a 0%, #c89548 50%, #5a3818 100%)",
    accent:   "#E8C870",
    glyph:    "◑",
    image:    vapeDessertImg,
  },
  {
    id:       "menthol",
    title:    "Menthol & Cool",
    subtitle: "Mint · Ice · Eucalyptus",
    flavors:  ["mint", "cool", "fresh", "menthol"],
    strength: 2,
    mood:     "focused",
    gradient: "linear-gradient(155deg, #8de8ff 0%, #2c8ab8 50%, #08283a 100%)",
    accent:   "#8DE8FF",
    glyph:    "◒",
    image:    vapeMentholImg,
  },
  {
    id:       "tobacco",
    title:    "Tobacco & Bold",
    subtitle: "Tobacco · Smoky · Earthy",
    flavors:  ["smoky", "earthy", "tobacco", "bold"],
    strength: 4,
    mood:     "bold",
    gradient: "linear-gradient(155deg, #6a4828 0%, #3a2410 50%, #100804 100%)",
    accent:   "#C8A078",
    glyph:    "●",
    image:    vapeTobaccoImg,
  },
];

interface VapeResult {
  style:   VapeStyle;
  vape:    ProductResult | null;
  /** Pairing tags passed to the menu suggestion endpoint. */
  tags:    string[];
}

export default function VapeCraft() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<VapeResult | null>(null);
  const [resp, setResp]             = useState<RecommendResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

  async function handleSelect(style: VapeStyle) {
    if (loading) return;
    setSelectedId(style.id);
    setLoading(true);
    setError(null);
    setResult(null);
    setResp(null);

    /* Snapshot the preference for trend analytics — fire-and-forget so a
     * slow /api/preferences call never blocks the pairing. */
    trackPreferences({
      category:          "vape",
      flavorPreferences: style.flavors,
      strength:          style.strength,
      mood:              style.mood,
    });

    /* Defensive fetch.
     *
     * The server-side recommendation registry doesn't yet include "vape",
     * so /api/recommend returns 400; in demo mode `fetchRecommendations`
     * additionally falls back to DEMO_RECOMMENDATIONS, which returns
     * cigar/alcohol seed products. Surfacing either as a "vape pairing"
     * would lie to the operator. We instead:
     *   • swallow the error and render the empty "venue inventory pending"
     *     state — never surface a cross-category fallback as the match
     *   • only accept results whose category truly matches "vape"
     *
     * Once the server registry + zod schemas grow a "vape" entry and the
     * venue stocks vape SKUs, this same branch lights up automatically. */
    try {
      const r: RecommendResponse = await fetchRecommendations({
        category:          "vape",
        flavorPreferences: style.flavors,
        strength:          style.strength,
        mood:              style.mood,
      });
      const onlyVape = r.recommendations.filter(p => p.category === "vape");
      const top      = onlyVape[0] ?? null;
      setResp(top ? r : null);
      const tags = top
        ? (r.commentary?.pairingTags
           ?? Array.from(new Set([...(top.flavorNotes ?? []), ...(top.pairingTags ?? [])])))
        : style.flavors;
      setResult({ style, vape: top, tags: tags.length ? tags : style.flavors });
    } catch {
      /* Fail-soft: still show the result frame so the operator gets
       * confirmation their selection registered, just without a product. */
      setResp(null);
      setResult({ style, vape: null, tags: style.flavors });
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

  return (
    <div data-testid="vapecraft-page" style={{ position: "relative", minHeight: "100vh", color: "#FFFFFF" }}>
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0,
          backgroundImage: `url(${vapeBg})`,
          backgroundSize:  "cover",
          backgroundPosition: "center",
          filter: "saturate(0.9)",
          zIndex: -2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(118,80,180,0.4), transparent 55%)," +
            "linear-gradient(180deg, rgba(4,2,8,0.55) 0%, rgba(4,2,8,0.92) 100%)",
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
        {/* Inline back button intentionally omitted — GlobalBackButton in App.tsx
            already renders a single fixed back control across every craft page. */}
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
            VapeCraft
          </h1>
          <p
            style={{
              margin: "4px 0 0", fontSize: 12,
              letterSpacing: "0.32em", textTransform: "uppercase",
              color: "#B496E6", fontWeight: 600,
            }}
          >
            Pick your vapor · We'll match the flavor
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
          <ExperienceFrame padding="22px 20px" testId="vapecraft-stepnav">
            <p
              style={{
                margin: "0 0 16px", fontSize: 10,
                letterSpacing: "0.3em", textTransform: "uppercase",
                color: "#B496E6", fontWeight: 600,
              }}
            >
              Experience
            </p>
            <StepRow num={1} label="Pick a flavor" active={!result} done={!!result} />
            <StepRow num={2} label="See the match" active={!!result}              done={false} />
            <StepRow num={3} label="Order"         active={false}                 done={false} />
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
                  data-testid={`vape-card-${style.id}`}
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
                    /* Photo on top, gradient fallback beneath — same
                     * defensive layering as PourCraft / BrewCraft. */
                    backgroundImage:    `url(${style.image}), ${style.gradient}`,
                    backgroundSize:     "cover",
                    backgroundPosition: "center",
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

          <div style={{ marginTop: 28 }} aria-live="polite" aria-atomic="false">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  data-testid="vapecraft-loading"
                  style={{
                    textAlign: "center", color: "#B496E6",
                    fontSize: 12, letterSpacing: "0.3em",
                    textTransform: "uppercase", padding: "20px 0",
                  }}
                >
                  Calibrating your vapor…
                </motion.div>
              )}

              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  data-testid="vapecraft-error"
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
                  data-testid="vapecraft-result"
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
                        {result.style.title} Match
                      </h3>
                    </div>

                    <ResultBlock label="The Vape" product={result.vape} testId="vapecraft-vape" />

                    <SuggestedMenu tags={result.tags} testId="vapecraft-menu" />

                    <div style={{ marginTop: 20 }}>
                      <button
                        type="button"
                        data-testid="vapecraft-reset"
                        onClick={reset}
                        style={{
                          background: "transparent",
                          color:      "#B496E6",
                          border:     "1px solid rgba(180,150,230,0.4)",
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
            accent="rgba(180,150,230,0.55)"
            testId="vapecraft-voice"
          />
        </aside>
      </div>
    </div>
  );
}

function StepRow({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  const color = done ? "#7A9A6A" : active ? "#B496E6" : "#6A6258";
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
          color: "#B496E6", fontWeight: 600,
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
        {product?.flavorNotes.join(" · ") ?? "No match available — venue inventory pending"}
      </p>
    </div>
  );
}
