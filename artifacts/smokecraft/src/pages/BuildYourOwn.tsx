import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { fetchRecommendations, type RecommendResponse, type ProductResult } from "@/services/api";
import { getAuthHeaders } from "@/services/auth";
import ExperienceFrame from "@/components/ExperienceFrame";
import VoicePanel from "@/components/AIPanel/VoicePanel";
import pourBg from "@assets/locked_cards/experience_pourcraft.png";
import imgWhiskey from "@assets/generated_images/build_whiskey.png";
import imgGin from "@assets/generated_images/build_gin.png";
import imgRum from "@assets/generated_images/build_rum.png";
import imgTequila from "@assets/generated_images/build_tequila.png";
import imgVodka from "@assets/generated_images/build_vodka.png";

interface Spirit {
  id: string;
  name: string;
  flavors: string[];
  strength: number;
  image: string;
  accent: string;
  gradient: string;
}

const BASES: Spirit[] = [
  { id: "whiskey", name: "Whiskey", flavors: ["smoky", "oak", "caramel", "warm"], strength: 4, image: imgWhiskey, accent: "#E8C870", gradient: "linear-gradient(155deg, #f0d68a 0%, #c89548 50%, #5a3818 100%)" },
  { id: "gin", name: "Gin", flavors: ["floral", "citrus", "fresh", "herbal"], strength: 3, image: imgGin, accent: "#8DE8A0", gradient: "linear-gradient(155deg, #8de8a0 0%, #2c8a58 50%, #082a1a 100%)" },
  { id: "rum", name: "Rum", flavors: ["sweet", "vanilla", "caramel", "tropical"], strength: 3, image: imgRum, accent: "#D49555", gradient: "linear-gradient(155deg, #d49555 0%, #9c5a1e 50%, #4a2810 100%)" },
  { id: "tequila", name: "Tequila", flavors: ["spicy", "citrus", "earthy", "bright"], strength: 3, image: imgTequila, accent: "#E8A04A", gradient: "linear-gradient(155deg, #e8a04a 0%, #b8651a 50%, #5a2c08 100%)" },
  { id: "vodka", name: "Vodka", flavors: ["crisp", "clean", "smooth", "neutral"], strength: 2, image: imgVodka, accent: "#B0C8E8", gradient: "linear-gradient(155deg, #b0c8e8 0%, #6088b8 50%, #1a3050 100%)" },
];

interface Modifier {
  id: string;
  name: string;
  flavor: string;
  strengthDelta: number;
}

const MODIFIERS: Modifier[] = [
  { id: "citrus", name: "Fresh Citrus", flavor: "citrus", strengthDelta: 0 },
  { id: "honey", name: "Wildflower Honey", flavor: "honey", strengthDelta: 0 },
  { id: "smoke", name: "Applewood Smoke", flavor: "smoky", strengthDelta: 1 },
  { id: "vanilla", name: "Madagascar Vanilla", flavor: "vanilla", strengthDelta: 0 },
  { id: "ginger", name: "Fresh Ginger", flavor: "spicy", strengthDelta: 0 },
  { id: "mint", name: "Crushed Mint", flavor: "mint", strengthDelta: -1 },
  { id: "chocolate", name: "Dark Chocolate", flavor: "dark-chocolate", strengthDelta: 1 },
  { id: "espresso", name: "Espresso Shot", flavor: "coffee", strengthDelta: 1 },
  { id: "elderflower", name: "Elderflower", flavor: "floral", strengthDelta: -1 },
  { id: "pepper", name: "Cracked Pepper", flavor: "pepper", strengthDelta: 1 },
];

type Step = "base" | "modifiers" | "name" | "reveal";

function computeRarity(base: Spirit, mods: Modifier[]): { score: number; label: string; percentile: number } {
  const uniqueFlavors = new Set([...base.flavors, ...mods.map(m => m.flavor)]);
  const complexity = uniqueFlavors.size;
  const strengthShift = Math.abs(mods.reduce((s, m) => s + m.strengthDelta, 0));
  const raw = Math.min(10, complexity * 1.2 + strengthShift * 0.8 + mods.length * 0.5);
  const score = Number(raw.toFixed(1));
  const percentile = Math.max(1, Math.min(99, Math.round(100 - score * 9)));
  const label = score >= 8 ? "Legendary" : score >= 6 ? "Rare" : score >= 4 ? "Uncommon" : "Common";
  return { score, label, percentile };
}

