import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { playClick } from "@/hooks/useAudio";
import { hapticClick, hapticMilestone } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";
const GREEN = "#3DAA6A";

const PAGE_VARIANTS = {
  enter:  { opacity: 0, x: 60,  scale: 0.95 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -50, scale: 0.98 },
};
const PAGE_TRANSITION = {
  type:      "spring" as const,
  mass:      0.9,
  stiffness: 260,
  damping:   28,
};

/* ─── Soil telemetry data ─── */
interface TelemetryCard {
  id:       string;
  title:    string;
  subtitle: string;
  body:     string;
  soilBg1:  string;
  soilBg2:  string;
  color:    string;
  icon:     string;
}

function getSoilTelemetry(n: number, k: number, ph: number): TelemetryCard {
  if (n >= 65) {
    return {
      id:      "high_nitrogen",
      title:   "High Nitrogen Balance",
      subtitle: "Dark Maduro Formation Detected",
      body:    "Drastically deepens leaf oil saturation, forcing a dark Maduro format. Thick, waxy cuticle develops — high nicotine strength and a dense, almost oily combustion profile. Expect rich, dark chocolate and earth transitions with maximum aromatic intensity.",
      soilBg1: "#1A0A04",
      soilBg2: "#2D1208",
      color:   "#C87820",
      icon:    "🟤",
    };
  }
  if (k >= 65) {
    return {
      id:      "high_potassium",
      title:   "High Potassium Balance",
      subtitle: "Combustion Elasticity Optimized",
      body:    "Optimizes combustion elasticity and ash structure stability. Prevents tunneling, canoeing, and wrapper splitting under draw pressure. The ash will hold a long, firm column — a hallmark of elite construction and consistent burn physics.",
      soilBg1: "#0A1A08",
      soilBg2: "#142A10",
      color:   GREEN,
      icon:    "🟢",
    };
  }
  if (ph >= 7.2) {
    return {
      id:      "alkaline_soil",
      title:   "Alkaline Soil Profile",
      subtitle: "Reduced Fermentation Depth",
      body:    "High pH inhibits the enzymatic breakdown of chlorophyll during fermentation, producing lighter-colored leaves with reduced nicotine conversion. Expect milder, more restrained aromatic profiles — ideal for Connecticut Shade and natural wrappers.",
      soilBg1: "#0A0E1A",
      soilBg2: "#14182A",
      color:   "#4A90D9",
      icon:    "🔵",
    };
  }
  if (ph <= 5.0) {
    return {
      id:      "acidic_soil",
      title:   "Acidic Volcanic Soil",
      subtitle: "Maximum Mineral Complexity",
      body:    "High acidity from volcanic mineral deposits supercharges microbial activity in the root zone, producing dense, mineral-forward leaf with complex secondary flavors. This is the signature profile of Estelí, Nicaragua — full-bodied with volcanic earth notes.",
      soilBg1: "#1A0808",
      soilBg2: "#2A1010",
      color:   "#C8322A",
      icon:    "🔴",
    };
  }
  return {
    id:      "balanced",
    title:   "Balanced Terroir Profile",
    subtitle: "Optimal Multi-Leaf Architecture",
    body:    "The sweet spot between N/K/pH produces consistently complex, balanced leaf. Medium body with even oil distribution and predictable fermentation curves. This profile supports the widest range of blend architectures from Robusto to Churchill formats.",
    soilBg1: "#0A1208",
    soilBg2: "#141E10",
    color:   GOLD,
    icon:    "⚡",
  };
}

const HUMIDOR_MATCHES: Record<string, { name: string; origin: string; strength: string }[]> = {
  rich:     [
    { name: "Arturo Fuente Opus X",    origin: "Dominican Republic", strength: "Full"        },
    { name: "Padron 1964 Anniversary", origin: "Nicaragua",          strength: "Full-Medium" },
  ],
  balanced: [
    { name: "Davidoff Nicaragua",      origin: "Nicaragua",          strength: "Medium"      },
    { name: "Rocky Patel Vintage 1990",origin: "Honduras",           strength: "Medium"      },
  ],
  mild:     [
    { name: "Macanudo Café",           origin: "Jamaica/Dominican",  strength: "Mild"        },
    { name: "Ashton Classic",          origin: "Dominican Republic", strength: "Mild-Medium" },
  ],
};

