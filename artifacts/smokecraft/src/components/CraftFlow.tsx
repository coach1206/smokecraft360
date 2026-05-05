import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, ShoppingBag, ChevronRight, RotateCcw } from "lucide-react";
import {
  fetchRecommendations,
  trackPreferences,
  postScore,
  upsertCraftBuild,
  type RecommendResponse,
  type ProductResult,
} from "@/services/api";
import LivePreviewPanel, { type LiveMeters } from "@/components/LivePreview/LivePreviewPanel";

export type CraftCategory = "beer" | "alcohol" | "vape";

export interface CraftStyleCard {
  id: string;
  title: string;
  subtitle: string;
  flavors: string[];
  strength: number;
  mood: string;
  gradient: string;
  image: string;
  glyph: string;
}

export interface CraftMoodCard {
  id: string;
  title: string;
  desc: string;
}

export interface CraftFlowConfig {
  testIdPrefix: string;
  title: string;
  tagline: string;
  category: CraftCategory;
  background: string;
  theme: {
    accent: string;
    accentSoft: string;
    tint: string;
    bodyTextOverlay: string;
  };
  language: {
    introHeadline: string;
    introBody: string;
    introCta: string;
    stepStyleLabel: string;
    stepProfileLabel: string;
    stylePrompt: string;
    profilePrompt: string;
    matchingCopy: string;
    revealHeadline: string;
    productLabel: string;
    pairingLabel?: string;
    orderCta: string;
  };
  styles: CraftStyleCard[];
  moods: CraftMoodCard[];
  /** When true, suppress cross-category pairing in reveal (used by VapeCraft). */
  hidePairing?: boolean;
  /** Craft type for DB build persistence. Derived from testIdPrefix when omitted. */
  craftType?: "smoke" | "brew" | "pour" | "vape";
}

function deriveScoreInputs(style: CraftStyleCard, mood: CraftMoodCard | null) {
  const flavorRaw   = Math.min(10, 2 + style.flavors.length * 1.5);
  const strengthRaw = Math.min(10, Math.max(0, style.strength));
  const moodMatch   = mood
    ? (style.mood.toLowerCase().includes(mood.id.toLowerCase()) ? 1.0 : 0.65)
    : 0.5;
  const pairingRaw  = Math.min(10, (flavorRaw + strengthRaw) / 2 * moodMatch + 2);
  return {
    flavor:   Number(flavorRaw.toFixed(1)),
    strength: Number(strengthRaw.toFixed(1)),
    pairing:  Number(pairingRaw.toFixed(1)),
  };
}

