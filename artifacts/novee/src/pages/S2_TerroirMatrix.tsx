import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { hapticMilestone } from "@/hooks/useHaptic";

const GOLD  = "#D4AF37";
const GREEN = "#3DAA6A";

const PV = {
  enter:  { opacity: 0, x: 60,  scale: 0.95 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -50, scale: 0.98 },
};
const PT = { type: "spring" as const, mass: 0.9, stiffness: 260, damping: 28 };

/* ── Telemetry cards keyed to soil state ── */
interface Card {
  id:       string;
  title:    string;
  subtitle: string;
  body:     string;
  color:    string;
  icon:     string;
  bgTop:    string;
  bgBot:    string;
  grainColor: string;
}

function getTelemetry(n: number, k: number, ph: number): Card {
  if (n >= 65) return {
    id:       "high_n",
    title:    "High Nitrogen Balance",
    subtitle: "Dark Maduro Formation Active",
    body:     "Maximum nitrogen deepens leaf oil saturation, forcing a dense Maduro wrapper format. Thick, waxy cuticle develops — elevated nicotine strength and heavy aromatic combustion. Expect dark chocolate, earth, and leather transition notes across the full smoke.",
    color:    "#C87820",
    icon:     "N",
    bgTop:    "#1A0A02",
    bgBot:    "#2E1408",
    grainColor: "rgba(200,120,32,0.15)",
  };
  if (k >= 65) return {
    id:       "high_k",
    title:    "High Potassium Balance",
    subtitle: "Combustion Elasticity Optimized",
    body:     "Elevated potassium optimizes combustion elasticity and ash column stability, preventing structural tunneling, canoeing, and wrapper splits under draw pressure. The ash holds a long, firm, pearl-white column — the mark of elite blend construction.",
    color:    GREEN,
    icon:     "K",
    bgTop:    "#071408",
    bgBot:    "#0E2210",
    grainColor: "rgba(61,170,106,0.14)",
  };
  if (ph >= 7.2) return {
    id:       "alkaline",
    title:    "Alkaline Soil Profile",
    subtitle: "Reduced Fermentation Depth",
    body:     "High pH inhibits enzymatic chlorophyll breakdown during fermentation, producing lighter-colored leaves with reduced nicotine conversion. Expect a milder, restrained aromatic profile — ideal for Connecticut Shade and natural wrapper constructions.",
    color:    "#4A90D9",
    icon:     "pH↑",
    bgTop:    "#080E1A",
    bgBot:    "#101822",
    grainColor: "rgba(74,144,217,0.12)",
  };
  if (ph <= 5.0) return {
    id:       "acid",
    title:    "Acidic Volcanic Soil",
    subtitle: "Maximum Mineral Complexity",
    body:     "High volcanic acidity supercharges microbial activity in the root zone, producing mineral-dense leaf with complex secondary flavor compounds. This is the signature of Estelí, Nicaragua — full-body, volcanic earth, and a robust palate intensity.",
    color:    "#C8322A",
    icon:     "pH↓",
    bgTop:    "#180604",
    bgBot:    "#280A08",
    grainColor: "rgba(200,50,42,0.13)",
  };
  return {
    id:       "balanced",
    title:    "Balanced Terroir Profile",
    subtitle: "Optimal Multi-Leaf Architecture",
    body:     "The equilibrium between N/K/pH produces consistently complex, balanced leaf with even oil distribution and predictable fermentation curves. This profile supports the widest range of blend architectures — from Robusto to Churchill formats.",
    color:    GOLD,
    icon:     "⚖",
    bgTop:    "#0C1008",
    bgBot:    "#141C0E",
    grainColor: "rgba(212,175,55,0.11)",
  };
}