function getHumidorKey(n: number, k: number, ph: number) {
  const richness = (n + k) / 2;
  if (richness > 65 && ph < 6.5) return "rich";
  if (richness < 35 || ph > 7.0) return "mild";
  return "balanced";
}

type Step = "sliders" | "results" | "voucher";

export function S2_TerroirMatrix() {
  const { profile, updateProfile, setPhase, addPoints } = useGuest();

  const [step,   setStep]   = useState<Step>("sliders");
  const [soilN,  setSoilN]  = useState(profile.soilN);
  const [soilK,  setSoilK]  = useState(profile.soilK);
  const [soilPH, setSoilPH] = useState(profile.soilPH);

  const telemetry   = getSoilTelemetry(soilN, soilK, soilPH);
  const humidorKey  = getHumidorKey(soilN, soilK, soilPH);
  const matches     = HUMIDOR_MATCHES[humidorKey];

  function touch() { playClick(); hapticClick(); }

  function handleAnalyze() {
    touch();
    updateProfile({ soilN, soilK, soilPH });
    addPoints(25);
    setStep("results");
  }

  function handleContinue() { touch(); setStep("voucher"); }

  function handleUnlockS3() {
    touch();
    hapticMilestone();
    setPhase("s3_spiritquiz");
  }

  const SLIDERS = [
    { label: "Nitrogen",    sub: "Leaf Growth Catalyst",  val: soilN,  set: setSoilN,  color: "#8AAA4A", min: 10, max: 90, step: 1,   unit: "mg/kg" },
    { label: "Potassium",   sub: "Combustion Control",    val: soilK,  set: setSoilK,  color: "#4A90D9", min: 10, max: 90, step: 1,   unit: "mg/kg" },
    { label: "pH Balance",  sub: "Soil Acidity Index",    val: soilPH, set: setSoilPH, color: "#C8762A", min: 4,  max: 8,  step: 0.1, unit: "pH"    },
  ] as const;

  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      background: "#000000",
      overflow:   "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      <BackButton />

      <div style={{
        position:  "absolute",
        top:       0,
        left:      "50%",
        transform: "translateX(-50%)",
        width:     1100,
        height:    340,
        background: "radial-gradient(ellipse at 50% 0%, rgba(61,170,106,0.10) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "100px 48px 48px",
        overflowY:      "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ── Soil Sliders + Telemetry ── */}
          {step === "sliders" && (
            <motion.div key="sliders"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 1000 }}
            >
              <p style={lbl}>Session 2 · Terroir Matrix · Step 1.6</p>
              <h2 style={hd}>Soil Chemistry Lab</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
                {/* Sliders */}
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {SLIDERS.map(sl => (
                    <div key={sl.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                        <div>
                          <span style={{ color: sl.color, fontSize: 16, fontWeight: 700, letterSpacing: "0.07em" }}>{sl.label}</span>
                          <span style={{ color: "rgba(240,232,212,0.30)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", marginLeft: 10 }}>{sl.sub}</span>
                        </div>
                        <motion.span key={sl.val} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                          style={{ color: sl.color, fontSize: 22, fontWeight: 800 }}>
                          {sl.label === "pH Balance" ? (sl.val as number).toFixed(1) : sl.val} {sl.unit}
                        </motion.span>
                      </div>

                      <div style={{ position: "relative", height: 50, display: "flex", alignItems: "center" }}>
                        <div style={{ position: "absolute", left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }} />
                        <div style={{
                          position:     "absolute",
                          left:         0,
                          width:        `${((sl.val - sl.min) / (sl.max - sl.min)) * 100}%`,
                          height:       6,
                          background:   `linear-gradient(90deg, ${sl.color}55, ${sl.color})`,
                          borderRadius: 3,
                          boxShadow:    `0 0 10px ${sl.color}60`,
                          transition:   "width 0.08s",
                        }} />
                        <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val}
                          onChange={e => sl.set(Number(e.target.value))}
                          style={{ position: "absolute", left: 0, right: 0, width: "100%", height: 50, opacity: 0, zIndex: 3, cursor: "pointer", touchAction: "none", margin: 0, padding: 0 }} />
                        <motion.div
                          animate={{ left: `calc(${((sl.val - sl.min) / (sl.max - sl.min)) * 100}% - 15px)` }}
                          transition={{ type: "spring", stiffness: 420, damping: 30 }}
                          style={{
                            position:      "absolute",
                            width:         30,
                            height:        30,
                            borderRadius:  "50%",
                            background:    `radial-gradient(circle at 34% 28%, #fff9, ${sl.color} 55%, #2A1000)`,
                            border:        `2.5px solid ${sl.color}`,
                            boxShadow:     `0 0 18px ${sl.color}88, 0 2px 8px rgba(0,0,0,0.60)`,
                            pointerEvents: "none",
                            top:           "50%",
                            transform:     "translateY(-50%)",
                            zIndex:        2,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <motion.button type="button" onPointerDown={handleAnalyze} whileTap={{ scale: 0.97 }}
                    style={{
                      padding:       "22px",
                      background:    `linear-gradient(135deg, ${GREEN} 0%, #1E7A44 100%)`,
                      border:        "none",
                      borderRadius:  12,
                      color:         "#fff",
                      fontSize:      20,
                      fontWeight:    900,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      cursor:        "pointer",
                      fontFamily:    "'Inter', sans-serif",
                      boxShadow:     `0 0 32px rgba(61,170,106,0.28)`,
                    }}>
                    ANALYZE TERROIR PROFILE →
                  </motion.button>
                </div>

                {/* ── Live Telemetry Card ── */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={telemetry.id}
                    initial={{ opacity: 0, x: 24, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0,  scale: 1  }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ type: "spring", mass: 0.7, stiffness: 320, damping: 28 }}
                    style={{
                      background: `linear-gradient(155deg, ${telemetry.soilBg2} 0%, ${telemetry.soilBg1} 100%)`,
                      border:     `1.5px solid ${telemetry.color}44`,
                      borderRadius: 18,
                      overflow:   "hidden",
                      display:    "flex",
                      flexDirection: "column",
                      boxShadow:  `0 0 40px ${telemetry.color}18, 0 8px 32px rgba(0,0,0,0.55)`,
                    }}
                  >
                    {/* Soil texture top */}
                    <div style={{
                      height:     140,
                      background: `
                        radial-gradient(ellipse 80% 60% at 30% 40%, ${telemetry.color}22 0%, transparent 60%),
                        linear-gradient(180deg, ${telemetry.soilBg2}EE 0%, ${telemetry.soilBg1} 100%)
                      `,
                      position:   "relative",
                      overflow:   "hidden",
                      display:    "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {/* Texture dots */}
                      <div style={{
                        position:   "absolute",
                        inset:      0,
                        backgroundImage: `radial-gradient(${telemetry.color}18 1px, transparent 1px)`,
                        backgroundSize: "14px 14px",
                      }} />
                      {/* Soil layer lines */}
                      {[0.18, 0.36, 0.55, 0.72].map((op, i) => (
                        <div key={i} style={{
                          position:   "absolute",
                          left:       0,
                          right:      0,
                          top:        `${25 + i * 18}%`,
                          height:     1,
                          background: `rgba(${i % 2 === 0 ? "180,130,60" : "100,70,30"},${op * 0.6})`,
                        }} />
                      ))}
                      <span style={{ fontSize: 40, position: "relative", zIndex: 2 }}>{telemetry.icon}</span>
                    </div>

                    {/* Content */}
                    <div style={{ padding: "20px 20px 24px", flex: 1 }}>
                      <div style={{
                        fontSize:      9,
                        letterSpacing: "0.30em",
                        color:         `${telemetry.color}99`,
                        textTransform: "uppercase",
                        fontWeight:    700,
                        marginBottom:  6,
                      }}>
                        {telemetry.subtitle}
                      </div>
                      <h4 style={{
                        fontFamily:    "'Cormorant Garamond', Georgia, serif",
                        fontSize:      20,
                        fontWeight:    400,
                        color:         "#F0E8D4",
                        margin:        "0 0 12px",
                        lineHeight:    1.3,
                      }}>
                        {telemetry.title}
                      </h4>
                      <p style={{
                        fontSize:   13,
                        color:      "rgba(240,232,212,0.50)",
                        lineHeight: 1.60,
                        margin:     0,
                      }}>
                        {telemetry.body}
                      </p>

                      {/* Metric bars */}
                      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "N", pct: Math.round(((soilN - 10) / 80) * 100), color: "#8AAA4A" },
                          { label: "K", pct: Math.round(((soilK - 10) / 80) * 100), color: "#4A90D9" },
                          { label: "pH", pct: Math.round(((soilPH - 4) / 4) * 100), color: "#C8762A" },
                        ].map(m => (
                          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: m.color, width: 22, letterSpacing: "0.08em" }}>{m.label}</span>
                            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
                              <motion.div
                                animate={{ width: `${m.pct}%` }}
                                transition={{ duration: 0.3 }}
                                style={{ height: "100%", background: m.color, borderRadius: 2, boxShadow: `0 0 6px ${m.color}60` }}
                              />
                            </div>
                            <span style={{ fontSize: 11, color: m.color, fontWeight: 700, width: 28, textAlign: "right" }}>{m.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── Humidor Match ── */}
          {step === "results" && (
            <motion.div key="results"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 720 }}
            >
              <p style={lbl}>Session 2 · Humidor Inventory Match</p>
              <h2 style={hd}>
                Your Soil Profile ·{" "}
                <span style={{ color: GREEN }}>{humidorKey.charAt(0).toUpperCase() + humidorKey.slice(1)}</span>
              </h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 32px" }}>
                Live stock match from tonight's physical humidor.
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: 28, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px" }}>
                {[
                  { label: "Nitrogen",  val: soilN,           color: "#8AAA4A", unit: " mg" },
                  { label: "Potassium", val: soilK,           color: "#4A90D9", unit: " mg" },
                  { label: "pH",        val: soilPH.toFixed(1), color: "#C8762A", unit: "" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}{s.unit}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", letterSpacing: "0.18em", textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                {matches.map((m, i) => (
                  <motion.div key={m.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background:   "rgba(61,170,106,0.06)",
                      border:       "1.5px solid rgba(61,170,106,0.30)",
                      borderRadius: 14,
                      padding:      "22px 26px",
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#F0E8D4", marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: 14, color: "rgba(240,232,212,0.45)", letterSpacing: "0.10em" }}>
                        {m.origin} · {m.strength} Strength
                      </div>
                    </div>
                    <div style={{
                      background:   "rgba(61,170,106,0.14)",
                      border:       `1px solid ${GREEN}55`,
                      borderRadius: 8,
                      padding:      "6px 14px",
                      fontSize:     12,
                      fontWeight:   800,
                      color:        GREEN,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}>
                      IN STOCK
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button type="button" onPointerDown={handleContinue} whileTap={{ scale: 0.97 }}
                style={cta}>
                CLAIM SESSION VOUCHER →
              </motion.button>
            </motion.div>
          )}

          {/* ── Voucher ── */}
          {step === "voucher" && (
            <motion.div key="voucher"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 600, textAlign: "center" }}
            >
              <div style={{ fontSize: 64, marginBottom: 20 }}>🍽</div>
              <p style={lbl}>Session 2 · Complete</p>
              <h2 style={hd}>Premium Appetizer Voucher</h2>
              <div style={{
                background:   "rgba(212,175,55,0.08)",
                border:       `2px dashed ${GOLD}55`,
                borderRadius: 16,
                padding:      "32px",
                margin:       "0 0 32px",
              }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, letterSpacing: "0.24em", marginBottom: 8 }}>
                  SMKTERR-{Math.random().toString(36).substring(2,8).toUpperCase()}
                </div>
                <p style={{ color: "rgba(240,232,212,0.55)", fontSize: 18 }}>
                  Present to your server · Complimentary premium appetizer
                </p>
              </div>
              <motion.button type="button" onPointerDown={handleUnlockS3} whileTap={{ scale: 0.97 }}
                style={{ ...cta, boxShadow: `0 0 36px rgba(212,175,55,0.28)` }}>
                BEGIN SESSION 3 →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  fontSize:      10,
  letterSpacing: "0.38em",
  color:         "rgba(61,170,106,0.80)",
  textTransform: "uppercase",
  fontWeight:    700,
  margin:        "0 0 10px",
};
const hd: React.CSSProperties = {
  fontFamily:    "'Cormorant Garamond', Georgia, serif",
  fontSize:      "clamp(28px, 4vw, 46px)",
  fontWeight:    300,
  color:         "#F0E8D4",
  margin:        "0 0 32px",
  letterSpacing: "0.05em",
};
const cta: React.CSSProperties = {
  width:         "100%",
  padding:       "22px",
  background:    "linear-gradient(135deg, #D4AF37 0%, #9A7A14 100%)",
  border:        "none",
  borderRadius:  12,
  color:         "#0A0604",
  fontSize:      20,
  fontWeight:    900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  cursor:        "pointer",
  fontFamily:    "'Inter', sans-serif",
};
