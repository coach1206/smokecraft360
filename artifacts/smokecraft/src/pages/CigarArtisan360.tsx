/**
 * CigarArtisan360 — Bespoke Cigar Box Customization Suite
 *
 * React Three Fiber scene with:
 *  • Three wood presets (Cedar, Mahogany, Ebony) via PBR-style materials
 *  • Four band styles (Sovereign, Obsidian, Heirloom, Midnight)
 *  • Custom logo upload → Decal mapped onto box lid
 *  • Animated lid open on long-press (useFrame spring)
 *  • Touch-first OrbitControls (single-finger rotate, two-finger zoom)
 *  • Sovereign Override Hub auto-present (global, no extra wiring needed)
 */

import { Suspense, useRef, useState, useCallback, useEffect, Component, type FormEvent } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Decal,
  useTexture,
  Float,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD    = "#D4AF37";
const OBSIDIAN = "#0A0908";
const CREAM   = "#F5F2ED";
const MONO    = "'Space Mono','Courier New',monospace";

// ── WebGL availability detection ───────────────────────────────────────────────
function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

// ── Wood presets — PBR-style material params, no texture files required ────────
type WoodId = "cedar" | "mahogany" | "ebony";

const WOOD: Record<WoodId, {
  label:    string;
  color:    string;
  interior: string;
  rough:    number;
  metal:    number;
  desc:     string;
}> = {
  cedar: {
    label:    "Spanish Cedar",
    color:    "#C4A882",
    interior: "#D4B896",
    rough:    0.88,
    metal:    0.0,
    desc:     "Classic aroma · Light grain · Ideal preservation",
  },
  mahogany: {
    label:    "African Mahogany",
    color:    "#4A1C0F",
    interior: "#C4A882",
    rough:    0.12,
    metal:    0.08,
    desc:     "Deep reddish-brown · Mirror finish · High-gloss coat",
  },
  ebony: {
    label:    "Piano Black Ebony",
    color:    "#111110",
    interior: "#C4A882",
    rough:    0.04,
    metal:    0.14,
    desc:     "Ultra-premium matte · Modern · Sleek aesthetic",
  },
};

// ── Band presets ───────────────────────────────────────────────────────────────
type BandId = "sovereign" | "obsidian" | "heirloom" | "midnight";

const BAND: Record<BandId, {
  label:   string;
  color:   string;
  accent:  string;
  rough:   number;
  metal:   number;
  desc:    string;
}> = {
  sovereign: {
    label:  "The Sovereign",
    color:  "#1A1A1A",
    accent: "#D4AF37",
    rough:  0.1,
    metal:  0.9,
    desc:   "Matte black · 24k gold leaf foil embossing",
  },
  obsidian: {
    label:  "The Obsidian",
    color:  "#3A3A3A",
    accent: "#C0C0C0",
    rough:  0.2,
    metal:  0.8,
    desc:   "Smoked charcoal · Silver metallic accents",
  },
  heirloom: {
    label:  "The Heirloom",
    color:  "#F0EAD6",
    accent: "#CD7F32",
    rough:  0.75,
    metal:  0.3,
    desc:   "Cream parchment · Bronze filigree",
  },
  midnight: {
    label:  "The Midnight",
    color:  "#1A2040",
    accent: "#B8C0CC",
    rough:  0.15,
    metal:  0.7,
    desc:   "Deep navy blue · Brushed titanium detailing",
  },
};