export default function BuildYourOwn() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("base");
  const [base, setBase] = useState<Spirit | null>(null);
  const [selectedMods, setSelectedMods] = useState<Modifier[]>([]);
  const [drinkName, setDrinkName] = useState("");
  const [matchResult, setMatchResult] = useState<ProductResult | null>(null);
  const [resp, setResp] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);

  function selectBase(spirit: Spirit) {
    setBase(spirit);
    setStep("modifiers");
  }

  function toggleMod(mod: Modifier) {
    setSelectedMods(prev =>
      prev.find(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : prev.length < 3
        ? [...prev, mod]
        : prev,
    );
  }

  function confirmMods() {
    if (selectedMods.length === 0) return;
    setStep("name");
  }

  async function revealDrink() {
    if (!base) return;
    setStep("reveal");
    setLoading(true);

    const allFlavors = [...base.flavors, ...selectedMods.map(m => m.flavor)];
    const finalStrength = Math.max(1, Math.min(5, base.strength + selectedMods.reduce((s, m) => s + m.strengthDelta, 0)));

    try {
      const r: RecommendResponse = await fetchRecommendations({
        category: "alcohol",
        flavorPreferences: allFlavors,
        strength: finalStrength,
        mood: "bold",
      });
      setResp(r);
      setMatchResult(r.recommendations[0] ?? null);
    } catch {
      setResp(null);
      setMatchResult(null);
    } finally {
      setLoading(false);
    }

    fetch(`${import.meta.env.BASE_URL}api/loyalty/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ points: 20, reason: "build_your_own" }),
    }).catch(() => {});
  }

  const rarity = useMemo(() => {
    if (!base) return null;
    return computeRarity(base, selectedMods);
  }, [base, selectedMods]);

  const stepNum = step === "base" ? 1 : step === "modifiers" ? 2 : step === "name" ? 3 : 4;

  return (
    <div data-testid="build-your-own-page" style={{ position: "relative", minHeight: "100vh", color: "#1A1A1B" }}>
      <div aria-hidden style={{
        position: "fixed", inset: 0,
        backgroundImage: `url(${pourBg})`, backgroundSize: "cover", backgroundPosition: "center",
        filter: "saturate(0.85)", zIndex: -2,
      }} />
      <div aria-hidden style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at 50% 30%, rgba(80,30,10,0.35), transparent 55%), linear-gradient(180deg, rgba(26,26,27,0.32) 0%, rgba(26,26,27,0.50) 100%)",
        zIndex: -1,
      }} />

      <header style={{
        maxWidth: 1640, margin: "0 auto", padding: "28px 32px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div />
        <div style={{ textAlign: "right", textShadow: "0 2px 8px rgba(26,26,27,0.45)" }}>
          <h1 style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: "clamp(28px, 3.2vw, 44px)", margin: 0, fontWeight: 600,
            color: "#1A1A1B", letterSpacing: "0.02em",
          }}>
            Build Your Drink
          </h1>
          <p style={{
            margin: "4px 0 0", fontSize: 12, letterSpacing: "0.32em",
            textTransform: "uppercase", color: "#D48B00", fontWeight: 600,
          }}>
            Craft it · Name it · Own it
          </p>
        </div>
      </header>

      <div style={{
        maxWidth: 1640, margin: "0 auto", padding: "12px 32px 60px",
        display: "grid", gap: 24, gridTemplateColumns: "260px 1fr 360px",
      }} className="byo-grid">
        <aside style={{ opacity: 0.78 }}>
          <ExperienceFrame padding="22px 20px" testId="byo-stepnav">
            <p style={{
              margin: "0 0 16px", fontSize: 10, letterSpacing: "0.3em",
              textTransform: "uppercase", color: "#D48B00", fontWeight: 600,
            }}>
              Your Build
            </p>
            <StepRow num={1} label="Pick your base" active={step === "base"} done={stepNum > 1} />
            <StepRow num={2} label="Add flavors" active={step === "modifiers"} done={stepNum > 2} />
            <StepRow num={3} label="Name it" active={step === "name"} done={stepNum > 3} />
            <StepRow num={4} label="The reveal" active={step === "reveal"} done={false} />
          </ExperienceFrame>
        </aside>

        <main>
          <AnimatePresence mode="wait">
            {step === "base" && (
              <motion.div key="base" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p style={{
                  margin: "0 0 18px", fontSize: 11, letterSpacing: "0.28em",
                  textTransform: "uppercase", color: "#D48B00", fontWeight: 600,
                }}>
                  Choose your foundation
                </p>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16,
                }}>
                  {BASES.map((spirit, i) => (
                    <motion.button
                      key={spirit.id}
                      type="button"
                      data-testid={`byo-base-${spirit.id}`}
                      onClick={() => selectBase(spirit)}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.04, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      style={{
                        position: "relative", overflow: "hidden",
                        minHeight: 220, borderRadius: 18,
                        border: `1px solid ${spirit.accent}55`,
                        cursor: "pointer", padding: 0, color: "inherit",
                        backgroundImage: `url(${spirit.image}), ${spirit.gradient}`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        boxShadow: "0 16px 48px rgba(26,26,27,0.18)", textAlign: "left",
                      }}
                    >
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(180deg, rgba(26,26,27,0.02) 0%, rgba(26,26,27,0.36) 100%)",
                        pointerEvents: "none",
                      }} />
                      <div style={{
                        position: "relative", height: "100%",
                        display: "flex", flexDirection: "column", justifyContent: "flex-end",
                        padding: "20px 18px", minHeight: 220,
                      }}>
                        <div style={{ width: 24, height: 2, marginBottom: 10, background: `linear-gradient(90deg, ${spirit.accent}, transparent)` }} />
                        <h3 style={{
                          fontFamily: "var(--app-font-serif, Georgia, serif)",
                          fontSize: 20, fontWeight: 600, margin: 0, color: "#1A1A1B",
                          textShadow: "0 2px 8px rgba(26,26,27,0.32)",
                        }}>
                          {spirit.name}
                        </h3>
                        <p style={{
                          margin: "6px 0 0", fontSize: 10, letterSpacing: "0.2em",
                          textTransform: "uppercase", color: "#E5E5E5",
                        }}>
                          {spirit.flavors.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "modifiers" && base && (
              <motion.div key="mods" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <p style={{
                    margin: 0, fontSize: 11, letterSpacing: "0.28em",
                    textTransform: "uppercase", color: "#D48B00", fontWeight: 600,
                  }}>
                    Add up to 3 flavors to your {base.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(229,229,229,0.6)" }}>
                    {selectedMods.length}/3 selected
                  </p>
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12,
                }}>
                  {MODIFIERS.map((mod, i) => {
                    const active = !!selectedMods.find(m => m.id === mod.id);
                    return (
                      <motion.button
                        key={mod.id}
                        type="button"
                        data-testid={`byo-mod-${mod.id}`}
                        onClick={() => toggleMod(mod)}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.3, delay: i * 0.03 }}
                        style={{
                          background: active ? `${base.accent}25` : "rgba(26,26,27,0.07)",
                          border: `1px solid ${active ? base.accent : "rgba(255,255,255,0.1)"}`,
                          color: active ? "#1A1A1B" : "#E5E5E5",
                          padding: "14px 16px",
                          borderRadius: 14,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.25s ease",
                        }}
                      >
                        <p style={{
                          margin: 0, fontSize: 14, fontWeight: 600,
                        }}>
                          {mod.name}
                        </p>
                        <p style={{
                          margin: "4px 0 0", fontSize: 10, letterSpacing: "0.18em",
                          textTransform: "uppercase", color: active ? base.accent : "rgba(229,229,229,0.5)",
                        }}>
                          {mod.flavor}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    data-testid="byo-back-to-base"
                    onClick={() => { setStep("base"); setBase(null); setSelectedMods([]); }}
                    style={{
                      background: "transparent", color: "#E5E5E5",
                      border: "1px solid rgba(26,26,27,0.17)",
                      padding: "10px 20px", borderRadius: 999, fontSize: 11,
                      letterSpacing: "0.24em", textTransform: "uppercase", cursor: "pointer",
                    }}
                  >
                    Change base
                  </button>
                  <button
                    type="button"
                    data-testid="byo-confirm-mods"
                    onClick={confirmMods}
                    disabled={selectedMods.length === 0}
                    style={{
                      background: selectedMods.length > 0 ? base.accent : "rgba(255,255,255,0.1)",
                      color: selectedMods.length > 0 ? "#0a0604" : "#666",
                      border: "none", padding: "10px 22px", borderRadius: 999,
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      cursor: selectedMods.length > 0 ? "pointer" : "default",
                    }}
                  >
                    Next: Name it
                  </button>
                </div>
              </motion.div>
            )}

            {step === "name" && base && (
              <motion.div key="name" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ExperienceFrame accent={`${base.accent}44`} padding="32px 30px">
                  <p style={{
                    margin: "0 0 8px", fontSize: 10, letterSpacing: "0.32em",
                    textTransform: "uppercase", color: "#D48B00", fontWeight: 600,
                  }}>
                    Name your creation
                  </p>
                  <p style={{
                    margin: "0 0 24px", fontSize: 13, color: "rgba(229,229,229,0.7)", lineHeight: 1.5,
                  }}>
                    {base.name} + {selectedMods.map(m => m.name).join(" + ")}
                  </p>
                  <input
                    type="text"
                    data-testid="byo-name-input"
                    placeholder="e.g. Midnight Gold"
                    value={drinkName}
                    onChange={e => setDrinkName(e.target.value)}
                    maxLength={40}
                    style={{
                      width: "100%", padding: "14px 18px",
                      background: "rgba(26,26,27,0.08)",
                      border: "1px solid rgba(26,26,27,0.17)",
                      borderRadius: 12, color: "#1A1A1B",
                      fontFamily: "var(--app-font-serif, Georgia, serif)",
                      fontSize: 22, fontWeight: 600,
                      outline: "none",
                    }}
                    onFocus={e => { e.target.style.borderColor = base.accent; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(26,26,27,0.17)"; }}
                  />
                  <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                    <button
                      type="button"
                      data-testid="byo-back-to-mods"
                      onClick={() => setStep("modifiers")}
                      style={{
                        background: "transparent", color: "#E5E5E5",
                        border: "1px solid rgba(26,26,27,0.17)",
                        padding: "10px 20px", borderRadius: 999, fontSize: 11,
                        letterSpacing: "0.24em", textTransform: "uppercase", cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      data-testid="byo-reveal"
                      onClick={revealDrink}
                      disabled={!drinkName.trim()}
                      style={{
                        background: drinkName.trim() ? base.accent : "rgba(255,255,255,0.1)",
                        color: drinkName.trim() ? "#0a0604" : "#666",
                        border: "none", padding: "10px 22px", borderRadius: 999,
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        cursor: drinkName.trim() ? "pointer" : "default",
                      }}
                    >
                      Reveal my drink
                    </button>
                  </div>
                </ExperienceFrame>
              </motion.div>
            )}

            {step === "reveal" && base && rarity && (
              <motion.div key="reveal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <ExperienceFrame accent={`${base.accent}55`} padding="32px 30px" testId="byo-reveal-card">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p style={{
                      margin: "0 0 6px", fontSize: 10, letterSpacing: "0.32em",
                      textTransform: "uppercase", color: base.accent, fontWeight: 600,
                    }}>
                      Your Creation
                    </p>
                    <h2 style={{
                      fontFamily: "var(--app-font-serif, Georgia, serif)",
                      fontSize: 36, fontWeight: 600, margin: "0 0 6px", color: "#1A1A1B",
                    }}>
                      {drinkName || "Unnamed"}
                    </h2>
                    <p style={{
                      margin: "0 0 24px", fontSize: 13, color: "rgba(229,229,229,0.7)",
                    }}>
                      {base.name} + {selectedMods.map(m => m.name).join(" + ")}
                    </p>

                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24,
                    }}>
                      <StatBlock label="Rarity" value={rarity.label} accent={base.accent} />
                      <StatBlock label="Score" value={`${rarity.score}/10`} accent={base.accent} />
                      <StatBlock label="Percentile" value={`Top ${rarity.percentile}%`} accent={base.accent} />
                    </div>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      style={{
                        margin: "0 0 8px", fontSize: 12, color: "rgba(229,229,229,0.5)",
                        fontStyle: "italic",
                      }}
                    >
                      Only {rarity.percentile}% of users build like this.
                    </motion.p>

                    {matchResult && (
                      <div style={{
                        marginTop: 20, paddingTop: 18,
                        borderTop: "1px solid rgba(26,26,27,0.10)",
                      }}>
                        <p style={{
                          margin: "0 0 6px", fontSize: 10, letterSpacing: "0.32em",
                          textTransform: "uppercase", color: "#D48B00", fontWeight: 600,
                        }}>
                          Closest real pour
                        </p>
                        <h4 style={{
                          fontFamily: "var(--app-font-serif, Georgia, serif)",
                          fontSize: 20, fontWeight: 600, margin: "0 0 4px", color: "#1A1A1B",
                        }}>
                          {matchResult.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: 12, color: "#C8C0B0", lineHeight: 1.5 }}>
                          {matchResult.flavorNotes.join(" · ")}
                        </p>
                      </div>
                    )}

                    {loading && (
                      <p style={{
                        marginTop: 20, fontSize: 12, color: base.accent,
                        letterSpacing: "0.3em", textTransform: "uppercase", textAlign: "center",
                      }}>
                        Matching your build to inventory...
                      </p>
                    )}

                    <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        data-testid="byo-start-over"
                        onClick={() => {
                          setStep("base");
                          setBase(null);
                          setSelectedMods([]);
                          setDrinkName("");
                          setMatchResult(null);
                          setResp(null);
                        }}
                        style={{
                          background: "transparent", color: "#E5E5E5",
                          border: "1px solid rgba(26,26,27,0.17)",
                          padding: "10px 20px", borderRadius: 999, fontSize: 11,
                          letterSpacing: "0.24em", textTransform: "uppercase", cursor: "pointer",
                        }}
                      >
                        Build another
                      </button>
                      <button
                        type="button"
                        data-testid="byo-to-pourcraft"
                        onClick={() => navigate("/pourcraft")}
                        style={{
                          background: "#D48B00", color: "#0a0604",
                          border: "none", padding: "10px 22px", borderRadius: 999,
                          fontSize: 11, fontWeight: 700, letterSpacing: "0.24em",
                          textTransform: "uppercase", cursor: "pointer",
                        }}
                      >
                        Explore PourCraft
                      </button>
                    </div>
                  </motion.div>
                </ExperienceFrame>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <aside>
          <VoicePanel
            commentary={resp?.commentary}
            accent="rgba(232,152,88,0.55)"
            testId="byo-voice"
          />
        </aside>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .byo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StepRow({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  const color = done ? "#7A9A6A" : active ? "#D48B00" : "#6A6258";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span style={{
        width: 24, height: 24, borderRadius: "50%",
        border: `1px solid ${color}`, color, fontSize: 11, fontWeight: 700,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        {done ? "✓" : num}
      </span>
      <span style={{ fontSize: 13, color, fontWeight: active ? 600 : 500 }}>{label}</span>
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{
        margin: "0 0 4px", fontSize: 10, letterSpacing: "0.28em",
        textTransform: "uppercase", color: "rgba(229,229,229,0.5)", fontWeight: 500,
      }}>
        {label}
      </p>
      <p style={{
        margin: 0, fontFamily: "var(--app-font-serif, Georgia, serif)",
        fontSize: 20, fontWeight: 600, color: accent,
      }}>
        {value}
      </p>
    </div>
  );
}
