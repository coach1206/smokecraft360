/**
 * S2_TerroirMatrix — THE ALCHEMIST · THE CRAFT (NOVEE OS)
 * Full rebuild: mentor challenge, blend stability scoring, XP/merit awards,
 * ligero warning overlay, flavor wheel, analytics tracking.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";
import { XPFeedback } from "@/components/XPFeedback";
import { calcMeritDelta } from "@/lib/xpEngine";
import { trackEvent } from "@/lib/analyticsEngine";

const GOLD   = "#D4AF37";
const RED    = "#C8322A";
const AMBER  = "#C8762A";

const PV = {
  enter:  { opacity: 0, x: 60,  scale: 0.96 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -50, scale: 0.98 },
};
const PT = { type: "spring" as const, mass: 0.9, stiffness: 260, damping: 28 };

const WRAPPERS = [
  { id: "connecticut", name: "Connecticut Shade", body: "Mild",   notes: ["Creamy", "Cedar", "Nutty"],             color: "#C8A96E" },
  { id: "corojo",      name: "Corojo",            body: "Medium", notes: ["Spice", "Pepper", "Earth"],             color: "#8B4513" },
  { id: "criollo",     name: "Criollo",           body: "Full",   notes: ["Cocoa", "Molasses", "Pepper"],          color: "#5C3317" },
  { id: "maduro",      name: "Maduro",            body: "Full",   notes: ["Dark Chocolate", "Sweetness", "Fruit"], color: "#3B2008" },
  { id: "habano",      name: "Habano",            body: "Full",   notes: ["Spice", "Wood", "Leather"],             color: "#7A4A1E" },
];

type MentorId = "dominican_republic" | "nicaragua" | "honduras" | "venezuela";

const MENTORS: Record<MentorId, {
  name: string; title: string; profile: string; color: string;
  challengeTarget: { volado: [number, number]; seco: [number, number]; ligero: [number, number] };
  challengeText: (c2: string | null) => string;
}> = {
  dominican_republic: {
    name: "Señor Alejandro", title: "MASTER OF CEDAR",
    profile: "Earthy · Cedar · Medium Body", color: "#B8860B",
    challengeTarget: { volado: [30, 42], seco: [30, 42], ligero: [18, 32] },
    challengeText: (c2) => `Construct a medium-bodied blend honoring Dominican cedar and earth. Pair with ${c2 ? c2.replace(/_/g, " ") : "your second terroir"} for complexity. Keep Ligero restrained — balance is everything.`,
  },
  nicaragua: {
    name: "Doña Rosa", title: "KEEPER OF THE VOLCANO",
    profile: "Volcanic · Spicy · Full Body", color: "#C8322A",
    challengeTarget: { volado: [25, 38], seco: [28, 40], ligero: [28, 40] },
    challengeText: (c2) => `Forge a full-bodied powerhouse from Nicaraguan volcanic soil. Channel the fire — high Ligero is permitted, but never let combustion fail. Balance with ${c2 ? c2.replace(/_/g, " ") : "your blend partner"}.`,
  },
  honduras: {
    name: "Maestro Cortés", title: "GUARDIAN OF THE VALLEY",
    profile: "Creamy · Smooth · Mild-Medium", color: "#4A8A4A",
    challengeTarget: { volado: [35, 48], seco: [32, 44], ligero: [12, 26] },
    challengeText: (c2) => `Build a smooth, approachable blend from Honduran valley leaf. Prioritize draw and burn — keep Ligero lean. Let ${c2 ? c2.replace(/_/g, " ") : "your second terroir"} carry the depth.`,
  },
  venezuela: {
    name: "Don Estéban", title: "ARCHITECT OF COMPLEXITY",
    profile: "Rich · Complex · Full Body", color: "#7B4A8B",
    challengeTarget: { volado: [22, 35], seco: [35, 48], ligero: [28, 42] },
    challengeText: (c2) => `Weave a complex Venezuelan tapestry — heavy Seco for aroma, strong Ligero for power. Merge with ${c2 ? c2.replace(/_/g, " ") : "your blend partner"} for a multi-layered masterwork.`,
  },
};

const FLAVOR_NODES = ["Earth", "Cedar", "Spice", "Cocoa", "Leather", "Floral", "Cream", "Pepper", "Smoke", "Wood", "Nuts", "Citrus"];

type Step = "intro" | "wrapper" | "anatomy" | "balancing" | "mentor_challenge" | "flavor_wheel";

interface MeritFeedback { amount: number; type: "merit" | "points" }

export function S2_TerroirMatrix() {
  const { profile, updateProfile, setPhase, addPoints, applyPenalty } = useGuest();
  const [step,          setStep]       = useState<Step>("intro");
  const [wrapper,       setWrapper]    = useState<string | null>(profile.wrapper ?? null);
  const [volado,        setVolado]     = useState(profile.volado  ?? 33);
  const [seco,          setSeco]       = useState(profile.seco    ?? 34);
  const [ligero,        setLigero]     = useState(profile.ligero  ?? 33);
  const [selectedNotes, setNotes]      = useState<string[]>(profile.flavorProfile ?? []);
  const [showLigeroWarn, setLigeroWarn] = useState(false);
  const [meritFeedback,  setMeritFb]   = useState<MeritFeedback | null>(null);

  const primaryMentorId = (profile.blendCountry1 ?? "dominican_republic") as MentorId;
  const mentorData      = MENTORS[primaryMentorId] ?? MENTORS.dominican_republic;
  const total           = volado + seco + ligero;

  function go(s: Step) {
    setStep(s);
    trackEvent({ type: "phase_enter", phase: `s2_${s}`, data: {}, sessionType: profile.sessionType, timestamp: Date.now() });
  }

  function handleWrapperSelect(w: typeof WRAPPERS[0]) {
    setWrapper(w.id);
    updateProfile({ wrapper: w.id });
    hapticMilestone();
    go("anatomy");
  }

  function calcBlendScore(): { merit: number } {
    const tgt = mentorData.challengeTarget;
    const vOk = volado >= tgt.volado[0] && volado <= tgt.volado[1];
    const sOk = seco   >= tgt.seco[0]   && seco   <= tgt.seco[1];
    const lOk = ligero >= tgt.ligero[0] && ligero <= tgt.ligero[1];
    const bal = total >= 92 && total <= 108;
    if (bal && vOk && sOk && lOk) return { merit: calcMeritDelta("blend_perfect", profile.difficultyTier) };
    if (bal && (vOk || sOk))      return { merit: 2 };
    return { merit: calcMeritDelta("blend_poor", profile.difficultyTier) };
  }

  function handleFinalizeBlend() {
    if (ligero > 40) { hapticError(); setLigeroWarn(true); return; }
    const score = calcBlendScore();
    updateProfile({ volado, seco, ligero, merit: Math.max(0, (profile.merit ?? 0) + score.merit) });
    if (score.merit >= 0) { addPoints(score.merit > 0 ? 15 : 5); }
    else                  { applyPenalty(Math.abs(score.merit)); }
    setMeritFb({ amount: score.merit, type: "merit" });
    hapticMilestone();
    trackEvent({ type: "blend_saved", phase: "s2_balancing", data: { volado, seco, ligero }, sessionType: profile.sessionType, timestamp: Date.now() });
    go("mentor_challenge");
  }

  function handleFlavorFinish() {
    updateProfile({ flavorProfile: selectedNotes });
    trackEvent({ type: "phase_exit", phase: "s2_flavor_wheel", data: { notes: selectedNotes }, sessionType: profile.sessionType, timestamp: Date.now() });
    setPhase("s3_spiritquiz");
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#050505", color: "#F0E8D4", fontFamily: "'Inter', sans-serif" }}>
      {/* S2 — Wrapper / Terroir cinematic background */}
      <img src={`${import.meta.env.BASE_URL}images/lounge_bg.jpg`} alt="" aria-hidden
        style={{ position: "absolute", inset: "6% 4%", width: "92%", height: "88%", objectFit: "contain", objectPosition: "center center", opacity: 0.22, pointerEvents: "none" }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(5,5,5,0.72) 0%, rgba(5,5,5,0.55) 50%, rgba(5,5,5,0.85) 100%)", pointerEvents: "none" }} />
      <BackButton />

      {/* Ligero warning overlay */}
      <AnimatePresence>
        {showLigeroWarn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
            <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} transition={PT}
              style={{ maxWidth: 560, textAlign: "center", background: "rgba(200,50,42,0.08)", border: "1px solid rgba(200,50,42,0.4)", borderRadius: 16, padding: 48 }}>
              <div style={{ fontSize: 14, letterSpacing: "0.3em", color: RED, marginBottom: 16, fontWeight: 800 }}>MENTOR INTERVENTION</div>
              <div style={{ fontSize: 40, fontWeight: 900, fontFamily: "'Cormorant Garamond', serif", color: "#F0E8D4", marginBottom: 24 }}>{mentorData.name}</div>
              <p style={{ fontSize: 24, color: "#F0E8D4cc", lineHeight: 1.6, marginBottom: 32 }}>
                "Too much Ligero will destroy your blend's draw and scorch the burn. Reduce it below 40% before we continue."
              </p>
              <motion.button onClick={() => setLigeroWarn(false)} whileTap={{ scale: 0.96 }}
                style={{ padding: "18px 40px", background: RED, color: "#fff", border: "none", borderRadius: 4, fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: "0.1em" }}>
                ADJUST BLEND
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merit feedback overlay */}
      <AnimatePresence>
        {meritFeedback && <XPFeedback amount={meritFeedback.amount} type={meritFeedback.type} onComplete={() => setMeritFb(null)} />}
      </AnimatePresence>

      {/* Step dots */}
      {(["intro","wrapper","anatomy","balancing","mentor_challenge","flavor_wheel"] as Step[]).map((s, i) => (
        <div key={s} style={{ position: "absolute", top: 16, left: `calc(50% - 90px + ${i * 36}px)`, width: 28, height: 4, borderRadius: 2, background: s === step ? GOLD : "rgba(255,255,255,0.12)", boxShadow: s === step ? `0 0 8px ${GOLD}` : "none", transition: "all 0.25s", zIndex: 10 }} />
      ))}

      <AnimatePresence mode="wait">

        {step === "intro" && (
          <motion.div key="intro" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.35em", color: GOLD, marginBottom: 16, fontWeight: 800 }}>THE ALCHEMIST</div>
            <h1 style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 24, fontFamily: "'Cormorant Garamond', serif", lineHeight: 0.95 }}>THE CRAFT</h1>
            <p style={{ fontSize: 24, opacity: 0.65, marginBottom: 48, maxWidth: 540, lineHeight: 1.5 }}>Transform raw terroir into a masterwork of construction. Your mentors await.</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 48 }}>
              {[profile.blendCountry1, profile.blendCountry2].filter(Boolean).map(c => {
                const m = MENTORS[c as MentorId];
                if (!m) return null;
                return (
                  <motion.div key={c} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{ background: `${m.color}18`, border: `1px solid ${m.color}55`, borderRadius: 12, padding: "20px 28px", backdropFilter: "blur(12px)", textAlign: "center", minWidth: 180 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.25em", color: m.color, marginBottom: 6, fontWeight: 800 }}>{m.title}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#F0E8D4", marginBottom: 4 }}>{m.name}</div>
                    <div style={{ fontSize: 14, color: "#F0E8D4aa" }}>{m.profile}</div>
                  </motion.div>
                );
              })}
            </div>
            <motion.button onClick={() => go("wrapper")} whileTap={{ scale: 0.96 }}
              style={{ padding: "22px 48px", background: GOLD, color: "#000", border: "none", borderRadius: 4, fontSize: 20, fontWeight: 900, cursor: "pointer", letterSpacing: "0.1em" }}>
              BEGIN COMPOSITION
            </motion.button>
          </motion.div>
        )}

        {step === "wrapper" && (
          <motion.div key="wrapper" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "80px 32px 40px" }}>
            <h2 style={{ fontSize: 42, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8 }}>Select Your Wrapper</h2>
            <p style={{ fontSize: 24, opacity: 0.55, marginBottom: 36 }}>The outer leaf defines the first impression and dominant flavor profile.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {WRAPPERS.map(w => (
                <motion.div key={w.id} onClick={() => handleWrapperSelect(w)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ background: wrapper === w.id ? `${w.color}22` : "rgba(255,255,255,0.03)", border: wrapper === w.id ? `2px solid ${w.color}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ height: 80, background: `linear-gradient(160deg, ${w.color} 0%, ${w.color}44 100%)` }} />
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{w.name}</div>
                    <div style={{ fontSize: 14, letterSpacing: "0.15em", color: AMBER, marginBottom: 8 }}>{w.body.toUpperCase()} BODY</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {w.notes.map(n => <span key={n} style={{ fontSize: 12, background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "3px 8px", color: "#F0E8D4aa", border: "1px solid rgba(255,255,255,0.1)" }}>{n}</span>)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {step === "anatomy" && (
          <motion.div key="anatomy" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "80px 40px 40px", maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ fontSize: 42, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8 }}>Leaf Anatomy</h2>
            <p style={{ fontSize: 24, opacity: 0.55, marginBottom: 36 }}>Every great cigar is a three-layer composition.</p>
            {[
              { label: "WRAPPER", sub: "Outer Leaf",             desc: "Defines aesthetic appeal, aroma, and the first third of the smoking experience.", color: GOLD  },
              { label: "BINDER",  sub: "Structural Leaf",        desc: "Holds the filler in shape. Provides structural integrity and secondary combustion characteristics.", color: AMBER },
              { label: "FILLER",  sub: "Volado · Seco · Ligero", desc: "Three leaf types combine for combustion, aroma, and strength. The art lies in their ratio.", color: "#8AAA4A" },
            ].map(layer => (
              <motion.div key={layer.label} whileHover={{ x: 4 }}
                style={{ marginBottom: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, borderLeft: `3px solid ${layer.color}` }}>
                <div style={{ fontSize: 12, letterSpacing: "0.25em", color: layer.color, marginBottom: 4, fontWeight: 800 }}>{layer.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{layer.sub}</div>
                <div style={{ fontSize: 20, color: "#F0E8D4cc", lineHeight: 1.5 }}>{layer.desc}</div>
              </motion.div>
            ))}
            <motion.button onClick={() => go("balancing")} whileTap={{ scale: 0.96 }}
              style={{ marginTop: 24, padding: "22px 48px", background: GOLD, color: "#000", border: "none", borderRadius: 4, fontSize: 20, fontWeight: 900, cursor: "pointer", letterSpacing: "0.1em" }}>
              PROCEED TO BALANCING
            </motion.button>
          </motion.div>
        )}

        {step === "balancing" && (
          <motion.div key="balancing" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "80px 40px 40px", maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ fontSize: 42, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8 }}>Filler Equilibrium</h2>
            <p style={{ fontSize: 24, opacity: 0.55, marginBottom: 32 }}>Balance combustion, aroma, and strength to satisfy your mentor's challenge.</p>
            <div style={{ background: `${mentorData.color}15`, border: `1px solid ${mentorData.color}44`, borderRadius: 12, padding: "20px 24px", marginBottom: 32 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.2em", color: mentorData.color, marginBottom: 4, fontWeight: 800 }}>{mentorData.name.toUpperCase()} — TARGET</div>
              <div style={{ fontSize: 20, color: "#F0E8D4bb", lineHeight: 1.5 }}>
                Volado {mentorData.challengeTarget.volado[0]}–{mentorData.challengeTarget.volado[1]}% · Seco {mentorData.challengeTarget.seco[0]}–{mentorData.challengeTarget.seco[1]}% · Ligero {mentorData.challengeTarget.ligero[0]}–{mentorData.challengeTarget.ligero[1]}%
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.025)", padding: 32, borderRadius: 16, marginBottom: 28, border: "1px solid rgba(255,255,255,0.06)" }}>
              <LeafSlider label="Volado" sub="Combustion & Draw"  val={volado} set={setVolado} color="#8AAA4A" target={mentorData.challengeTarget.volado} />
              <LeafSlider label="Seco"   sub="Aroma & Complexity" val={seco}   set={setSeco}   color="#4A90D9" target={mentorData.challengeTarget.seco} />
              <LeafSlider label="Ligero" sub="Strength & Body"    val={ligero} set={setLigero} color={ligero > 40 ? RED : AMBER} target={mentorData.challengeTarget.ligero} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "16px 20px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${total > 108 || total < 92 ? RED : GOLD}44` }}>
              <span style={{ fontSize: 24, color: "#F0E8D4bb" }}>Blend Total</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: total > 108 || total < 92 ? RED : GOLD }}>{total}%</span>
            </div>
            {ligero > 40 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: "rgba(200,50,42,0.12)", border: "1px solid rgba(200,50,42,0.5)", borderRadius: 8, padding: "18px 24px", marginBottom: 24, fontSize: 22, color: RED, fontWeight: 700 }}>
                MENTOR WARNING — Ligero exceeds 40%. Draw stability at risk.
              </motion.div>
            )}
            <motion.button onClick={handleFinalizeBlend} whileTap={{ scale: 0.96 }}
              style={{ padding: "22px 48px", background: GOLD, color: "#000", border: "none", borderRadius: 4, fontSize: 20, fontWeight: 900, cursor: "pointer", letterSpacing: "0.1em" }}>
              FINALIZE BLEND
            </motion.button>
          </motion.div>
        )}

        {step === "mentor_challenge" && (
          <motion.div key="mentor_challenge" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center" }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ...PT }}
              style={{ background: `radial-gradient(ellipse at top, ${mentorData.color}22 0%, rgba(5,5,5,0.95) 70%)`, border: `1px solid ${mentorData.color}66`, borderRadius: 20, padding: "40px 48px", maxWidth: 600, width: "100%", backdropFilter: "blur(20px)", boxShadow: `0 0 60px ${mentorData.color}33`, marginBottom: 40 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.35em", color: mentorData.color, marginBottom: 8, fontWeight: 800 }}>{mentorData.title}</div>
              <h2 style={{ fontSize: 48, fontWeight: 900, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8, color: "#F0E8D4" }}>{mentorData.name}</h2>
              <div style={{ fontSize: 16, color: `${mentorData.color}cc`, marginBottom: 28 }}>{mentorData.profile}</div>
              <p style={{ fontSize: 24, color: "#F0E8D4cc", lineHeight: 1.65, fontStyle: "italic" }}>
                "{mentorData.challengeText(profile.blendCountry2)}"
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ display: "flex", gap: 32, marginBottom: 40 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, letterSpacing: "0.2em", color: GOLD, marginBottom: 4 }}>BLEND TOTAL</div>
                <div style={{ fontSize: 36, fontWeight: 900 }}>{total}%</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, letterSpacing: "0.2em", color: GOLD, marginBottom: 4 }}>MERIT</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: GOLD }}>{profile.merit ?? 0}</div>
              </div>
            </motion.div>
            <motion.button onClick={() => go("flavor_wheel")} whileTap={{ scale: 0.96 }}
              style={{ padding: "22px 48px", background: GOLD, color: "#000", border: "none", borderRadius: 4, fontSize: 20, fontWeight: 900, cursor: "pointer", letterSpacing: "0.1em" }}>
              PROCEED TO FLAVOR CALIBRATION
            </motion.button>
          </motion.div>
        )}

        {step === "flavor_wheel" && (
          <motion.div key="flavor_wheel" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "80px 40px 40px", maxWidth: 760, margin: "0 auto" }}>
            <h2 style={{ fontSize: 42, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8 }}>Flavor Calibration</h2>
            <p style={{ fontSize: 24, opacity: 0.55, marginBottom: 32 }}>Tag the dominant notes in your blend. These inform the pairing engine in Phase 3.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 40 }}>
              {FLAVOR_NODES.map(f => {
                const sel = selectedNotes.includes(f);
                return (
                  <motion.div key={f} onClick={() => setNotes(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    style={{ padding: "22px 12px", border: `1px solid ${sel ? GOLD : "rgba(255,255,255,0.12)"}`, borderRadius: 10, textAlign: "center", cursor: "pointer", background: sel ? `${GOLD}18` : "transparent", fontSize: 20, fontWeight: sel ? 800 : 400, color: sel ? GOLD : "#F0E8D4aa", transition: "all 0.2s" }}>
                    {f}
                  </motion.div>
                );
              })}
            </div>
            {selectedNotes.length > 0 && (
              <div style={{ marginBottom: 24, fontSize: 20, color: "#F0E8D4aa" }}>
                Selected: <span style={{ color: GOLD, fontWeight: 700 }}>{selectedNotes.join(" · ")}</span>
              </div>
            )}
            <motion.button onClick={handleFlavorFinish} whileTap={{ scale: 0.96 }}
              disabled={selectedNotes.length === 0}
              style={{ padding: "22px 48px", background: selectedNotes.length > 0 ? GOLD : "rgba(255,255,255,0.06)", color: selectedNotes.length > 0 ? "#000" : "#F0E8D444", border: "none", borderRadius: 4, fontSize: 20, fontWeight: 900, cursor: selectedNotes.length > 0 ? "pointer" : "default", letterSpacing: "0.1em" }}>
              LOCK BLEND PROFILE
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function LeafSlider({ label, sub, val, set, color, target }: {
  label: string; sub: string; val: number;
  set: (v: number) => void; color: string; target: [number, number];
}) {
  const inRange = val >= target[0] && val <= target[1];
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 16, opacity: 0.45, marginLeft: 10 }}>{sub}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28, color, fontWeight: 900 }}>{val}%</span>
          {inRange && <span style={{ fontSize: 11, color: "#4A8A4A", fontWeight: 800, letterSpacing: "0.15em" }}>TARGET</span>}
        </div>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
        <div style={{ position: "absolute", left: `${target[0]}%`, width: `${target[1] - target[0]}%`, height: "100%", background: `${color}33`, borderRadius: 3 }} />
        <div style={{ position: "absolute", left: 0, width: `${val}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <input type="range" min={0} max={100} value={val} onChange={e => set(Number(e.target.value))}
        style={{ width: "100%", appearance: "none", background: "transparent", height: 36, cursor: "pointer", marginTop: -3 }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: -4 }}>
        <span>0</span><span>Target {target[0]}–{target[1]}%</span><span>100</span>
      </div>
    </div>
  );
}