// ── Decal child component (isolates useTexture so it can't be called null) ────
function LogoDecal({ url }: { url: string }) {
  const tex = useTexture(url);
  return (
    <Decal
      position={[0, 0.76, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[1.4, 1.4, 1]}
    >
      <meshStandardMaterial
        map={tex}
        transparent
        polygonOffset
        polygonOffsetFactor={-1}
        roughness={0.4}
        metalness={0.1}
      />
    </Decal>
  );
}

// ── Animated lid ───────────────────────────────────────────────────────────────
function BoxLid({
  wood,
  lidOpen,
}: {
  wood:    WoodId;
  lidOpen: boolean;
}) {
  const ref   = useRef<THREE.Mesh>(null);
  const angle = useRef(0);
  const w     = WOOD[wood];

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = lidOpen ? -Math.PI / 1.8 : 0;
    angle.current += (target - angle.current) * Math.min(1, delta * 5);
    ref.current.rotation.x = angle.current;
  });

  return (
    // Pivot at back edge of lid
    <group position={[0, 0.75, -1.5]}>
      <mesh ref={ref} position={[0, 0, 1.5]} castShadow>
        <boxGeometry args={[4, 0.08, 3]} />
        <meshStandardMaterial
          color={w.color}
          roughness={w.rough}
          metalness={w.metal}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

// ── Band ring ──────────────────────────────────────────────────────────────────
function BandRing({ band }: { band: BandId }) {
  const b = BAND[band];
  return (
    <group position={[0, 0.3, 1.0]}>
      {/* Band backing */}
      <mesh>
        <boxGeometry args={[4.02, 0.45, 0.12]} />
        <meshStandardMaterial color={b.color} roughness={b.rough} metalness={b.metal} />
      </mesh>
      {/* Accent stripe */}
      <mesh position={[0, 0, 0.062]}>
        <boxGeometry args={[4.04, 0.06, 0.01]} />
        <meshStandardMaterial color={b.accent} roughness={0.05} metalness={0.95} envMapIntensity={2} />
      </mesh>
      <mesh position={[0, -0.18, 0.062]}>
        <boxGeometry args={[4.04, 0.04, 0.01]} />
        <meshStandardMaterial color={b.accent} roughness={0.05} metalness={0.95} envMapIntensity={2} />
      </mesh>
    </group>
  );
}

// ── Main 3D scene ──────────────────────────────────────────────────────────────
function CigarBoxScene({
  wood,
  band,
  logoUrl,
  lidOpen,
}: {
  wood:    WoodId;
  band:    BandId;
  logoUrl: string | null;
  lidOpen: boolean;
}) {
  const w = WOOD[wood];
  const { gl } = useThree();

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type    = THREE.PCFSoftShadowMap;
  }, [gl]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 4, 5]} fov={42} />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Lighting */}
      <ambientLight intensity={0.55} color="#fff8ee" />
      <spotLight
        position={[8, 10, 8]}
        angle={0.18}
        penumbra={1}
        intensity={3.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <spotLight
        position={[-6, 6, -4]}
        angle={0.25}
        penumbra={1}
        intensity={1.2}
        color="#ffd580"
      />
      <pointLight position={[0, -2, 3]} intensity={0.4} color="#c4a882" />

      {/* Shadow receiver */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.76, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.22} />
      </mesh>

      <Float speed={1.2} rotationIntensity={0.18} floatIntensity={0.22}>
        <group>
          {/* Box body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4, 1.5, 3]} />
            <meshStandardMaterial
              color={w.color}
              roughness={w.rough}
              metalness={w.metal}
              envMapIntensity={1.4}
            />
            {/* Custom logo decal (separate component for safe useTexture) */}
            {logoUrl && (
              <Suspense fallback={null}>
                <LogoDecal url={logoUrl} />
              </Suspense>
            )}
          </mesh>

          {/* Interior cedar lining — visible when lid is open */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[3.82, 1.35, 2.82]} />
            <meshStandardMaterial
              color={w.interior}
              roughness={0.92}
              metalness={0}
              side={THREE.BackSide}
            />
          </mesh>

          {/* Animated lid */}
          <BoxLid wood={wood} lidOpen={lidOpen} />

          {/* Band */}
          <BandRing band={band} />
        </group>
      </Float>

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={11}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.8}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        touches={{
          ONE:   THREE.TOUCH.ROTATE,
          TWO:   THREE.TOUCH.DOLLY_ROTATE,
        }}
      />
    </>
  );
}

