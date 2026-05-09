/**
 * PourCraft360 — Viscosity & Distillation
 * Stage 1: Cinematic intro (Liquid Gold motion)
 * Stage 2: Flavor profile (Oak / Peat / Spice / Fruit)
 * Stage 3: Glass & Spirit designer with commission bridge
 */

import { useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence }               from "framer-motion";
import { Craft360Shell, type Craft360Config }    from "@/components/experience/Craft360Shell";

const ACCENT = "#E8C870";

const CONFIG: Craft360Config = {
  craftId:   "pour",
  title:     "PourCraft",
  subtitle:  "Viscosity & Distillation",
  quote:     "A great pour is neither fast nor slow — it is deliberate. Patience distilled into gold.",
  accent:    ACCENT,
  dimAccent: "rgba(42,26,8,0.60)",
  mentor: {
    name:       "The Sommelier",
    title:      "Sophisticated · Finish Compatibility · Aging",
    philosophy: "The finest spirit remembers its origin in every sip — terroir is not a place, it is a memory.",
  },
  flavors: [
    { id: "oak",   label: "Oak",   icon: "🪵", desc: "Vanilla, toasted wood, caramel warmth" },
    { id: "peat",  label: "Peat",  icon: "🌫️", desc: "Smoky, maritime, charred earth" },
    { id: "spice", label: "Spice", icon: "🌶️", desc: "Black pepper, cinnamon, dry ginger" },
    { id: "fruit", label: "Fruit", icon: "🍇", desc: "Dark cherry, dried fig, citrus zest" },
  ],
  particles: [
    "rgba(232,200,112,0.32)",
    "rgba(200,140,60,0.22)",
    "rgba(255,200,80,0.18)",
  ],
};

const GLASS_OPTS = [
  { id: "rocks",    label: "Rocks"    },
  { id: "highball", label: "Highball" },
  { id: "neat",     label: "Neat"     },
  { id: "coupe",    label: "Coupe"    },
  { id: "snifter",  label: "Snifter"  },
];

const SPIRIT_OPTS = [
  { id: "whiskey", label: "Whiskey",  color: "#B86020" },
  { id: "cognac",  label: "Cognac",   color: "#A04820" },
  { id: "rum",     label: "Dark Rum", color: "#803020" },
  { id: "gin",     label: "Gin",      color: "rgba(180,210,240,0.55)" },
  { id: "tequila", label: "Tequila",  color: "rgba(220,220,140,0.55)" },
  { id: "mezcal",  label: "Mezcal",   color: "#C09040" },
];

const ICE_OPTS = [
  { id: "none",    label: "Neat"       },
  { id: "cube",    label: "Ice Cube"   },
  { id: "rock",    label: "Large Rock" },
  { id: "crushed", label: "Crushed"    },
];

// ── CSS glass visual ───────────────────────────────────────────────────────────
function GlassVisual({ glass, spirit, ice }: { glass: string; spirit: string; ice: string }) {
  const sp  = SPIRIT_OPTS.find(s => s.id === spirit) ?? SPIRIT_OPTS[0];
  const dims: Record<string, [number, number, number]> = {
    rocks:    [60, 70,  4],
    highball: [44, 100, 3],
    neat:     [58, 55,  6],
    coupe:    [70, 48, 35],
    snifter:  [64, 72, 32],
  };
  const [w, h, r] = dims[glass] ?? dims.rocks;
  const isCoupeStyle = glass === "coupe" || glass === "snifter";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div style={{ position: "relative", width: w, height: h }}>
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid rgba(232,200,112,0.50)",
          borderRadius: `${r}px ${r}px 4px 4px`,
          background: "rgba(180,210,240,0.05)",
          backdropFilter: "blur(4px)",
          overflow: "hidden",
        }}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "55%" }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: `linear-gradient(180deg, ${sp.color}88 0%, ${sp.color} 100%)`,
            }}
          />
          {ice !== "none" && (
            <div style={{
              position: "absolute", bottom: "46%", left: "50%", transform: "translateX(-50%)",
              width:  ice === "crushed" ? w * 0.65 : 14,
              height: ice === "crushed" ? 7 : 14,
              background: "rgba(200,230,255,0.60)", borderRadius: ice === "crushed" ? 2 : 3,
              boxShadow: "0 0 8px rgba(200,230,255,0.4)",
            }} />
          )}
          <div style={{
            position: "absolute", bottom: "44%", left: "14%", width: "24%", height: "44%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, transparent 100%)",
          }} />
        </div>
      </div>
      {isCoupeStyle && <div style={{ width: 2, height: 18, background: "rgba(232,200,112,0.35)" }} />}
      <div style={{ width: isCoupeStyle ? 38 : w + 8, height: 4, borderRadius: 2, background: "rgba(232,200,112,0.28)" }} />
    </div>
  );
}