const HUMIDOR: Record<string, { name: string; origin: string; strength: string }[]> = {
  rich:     [{ name: "Arturo Fuente Opus X",     origin: "Dominican Republic", strength: "Full"        },
             { name: "Padron 1964 Anniversary",   origin: "Nicaragua",          strength: "Full-Medium" }],
  balanced: [{ name: "Davidoff Nicaragua",        origin: "Nicaragua",          strength: "Medium"      },
             { name: "Rocky Patel Vintage 1990",  origin: "Honduras",           strength: "Medium"      }],
  mild:     [{ name: "Macanudo Café",             origin: "Jamaica/Dominican",  strength: "Mild"        },
             { name: "Ashton Classic",             origin: "Dominican Republic", strength: "Mild-Medium" }],
};

function getHumidorKey(n: number, k: number, ph: number) {
  const r = (n + k) / 2;
  if (r > 65 && ph < 6.5) return "rich";
  if (r < 35 || ph > 7.0) return "mild";
  return "balanced";
}

/* ── Volcanic soil SVG ── */
function SoilTexture({ card }: { card: Card }) {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 1 }}>
      <defs>
        <filter id={`soil_${card.id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="5" seed="14" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="matrix"
            values="0 0 0 0 0.04  0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 0.55 0"
            in="noise" result="dark" />
          <feBlend in="SourceGraphic" in2="dark" mode="multiply" />
        </filter>
        <linearGradient id={`soilGrad_${card.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={card.bgTop} />
          <stop offset="100%" stopColor={card.bgBot} />
        </linearGradient>
      </defs>

      {/* Base soil gradient */}
      <rect width="100%" height="100%" fill={`url(#soilGrad_${card.id})`} />

      {/* Soil strata lines */}
      {[22, 35, 48, 60, 72, 84].map((pct, i) => (
        <line key={i} x1="0" y1={`${pct}%`} x2="100%" y2={`${pct + (i % 2 === 0 ? 1 : -0.5)}%`}
          stroke={card.grainColor} strokeWidth={i % 3 === 0 ? 1.5 : 0.7} />
      ))}

      {/* Mineral particle field */}
      {Array.from({ length: 28 }, (_, i) => {
        const x  = (i * 97 + 13) % 100;
        const y  = (i * 53 + 27) % 100;
        const r  = 0.8 + (i % 4) * 0.5;
        const op = 0.20 + (i % 5) * 0.07;
        return <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill={card.color} opacity={op} />;
      })}

      {/* Texture noise on top */}
      <rect width="100%" height="100%" filter={`url(#soil_${card.id})`} opacity="0.38" />

      {/* Top glow */}
      <ellipse cx="50%" cy="20%" rx="55%" ry="30%"
        fill={card.color} opacity="0.08" />
    </svg>
  );
}

type Step = "sliders" | "results" | "voucher";