// ── Canvas error boundary (catches R3F crashes) ────────────────────────────────
interface EBState { crashed: boolean }
class CanvasErrorBoundary extends Component<{ children: ReactNode; onCrash: () => void }, EBState> {
  state: EBState = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch() { this.props.onCrash(); }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

// ── CSS 3D fallback — renders when WebGL is unavailable ───────────────────────
function CigarBoxFallback({
  wood,
  band,
  logoUrl,
  lidOpen,
}: {
  wood:    WoodId;
  band:    BandId;
  logoUrl: string | null;
  lidOpen: boolean;
}) {
  const w = WOOD[wood];
  const b = BAND[band];

  // Box face dimensions (px)
  const W = 300, H = 110, D = 190;

  const face = (
    transform: string,
    width: number,
    height: number,
    bg: string,
    extra?: React.CSSProperties
  ) => (
    <div style={{
      position:    "absolute",
      width,
      height,
      background:  bg,
      transform,
      backfaceVisibility: "hidden",
      border:      "1px solid rgba(0,0,0,0.18)",
      ...extra,
    }} />
  );

  const woodShine  = `linear-gradient(135deg, ${w.color}ee 0%, ${w.color} 40%, ${w.color}cc 100%)`;
  const woodDark   = `linear-gradient(135deg, ${w.color}99 0%, ${w.color}bb 100%)`;
  const bandBg     = `linear-gradient(90deg, ${b.color} 0%, ${b.color}dd 50%, ${b.color} 100%)`;

  return (
    <div style={{
      flex:            1,
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             24,
      minHeight:       0,
    }}>
      {/* Perspective stage */}
      <div style={{ perspective: 900, perspectiveOrigin: "50% 40%" }}>
        <motion.div
          animate={{ rotateY: [-14, 14, -14], rotateX: [4, -2, 4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width:            W,
            height:           H,
            position:         "relative",
            transformStyle:   "preserve-3d",
            transformOrigin:  "center center",
          }}
        >
          {/* Front face */}
          {face(
            `translateZ(${D / 2}px)`,
            W, H, woodShine,
            { display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }
          )}

          {/* Back face */}
          {face(`rotateY(180deg) translateZ(${D / 2}px)`, W, H, woodDark)}

          {/* Right face */}
          {face(`rotateY(90deg) translateZ(${W / 2}px)`, D, H, woodDark)}

          {/* Left face */}
          {face(`rotateY(-90deg) translateZ(${W / 2}px)`, D, H, woodDark)}

          {/* Bottom face */}
          {face(`rotateX(-90deg) translateZ(${H / 2}px)`, W, D, woodDark)}

          {/* Lid (top face) — pivots at back edge when lidOpen */}
          <motion.div
            animate={{ rotateX: lidOpen ? -105 : 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 14 }}
            style={{
              position:        "absolute",
              width:           W,
              height:          D,
              background:      woodShine,
              transformOrigin: "top center",
              transform:       `rotateX(90deg) translateZ(${-H / 2}px)`,
              backfaceVisibility: "hidden",
              border:          "1px solid rgba(0,0,0,0.18)",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              overflow:        "hidden",
            }}
          >
            {/* Logo on lid */}
            {logoUrl && (
              <img
                src={logoUrl}
                alt="emblem"
                style={{
                  maxWidth: "60%", maxHeight: "60%",
                  objectFit: "contain", opacity: 0.88,
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
                }}
              />
            )}
          </motion.div>

          {/* Band ring — sits on front face at mid-height */}
          <div style={{
            position:  "absolute",
            left:      -1,
            top:       H * 0.28,
            width:     W + 2,
            height:    H * 0.3,
            transform: `translateZ(${D / 2 + 1}px)`,
            background: bandBg,
            display:    "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            overflow:   "hidden",
          }}>
            {/* Accent stripe top */}
            <div style={{ height: 2, background: b.accent, opacity: 0.9, boxShadow: `0 0 6px ${b.accent}88` }} />
            <div style={{ fontSize: 7, fontFamily: MONO, letterSpacing: "0.28em", color: b.accent,
              textAlign: "center", textTransform: "uppercase", opacity: 0.85,
              textShadow: `0 0 8px ${b.accent}66` }}>
              {b.label}
            </div>
            {/* Accent stripe bottom */}
            <div style={{ height: 1.5, background: b.accent, opacity: 0.7, boxShadow: `0 0 4px ${b.accent}66` }} />
          </div>
        </motion.div>
      </div>

      {/* Shadow beneath box */}
      <div style={{
        width: W * 0.8, height: 14, marginTop: -10,
        background: "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 75%)",
        borderRadius: "50%",
      }} />

      {/* WebGL notice */}
      <div style={{
        fontSize: 7.5, color: "rgba(212,175,55,0.22)", letterSpacing: "0.16em",
        textAlign: "center", fontFamily: MONO,
      }}>
        CSS PREVIEW · FULL 3D ACTIVE ON DEVICE
      </div>
    </div>
  );
}

// ── Control pill ───────────────────────────────────────────────────────────────
function Pill({
  label,
  active,
  accent,
  onClick,
}: {
  label:   string;
  active:  boolean;
  accent:  string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      style={{
        padding:              "9px 18px",
        borderRadius:         999,
        border:               `1px solid ${active ? accent : "rgba(212,175,55,0.18)"}`,
        background:           active ? `${accent}22` : "rgba(10,9,8,0.70)",
        color:                active ? accent : "rgba(212,175,55,0.42)",
        fontSize:             9,
        fontWeight:           700,
        letterSpacing:        "0.14em",
        textTransform:        "uppercase" as const,
        fontFamily:           MONO,
        cursor:               "pointer",
        backdropFilter:       "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        touchAction:          "manipulation",
        WebkitTapHighlightColor: "transparent",
        whiteSpace:           "nowrap",
        transition:           "border-color 0.18s, background 0.18s, color 0.18s",
        boxShadow:            active ? `0 0 14px ${accent}33` : "none",
      }}
    >
      {label}
    </motion.button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
// ── Commission modal ───────────────────────────────────────────────────────────
type CommissionState = "idle" | "open" | "submitting" | "success" | "error";

function CommissionModal({
  wood, band, hasEmblem,
  state, orderId,
  guestName, notes,
  onGuestName, onNotes,
  onSubmit, onClose,
}: {
  wood: WoodId; band: BandId; hasEmblem: boolean;
  state: CommissionState; orderId: string;
  guestName: string; notes: string;
  onGuestName: (v: string) => void;
  onNotes:     (v: string) => void;
  onSubmit:    (e: FormEvent) => void;
  onClose:     () => void;
}) {
  const w = WOOD[wood];
  const b = BAND[band];
  const input: React.CSSProperties = {
    width: "100%", boxSizing: "border-box" as const,
    background: "rgba(212,175,55,0.05)",
    border: "1px solid rgba(212,175,55,0.22)",
    borderRadius: 8, color: "#F5F2ED",
    fontSize: 11, fontFamily: MONO, letterSpacing: "0.06em",
    padding: "10px 14px", outline: "none",
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(10,9,8,0.92)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, fontFamily: MONO,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{    y: 16, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{
          background: "rgba(16,14,12,0.98)",
          border: `1px solid rgba(212,175,55,0.28)`,
          borderRadius: 16, padding: "28px 24px",
          width: "100%", maxWidth: 420,
          boxShadow: `0 32px 80px rgba(0,0,0,0.85), 0 0 40px rgba(212,175,55,0.06) inset`,
        }}
      >
        {state === "success" ? (
          /* Success screen */
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
              style={{ fontSize: 40, marginBottom: 16 }}
            >◈</motion.div>
            <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", marginBottom: 8 }}>
              COMMISSION RECEIVED
            </div>
            <div style={{ color: "rgba(212,175,55,0.45)", fontSize: 8, letterSpacing: "0.18em", marginBottom: 24 }}>
              ORDER REFERENCE
            </div>
            <div style={{
              background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: 8, padding: "10px 16px",
              color: GOLD, fontSize: 14, letterSpacing: "0.22em", marginBottom: 20,
            }}>{orderId}</div>
            <div style={{ color: "rgba(245,242,237,0.45)", fontSize: 9, lineHeight: 1.7, letterSpacing: "0.08em", marginBottom: 24 }}>
              Your bespoke commission has been routed to the Master Artisan team.
              A detailed order summary has been sent for review.
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} style={{
              width: "100%", padding: "13px", borderRadius: 999,
              background: `rgba(212,175,55,0.12)`, border: `1px solid ${GOLD}`,
              color: GOLD, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
              cursor: "pointer", touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}>CLOSE</motion.button>
          </div>
        ) : (
          /* Order form */
          <form onSubmit={onSubmit}>
            {/* Header */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", marginBottom: 4 }}>
                ◈ COMMISSION THIS BOX
              </div>
              <div style={{ color: "rgba(212,175,55,0.38)", fontSize: 7.5, letterSpacing: "0.14em" }}>
                MASTER ARTISAN 360 · BESPOKE ORDER SUBMISSION
              </div>
            </div>

            {/* Design summary */}
            <div style={{
              background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.14)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 6,
            }}>
              {[
                ["WOOD",   w.label],
                ["BAND",   b.label],
                ["EMBLEM", hasEmblem ? "Custom — Uploaded" : "None"],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 7, color: "rgba(212,175,55,0.4)", letterSpacing: "0.2em", minWidth: 50 }}>{lbl}</span>
                  <span style={{ fontSize: 10, color: "#F5F2ED", letterSpacing: "0.06em" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Guest name */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 7, color: "rgba(212,175,55,0.38)", letterSpacing: "0.2em", marginBottom: 6 }}>
                YOUR NAME <span style={{ color: "rgba(212,175,55,0.22)" }}>(OPTIONAL)</span>
              </div>
              <input
                value={guestName}
                onChange={e => onGuestName(e.target.value)}
                placeholder="e.g. James C."
                maxLength={80}
                style={{ ...input, height: 40 }}
              />
            </div>

            {/* Special instructions */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 7, color: "rgba(212,175,55,0.38)", letterSpacing: "0.2em", marginBottom: 6 }}>
                SPECIAL INSTRUCTIONS <span style={{ color: "rgba(212,175,55,0.22)" }}>(OPTIONAL)</span>
              </div>
              <textarea
                value={notes}
                onChange={e => onNotes(e.target.value)}
                placeholder="Engraving text, quantity, occasion…"
                maxLength={400}
                rows={3}
                style={{ ...input, resize: "none" as const, lineHeight: 1.6 }}
              />
            </div>

            {/* Error */}
            {state === "error" && (
              <div style={{ color: "#EF4444", fontSize: 8, letterSpacing: "0.12em", marginBottom: 14, textAlign: "center" }}>
                Submission failed — please try again
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onClose}
                style={{
                  flex: 1, padding: "13px", borderRadius: 999,
                  background: "transparent", border: "1px solid rgba(212,175,55,0.20)",
                  color: "rgba(212,175,55,0.40)", fontSize: 8, fontWeight: 700, letterSpacing: "0.2em",
                  cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}>
                CANCEL
              </motion.button>
              <motion.button type="submit" whileTap={{ scale: 0.95 }} disabled={state === "submitting"}
                style={{
                  flex: 2, padding: "13px", borderRadius: 999,
                  background: state === "submitting" ? "rgba(212,175,55,0.08)" : `rgba(212,175,55,0.14)`,
                  border: `1px solid ${state === "submitting" ? "rgba(212,175,55,0.22)" : GOLD}`,
                  color: state === "submitting" ? "rgba(212,175,55,0.40)" : GOLD,
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.2em",
                  cursor: state === "submitting" ? "default" : "pointer",
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  transition: "all 0.18s",
                }}>
                {state === "submitting" ? "TRANSMITTING…" : "SUBMIT COMMISSION"}
              </motion.button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CigarArtisan360() {
  const [, navigate] = useLocation();
  const [wood, setWood]       = useState<WoodId>("mahogany");
  const [band, setBand]       = useState<BandId>("sovereign");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [lidOpen, setLidOpen] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const longPressRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  // Commission state
  const [commState, setCommState] = useState<CommissionState>("idle");
  const [guestName, setGuestName] = useState("");
  const [notes,     setNotes]     = useState("");
  const [orderId,   setOrderId]   = useState("");

  useEffect(() => {
    setHasWebGL(detectWebGL());
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const prev = logoUrl;
      const url  = URL.createObjectURL(file);
      setLogoUrl(url);
      if (prev) URL.revokeObjectURL(prev);
    }
  }, [logoUrl]);

  // Long-press to open lid
  const onPressStart = useCallback(() => {
    longPressRef.current = setTimeout(() => setLidOpen(v => !v), 700);
  }, []);
  const onPressEnd = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  const handleCommission = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setCommState("submitting");
    try {
      const res = await fetch("/api/artisan-orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wood, band, hasEmblem: !!logoUrl, guestName: guestName.trim() || undefined, notes: notes.trim() || undefined }),
      });
      const data = await res.json() as { success?: boolean; orderId?: string };
      if (data.success && data.orderId) {
        setOrderId(data.orderId);
        setCommState("success");
      } else {
        setCommState("error");
      }
    } catch {
      setCommState("error");
    }
  }, [wood, band, logoUrl, guestName, notes]);

  const openCommission  = useCallback(() => { setCommState("open"); setGuestName(""); setNotes(""); setOrderId(""); }, []);
  const closeCommission = useCallback(() => { if (commState !== "submitting") setCommState("idle"); }, [commState]);

  const w = WOOD[wood];
  const b = BAND[band];

  return (
    <div style={{
      width:    "100vw",
      height:   "100vh",
      background: OBSIDIAN,
      overflow: "hidden",
      position: "relative",
      fontFamily: MONO,
    }}>

      {/* ── Back button ── */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => navigate("/")}
        style={{
          position:    "fixed", top: 14, left: 14, zIndex: 200,
          display:     "flex", alignItems: "center", gap: 7,
          padding:     "9px 16px", borderRadius: 999,
          background:  "rgba(10,9,8,0.80)",
          border:      "1px solid rgba(212,175,55,0.25)",
          color:       "rgba(212,175,55,0.60)",
          fontSize:    9, letterSpacing: "0.16em", cursor: "pointer",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        }}
      >
        ‹ PORTAL
      </motion.button>

      {/* ── Header ── */}
      <div style={{
        position: "absolute", top: 0, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100, textAlign: "center", pointerEvents: "none",
        padding: "18px 0 0",
      }}>
        <div style={{
          fontSize:      "clamp(10px, 1.6vw, 14px)",
          fontWeight:    700, letterSpacing: "0.38em",
          color:         GOLD, textTransform: "uppercase",
          textShadow:    `0 0 24px ${GOLD}55`,
        }}>
          MASTER ARTISAN 360
        </div>
        <div style={{ fontSize: 7, color: "rgba(212,175,55,0.32)", letterSpacing: "0.22em", marginTop: 3 }}>
          BESPOKE CIGAR BOX DESIGN SUITE
        </div>
      </div>

      {/* ── Viewport: 3D canvas or CSS fallback ── */}
      <div style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        flexDirection:  "column",
        paddingTop:     56,
        paddingBottom:  hasWebGL ? 0 : 210,
        touchAction:    "none",
      }}
        onMouseDown={onPressStart} onMouseUp={onPressEnd}
        onTouchStart={onPressStart} onTouchEnd={onPressEnd}
      >
        {hasWebGL ? (
          <CanvasErrorBoundary onCrash={() => setHasWebGL(false)}>
            <Canvas
              shadows
              style={{ flex: 1, background: "transparent" }}
              gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
            >
              <Suspense fallback={null}>
                <CigarBoxScene wood={wood} band={band} logoUrl={logoUrl} lidOpen={lidOpen} />
              </Suspense>
            </Canvas>
          </CanvasErrorBoundary>
        ) : (
          <CigarBoxFallback wood={wood} band={band} logoUrl={logoUrl} lidOpen={lidOpen} />
        )}
      </div>

      {/* ── Ambient background glow ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 40% at 50% 60%, ${GOLD}09 0%, transparent 70%)`,
      }} />

      {/* ── Bottom control bar ── */}
      <div style={{
        position:             "fixed", bottom: 0, left: 0, right: 0,
        zIndex:               150,
        background:           "rgba(10,9,8,0.88)",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop:            "1px solid rgba(212,175,55,0.14)",
        padding:              "16px 20px 20px",
        display:              "flex",
        flexDirection:        "column",
        gap:                  14,
      }}>

        {/* Wood row */}
        <div>
          <div style={{ fontSize: 7, color: "rgba(212,175,55,0.35)", letterSpacing: "0.22em", marginBottom: 8 }}>
            WOOD SELECTION
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {(Object.keys(WOOD) as WoodId[]).map(id => (
              <Pill key={id} label={WOOD[id].label} active={wood === id} accent={GOLD} onClick={() => setWood(id)} />
            ))}
          </div>
          <div style={{ fontSize: 7.5, color: "rgba(212,175,55,0.28)", marginTop: 6, letterSpacing: "0.1em" }}>
            {w.desc}
          </div>
        </div>

        {/* Band + Upload row */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" as const }}>
          {/* Band selector */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 7, color: "rgba(212,175,55,0.35)", letterSpacing: "0.22em", marginBottom: 8 }}>
              BAND STYLE
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              {(Object.keys(BAND) as BandId[]).map(id => (
                <Pill key={id} label={BAND[id].label} active={band === id} accent={BAND[id].accent} onClick={() => setBand(id)} />
              ))}
            </div>
            <div style={{ fontSize: 7.5, color: "rgba(212,175,55,0.28)", marginTop: 6, letterSpacing: "0.1em" }}>
              {b.desc}
            </div>
          </div>

          {/* Upload + lid */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, alignItems: "flex-end" }}>
            {/* Upload emblem */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ display: "none" }}
            />
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => fileRef.current?.click()}
              style={{
                padding:    "9px 18px", borderRadius: 999,
                border:     `1px solid ${logoUrl ? GOLD : "rgba(212,175,55,0.22)"}`,
                background: logoUrl ? `${GOLD}18` : "rgba(10,9,8,0.70)",
                color:      logoUrl ? GOLD : "rgba(212,175,55,0.45)",
                fontSize:   8, fontWeight: 700, letterSpacing: "0.14em",
                cursor:     "pointer", touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                whiteSpace: "nowrap",
              }}
            >
              {logoUrl ? "✓ EMBLEM APPLIED" : "UPLOAD EMBLEM"}
            </motion.button>

            {/* Lid toggle hint */}
            <div style={{ fontSize: 7, color: "rgba(212,175,55,0.22)", letterSpacing: "0.12em", textAlign: "right" }}>
              {lidOpen ? "TAP & HOLD TO CLOSE LID" : "HOLD 3D VIEW TO OPEN LID"}
            </div>
          </div>
        </div>

        {/* Commission CTA */}
        <div style={{ borderTop: "1px solid rgba(212,175,55,0.10)", paddingTop: 12 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={openCommission}
            style={{
              width: "100%", padding: "14px", borderRadius: 999,
              background: "linear-gradient(135deg, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.08) 100%)",
              border: `1px solid ${GOLD}`,
              color: GOLD, fontSize: 9, fontWeight: 700, letterSpacing: "0.26em",
              cursor: "pointer", touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              boxShadow: `0 0 24px rgba(212,175,55,0.12)`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 12 }}>◈</span> COMMISSION THIS BOX
          </motion.button>
        </div>

        {/* Instruction strip */}
        <div style={{
          display: "flex", gap: 20, justifyContent: "center",
          borderTop: "1px solid rgba(212,175,55,0.06)", paddingTop: 8,
        }}>
          {["1 FINGER — ROTATE", "2 FINGERS — ZOOM", "LONG PRESS — OPEN LID"].map(t => (
            <div key={t} style={{ fontSize: 7, color: "rgba(212,175,55,0.20)", letterSpacing: "0.12em" }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── Commission modal ── */}
      <AnimatePresence>
        {commState !== "idle" && (
          <CommissionModal
            wood={wood} band={band} hasEmblem={!!logoUrl}
            state={commState} orderId={orderId}
            guestName={guestName} notes={notes}
            onGuestName={setGuestName} onNotes={setNotes}
            onSubmit={handleCommission} onClose={closeCommission}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
