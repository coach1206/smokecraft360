/**
 * VapeCraft360 — Fluidity & Cloud Geometry
 * Stage 1: Cinematic intro (VaporDrift motion)
 * Stage 2: Flavor profile (Density / Cloud Geometry / Flavor Layering / Crispness)
 * Stage 3: Device & cloud designer with commission bridge
 */

import { useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence }               from "framer-motion";
import { Craft360Shell, type Craft360Config }    from "@/components/experience/Craft360Shell";

const ACCENT = "#B8A0E8";

const CONFIG: Craft360Config = {
  craftId:   "vape",
  title:     "VapeCraft",
  subtitle:  "Fluidity & Cloud Geometry",
  quote:     "Vapor is ephemeral by design — a flavor that lives only in the moment of its creation, then dissolves into silence.",
  accent:    ACCENT,
  dimAccent: "rgba(26,16,48,0.65)",
  mentor: {
    name:       "The Cloud Architect",
    title:      "Fluid Dynamics · Flavor Density · Device Calibration",
    philosophy: "Cloud is not an accident — it is physics made intentional. Every exhale is a signature.",
  },
  flavors: [
    { id: "density",   label: "Density",        icon: "🌀", desc: "Thick, saturated, enveloping presence" },
    { id: "geometry",  label: "Cloud Geometry",  icon: "🌫️", desc: "Precise shape, structured expansion" },
    { id: "layering",  label: "Flavor Layering", icon: "🎨", desc: "Complex, evolving, multi-note exhale" },
    { id: "crisp",     label: "Crispness",       icon: "✨", desc: "Clean, light, immediate flavor pop" },
  ],
  particles: [
    "rgba(184,160,232,0.25)",
    "rgba(140,100,200,0.18)",
    "rgba(210,190,255,0.15)",
  ],
};

const DEVICE_OPTS = [
  { id: "pen",        label: "Pen"         },
  { id: "pod",        label: "Pod Mod"     },
  { id: "box",        label: "Box Mod"     },
  { id: "disposable", label: "Disposable"  },
];

const COLOR_OPTS = [
  { id: "obsidian",  label: "Obsidian",  color: "#1A1A1B" },
  { id: "slate",     label: "Slate",     color: "#3A3A4A" },
  { id: "midnight",  label: "Midnight",  color: "#0A0820" },
  { id: "rose",      label: "Rose Gold", color: "#C8906A" },
  { id: "titanium",  label: "Titanium",  color: "#7A8090" },
  { id: "violet",    label: "Violet",    color: "#5A3080" },
];

const CLOUD_OPTS = [
  { id: "wisp",      label: "Light Mist"   },
  { id: "billow",    label: "Billowing"    },
  { id: "dense",     label: "Dense Fog"    },
  { id: "geometric", label: "Geometric"    },
];

// ── Device visual ──────────────────────────────────────────────────────────────
function DeviceVisual({ device, color, cloud }: { device: string; color: string; cloud: string }) {
  const col = COLOR_OPTS.find(c => c.id === color)?.color ?? "#1A1A1B";

  const dims: Record<string, [number, number, number]> = {
    pen:        [18, 110, 9],
    pod:        [36, 68,  6],
    box:        [52, 80,  4],
    disposable: [20, 88,  10],
  };
  const [w, h, r] = dims[device] ?? dims.pen;

  const cloudOpacity = cloud === "dense" ? 0.22 : cloud === "billow" ? 0.14 : cloud === "geometric" ? 0.16 : 0.09;
  const cloudBlob    = cloud === "geometric" ? "12px" : "50%";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative" }}>
      {/* Cloud wisps above device */}
      <div style={{ height: 60, width: 120, position: "relative", overflow: "visible" }}>
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i}
            style={{
              position: "absolute",
              width: 28 + i * 12,
              height: 20 + i * 6,
              borderRadius: cloudBlob,
              background: `rgba(184,160,232,${cloudOpacity + i * 0.025})`,
              filter: `blur(${cloud === "geometric" ? 2 : 10 + i * 4}px)`,
              left: `${20 + i * 10}%`,
              top: `${i * 14}%`,
            }}
            animate={{
              y:       [0, -(10 + i * 5), 0],
              x:       [0, i % 2 === 0 ? 6 : -6, 0],
              opacity: [cloudOpacity + i * 0.02, cloudOpacity * 2.5, cloudOpacity + i * 0.02],
              scale:   [1, 1.08, 1],
            }}
            transition={{
              duration: 4.5 + i * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.55,
            }}
          />
        ))}
      </div>

      {/* Device body */}
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: w, height: h, borderRadius: r,
          background: `linear-gradient(160deg, ${col}EE 0%, ${col} 100%)`,
          border: `1px solid ${ACCENT}35`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 24px ${ACCENT}18`,
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Screen / indicator (for box/pod) */}
        {(device === "box" || device === "pod") && (
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            width: device === "box" ? 30 : 20, height: device === "box" ? 20 : 12,
            background: "rgba(184,160,232,0.20)", borderRadius: 3,
            border: "1px solid rgba(184,160,232,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT }}
            />
          </div>
        )}
        {/* Coil glow at bottom */}
        <motion.div
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: h * 0.15,
            background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${ACCENT}55, transparent)`,
          }}
        />
        {/* Highlight */}
        <div style={{
          position: "absolute", top: 0, left: "15%", width: "20%", height: "100%",
          background: "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)",
        }} />
      </motion.div>
    </div>
  );
}

