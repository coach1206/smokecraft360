import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { playClick } from "@/hooks/useAudio";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

const CHEAT_DEFS = [
  {
    code: 1 as const,
    trigger: "PAIRING1",
    label: "Cigar + Single Drink",
    badge: "2× MULTIPLIER",
    color: "#C8762A",
    desc: "Doubles current session points · Erases 1 mentor penalty",
  },
  {
    code: 2 as const,
    trigger: "DOUBLE2",
    label: "Two Premium Drinks",
    badge: "3× MULTIPLIER",
    color: "#7A44D4",
    desc: "Triples session points · Upgrades loyalty score tier",
  },
  {
    code: 3 as const,
    trigger: "SOVEREIGN5",
    label: "Grand Slam Sovereign",
    badge: "5× ULTIMATE",
    color: "#D4AF37",
    desc: "×5 total session points · PURGES all accumulated penalties",
  },
];

export function CheatCodeEngine() {
  const { applyCheatCode, profile } = useGuest();
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState("");

  function attempt() {
    playClick();
    const val = input.trim().toUpperCase();
    const found = CHEAT_DEFS.find(d => d.trigger === val);
    if (!found) {
      hapticError();
      setError("Code not recognized.");
      return;
    }
    if (profile.cheatCodesUsed.includes(found.code)) {
      setError("Already redeemed.");
      return;
    }
    hapticMilestone();
    applyCheatCode(found.code);
    setFlash(found.badge);
    setInput("");
    setError("");
    setTimeout(() => setFlash(null), 2800);
  }

  return (
    <div style={{
      background: "rgba(212,175,55,0.04)",
      border: `1px solid rgba(212,175,55,0.20)`,
      borderRadius: 16,
      padding: "28px 28px 22px",
    }}>
      <p style={{
        fontSize: 10,
        letterSpacing: "0.34em",
        color: `${GOLD}88`,
        textTransform: "uppercase",
        fontWeight: 700,
        margin: "0 0 16px",
        fontFamily: "'Inter', sans-serif",
      }}>
        Transactional Recovery · Cheat Codes
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {CHEAT_DEFS.map(d => (
          <div
            key={d.code}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: profile.cheatCodesUsed.includes(d.code) ? 0.35 : 1,
              transition: "opacity 0.3s",
            }}
          >
            <span style={{
              background: d.color + "22",
              border: `1px solid ${d.color}55`,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 800,
              color: d.color,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              {d.badge}
            </span>
            <span style={{
              color: "rgba(240,232,212,0.55)",
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
            }}>
              {d.label} — {d.desc}
            </span>
            {profile.cheatCodesUsed.includes(d.code) && (
              <span style={{ color: GOLD, fontSize: 16, marginLeft: "auto" }}>✓</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") attempt(); }}
          placeholder="ENTER COUPON CODE"
          style={{
            flex: 1,
            padding: "16px 18px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${error ? "#C8322A" : `${GOLD}30`}`,
            borderRadius: 10,
            color: "#F0E8D4",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.14em",
            fontFamily: "'Inter', sans-serif",
            outline: "none",
          }}
        />
        <motion.button
          type="button"
          onPointerDown={attempt}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: "16px 28px",
            background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
            border: "none",
            borderRadius: 10,
            color: "#0A0604",
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "0.16em",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
          }}
        >
          REDEEM
        </motion.button>
      </div>

      {error && (
        <p style={{ color: "#C8322A", fontSize: 14, margin: "8px 0 0", fontFamily: "'Inter', sans-serif" }}>
          {error}
        </p>
      )}

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            style={{
              marginTop: 16,
              padding: "16px",
              background: `rgba(212,175,55,0.12)`,
              border: `1.5px solid ${GOLD}`,
              borderRadius: 10,
              textAlign: "center",
              color: GOLD,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.18em",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {flash} ACTIVATED
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
