import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNoveeGuest } from "@/contexts/NoveeGuestProfileContext";
import { NoveeBackButton } from "@/components/NoveeBackButton";
import { hapticMilestone } from "@/hooks/useNoveeHaptic";

const GOLD = "#D4AF37";
const AMBER = "#C8762A";
const RED = "#C8322A";

const PV = {
  enter: { opacity: 0, x: 60, scale: 0.95 },
  active: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -50, scale: 0.98 },
};
const PT = { type: "spring" as const, mass: 0.9, stiffness: 260, damping: 28 };

const WRAPPERS = [
  { id: "connecticut", name: "Connecticut Shade", body: "mild", notes: ["creamy", "cedar", "nutty"], img: "tobacco_connecticut.png" },
  { id: "corojo", name: "Corojo", body: "medium", notes: ["spice", "pepper", "earth"], img: "tobacco_corojo.png" },
  { id: "criollo", name: "Criollo", body: "full", notes: ["cocoa", "molasses", "pepper"], img: "tobacco_criollo.png" },
  { id: "maduro", name: "Maduro", body: "full", notes: ["chocolate", "sweetness", "dark fruit"], img: "tobacco_criollo.png" },
  { id: "habano", name: "Habano", body: "full", notes: ["spice", "wood", "leather"], img: "tobacco_corojo.png" },
];

