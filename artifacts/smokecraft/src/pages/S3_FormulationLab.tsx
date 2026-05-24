import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNoveeGuest } from "@/contexts/NoveeGuestProfileContext";
import { NoveeBackButton } from "@/components/NoveeBackButton";
import { playClick } from "@/hooks/useNoveeAudio";
import { hapticClick, hapticMilestone, hapticError } from "@/hooks/useNoveeHaptic";
import { XPFeedback } from "@/components/XPFeedback";
import { PairingAffinityMeter } from "@/components/PairingAffinityMeter";
import { calcPairingAffinity, DRINK_OPTIONS } from "@/lib/pairingEngine";

const GOLD = "#D4AF37";
const COPPER = "#C8762A";

const VITOLAS = [
  { id: "robusto", name: "Robusto", ring: 50, length: '5"', desc: "Classic proportion, intense draw." },
  { id: "toro", name: "Toro", ring: 52, length: '6"', desc: "Perfectly balanced burn time." },
  { id: "churchill", name: "Churchill", ring: 48, length: '7"', desc: "Grand format, evolving flavor." },
  { id: "lonsdale", name: "Lonsdale", ring: 42, length: '6.5"', desc: "Slender, concentrated aroma." },
  { id: "corona", name: "Corona", ring: 42, length: '5.5"', desc: "Traditional standard profile." },
  { id: "belicoso", name: "Belicoso", ring: 52, length: '5.5"', desc: "Tapered head for focused draw." },
  { id: "figurado", name: "Figurado", ring: 54, length: '6"', desc: "Artistic shape, variable burn." },
  { id: "lancero", name: "Lancero", ring: 38, length: '7.5"', desc: "Elegant, wrapper-dominant taste." },
];

const CUTS = [
  { id: "straight", name: "Straight Cut", desc: "Maximum draw, clean finish." },
  { id: "vcut", name: "V-Cut", desc: "Deep wedge, concentrated oils." },
  { id: "punch", name: "Punch Cut", desc: "Tight draw, preserves cap." },
];

const FOODS = [
  { id: "dark_choc", name: "72% Dark Chocolate", category: "chocolate" as const },
  { id: "aged_cheddar", name: "Aged Cheddar", category: "cheese" as const },
  { id: "charcuterie", name: "Ibérico Ham", category: "charcuterie" as const },
  { id: "almonds", name: "Smoked Almonds", category: "nuts" as const },
];

type Step = "vitola" | "cut" | "toast" | "draw" | "pairing" | "complete";