export function S2_TerroirMatrix() {
  const { profile, updateProfile, setPhase, addPoints } = useGuest();

  const [step,   setStep]   = useState<Step>("sliders");
  const [soilN,  setSoilN]  = useState(profile.soilN);
  const [soilK,  setSoilK]  = useState(profile.soilK);
  const [soilPH, setSoilPH] = useState(profile.soilPH);

  const telemetry  = useMemo(() => getTelemetry(soilN, soilK, soilPH), [soilN, soilK, soilPH]);
  const humidorKey = useMemo(() => getHumidorKey(soilN, soilK, soilPH), [soilN, soilK, soilPH]);
  const matches    = HUMIDOR[humidorKey];

  function handleAnalyze() {
    updateProfile({ soilN, soilK, soilPH });
    addPoints(25);
    setStep("results");
  }

  const SLIDERS = [
    { label: "Nitrogen",   sub: "Leaf Growth Catalyst",  val: soilN,  set: setSoilN,  color: "#8AAA4A", min: 10, max: 90, step: 1,   unit: "mg/kg" },
    { label: "Potassium",  sub: "Combustion Control",    val: soilK,  set: setSoilK,  color: "#4A90D9", min: 10, max: 90, step: 1,   unit: "mg/kg" },
    { label: "pH Balance", sub: "Soil Acidity Index",    val: soilPH, set: setSoilPH, color: "#C8762A", min: 4,  max: 8,  step: 0.1, unit: "pH"    },
  ] as const;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <BackButton />

      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${GREEN}66 30%, ${GREEN}AA 50%, ${GREEN}66 70%, transparent)`,
        boxShadow: `0 0 28px 2px rgba(61,170,106,0.20)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "100px 48px 60px",
        overflowY: "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ── Soil Sliders + Live Telemetry ── */}
          {step === "sliders" && (
            <motion.div key="sliders" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 1020 }}>
              <p style={EyebrowStyle("rgba(61,170,106,0.80)")}>Session 2 · Terroir Matrix · Step 1.6</p>
              <h2 style={HeadingStyle}>Soil Chemistry Lab</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
                {/* Sliders */}
                <div style={{
                  background:     "rgba(255,255,255,0.024)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border:         "1px solid rgba(255,255,255,0.09)",
                  borderRadius:   18,
                  padding:        "28px",
                  boxShadow:      "0 8px 48px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.05)",
                  display:        "flex",
                  flexDirection:  "column",
                  gap:            30,
                }}>
                  {SLIDERS.map(sl => (
                    <div key={sl.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                        <div>
                          <span style={{ color: sl.color, fontSize: 16, fontWeight: 700, letterSpacing: "0.06em" }}>{sl.label}</span>
                          <span style={{ color: "rgba(240,232,212,0.28)", fontSize: 10, letterSpacing: "0.20em", textTransform: "uppercase", marginLeft: 10, fontWeight: 700 }}>{sl.sub}</span>
                        </div>
                        <motion.span key={sl.val} initial={{ scale: 1.22 }} animate={{ scale: 1 }}
                          style={{ color: sl.color, fontSize: 24, fontWeight: 900, letterSpacing: "0.04em" }}>
                          {sl.label === "pH Balance" ? (sl.val as number).toFixed(1) : sl.val}{" "}{sl.unit}
                        </motion.span>
                      </div>

                      <div style={{ position: "relative", height: 52, display: "flex", alignItems: "center" }}>
                        {/* Track */}
                        <div style={{ position: "absolute", left: 0, right: 0, height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 4, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.40)" }} />
                        {/* Fill */}
                        <div style={{
                          position: "absolute", left: 0,
                          width: `${((sl.val - sl.min) / (sl.max - sl.min)) * 100}%`,
                          height: 7,
                          background: `linear-gradient(90deg, ${sl.color}55, ${sl.color})`,
                          borderRadius: 4,
                          boxShadow: `0 0 14px ${sl.color}70`,
                          transition: "width 0.08s",
                        }} />
                        {/* Hidden native range */}
                        <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val}
                          onChange={e => sl.set(Number(e.target.value))}
                          style={{ position: "absolute", left: 0, right: 0, width: "100%", height: 52, opacity: 0, zIndex: 3, cursor: "pointer", touchAction: "none", margin: 0, padding: 0 }} />
                        {/* Premium thumb */}
                        <motion.div
                          animate={{ left: `calc(${((sl.val - sl.min) / (sl.max - sl.min)) * 100}% - 16px)` }}
                          transition={{ type: "spring", stiffness: 500, damping: 32 }}
                          style={{
                            position: "absolute", width: 32, height: 32, borderRadius: "50%",
                            background: `
                              radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55) 0%, ${sl.color} 45%, color-mix(in srgb, ${sl.color} 60%, #000) 100%)
                            `,
                            border: `2px solid rgba(255,255,255,0.30)`,
                            boxShadow: `0 0 24px ${sl.color}99, 0 4px 12px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.30)`,
                            pointerEvents: "none",
                            top: "50%", transform: "translateY(-50%)", zIndex: 2,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <motion.button type="button" onPointerDown={handleAnalyze} whileTap={{ scale: 0.97 }}
                    style={{
                      padding: "22px",
                      background: `linear-gradient(135deg, ${GREEN} 0%, #1C7A40 100%)`,
                      border: "none", borderRadius: 13,
                      color: "#fff", fontSize: 20, fontWeight: 900,
                      letterSpacing: "0.22em", textTransform: "uppercase",
                      cursor: "pointer", fontFamily: "'Inter', sans-serif",
                      boxShadow: `0 0 40px rgba(61,170,106,0.28), 0 8px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.20)`,
                      position: "relative", overflow: "hidden",
                    }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)", borderRadius: "13px 13px 0 0" }} />
                    ANALYZE TERROIR PROFILE →
                  </motion.button>
                </div>

                {/* ── Live Telemetry Card ── */}
                <AnimatePresence mode="wait">
                  <motion.div key={telemetry.id}
                    initial={{ opacity: 0, x: 28, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0,  scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.96 }}
                    transition={{ type: "spring", mass: 0.7, stiffness: 340, damping: 30 }}
                    style={{
                      borderRadius:   18,
                      overflow:       "hidden",
                      border:         `1.5px solid ${telemetry.color}44`,
                      boxShadow:      `0 0 50px ${telemetry.color}18, 0 12px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)`,
                      display:        "flex",
                      flexDirection:  "column",
                      position:       "relative",
                    }}
                  >
                    {/* Photorealistic soil top panel */}
                    <div style={{ height: 180, position: "relative", overflow: "hidden", flexShrink: 0 }}>
                      <SoilTexture card={telemetry} />

                      {/* Chemical symbol */}
                      <div style={{
                        position:  "absolute",
                        top:       "50%",
                        left:      "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize:  telemetry.icon.length <= 1 ? 72 : 42,
                        fontWeight: 900,
                        color:     telemetry.color,
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0",
                        opacity:   0.60,
                        textShadow: `0 0 40px ${telemetry.color}`,
                        zIndex:    3,
                      }}>
                        {telemetry.icon}
                      </div>

                      {/* Rim light */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg, transparent, ${telemetry.color}88, transparent)`,
                      }} />
                    </div>

                    {/* Card body */}
                    <div style={{
                      background:     "rgba(8,8,6,0.92)",
                      backdropFilter: "blur(16px)",
                      padding:        "20px 20px 24px",
                      flex:           1,
                    }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.32em", color: `${telemetry.color}AA`, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                        {telemetry.subtitle}
                      </div>
                      <h4 style={{
                        fontFamily:    "'Cormorant Garamond', Georgia, serif",
                        fontSize:      21,
                        fontWeight:    400,
                        color:         "#F0E8D4",
                        margin:        "0 0 10px",
                        lineHeight:    1.28,
                        letterSpacing: "0.03em",
                      }}>
                        {telemetry.title}
                      </h4>
                      <p style={{ fontSize: 13, color: "rgba(240,232,212,0.46)", lineHeight: 1.62, margin: "0 0 16px" }}>
                        {telemetry.body}
                      </p>

                      {/* Live metric bars */}
                      {[
                        { l: "N", pct: Math.round(((soilN  - 10) / 80) * 100), c: "#8AAA4A" },
                        { l: "K", pct: Math.round(((soilK  - 10) / 80) * 100), c: "#4A90D9" },
                        { l: "pH", pct: Math.round(((soilPH - 4)  / 4)  * 100), c: "#C8762A" },
                      ].map(m => (
                        <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: m.c, width: 24, letterSpacing: "0.08em" }}>{m.l}</span>
                          <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
                            <motion.div
                              animate={{ width: `${m.pct}%` }}
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                              style={{
                                height: "100%", background: m.c, borderRadius: 3,
                                boxShadow: `0 0 6px ${m.c}70`,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: m.c, fontWeight: 800, width: 28, textAlign: "right" }}>{m.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── Humidor Match ── */}
          {step === "results" && (
            <motion.div key="results" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 720 }}>
              <p style={EyebrowStyle("rgba(61,170,106,0.80)")}>Session 2 · Humidor Inventory Match</p>
              <h2 style={HeadingStyle}>
                Soil Profile ·{" "}
                <span style={{ color: GREEN }}>{humidorKey.charAt(0).toUpperCase() + humidorKey.slice(1)}</span>
              </h2>

              <div style={{ display: "flex", gap: 12, marginBottom: 24, background: "rgba(255,255,255,0.025)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 24px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                {[
                  { l: "Nitrogen",  v: soilN,              c: "#8AAA4A", u: " mg" },
                  { l: "Potassium", v: soilK,              c: "#4A90D9", u: " mg" },
                  { l: "pH",        v: soilPH.toFixed(1),  c: "#C8762A", u: "" },
                ].map(s => (
                  <div key={s.l} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.c }}>{s.v}{s.u}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", letterSpacing: "0.20em", textTransform: "uppercase" }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {matches.map((m, i) => (
                <motion.div key={m.name}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.14, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    background:   "rgba(61,170,106,0.05)",
                    backdropFilter: "blur(12px)",
                    border:       "1.5px solid rgba(61,170,106,0.28)",
                    borderRadius: 14,
                    padding:      "22px 26px",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                    boxShadow:    "0 4px 20px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#F0E8D4", marginBottom: 4 }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: "rgba(240,232,212,0.42)", letterSpacing: "0.10em" }}>{m.origin} · {m.strength} Strength</div>
                  </div>
                  <div style={{
                    background: "rgba(61,170,106,0.14)", border: `1px solid ${GREEN}55`,
                    borderRadius: 8, padding: "7px 16px", fontSize: 11, fontWeight: 800,
                    color: GREEN, letterSpacing: "0.14em", textTransform: "uppercase",
                    boxShadow: `0 0 14px rgba(61,170,106,0.20)`,
                  }}>
                    IN STOCK
                  </div>
                </motion.div>
              ))}

              <motion.button type="button" onPointerDown={() => setStep("voucher")} whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 8, width: "100%", padding: "22px",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
                  border: "none", borderRadius: 13,
                  color: "#080501", fontSize: 20, fontWeight: 900,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  boxShadow: `0 0 40px rgba(212,175,55,0.22), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.20)`,
                  position: "relative", overflow: "hidden",
                }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)", borderRadius: "13px 13px 0 0" }} />
                CLAIM SESSION VOUCHER →
              </motion.button>
            </motion.div>
          )}

          {/* ── Voucher ── */}
          {step === "voucher" && (
            <motion.div key="voucher" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 640, textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🍽</div>
              <p style={EyebrowStyle("rgba(212,175,55,0.70)")}>Session 2 · Complete</p>
              <h2 style={HeadingStyle}>Premium Appetizer Voucher</h2>
              <div style={{
                background: "rgba(212,175,55,0.06)",
                backdropFilter: "blur(18px)",
                border: `2px dashed ${GOLD}44`,
                borderRadius: 18, padding: "36px",
                margin: "0 0 32px",
                boxShadow: `0 0 40px rgba(212,175,55,0.12), inset 0 1px 0 rgba(255,255,255,0.05)`,
              }}>
                <div style={{ fontSize: 34, fontWeight: 900, color: GOLD, letterSpacing: "0.22em", marginBottom: 10, textShadow: `0 0 30px rgba(212,175,55,0.50)` }}>
                  SMKTERR-{Math.random().toString(36).substring(2,8).toUpperCase()}
                </div>
                <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 17, margin: 0, lineHeight: 1.5 }}>
                  Present to your server · Complimentary premium appetizer
                </p>
              </div>
              <motion.button type="button"
                onPointerDown={() => { hapticMilestone(); setPhase("s3_spiritquiz"); }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%", padding: "23px",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #B8960A 55%, #9A7A14 100%)`,
                  border: "none", borderRadius: 13,
                  color: "#080501", fontSize: 20, fontWeight: 900,
                  letterSpacing: "0.24em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  boxShadow: `0 0 50px rgba(212,175,55,0.30), 0 8px 36px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.22)`,
                  position: "relative", overflow: "hidden",
                }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)", borderRadius: "13px 13px 0 0" }} />
                BEGIN SESSION 3 →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

const EyebrowStyle = (color: string): React.CSSProperties => ({
  fontSize: 10, letterSpacing: "0.42em", color,
  textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px",
});
const HeadingStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: "clamp(28px, 4vw, 46px)",
  fontWeight: 300, color: "#F0E8D4",
  margin: "0 0 32px", letterSpacing: "0.05em",
  textShadow: "0 0 40px rgba(212,175,55,0.08)",
};
