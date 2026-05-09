/**
 * BrewCraft360 — Carbonation & Fermentation
 * Stage 1: Cinematic intro (Rising Carbonation motion)
 * Stage 2: Flavor profile (Hops / Malt / Crispness / Body)
 * Stage 3: Beer & glass designer with commission bridge
 */

import { useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence }               from "framer-motion";
import { Craft360Shell, type Craft360Config }    from "@/components/experience/Craft360Shell";

const ACCENT = "#7EC8A0";

const CONFIG: Craft360Config = {
  craftId:   "brew",
  title:     "BrewCraft",
  subtitle:  "Carbonation & Fermentation",
  quote:     "Fermentation is time made tangible — a conversation between grain, water, and patience older than civilization.",
  accent:    ACCENT,
  dimAccent: "rgba(15,42,24,0.65)",
  mentor: {
    name:       "Master Brewer",
    title:      "Technical · Bitterness Units · Aroma Layering",
    philosophy: "A perfect brew is not brewed — it is coaxed. Yeast has opinions. Learn to negotiate.",
  },
  flavors: [
    { id: "hops",      label: "Hops",      icon: "🌿", desc: "Citrus, pine, floral bitterness" },
    { id: "malt",      label: "Malt",      icon: "🌾", desc: "Caramel, bread, roasted grain" },
    { id: "crispness", label: "Crispness", icon: "❄️", desc: "Clean finish, mineral water, clarity" },
    { id: "body",      label: "Body",      icon: "🛢️", desc: "Full, round, barrel-aged depth" },
  ],
  particles: [
    "rgba(126,200,160,0.30)",
    "rgba(80,160,100,0.20)",
    "rgba(160,220,180,0.18)",
  ],
};

const STYLE_OPTS = [
  { id: "ipa",    label: "IPA",    color: "#C88020" },
  { id: "stout",  label: "Stout",  color: "#1A0E08" },
  { id: "lager",  label: "Lager",  color: "#E0B840" },
  { id: "wheat",  label: "Wheat",  color: "#D4A840" },
  { id: "sour",   label: "Sour",   color: "#E8D060" },
  { id: "porter", label: "Porter", color: "#2A1408" },
];

const GLASS_OPTS = [
  { id: "pint",   label: "Pint"   },
  { id: "tulip",  label: "Tulip"  },
  { id: "stein",  label: "Stein"  },
  { id: "weizen", label: "Weizen" },
  { id: "goblet", label: "Goblet" },
];

const FOAM_OPTS = [
  { id: "none",   label: "No Head"  },
  { id: "light",  label: "Light"    },
  { id: "medium", label: "Medium"   },
  { id: "thick",  label: "Thick"    },
];