// ── Commission modal ───────────────────────────────────────────────────────────
type CommState = "open" | "submitting" | "success" | "error";

function CommModal({
  design, flavors, onClose,
}: {
  design:  { device: string; color: string; cloud: string };
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
          craft:       "vape",
          style:       `${DEVICE_OPTS.find(d => d.id === design.device)?.label} · ${COLOR_OPTS.find(c => c.id === design.color)?.label} · ${CLOUD_OPTS.find(c => c.id === design.cloud)?.label}`,
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
              Your device configuration has been transmitted to the Cloud Architect team.
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
            <div style={{ color: ACCENT, fontSize: 10, fontWeight: 700, letterSpacing: "0.24em", marginBottom: 4 }}>◈ COMMISSION YOUR DEVICE</div>
            <div style={{ color: `${ACCENT}50`, fontSize: 7.5, letterSpacing: "0.14em", marginBottom: 20 }}>VAPECRAFT 360 · CLOUD ARCHITECT COMMISSION</div>
            <div style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}18`, borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
              {[
                ["Device", DEVICE_OPTS.find(d => d.id === design.device)?.label ?? design.device],
                ["Finish", COLOR_OPTS.find(c => c.id === design.color)?.label ?? design.color],
                ["Cloud",  CLOUD_OPTS.find(c => c.id === design.cloud)?.label ?? design.cloud],
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
              <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={400} rows={2} placeholder="Preferred flavors, nicotine level, custom engraving…" style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
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
function VapeCraftCreation({ flavors }: { flavors: string[] }) {
  const [device,   setDevice]   = useState("pen");
  const [color,    setColor]    = useState("obsidian");
  const [cloud,    setCloud]    = useState("billow");
  const [showComm, setShowComm] = useState(false);

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${active ? ACCENT : "rgba(184,160,232,0.18)"}`,
    background: active ? `${ACCENT}1A` : "rgba(10,9,8,0.55)",
    color: active ? ACCENT : "rgba(184,160,232,0.38)",
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
      {/* Device preview */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <DeviceVisual device={device} color={color} cloud={cloud} />
        <div style={{ fontSize: 7, color: `${ACCENT}45`, letterSpacing: "0.18em" }}>
          {DEVICE_OPTS.find(d => d.id === device)?.label} · {COLOR_OPTS.find(c => c.id === color)?.label}
        </div>
      </div>

      {/* Selectors */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>DEVICE TYPE</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {DEVICE_OPTS.map(d => <button key={d.id} style={pill(device === d.id)} onClick={() => setDevice(d.id)}>{d.label}</button>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>FINISH / COLOR</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {COLOR_OPTS.map(c => (
              <button key={c.id} style={pill(color === c.id)} onClick={() => setColor(c.id)}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c.color, border: "1px solid rgba(255,255,255,0.15)", marginRight: 5, verticalAlign: "middle" }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, color: `${ACCENT}50`, letterSpacing: "0.22em", marginBottom: 8 }}>CLOUD STYLE</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {CLOUD_OPTS.map(c => <button key={c.id} style={pill(cloud === c.id)} onClick={() => setCloud(c.id)}>{c.label}</button>)}
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
          <span style={{ fontSize: 12 }}>◈</span> COMMISSION THIS DEVICE
        </motion.button>
      </div>

      <AnimatePresence>
        {showComm && <CommModal design={{ device, color, cloud }} flavors={flavors} onClose={() => setShowComm(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function VapeCraft360() {
  return (
    <Craft360Shell config={CONFIG}>
      {(flavors) => <VapeCraftCreation flavors={flavors} />}
    </Craft360Shell>
  );
}