/** Extract the first (most vibrant) hex color from a CSS gradient string. */
function extractGradientColor(gradient: string): string {
  return gradient.match(/#[0-9a-fA-F]{6}/g)?.[0] ?? "";
}

type Phase = "intro" | "style" | "profile" | "match" | "reveal";

const SIDEBAR_STEPS = ["Intro", "Style", "Profile", "Match", "Reveal"] as const;

export default function CraftFlow({ config }: { config: CraftFlowConfig }) {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedStyle, setSelectedStyle] = useState<CraftStyleCard | null>(null);
  const [selectedMood, setSelectedMood] = useState<CraftMoodCard | null>(null);
  const [resp, setResp] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreState, setScoreState] = useState({ score: 50, prevScore: 50 });
  const [liveMeters, setLiveMeters] = useState<LiveMeters>({ flavor: 50, strength: 50, balance: 50 });

  const phaseIndex = useMemo(() => {
    const order: Phase[] = ["intro", "style", "profile", "match", "reveal"];
    return order.indexOf(phase);
  }, [phase]);

  const reset = useCallback(() => {
    setPhase("intro");
    setSelectedStyle(null);
    setSelectedMood(null);
    setResp(null);
    setError(null);
    setScoreState({ score: 50, prevScore: 50 });
    setLiveMeters({ flavor: 50, strength: 50, balance: 50 });
  }, []);

  const craftType = useMemo(() =>
    config.craftType ?? (
      config.testIdPrefix.startsWith("smoke") ? "smoke" as const :
      config.testIdPrefix.startsWith("brew")  ? "brew"  as const :
      config.testIdPrefix.startsWith("pour")  ? "pour"  as const :
      "vape"  as const
    ), [config.craftType, config.testIdPrefix]);

  const updateScore = useCallback(async (
    style:        CraftStyleCard,
    mood:         CraftMoodCard | null,
    currentPhase: Phase,
  ) => {
    const inputs = deriveScoreInputs(style, mood);
    const result = await postScore(inputs);
    // Always persist phase + selections — include score only when scoring succeeded.
    void upsertCraftBuild({
      craft:       craftType,
      phase:       currentPhase,
      styleChoice: style.id,
      ...(mood    ? { moodChoice: mood.id    } : {}),
      ...(result  ? { score:      result.score } : {}),
    });
    if (!result) return;
    const newScore100 = Math.round(result.score * 10);
    setScoreState(prev => ({ score: newScore100, prevScore: prev.score }));
    setLiveMeters({
      flavor:   Math.round(inputs.flavor   * 10),
      strength: Math.round(inputs.strength * 10),
      balance:  Math.round(inputs.pairing  * 10),
    });
  }, [craftType]);

  const runMatch = useCallback(async (style: CraftStyleCard, mood: CraftMoodCard) => {
    setPhase("match");
    setError(null);
    setResp(null);
    try {
      trackPreferences({
        category: config.category,
        flavorPreferences: style.flavors,
        strength: style.strength,
        mood: mood.id,
      });
      const r = await fetchRecommendations({
        category: config.category,
        flavorPreferences: style.flavors,
        strength: style.strength,
        mood: mood.id,
      });
      // For vape, only accept truly-vape rows (engine may return empty).
      if (config.category === "vape") {
        const onlyVape = r.recommendations.filter((p) => p.category === "vape");
        setResp(onlyVape.length ? { ...r, recommendations: onlyVape } : { ...r, recommendations: [] });
      } else {
        setResp(r);
      }
      setPhase("reveal");
      void upsertCraftBuild({ craft: craftType, phase: "reveal", styleChoice: style.id, moodChoice: mood.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pairing");
      setPhase("reveal");
      void upsertCraftBuild({ craft: craftType, phase: "reveal", styleChoice: style.id, moodChoice: mood.id });
    }
  }, [config.category, craftType]);

  const handleStylePick = useCallback((s: CraftStyleCard) => {
    setSelectedStyle(s);
    setPhase("profile");
    void updateScore(s, null, "style");
  }, [updateScore]);

  const handleMoodPick = useCallback((m: CraftMoodCard) => {
    setSelectedMood(m);
    if (selectedStyle) {
      void runMatch(selectedStyle, m);
      void updateScore(selectedStyle, m, "profile");
    }
  }, [selectedStyle, runMatch, updateScore]);

  const featured = resp?.recommendations[0] ?? null;
  const secondary = (resp?.recommendations ?? []).slice(1, 4);
  const pairing = !config.hidePairing ? (resp?.pairings?.[0] ?? null) : null;
  const f = featured as (ProductResult & {
    tastingNotes?: string[]; whyItWorks?: string;
    strength?: string; tier?: string;
    isSponsored?: boolean; campaignTag?: string; brandTag?: string;
    rewardLabel?: string; xpReward?: number;
  }) | null;
  const tastingNotes = f?.tastingNotes ?? f?.flavorNotes ?? selectedStyle?.flavors ?? [];
  const whyItWorks = f?.whyItWorks
    ?? (selectedStyle && selectedMood
      ? `Selected for its ${selectedStyle.subtitle.toLowerCase().split("·").slice(0, 2).join(" and ").trim()} character — a precise match for your ${selectedMood.title.toLowerCase()} mood.`
      : "Curated for your selections.");

  return (
    <div data-testid={`${config.testIdPrefix}-page`} style={{ position: "relative", minHeight: "100dvh", color: "#FFFFFF", overflow: "hidden" }}>
      {/* Background */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: -2,
        backgroundImage: `url(${config.background})`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "saturate(0.85)",
      }} />
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: -1,
        background:
          `radial-gradient(ellipse at 50% 30%, ${config.theme.tint}, transparent 55%),` +
          "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.92) 100%)",
      }} />

      {/* Header */}
      <header style={{
        maxWidth: 1640, margin: "0 auto",
        padding: "24px 32px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div />
        <div style={{ textAlign: "right", textShadow: "0 2px 8px rgba(0,0,0,0.85)" }}>
          <h1 style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: "clamp(28px, 3.2vw, 44px)",
            margin: 0, fontWeight: 600, color: "#FFFFFF",
            letterSpacing: "0.02em",
          }}>{config.title}</h1>
          <p style={{
            margin: "4px 0 0", fontSize: 12,
            letterSpacing: "0.32em", textTransform: "uppercase",
            color: config.theme.accent, fontWeight: 600,
          }}>{config.tagline}</p>
        </div>
      </header>

      {/* 3-column layout: sidebar / center / right (right shows in reveal only) */}
      <div style={{
        maxWidth: 1640, margin: "0 auto",
        padding: "12px 32px 60px",
        display: "grid", gap: 24,
        gridTemplateColumns: phase === "reveal" ? "260px 1fr 360px" : "260px 1fr",
      }}>
        {/* LEFT — Sidebar with step progression */}
        <aside>
          <div style={{
            position: "sticky", top: 12,
            padding: "22px 20px",
            background: "rgba(10,8,6,0.55)",
            border: `1px solid ${config.theme.accent}25`,
            borderRadius: 18,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}>
            <p style={{
              margin: "0 0 18px", fontSize: 10,
              letterSpacing: "0.3em", textTransform: "uppercase",
              color: config.theme.accent, fontWeight: 700,
            }}>{config.title} Hub</p>
            {SIDEBAR_STEPS.map((label, i) => {
              const done = i < phaseIndex;
              const active = i === phaseIndex;
              const stepLabel =
                label === "Style" ? config.language.stepStyleLabel :
                label === "Profile" ? config.language.stepProfileLabel :
                label;
              const accentColor = done ? "#7A9A6A" : active ? config.theme.accent : "rgba(232,224,200,0.35)";
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: `1px solid ${accentColor}`,
                    color: accentColor, fontSize: 12, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: active ? `${config.theme.accent}15` : "transparent",
                  }}>
                    {done ? <Check size={13} /> : i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: accentColor, fontWeight: active ? 700 : 500 }}>{stepLabel}</span>
                </div>
              );
            })}
            <button
              type="button"
              data-testid={`${config.testIdPrefix}-restart`}
              onClick={reset}
              disabled={phase === "intro"}
              style={{
                marginTop: 18, width: "100%",
                background: "transparent",
                color: phase === "intro" ? "rgba(232,224,200,0.25)" : "rgba(232,224,200,0.7)",
                border: `1px solid ${phase === "intro" ? "rgba(232,224,200,0.15)" : "rgba(232,224,200,0.3)"}`,
                padding: "10px 14px", borderRadius: 10,
                fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
                cursor: phase === "intro" ? "default" : "pointer",
                fontWeight: 600,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <RotateCcw size={12} /> Start Over
            </button>
          </div>
        </aside>

        {/* CENTER — Phase-specific content */}
        <main>
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                data-testid={`${config.testIdPrefix}-intro`}
                style={{
                  padding: "60px 40px",
                  background: `linear-gradient(155deg, ${config.theme.accent}10, rgba(10,8,6,0.6))`,
                  border: `1px solid ${config.theme.accent}30`,
                  borderRadius: 22, textAlign: "center",
                  minHeight: 460, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24,
                }}>
                <Sparkles size={36} color={config.theme.accent} />
                <h2 style={{
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  fontSize: "clamp(28px, 3.6vw, 44px)", fontWeight: 600, margin: 0,
                  color: "#FFFFFF", maxWidth: 640, lineHeight: 1.2,
                }}>{config.language.introHeadline}</h2>
                <p style={{
                  fontSize: 15, color: "rgba(232,224,200,0.7)",
                  maxWidth: 520, lineHeight: 1.6, margin: 0,
                }}>{config.language.introBody}</p>
                <motion.button
                  type="button"
                  data-testid={`${config.testIdPrefix}-begin`}
                  onClick={() => setPhase("style")}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    marginTop: 8,
                    background: `linear-gradient(135deg, ${config.theme.accent}, ${config.theme.accentSoft})`,
                    color: "#0a0806", border: "none",
                    padding: "16px 36px", borderRadius: 999,
                    fontSize: 13, fontWeight: 700,
                    letterSpacing: "0.28em", textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: `0 12px 40px ${config.theme.accent}55`,
                    display: "inline-flex", alignItems: "center", gap: 10,
                  }}
                >
                  {config.language.introCta} <ChevronRight size={16} />
                </motion.button>
              </motion.div>
            )}

            {phase === "style" && (
              <motion.div key="style" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                <p style={{
                  margin: "0 0 18px", fontSize: 11,
                  letterSpacing: "0.32em", textTransform: "uppercase",
                  color: config.theme.accent, fontWeight: 700,
                }}>Step 1 — {config.language.stylePrompt}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                  {config.styles.map((style, i) => (
                    <motion.button
                      key={style.id}
                      type="button"
                      data-testid={`${config.testIdPrefix}-style-${style.id}`}
                      onClick={() => handleStylePick(style)}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.04, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                      style={{
                        position: "relative", overflow: "hidden",
                        minHeight: 280, borderRadius: 22,
                        border: `1px solid ${config.theme.accent}55`,
                        cursor: "pointer", padding: 0, color: "inherit",
                        backgroundImage: `url(${style.image}), ${style.gradient}`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                        textAlign: "left",
                      }}
                    >
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.92) 100%)",
                        pointerEvents: "none",
                      }} />
                      <div style={{
                        position: "absolute", top: 16, right: 20,
                        fontSize: 56, lineHeight: 1, color: "rgba(255,255,255,0.2)",
                      }} aria-hidden>{style.glyph}</div>
                      <div style={{
                        position: "relative", height: "100%",
                        display: "flex", flexDirection: "column",
                        justifyContent: "flex-end", padding: "24px 22px", minHeight: 280,
                      }}>
                        <div style={{ width: 32, height: 2, marginBottom: 14, background: `linear-gradient(90deg, ${config.theme.accent}, transparent)` }} />
                        <h3 style={{
                          fontFamily: "var(--app-font-serif, Georgia, serif)",
                          fontSize: 22, fontWeight: 600, margin: 0, color: "#FFFFFF",
                          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                        }}>{style.title}</h3>
                        <p style={{
                          margin: "8px 0 0", fontSize: 11,
                          letterSpacing: "0.24em", textTransform: "uppercase",
                          color: "#E5E5E5", fontWeight: 500,
                        }}>{style.subtitle}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === "profile" && selectedStyle && (
              <motion.div key="profile" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                <p style={{
                  margin: "0 0 6px", fontSize: 11,
                  letterSpacing: "0.32em", textTransform: "uppercase",
                  color: config.theme.accent, fontWeight: 700,
                }}>Step 2 — {config.language.profilePrompt}</p>
                <p style={{ margin: "0 0 22px", fontSize: 13, color: "rgba(232,224,200,0.55)" }}>
                  Picked <span style={{ color: "#fff", fontWeight: 600 }}>{selectedStyle.title}</span>. Now set the mood.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  {config.moods.map((m, i) => (
                    <motion.button
                      key={m.id}
                      type="button"
                      data-testid={`${config.testIdPrefix}-mood-${m.id}`}
                      onClick={() => handleMoodPick(m)}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.04, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      style={{
                        textAlign: "left", padding: "22px 20px", minHeight: 140,
                        borderRadius: 18, cursor: "pointer",
                        background: `linear-gradient(155deg, ${config.theme.accent}12, rgba(10,8,6,0.7))`,
                        border: `1px solid ${config.theme.accent}40`,
                        color: "#fff",
                        display: "flex", flexDirection: "column", justifyContent: "space-between",
                      }}
                    >
                      <div style={{ width: 28, height: 2, background: `linear-gradient(90deg, ${config.theme.accent}, transparent)` }} />
                      <div>
                        <h4 style={{
                          fontFamily: "var(--app-font-serif, Georgia, serif)",
                          fontSize: 18, fontWeight: 600, margin: "10px 0 6px",
                        }}>{m.title}</h4>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(232,224,200,0.65)", lineHeight: 1.5 }}>{m.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === "match" && (
              <motion.div key="match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                data-testid={`${config.testIdPrefix}-loading`}
                style={{
                  minHeight: 460, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 22,
                  padding: 40,
                }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
                  style={{
                    width: 64, height: 64, borderRadius: "50%",
                    border: `3px solid ${config.theme.accent}25`,
                    borderTopColor: config.theme.accent,
                  }}
                />
                <p style={{
                  fontSize: 12, letterSpacing: "0.32em", textTransform: "uppercase",
                  color: config.theme.accent, fontWeight: 700, margin: 0,
                }}>{config.language.matchingCopy}</p>
              </motion.div>
            )}

            {phase === "reveal" && (
              <motion.div key="reveal" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
                data-testid={`${config.testIdPrefix}-result`}>
                {error && (
                  <div style={{ color: "#E5818F", fontSize: 14, marginBottom: 16 }}>{error}</div>
                )}
                {!featured && !error && (
                  <div style={{
                    padding: 40, borderRadius: 18,
                    border: `1px solid ${config.theme.accent}30`,
                    background: "rgba(10,8,6,0.6)",
                    textAlign: "center", color: "rgba(232,224,200,0.7)",
                  }}>
                    No matching products in stock right now. Try a different style or check back later.
                  </div>
                )}

                {featured && (
                  <>
                    <p style={{
                      margin: "0 0 14px", fontSize: 11,
                      letterSpacing: "0.32em", textTransform: "uppercase",
                      color: config.theme.accent, fontWeight: 700,
                    }}>{config.language.revealHeadline}</p>

                    {/* Hero featured card */}
                    <div style={{
                      padding: "22px 22px",
                      borderRadius: 20,
                      background: `linear-gradient(155deg, ${config.theme.accent}15, rgba(10,8,6,0.75))`,
                      border: `1px solid ${config.theme.accent}50`,
                      boxShadow: `0 30px 80px ${config.theme.accent}25`,
                      display: "grid",
                      gridTemplateColumns: featured.imageUrl ? "180px 1fr" : "1fr",
                      gap: 22,
                    }}>
                      {featured.imageUrl && (
                        <div style={{
                          width: 180, height: 180, borderRadius: 14,
                          backgroundImage: `url(${featured.imageUrl})`,
                          backgroundSize: "cover", backgroundPosition: "center",
                          border: `1px solid ${config.theme.accent}30`,
                        }} />
                      )}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <p style={{
                            margin: "0 0 6px", fontSize: 9,
                            letterSpacing: "0.32em", textTransform: "uppercase",
                            color: config.theme.accent, fontWeight: 700,
                          }}>{config.language.productLabel}</p>
                          <h3 style={{
                            fontFamily: "var(--app-font-serif, Georgia, serif)",
                            margin: "0 0 6px", fontSize: 26, fontWeight: 600, color: "#fff",
                          }}>{featured.name}</h3>
                          <p style={{ margin: 0, fontSize: 13, color: "rgba(232,224,200,0.65)", lineHeight: 1.5 }}>
                            {(featured.flavorNotes ?? []).join(" · ")}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                          <motion.button
                            type="button"
                            data-testid={`${config.testIdPrefix}-order`}
                            onClick={() => navigate("/pos")}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            style={{
                              background: `linear-gradient(135deg, ${config.theme.accent}, ${config.theme.accentSoft})`,
                              color: "#0a0806", border: "none",
                              padding: "12px 22px", borderRadius: 999,
                              fontSize: 11, fontWeight: 700,
                              letterSpacing: "0.26em", textTransform: "uppercase",
                              cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 8,
                              boxShadow: `0 8px 22px ${config.theme.accent}55`,
                            }}
                          >
                            <ShoppingBag size={14} /> {config.language.orderCta}
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Secondary recommendations */}
                    {(secondary.length > 0 || pairing) && (
                      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        {pairing && (
                          <SecondaryCard
                            label={config.language.pairingLabel ?? "Paired Cigar"}
                            product={pairing}
                            accent={config.theme.accent}
                            testId={`${config.testIdPrefix}-pairing`}
                          />
                        )}
                        {secondary.map((p) => (
                          <SecondaryCard
                            key={p.id}
                            label="Also Try"
                            product={p}
                            accent={config.theme.accent}
                            testId={`${config.testIdPrefix}-alt-${p.id}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT — Signature panel (reveal only) */}
        {phase === "reveal" && featured && (
          <aside>
            <div style={{
              position: "sticky", top: 12,
              padding: "22px 20px",
              background: "rgba(10,8,6,0.65)",
              border: `1px solid ${config.theme.accent}30`,
              borderRadius: 18,
              display: "flex", flexDirection: "column", gap: 18,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }} data-testid={`${config.testIdPrefix}-signature`}>
              <div>
                <p style={{
                  margin: "0 0 4px", fontSize: 9,
                  letterSpacing: "0.32em", textTransform: "uppercase",
                  color: config.theme.accent, fontWeight: 700,
                }}>Signature Profile</p>
                <h4 style={{
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  margin: 0, fontSize: 18, fontWeight: 600, color: "#fff",
                }}>{featured.name}</h4>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Strength", value: f?.strength ?? selectedStyle?.subtitle.split("·")[0]?.trim() ?? "—" },
                  { label: "Type", value: featured.category ?? config.category },
                  { label: "Mood", value: selectedMood?.title ?? "—" },
                  { label: "Tier", value: f?.tier ?? "Premium" },
                ].map((s) => (
                  <div key={s.label} style={{
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                  }}>
                    <div style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,224,200,0.4)", marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Tasting notes */}
              {tastingNotes.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase",
                    color: "rgba(232,224,200,0.5)", marginBottom: 8, fontWeight: 600,
                  }}>Tasting Notes</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {tastingNotes.slice(0, 6).map((n) => (
                      <span key={n} style={{
                        fontSize: 11, padding: "5px 11px", borderRadius: 999,
                        background: `${config.theme.accent}15`,
                        border: `1px solid ${config.theme.accent}40`,
                        color: "#fff",
                      }}>{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Why It Works */}
              <div style={{
                padding: "14px 14px", borderRadius: 12,
                background: `linear-gradient(145deg, ${config.theme.accent}12, transparent)`,
                border: `1px solid ${config.theme.accent}30`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: config.theme.accent, marginBottom: 8,
                }}>
                  <Sparkles size={11} /> Why It Works
                </div>
                <p style={{ fontSize: 12, color: "rgba(232,224,200,0.78)", lineHeight: 1.55, margin: 0 }}>{whyItWorks}</p>
              </div>
            </div>
          </aside>
        )}
      </div>

      <LivePreviewPanel
        craft={craftType}
        accentColor={config.theme.accent}
        dynamicColor={selectedStyle
          ? (extractGradientColor(selectedStyle.gradient) || config.theme.accent)
          : config.theme.accent}
        score={scoreState.score}
        prevScore={scoreState.prevScore}
        meters={liveMeters}
        styleLabel={selectedStyle?.title ?? ""}
        moodLabel={selectedMood?.title ?? ""}
        visible={phase !== "intro" && phase !== "reveal"}
      />
    </div>
  );
}

function SecondaryCard({ label, product, accent, testId }: { label: string; product: ProductResult; accent: string; testId: string }) {
  return (
    <div data-testid={testId} style={{
      padding: "14px 16px",
      background: "rgba(10,8,6,0.55)",
      border: `1px solid ${accent}25`,
      borderRadius: 14,
      display: "flex", gap: 12, alignItems: "center",
    }}>
      {product.imageUrl && (
        <div style={{
          width: 64, height: 64, borderRadius: 10, flexShrink: 0,
          backgroundImage: `url(${product.imageUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
        }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 8, letterSpacing: "0.28em", textTransform: "uppercase",
          color: accent, fontWeight: 700, marginBottom: 2,
        }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</div>
        {product.flavorNotes && product.flavorNotes.length > 0 && (
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.55)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {product.flavorNotes.slice(0, 2).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