// ── Beer glass visual ──────────────────────────────────────────────────────────
function BeerGlass({ style, glass, foam }: { style: string; glass: string; foam: string }) {
  const sp     = STYLE_OPTS.find(s => s.id === style) ?? STYLE_OPTS[0];
  const foamH  = foam === "thick" ? 22 : foam === "medium" ? 14 : foam === "light" ? 7 : 0;

  const dims: Record<string, [number, number, string]> = {
    pint:   [58, 90,  "2px"],
    tulip:  [64, 88,  "16px"],
    stein:  [70, 80,  "3px"],
    weizen: [46, 110, "2px"],
    goblet: [68, 72,  "24px"],
  };
  const [w, h, br] = dims[glass] ?? dims.pint;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: w, height: h }}>
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid rgba(126,200,160,0.50)",
          borderRadius: br,
          background: "rgba(126,200,160,0.04)",
          overflow: "hidden",
        }}>
          {/* Beer fill */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${foamH > 0 ? 72 : 80}%` }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: `linear-gradient(180deg, ${sp.color}CC 0%, ${sp.color} 100%)`,
            }}
          />
          {/* Foam */}
          {foamH > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              style={{
                position: "absolute", top: `${100 - 72 - foamH / h * 100}%`,
                left: 0, right: 0, height: foamH,
                background: "rgba(245,242,237,0.90)",
                borderRadius: "4px 4px 0 0",
              }}
            />
          )}
          {/* Carbonation bubbles */}
          {[0, 1, 2].map(i => (
            <motion.div key={i} style={{
              position: "absolute",
              bottom: `${20 + i * 18}%`,
              left: `${20 + i * 22}%`,
              width: 3, height: 3, borderRadius: "50%",
              background: `${sp.color}80`,
            }}
            animate={{ y: [0, -40], opacity: [0.6, 0] }}
            transition={{ duration: 1.8 + i * 0.4, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
            />
          ))}
          {/* Glass highlight */}
          <div style={{
            position: "absolute", top: 0, left: "12%", width: "18%", height: "100%",
            background: "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)",
          }} />
        </div>
      </div>
      {/* Glass base */}
      <div style={{ width: w + 8, height: 5, borderRadius: 3, background: "rgba(126,200,160,0.28)" }} />
    </div>
  );
}

// ── Commission modal ───────────────────────────────────────────────────────────
type CommState = "open" | "submitting" | "success" | "error";

function CommModal({
  design, flavors, onClose,
}: {
  design:  { style: string; glass: string; foam: string };
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
      const res = await fetch("/api/artisan-orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craft:       "brew",
          style:       `${STYLE_OPTS.find(s => s.id === design.style)?.label} · ${GLASS_OPTS.find(g => g.id === design.glass)?.label} · ${design.foam} head`,
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
              Your bespoke brew commission has been routed to the Master Brewer team.
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
            <div style={{ color: ACCENT, fontSize: 10, fontWeight: 700, letterSpacing: "0.24em", marginBottom: 4 }}>◈ COMMISSION YOUR BREW</div>
            <div style={{ color: `${ACCENT}50`, fontSize: 7.5, letterSpacing: "0.14em", marginBottom: 20 }}>BREWCRAFT 360 · MASTER BREWER COMMISSION</div>
            <div style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}18`, borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
              {[
                ["Style", STYLE_OPTS.find(s => s.id === design.style)?.label ?? design.style],
                ["Glass", GLASS_OPTS.find(g => g.id === design.glass)?.label ?? design.glass],
                ["Head",  FOAM_OPTS.find(f => f.id === design.foam)?.label ?? design.foam],
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
              <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={400} rows={2} placeholder="Quantity, occasion, custom label requests…" style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
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
function BrewCraftCreation({ flavors }: { flavors: string[] }) {
  const [style,    setStyle]    = useState("ipa");
  const [glass,    setGlass]    = useState("pint");
  const [foam,     setFoam]     = useState("medium");
  const [showComm, setShowComm] = useState(false);

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${active ? ACCENT : "rgba(126,200,160,0.18)"}`,
    background: active ? `${ACCENT}1A` : "rgba(10,9,8,0.55)",
    color: active ? ACCENT : "rgba(126,200,160,0.38)",
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
      {/* Beer glass preview */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <BeerGlass style={style} glass={glass} foam={foam} />
        <div style={{ fontSize: 7, color: `${ACCENT}45`, letterSpacing: "0.18em" }}>
          {STYLE_OPTS.find(s => s.id === style)?.label} · {GLASS_OPTS.find(g => g.id === glass)?.label}
        </div>
      </div>

      {/* Selectors */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>BEER STYLE</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {STYLE_OPTS.map(s => (
              <button key={s.id} style={pill(style === s.id)} onClick={() => setStyle(s.id)}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color, marginRight: 5, verticalAlign: "middle", border: "1px solid rgba(255,255,255,0.15)" }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>GLASSWARE</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {GLASS_OPTS.map(g => <button key={g.id} style={pill(glass === g.id)} onClick={() => setGlass(g.id)}>{g.label}</button>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>FOAM HEAD</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {FOAM_OPTS.map(f => <button key={f.id} style={pill(foam === f.id)} onClick={() => setFoam(f.id)}>{f.label}</button>)}
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
          <span style={{ fontSize: 12 }}>◈</span> COMMISSION THIS BREW
        </motion.button>
      </div>

      <AnimatePresence>
        {showComm && <CommModal design={{ style, glass, foam }} flavors={flavors} onClose={() => setShowComm(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function BrewCraft360() {
  return (
    <Craft360Shell config={CONFIG}>
      {(flavors) => <BrewCraftCreation flavors={flavors} />}
    </Craft360Shell>
  );
}