export function S2_TerroirMatrix() {
  const { profile, updateProfile, setPhase, addPoints } = useNoveeGuest();
  const [step, setStep] = useState<"intro" | "wrapper" | "anatomy" | "balancing" | "aging" | "wheel">("intro");

  const [wrapper, setWrapper] = useState<string | null>(profile.wrapper);
  const [volado, setVolado] = useState(profile.volado);
  const [seco, setSeco] = useState(profile.seco);
  const [ligero, setLigero] = useState(profile.ligero);
  const [selectedNotes, setSelectedNotes] = useState<string[]>(profile.flavorProfile || []);

  const totalLeaf = volado + seco + ligero;

  function handleWrapperSelect(w: typeof WRAPPERS[0]) {
    setWrapper(w.id);
    updateProfile({ wrapper: w.id });
    hapticMilestone();
    setStep("anatomy");
  }

  function handleFinishBalancing() {
    if (ligero > 40) {
      // Trigger mentor warning overlay (simplified for now)
      console.warn("Too much ligero! Blend stability at risk.");
    }
    updateProfile({ volado, seco, ligero });
    setStep("aging");
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#050505", color: "#F0E8D4", fontFamily: "'Inter', sans-serif" }}>
      <NoveeBackButton />

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div key="intro" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={FullScreenCenter}>
            <p style={EyebrowStyle(GOLD)}>THE ALCHEMIST</p>
            <h1 style={HeadingStyle}>THE CRAFT</h1>
            <p style={SubStyle}>Transforming raw terroir into a masterwork of construction.</p>
            <motion.button onClick={() => setStep("wrapper")} whileTap={{ scale: 0.95 }} style={PrimaryBtnStyle}>
              BEGIN COMPOSITION →
            </motion.button>
          </motion.div>
        )}

        {step === "wrapper" && (
          <motion.div key="wrapper" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={PhaseContainer}>
            <h2 style={PhaseHeading}>Select Your Wrapper</h2>
            <div style={WrapperGrid}>
              {WRAPPERS.map(w => (
                <motion.div key={w.id} onClick={() => handleWrapperSelect(w)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ ...WrapperCard, border: wrapper === w.id ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.1)" }}>
                  <img src={`${import.meta.env.BASE_URL}images/${w.img}`} alt={w.name} style={WrapperImg} />
                  <div style={WrapperInfo}>
                    <h3>{w.name}</h3>
                    <p>{w.body.toUpperCase()} BODY</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {step === "anatomy" && (
          <motion.div key="anatomy" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={PhaseContainer}>
            <h2 style={PhaseHeading}>Leaf Anatomy</h2>
            <div style={AnatomyVisual}>
               {/* Simplified Diagram */}
               <div style={AnatomySection}>
                 <div style={AnatomyLabel}>WRAPPER</div>
                 <div style={AnatomyBar}>Outer Leaf - Aesthetic & Flavor</div>
               </div>
               <div style={AnatomySection}>
                 <div style={AnatomyLabel}>BINDER</div>
                 <div style={AnatomyBar}>Structural Integrity</div>
               </div>
               <div style={AnatomySection}>
                 <div style={AnatomyLabel}>FILLER</div>
                 <div style={AnatomyBar}>Volado / Seco / Ligero</div>
               </div>
            </div>
            <motion.button onClick={() => setStep("balancing")} style={PrimaryBtnStyle}>
              PROCEED TO BALANCING →
            </motion.button>
          </motion.div>
        )}

        {step === "balancing" && (
          <motion.div key="balancing" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={PhaseContainer}>
            <h2 style={PhaseHeading}>Filler Equilibrium</h2>
            <p style={SubStyle}>Balance the strength and burn rate of your blend.</p>
            
            <div style={SliderGroup}>
              <LeafSlider label="Volado" sub="Combustion" val={volado} set={setVolado} color="#8AAA4A" />
              <LeafSlider label="Seco" sub="Aroma" val={seco} set={setSeco} color="#4A90D9" />
              <LeafSlider label="Ligero" sub="Strength" val={ligero} set={setLigero} color="#C8322A" />
            </div>

            {ligero > 40 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={WarningPanel}>
                <span style={{ color: RED, fontWeight: 900 }}>MENTOR WARNING:</span> Excessive Ligero will impact draw stability and burn temperature.
              </motion.div>
            )}

            <motion.button onClick={handleFinishBalancing} style={PrimaryBtnStyle}>
              FINALIZE BLEND →
            </motion.button>
          </motion.div>
        )}

        {step === "aging" && (
          <motion.div key="aging" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={FullScreenCenter}>
            <h1 style={HeadingStyle}>AGING CHAMBER</h1>
            <div style={AgingAnimation} />
            <p style={SubStyle}>Allowing the oils to marry and flavors to mature...</p>
            <motion.button onClick={() => setStep("wheel")} style={PrimaryBtnStyle}>
              TEST MATURITY →
            </motion.button>
          </motion.div>
        )}

        {step === "wheel" && (
          <motion.div key="wheel" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={PhaseContainer}>
            <h2 style={PhaseHeading}>Flavor Calibration</h2>
            <div style={FlavorGrid}>
               {["Earth", "Cedar", "Spice", "Cocoa", "Leather", "Floral", "Cream", "Pepper"].map(f => (
                 <motion.div key={f} 
                   onClick={() => setSelectedNotes(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                   style={{ ...FlavorNode, background: selectedNotes.includes(f) ? GOLD : "transparent", color: selectedNotes.includes(f) ? "#000" : GOLD }}>
                   {f}
                 </motion.div>
               ))}
            </div>
            <motion.button onClick={() => {
              updateProfile({ flavorProfile: selectedNotes });
              setPhase("s3_spiritquiz"); // Transition to next phase
            }} style={PrimaryBtnStyle}>
              LOCK BLEND PROFILE →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeafSlider({ label, sub, val, set, color }: any) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span>{label} <small style={{ opacity: 0.5 }}>{sub}</small></span>
        <span style={{ color, fontWeight: 800 }}>{val}%</span>
      </div>
      <input type="range" min="0" max="100" value={val} onChange={e => set(Number(e.target.value))} style={SliderInput} />
    </div>
  );
}

// STYLES
const FullScreenCenter: React.CSSProperties = {
  position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center"
};
const PhaseContainer: React.CSSProperties = {
  width: "100%", maxWidth: 1000, margin: "100px auto", padding: "0 24px"
};
const EyebrowStyle = (color: string): React.CSSProperties => ({
  fontSize: 14, letterSpacing: "0.3em", color, marginBottom: 12, fontWeight: 800
});
const HeadingStyle: React.CSSProperties = {
  fontSize: 64, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 24
};
const SubStyle: React.CSSProperties = {
  fontSize: 20, opacity: 0.6, marginBottom: 40, maxWidth: 600
};
const PrimaryBtnStyle: React.CSSProperties = {
  padding: "20px 40px", background: GOLD, color: "#000", border: "none", borderRadius: 4, fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: "0.1em"
};
const PhaseHeading: React.CSSProperties = {
  fontSize: 32, fontWeight: 400, fontFamily: "Cormorant Garamond, serif", marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 16
};
const WrapperGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 40
};
const WrapperCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.2s"
};
const WrapperImg: React.CSSProperties = {
  width: "100%", height: 140, objectFit: "cover"
};
const WrapperInfo: React.CSSProperties = {
  padding: 16
};
const AnatomyVisual: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)", borderRadius: 20, padding: 40, marginBottom: 40, border: "1px solid rgba(255,255,255,0.05)"
};
const AnatomySection: React.CSSProperties = {
  marginBottom: 20
};
const AnatomyLabel: React.CSSProperties = {
  fontSize: 12, letterSpacing: "0.2em", color: GOLD, marginBottom: 8
};
const AnatomyBar: React.CSSProperties = {
  padding: 16, background: "rgba(255,255,255,0.05)", borderRadius: 4, fontSize: 14, opacity: 0.8
};
const SliderGroup: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)", padding: 32, borderRadius: 16, marginBottom: 32
};
const SliderInput: React.CSSProperties = {
  width: "100%", height: 4, background: "rgba(255,255,255,0.1)", appearance: "none", borderRadius: 2
};
const WarningPanel: React.CSSProperties = {
  background: "rgba(200,50,42,0.1)", border: "1px solid #C8322A", padding: 20, borderRadius: 8, marginBottom: 32, fontSize: 14
};
const AgingAnimation: React.CSSProperties = {
  width: 200, height: 200, borderRadius: "50%", border: `2px solid ${GOLD}22`, marginBottom: 40, borderTop: `2px solid ${GOLD}`, animation: "spin 4s linear infinite"
};
const FlavorGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40
};
const FlavorNode: React.CSSProperties = {
  padding: "20px", border: `1px solid ${GOLD}`, borderRadius: 8, textAlign: "center", cursor: "pointer", fontWeight: 700, letterSpacing: "0.1em"
};
