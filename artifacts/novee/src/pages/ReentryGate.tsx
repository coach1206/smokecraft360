import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

const FLAVOR_NOTES = ["Earthy & Woodsy","Spicy & Peppery","Sweet & Creamy","Citrus & Floral","Nutty & Roasted","Bold & Full-Bodied","Smooth & Mild"];
const EXP_LEVELS   = ["First-Time Smoker","Casual Enthusiast","Regular Smoker","Experienced Connoisseur","Master Aficionado"];

const STEPS = [
  { n: 1, label: "DISCOVER",   body: "Explore premium flavor, body, aroma, and structure" },
  { n: 2, label: "ANALYZE",    body: "Understand flavor transitions, depth, and blend notes" },
  { n: 3, label: "CRAFT",      body: "Build your blend profile through guided selections" },
  { n: 4, label: "EXPERIENCE", body: "Score your blends and refine your last palate" },
];

function FieldInput({ label, value, onChange, type = "text", maxLength }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.20)",
        borderRadius: 6, padding: "0 18px", height: 60,
        transition: "border-color 0.2s",
      }}>
        <input
          type={type}
          placeholder={label}
          value={value}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#F0E8D4", fontSize: 18, fontWeight: 500,
            fontFamily: "'Inter',sans-serif", letterSpacing: "0.04em",
          }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", height: 56, padding: "0 18px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.16)",
          borderRadius: 6, color: value ? "#F0E8D4" : "rgba(240,232,212,0.30)",
          fontSize: 17, fontFamily: "'Inter',sans-serif",
          appearance: "none", WebkitAppearance: "none", outline: "none", cursor: "pointer",
        }}
      >
        <option value="" style={{ background: "#080502", color: "rgba(240,232,212,0.40)" }}>{label}</option>
        {options.map(o => (
          <option key={o} value={o} style={{ background: "#080502", color: "#F0E8D4" }}>{o}</option>
        ))}
      </select>
      <span style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        color: `${GOLD}66`, fontSize: 14, pointerEvents: "none",
      }}>▾</span>
    </div>
  );
}

export function ReentryGate() {
  const { updateProfile, setPhase, resetProfile } = useGuest();
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [phone4,       setPhone4]       = useState("");
  const [age,          setAge]          = useState("");
  const [flavorNotes,  setFlavorNotes]  = useState("");
  const [expLevel,     setExpLevel]     = useState("");
  const [error,        setError]        = useState(false);

  function handleContinue() {
    if (!firstName.trim() || !lastName.trim()) {
      hapticError();
      setError(true);
      setTimeout(() => setError(false), 900);
      return;
    }
    hapticMilestone();
    resetProfile();
    updateProfile({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone4:    phone4.trim(),
      age:       age ? Number(age) : undefined,
    });
    setPhase("s1_demo");
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#060401",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter',-apple-system,sans-serif",
      overflow: "hidden",
    }}>

      {/* Ambient gold glow top */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 320,
        background: `radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", borderBottom: "1px solid rgba(212,175,55,0.08)", zIndex: 10 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.32em", color: "rgba(240,232,212,0.30)", textTransform: "uppercase", fontWeight: 700 }}>
          SMOKECRAFT 360 · KIOSK EDITION
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.26em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>TABLE KIOSK · ACTIVE</span>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
        </div>
      </div>

      {/* BACK button */}
      <motion.button type="button" onPointerDown={() => setPhase("crafthub")} whileTap={{ scale: 0.96 }}
        style={{
          position: "absolute", top: 80, left: 36, zIndex: 20,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8,
          color: "#F0E8D4", fontSize: 16, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          padding: "10px 20px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
        }}>
        <span>←</span> <span>BACK</span>
      </motion.button>

      {/* Centered form card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%", maxWidth: 680,
          padding: "52px 56px 48px",
          background: "rgba(10,7,2,0.92)",
          border: "1px solid rgba(212,175,55,0.14)",
          borderRadius: 12,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
          marginTop: 20,
        }}
      >

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.46em", color: `${GOLD}88`, textTransform: "uppercase", fontWeight: 800, marginBottom: 10 }}>
            GUEST REGISTRATION
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 44, fontWeight: 700, color: "#F0E8D4", lineHeight: 1.05, marginBottom: 6 }}>
            Your Profile
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg, ${GOLD}44, transparent)` }} />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "14px 18px", background: "rgba(180,40,40,0.16)", border: "1px solid rgba(200,50,50,0.30)", borderRadius: 6, color: "#FF8080", fontSize: 16, marginBottom: 18 }}>
              First name and last name are required to continue.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Name row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <FieldInput label="First Name" value={firstName} onChange={setFirstName} />
          <FieldInput label="Last Name"  value={lastName}  onChange={setLastName}  />
        </div>
        {/* Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          <FieldInput label="Last 4 Digits" value={phone4} onChange={v => setPhone4(v.replace(/\D/g,"").slice(0,4))} type="tel" maxLength={4} />
          <FieldInput label="Age" value={age} onChange={v => setAge(v.replace(/\D/g,"").slice(0,3))} type="tel" />
        </div>

        {/* Optional section */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.36em", color: "rgba(212,175,55,0.45)", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
            OPTIONAL — IMPROVES RECOMMENDATIONS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <SelectField label="Preferred Flavor Notes" options={FLAVOR_NOTES} value={flavorNotes} onChange={setFlavorNotes} />
            <SelectField label="Experience Level"       options={EXP_LEVELS}   value={expLevel}     onChange={setExpLevel}     />
          </div>
        </div>

        {/* CONTINUE */}
        <motion.button type="button" onPointerDown={handleContinue} whileTap={{ scale: 0.97 }}
          style={{
            width: "100%", padding: "22px 32px", marginBottom: 32,
            background: `linear-gradient(135deg, ${GOLD} 0%, #B8900A 100%)`,
            border: "none", borderRadius: 6, cursor: "pointer",
            fontSize: 18, fontWeight: 800, color: "#0A0600",
            letterSpacing: "0.22em", textTransform: "uppercase",
            fontFamily: "'Inter',sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            boxShadow: `0 8px 40px rgba(212,175,55,0.35), 0 2px 0 rgba(255,255,255,0.12) inset`,
          }}>
          CONTINUE <span style={{ fontSize: 20 }}>→</span>
        </motion.button>

        {/* WHAT TO EXPECT */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.40em", color: "rgba(240,232,212,0.28)", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>
            WHAT TO EXPECT
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "rgba(212,175,55,0.10)", border: `1.5px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: GOLD }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: "rgba(240,232,212,0.36)", lineHeight: 1.50 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