export function S3_FormulationLab() {
  const { updateProfile, setPhase, addPoints, profile } = useNoveeGuest();

  const [step, setStep] = useState<Step>("vitola");
  const [selectedVitola, setSelectedVitola] = useState(profile.vitola);
  const [selectedCut, setSelectedCut] = useState<string | null>(profile.capCut);
  const [toastProgress, setToastProgress] = useState(0);
  const [drawTaps, setDrawTaps] = useState<number[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [xpChange, setXpChange] = useState<{ amount: number; type: "merit" | "points" } | null>(null);

  const currentDrink = DRINK_OPTIONS.find(d => d.id === selectedDrink);
  const currentFood = FOODS.find(f => f.id === selectedFood);

  const affinity = (currentDrink)
    ? calcPairingAffinity(
        { 
          dominantNotes: profile.flavorProfile || ["earthy", "cedar"], 
          body: (profile.ligero > 40 ? "full" : profile.ligero > 20 ? "medium" : "mild"),
          strength: (profile.ligero > 40 ? "full" : profile.ligero > 20 ? "medium" : "mild")
        },
        currentDrink,
        currentFood || null
      )
    : null;

  function touch() { playClick(); hapticClick(); }

  const triggerXP = (amount: number, type: "merit" | "points" = "points") => {
    setXpChange({ amount, type });
    if (type === "points") addPoints(amount);
    // merit update handled via updateProfile elsewhere if needed
  };

  const nextStep = () => {
    touch();
    if (step === "vitola") setStep("cut");
    else if (step === "cut") setStep("toast");
    else if (step === "toast") setStep("draw");
    else if (step === "draw") setStep("pairing");
    else if (step === "pairing") {
      if (profile.visitPairings >= 1) {
        setStep("complete");
      } else {
        updateProfile({ 
          visitPairings: profile.visitPairings + 1,
          pairingHistory: [
            ...profile.pairingHistory,
            {
              cigar: `${selectedVitola} blend`,
              drink: currentDrink?.name || null,
              food: currentFood?.name || null,
              xp: 20
            }
          ]
        });
        setPhase("s4_designstudio");
      }
    }
  };

  useEffect(() => {
    if (step === "toast" && toastProgress < 100) {
      const t = setTimeout(() => setToastProgress(p => Math.min(100, p + 2)), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step, toastProgress]);

  const handleDrawTap = () => {
    touch();
    const now = Date.now();
    const newTaps = [...drawTaps, now].filter(t => now - t < 2000);
    setDrawTaps(newTaps);
    if (newTaps.length === 3) {
      hapticMilestone();
      triggerXP(10);
      setTimeout(nextStep, 1000);
    }
  };

  const handleOverride = () => {
    touch();
    updateProfile({ visitPairings: 0 });
    setPhase("crafthub");
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "#050302",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* S3 — Vitola / Formulation cinematic background */}
      <img src={`${import.meta.env.BASE_URL}images/cigar_hero.jpg`} alt="" aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%", opacity: 0.26, pointerEvents: "none" }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(5,3,2,0.75) 0%, rgba(5,3,2,0.58) 45%, rgba(5,3,2,0.88) 100%)", pointerEvents: "none" }} />
      <NoveeBackButton />

      <AnimatePresence>
        {xpChange && (
          <XPFeedback
            amount={xpChange.amount}
            type={xpChange.type}
            onComplete={() => setXpChange(null)}
          />
        )}
      </AnimatePresence>

      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1200,
        height: 400,
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 48px 48px",
        overflowY: "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ── Vitola Wall ── */}
          {step === "vitola" && (
            <motion.div
              key="vitola"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: "100%", maxWidth: 1000 }}
            >
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <p style={{ fontSize: 12, letterSpacing: "0.4em", color: GOLD, fontWeight: 900, textTransform: "uppercase" }}>
                  The Architect — The Ritual
                </p>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, color: "#F0E8D4", margin: "10px 0" }}>
                  Select Your Vitola
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
                {VITOLAS.map(v => (
                  <motion.div
                    key={v.id}
                    onPointerDown={() => { touch(); setSelectedVitola(v.id); }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: 24,
                      background: selectedVitola === v.id ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selectedVitola === v.id ? GOLD : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 16,
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 15 }}>
                      <div style={{ 
                        width: v.ring / 2, 
                        height: parseInt(v.length) * 15, 
                        background: `linear-gradient(to right, #4A2800, #633908, #4A2800)`,
                        borderRadius: "4px 4px 2px 2px",
                        boxShadow: "0 10px 20px rgba(0,0,0,0.5)"
                      }} />
                    </div>
                    <h3 style={{ color: "#F0E8D4", margin: "0 0 5px", fontSize: 18 }}>{v.name}</h3>
                    <p style={{ color: GOLD, fontSize: 12, fontWeight: 700, margin: 0 }}>{v.ring} RING × {v.length}</p>
                  </motion.div>
                ))}
              </div>

              <button 
                onPointerDown={selectedVitola ? nextStep : undefined}
                style={{ 
                  width: "100%", padding: 24, borderRadius: 12, border: "none",
                  background: selectedVitola ? GOLD : "rgba(255,255,255,0.05)",
                  color: selectedVitola ? "#000" : "#555",
                  fontWeight: 900, letterSpacing: "0.2em", fontSize: 18, cursor: selectedVitola ? "pointer" : "default"
                }}
              >
                CONFIRM ARCHITECTURE
              </button>
            </motion.div>
          )}

          {/* ── Cut Type ── */}
          {step === "cut" && (
            <motion.div
              key="cut"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              style={{ width: "100%", maxWidth: 800, textAlign: "center" }}
            >
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, color: "#F0E8D4", marginBottom: 40 }}>
                Choose Your Aperture
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 30, marginBottom: 50 }}>
                {CUTS.map(c => (
                  <motion.div
                    key={c.id}
                    onPointerDown={() => { touch(); setSelectedCut(c.id); }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: 30,
                      background: selectedCut === c.id ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${selectedCut === c.id ? GOLD : "rgba(255,255,255,0.05)"}`,
                      borderRadius: 20,
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ 
                      width: 80, height: 80, margin: "0 auto 20px", borderRadius: "50%", 
                      border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" 
                    }}>
                       {/* Cut visual placeholder */}
                       <div style={{ 
                         width: 40, height: c.id === 'vcut' ? 10 : 40, 
                         background: GOLD, 
                         borderRadius: c.id === 'straight' ? 0 : '50%' 
                       }} />
                    </div>
                    <h3 style={{ color: "#F0E8D4", fontSize: 20 }}>{c.name}</h3>
                    <p style={{ color: "rgba(240,232,212,0.5)", fontSize: 14 }}>{c.desc}</p>
                  </motion.div>
                ))}
              </div>

              <button 
                onPointerDown={selectedCut ? nextStep : undefined}
                style={{ 
                  padding: "20px 60px", borderRadius: 12, border: "none",
                  background: selectedCut ? GOLD : "rgba(255,255,255,0.05)",
                  color: "#000", fontWeight: 900, fontSize: 16, cursor: "pointer"
                }}
              >
                PREPARE FOR IGNITION
              </button>
            </motion.div>
          )}

          {/* ── Toasting ── */}
          {step === "toast" && (
            <motion.div
              key="toast"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: "center" }}
            >
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, color: "#F0E8D4", marginBottom: 10 }}>
                Toasting the Foot
              </h2>
              <p style={{ color: GOLD, fontSize: 14, letterSpacing: "0.2em", marginBottom: 40 }}>
                UNIFORM IGNITION IN PROGRESS
              </p>

              <div style={{ position: "relative", width: 300, height: 300, margin: "0 auto" }}>
                 <motion.div 
                   animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   style={{ 
                     position: "absolute", inset: 0, 
                     background: "radial-gradient(circle, rgba(255,100,0,0.3) 0%, transparent 70%)" 
                   }} 
                 />
                 <svg width="200" height="200" viewBox="0 0 100 100" style={{ position: "relative", zIndex: 2 }}>
                    <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
                    <motion.circle 
                      cx="50" cy="50" r="45" 
                      stroke={GOLD} strokeWidth="4" fill="none"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * toastProgress) / 100}
                    />
                    <text x="50" y="55" textAnchor="middle" fill={GOLD} fontSize="12" fontWeight="900">
                      {toastProgress}%
                    </text>
                 </svg>
                 
                 {/* Flame SVG */}
                 <motion.div 
                   animate={{ y: [0, -10, 0], opacity: [0.8, 1, 0.8] }}
                   transition={{ duration: 0.5, repeat: Infinity }}
                   style={{ position: "absolute", bottom: -20, left: "50%", marginLeft: -25 }}
                 >
                   <div style={{ width: 50, height: 70, background: "linear-gradient(to top, #F00, #F90, transparent)", borderRadius: "50% 50% 20% 20%" }} />
                 </motion.div>
              </div>

              {toastProgress === 100 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onPointerDown={nextStep}
                  style={{ marginTop: 50, padding: "15px 40px", background: GOLD, border: "none", borderRadius: 8, fontWeight: 900 }}
                >
                  PROCEED TO DRAW
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── Draw Simulation ── */}
          {step === "draw" && (
            <motion.div
              key="draw"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: "center" }}
            >
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, color: "#F0E8D4", marginBottom: 20 }}>
                The Perfect Draw
              </h2>
              <p style={{ color: "rgba(240,232,212,0.6)", fontSize: 18, marginBottom: 60 }}>
                Tap the center 3 times in quick succession to establish airflow.
              </p>

              <motion.div
                onPointerDown={handleDrawTap}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 240, height: 240, borderRadius: "50%",
                  background: "rgba(255,255,255,0.03)",
                  border: `2px solid ${drawTaps.length > 0 ? GOLD : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto", cursor: "pointer", position: "relative"
                }}
              >
                <div style={{ width: 100, height: 100, borderRadius: "50%", background: GOLD + "22", border: `1px solid ${GOLD}44` }} />
                {drawTaps.map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", border: `4px solid ${GOLD}` }}
                  />
                ))}
              </motion.div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 40 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ 
                    width: 12, height: 12, borderRadius: "50%", 
                    background: drawTaps.length > i ? GOLD : "rgba(255,255,255,0.1)" 
                  }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Beverage & Food Pairing ── */}
          {step === "pairing" && (
            <motion.div
              key="pairing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ width: "100%", maxWidth: 1100 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 40 }}>
                <div>
                   <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: "#F0E8D4", marginBottom: 20 }}>
                     Select Your Accompaniment
                   </h2>
                   
                   <div style={{ marginBottom: 30 }}>
                     <p style={{ fontSize: 10, letterSpacing: "0.2em", color: GOLD, fontWeight: 900, marginBottom: 15 }}>BEVERAGE SELECTION</p>
                     <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        {DRINK_OPTIONS.map(d => (
                          <motion.button
                            key={d.id}
                            onPointerDown={() => { touch(); setSelectedDrink(d.id); }}
                            style={{
                              padding: 15, borderRadius: 10, border: `1px solid ${selectedDrink === d.id ? GOLD : "rgba(255,255,255,0.05)"}`,
                              background: selectedDrink === d.id ? GOLD + "11" : "rgba(255,255,255,0.02)",
                              color: selectedDrink === d.id ? GOLD : "#F0E8D4", fontSize: 13, textAlign: "left"
                            }}
                          >
                            {d.name}
                          </motion.button>
                        ))}
                     </div>
                   </div>

                   <div>
                     <p style={{ fontSize: 10, letterSpacing: "0.2em", color: GOLD, fontWeight: 900, marginBottom: 15 }}>CRAFT FOOD PAIRING (OPTIONAL)</p>
                     <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        {FOODS.map(f => (
                          <motion.button
                            key={f.id}
                            onPointerDown={() => { touch(); setSelectedFood(selectedFood === f.id ? null : f.id); }}
                            style={{
                              padding: 15, borderRadius: 10, border: `1px solid ${selectedFood === f.id ? GOLD : "rgba(255,255,255,0.05)"}`,
                              background: selectedFood === f.id ? GOLD + "11" : "rgba(255,255,255,0.02)",
                              color: selectedFood === f.id ? GOLD : "#F0E8D4", fontSize: 13, textAlign: "left"
                            }}
                          >
                            {f.name}
                          </motion.button>
                        ))}
                     </div>
                   </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: 25 }}>
                   <h3 style={{ fontSize: 14, color: GOLD, letterSpacing: "0.1em", marginBottom: 20 }}>PAIRING ANALYSIS</h3>
                   {affinity ? (
                     <>
                        <PairingAffinityMeter score={affinity.score} label={affinity.label} />
                        <p style={{ marginTop: 20, color: "rgba(240,232,212,0.6)", fontSize: 14, lineHeight: 1.5 }}>
                          {affinity.feedback}
                        </p>
                        <div style={{ marginTop: 30, padding: 15, background: "rgba(0,0,0,0.3)", borderRadius: 10 }}>
                          <p style={{ fontSize: 11, color: GOLD, marginBottom: 5 }}>EXPECTED XP AWARD</p>
                          <p style={{ fontSize: 24, fontWeight: 900, color: "#FFF", margin: 0 }}>
                             +{5 + (selectedDrink ? 10 : 0) + (selectedFood ? 10 : 0)} XP
                          </p>
                        </div>
                     </>
                   ) : (
                     <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, textAlign: "center", marginTop: 40 }}>
                       Select a beverage to begin analysis
                     </p>
                   )}
                </div>
              </div>

              <button 
                onPointerDown={selectedDrink ? nextStep : undefined}
                style={{ 
                  width: "100%", marginTop: 40, padding: 24, borderRadius: 12, border: "none",
                  background: selectedDrink ? GOLD : "rgba(255,255,255,0.05)",
                  color: "#000", fontWeight: 900, fontSize: 18, cursor: selectedDrink ? "pointer" : "default"
                }}
              >
                FINALIZE PAIRING →
              </button>
            </motion.div>
          )}

          {/* ── Visit Lock / Complete ── */}
          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ width: "100%", maxWidth: 700, textAlign: "center" }}
            >
              <div style={{ 
                background: "rgba(212,175,55,0.05)", 
                border: `2px solid ${GOLD}`, 
                borderRadius: 24, 
                padding: "60px 40px",
                position: "relative",
                overflow: "hidden"
              }}>
                 <motion.div 
                   animate={{ opacity: [0.1, 0.3, 0.1] }}
                   transition={{ duration: 4, repeat: Infinity }}
                   style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${GOLD}33, transparent 70%)` }}
                 />
                 
                 <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, color: "#F0E8D4", marginBottom: 15, position: "relative" }}>
                   Your Ritual is Complete
                 </h2>
                 <p style={{ color: GOLD, fontSize: 16, letterSpacing: "0.3em", marginBottom: 40, position: "relative" }}>
                   LIMIT REACHED FOR THIS VISIT
                 </p>

                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40, position: "relative" }}>
                    <div style={{ padding: 20, background: "rgba(0,0,0,0.4)", borderRadius: 16 }}>
                       <p style={{ fontSize: 12, color: GOLD, margin: "0 0 5px" }}>TOTAL SESSION XP</p>
                       <p style={{ fontSize: 32, fontWeight: 900, color: "#FFF", margin: 0 }}>{profile.points}</p>
                    </div>
                    <div style={{ padding: 20, background: "rgba(0,0,0,0.4)", borderRadius: 16 }}>
                       <p style={{ fontSize: 12, color: GOLD, margin: "0 0 5px" }}>MERIT STANDING</p>
                       <p style={{ fontSize: 32, fontWeight: 900, color: "#FFF", margin: 0 }}>{profile.merit}</p>
                    </div>
                 </div>

                 <p style={{ color: "rgba(240,232,212,0.6)", fontSize: 16, lineHeight: 1.6, marginBottom: 40, position: "relative" }}>
                   You have completed 2 master-tier pairings. To preserve the integrity of the palate, 
                   further sessions are restricted until your next lounge visit.
                 </p>

                 <div style={{ display: "flex", flexDirection: "column", gap: 15, position: "relative" }}>
                    <button 
                      onPointerDown={() => { touch(); setPhase("s4_designstudio"); }}
                      style={{ padding: 20, background: GOLD, border: "none", borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: "pointer" }}
                    >
                      VIEW SESSION SUMMARY
                    </button>
                    {profile.skipTokens > 0 && profile.pairingHistory.filter(p => p.xp >= 20).length >= 3 && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        onPointerDown={() => { touch(); updateProfile({ skipTokens: profile.skipTokens - 1 }); setPhase("s4_designstudio"); }}
                        style={{ padding: 20, background: "linear-gradient(135deg, #8B6914, #D4AF37, #8B6914)", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 16, cursor: "pointer", boxShadow: `0 0 24px ${GOLD}55`, color: "#000", letterSpacing: "0.08em" }}
                      >
                        ADVANCE TO LEGACY — SKIP TOKEN ({profile.skipTokens})
                      </motion.button>
                    )}
                    <button 
                      onPointerDown={handleOverride}
                      style={{ 
                        padding: 15, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", 
                        borderRadius: 12, color: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      STAFF OVERRIDE (PIN REQUIRED)
                    </button>
                 </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