// ── Shared commission modal (pour flavour) ─────────────────────────────────────
type CommState = "open" | "submitting" | "success" | "error";

function CommModal({
  design, flavors, onClose,
}: {
  design:  { glass: string; spirit: string; ice: string };
  flavors: string[];
  onClose: () => void;
}) {
  const [state, setState]     = useState<CommState>("open");
  const [name,  setName]      = useState("");
  const [notes, setNotes]     = useState("");
  const [orderId, setOrderId] = useState("");

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setState("submitting");
    try {
      const res  = await fetch("/api/artisan-orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craft:       "pour",
          style:       `${SPIRIT_OPTS.find(s => s.id === design.spirit)?.label} · ${GLASS_OPTS.find(g => g.id === design.glass)?.label} · ${ICE_OPTS.find(i => i.id === design.ice)?.label}`,
          flavorNotes: flavors,
          hasEmblem:   false,
          guestName:   name.trim()  || undefined,
          notes:       notes.trim() || undefined,
        }),
      });
      const data = await res.json() as { success?: boolean; orderId?: string };
      if (data.success && data.orderId) { setOrderId(data.orderId); setState("success"); }
      else setState("error");
    } catch { setState("error"); }
  }, [design, flavors, name, notes]);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: `${ACCENT}08`, border: `1px solid ${ACCENT}28`,
    borderRadius: 8, color: "#F5F2ED", fontSize: 11,
    fontFamily: "'Space Mono', monospace", padding: "10px 14px", outline: "none",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(10,9,8,0.92)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget && state !== "submitting") onClose(); }}
    >
      <motion.div
        initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }}
        style={{
          background: "rgba(14,12,8,0.98)", border: `1px solid ${ACCENT}35`,
          borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 400,
          boxShadow: "0 32px 80px rgba(0,0,0,0.80)",
        }}
      >
        {state === "success" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14, color: ACCENT }}>◈</div>
            <div style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", marginBottom: 8 }}>
              COMMISSION RECEIVED
            </div>
            <div style={{
              background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`,
              borderRadius: 8, padding: "10px 16px",
              color: ACCENT, fontSize: 13, letterSpacing: "0.2em", margin: "16px 0 20px",
            }}>{orderId}</div>
            <div style={{ color: "rgba(245,242,237,0.40)", fontSize: 9, lineHeight: 1.7, letterSpacing: "0.06em", marginBottom: 20 }}>
              Your bespoke pour commission has been routed to the Sommelier team.
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} style={{
              width: "100%", padding: 13, borderRadius: 999,
              background: `${ACCENT}14`, border: `1px solid ${ACCENT}`,
              color: ACCENT, fontSize: 8, fontWeight: 700, letterSpacing: "0.2em",
              cursor: "pointer", touchAction: "manipulation",
            }}>CLOSE</motion.button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ color: ACCENT, fontSize: 10, fontWeight: 700, letterSpacing: "0.24em", marginBottom: 4 }}>◈ COMMISSION YOUR POUR</div>
            <div style={{ color: `${ACCENT}50`, fontSize: 7.5, letterSpacing: "0.14em", marginBottom: 20 }}>POURCRAFT 360 · SOMMELIER COMMISSION</div>
            <div style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}18`, borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
              {[
                ["Spirit", SPIRIT_OPTS.find(s => s.id === design.spirit)?.label ?? design.spirit],
                ["Glass",  GLASS_OPTS.find(g => g.id === design.glass)?.label ?? design.glass],
                ["Serve",  ICE_OPTS.find(i => i.id === design.ice)?.label ?? design.ice],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", gap: 10, padding: "5px 0" }}>
                  <span style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.18em", minWidth: 44 }}>{l}</span>
                  <span style={{ fontSize: 10, color: "#F5F2ED" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.18em", marginBottom: 6 }}>NAME (OPTIONAL)</div>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Your name…" style={{ ...inputStyle, height: 40 }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.18em", marginBottom: 6 }}>NOTES (OPTIONAL)</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={400} rows={2} placeholder="Occasion, quantity, special requests…" style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
            </div>
            {state === "error" && <div style={{ color: "#EF4444", fontSize: 8, textAlign: "center", marginBottom: 12 }}>Submission failed — please try again</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onClose} style={{
                flex: 1, padding: 13, borderRadius: 999, background: "transparent",
                border: `1px solid ${ACCENT}25`, color: `${ACCENT}50`,
                fontSize: 8, fontWeight: 700, letterSpacing: "0.18em",
                cursor: "pointer", touchAction: "manipulation",
              }}>CANCEL</motion.button>
              <motion.button type="submit" whileTap={{ scale: 0.95 }} disabled={state === "submitting"} style={{
                flex: 2, padding: 13, borderRadius: 999,
                background: state === "submitting" ? `${ACCENT}08` : `${ACCENT}18`,
                border: `1px solid ${state === "submitting" ? `${ACCENT}30` : ACCENT}`,
                color: state === "submitting" ? `${ACCENT}50` : ACCENT,
                fontSize: 8, fontWeight: 700, letterSpacing: "0.18em",
                cursor: "pointer", touchAction: "manipulation",
              }}>{state === "submitting" ? "TRANSMITTING…" : "SUBMIT COMMISSION"}</motion.button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Creation suite ─────────────────────────────────────────────────────────────
function PourCraftCreation({ flavors }: { flavors: string[] }) {
  const [glass,    setGlass]    = useState("rocks");
  const [spirit,   setSpirit]   = useState("whiskey");
  const [ice,      setIce]      = useState("none");
  const [showComm, setShowComm] = useState(false);

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${active ? ACCENT : "rgba(232,200,112,0.18)"}`,
    background: active ? `${ACCENT}1A` : "rgba(10,9,8,0.55)",
    color: active ? ACCENT : "rgba(232,200,112,0.38)",
    fontSize: 8, fontWeight: 700, letterSpacing: "0.13em",
    fontFamily: "'Space Mono', monospace",
    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
    transition: "all 0.18s",
    boxShadow: active ? `0 0 14px ${ACCENT}22` : "none",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      padding: "70px 24px 28px", fontFamily: "'Space Mono', monospace",
      overflowY: "auto",
    }}>
      {/* Live glass preview */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <GlassVisual glass={glass} spirit={spirit} ice={ice} />
        <div style={{ fontSize: 7, color: `${ACCENT}45`, letterSpacing: "0.18em" }}>
          {SPIRIT_OPTS.find(s => s.id === spirit)?.label} · {GLASS_OPTS.find(g => g.id === glass)?.label}
        </div>
      </div>

      {/* Selectors */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>GLASS SHAPE</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {GLASS_OPTS.map(g => <button key={g.id} style={pill(glass === g.id)} onClick={() => setGlass(g.id)}>{g.label}</button>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>SPIRIT</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {SPIRIT_OPTS.map(s => (
              <button key={s.id} style={pill(spirit === s.id)} onClick={() => setSpirit(s.id)}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color, marginRight: 5, verticalAlign: "middle" }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>ICE / SERVE</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {ICE_OPTS.map(i => <button key={i.id} style={pill(ice === i.id)} onClick={() => setIce(i.id)}>{i.label}</button>)}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowComm(true)}
          style={{
            width: "100%", padding: "13px", borderRadius: 999, cursor: "pointer",
            background: `linear-gradient(135deg, ${ACCENT}1E, ${ACCENT}0A)`,
            border: `1px solid ${ACCENT}`,
            color: ACCENT, fontSize: 9, fontWeight: 700, letterSpacing: "0.24em",
            touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
            boxShadow: `0 0 24px ${ACCENT}15`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <span style={{ fontSize: 12 }}>◈</span> COMMISSION THIS POUR
        </motion.button>
      </div>

      <AnimatePresence>
        {showComm && <CommModal design={{ glass, spirit, ice }} flavors={flavors} onClose={() => setShowComm(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function PourCraft360() {
  return (
    <Craft360Shell config={CONFIG}>
      {(flavors) => <PourCraftCreation flavors={flavors} />}
    </Craft360Shell>
  );
}
