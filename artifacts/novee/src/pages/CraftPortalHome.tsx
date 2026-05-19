import { useState, useEffect, useRef } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";

// ── 3 400 Hz tactile audio burst ─────────────────────────────────────────────
function playTactile() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 3400; o.type = "sine";
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.10);
  } catch { /* non-blocking */ }
}

type CraftKey = "smokecraft" | "pourcraft" | "beercraft" | "winecraft";

// ── HTML5 SmokeCanvas — z-index 9996 ─────────────────────────────────────────
function SmokeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    type Particle = { x: number; y: number; r: number; opacity: number; vx: number; vy: number };
    const particles: Particle[] = [];
    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * (canvas.width || 1920),
        y: Math.random() * (canvas.height || 1080),
        r: 30 + Math.random() * 70,
        opacity: 0.015 + Math.random() * 0.035,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.4 - Math.random() * 0.7,
      });
    }

    let rafId: number;
    function draw() {
      const w = canvas!.width; const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(235,228,210,${p.opacity})`);
        g.addColorStop(1, "rgba(235,228,210,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
        p.x += p.vx; p.y += p.vy; p.r += 0.25; p.opacity -= 0.00025;
        if (p.y < -p.r || p.opacity <= 0) {
          p.x = Math.random() * w; p.y = h + 30;
          p.r = 20 + Math.random() * 50;
          p.opacity = 0.02 + Math.random() * 0.03;
        }
      }
      rafId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 9996, pointerEvents: "none" }} />
  );
}

// ── Ambient burning cigar at absolute bottom ──────────────────────────────────
function AmbientCigar() {
  return (
    <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", zIndex: 9997, pointerEvents: "none", paddingBottom: 2 }}>
      <div style={{ position: "relative", width: 200, height: 22 }}>
        <div style={{ position: "absolute", left: 20, top: 7, width: 155, height: 8, background: "linear-gradient(90deg,#3d1a08 0%,#6b3a1a 28%,#8b5e30 58%,#c8a06a 100%)", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", right: 0, top: 5, width: 26, height: 12, background: "linear-gradient(90deg,#c8a06a,#e8c88a)", borderRadius: "0 8px 8px 0" }} />
        <div style={{ position: "absolute", left: 4, top: 6, width: 20, height: 10, background: "linear-gradient(90deg,transparent,#bab6b0,#e0ddd8)", borderRadius: "2px 0 0 2px", opacity: 0.9 }} />
        <motion.div
          animate={{ opacity: [0.55, 1, 0.5, 0.9, 0.55], scale: [1, 1.25, 0.88, 1.1, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: -4, top: 2, width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle,#ff6a00 0%,#ff4500 42%,transparent 80%)", boxShadow: "0 0 14px 5px rgba(255,100,0,0.55)" }}
        />
      </div>
    </div>
  );
}

// ── Portal definitions ────────────────────────────────────────────────────────
const PORTALS = [
  { id: "smokecraft" as CraftKey, title: "SmokeCraft 360", sub: "Luxury Cigar Masterclass",    route: "/smokecraft", offset: 0,    active: true  },
  { id: "pourcraft"  as CraftKey, title: "PourCraft 360",  sub: "Whiskey · Bourbon · Cognac",  route: "/pourcraft",  offset: 2000, active: false },
  { id: "beercraft"  as CraftKey, title: "BeerCraft 360",  sub: "Craft Beer Discovery",        route: "/beercraft",  offset: 4000, active: false },
  { id: "winecraft"  as CraftKey, title: "WineCraft 360",  sub: "Sommelier Wine Presentation", route: "/winecraft",  offset: 6000, active: false },
];

const smoke = PORTALS[0]!;
const bottomPortals = PORTALS.slice(1);

// ── Main component ────────────────────────────────────────────────────────────
const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

export default function CraftPortalHome() {
  const { setPhase } = useGuest();
  const [comingSoon,  setComingSoon]  = useState<string | null>(null);
  const [dissolving,  setDissolving]  = useState(false);
  const [artOfCigar,  setArtOfCigar]  = useState(false);
  const [showReturn,  setShowReturn]  = useState(false);

  function handleSmokeTap() {
    playTactile();
    setDissolving(true);
    setTimeout(() => { setDissolving(false); setArtOfCigar(true); }, 1900);
  }

  function handlePortalClick(portal: typeof PORTALS[number], e?: React.MouseEvent) {
    e?.stopPropagation();
    if (portal.id === "smokecraft") { handleSmokeTap(); return; }
    if (portal.active) setPhase("reentry");
    else setComingSoon(portal.title);
  }

  return (
    <div style={{
      width: "100dvw", height: "100dvh",
      background: "#050505",
      display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, background: "radial-gradient(ellipse at 50% 0%,rgba(255,176,0,0.04) 0%,transparent 55%)" }} />

      {/* Sovereign access — hidden tap target (admin-only) */}
      <button
        onClick={() => {/* sovereign panel reserved */}}
        style={{ position: "fixed", top: 22, right: 32, background: "none", border: "none", fontSize: 8, letterSpacing: "0.40em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", cursor: "pointer", zIndex: 50, padding: 0, transition: "color 0.3s" }}
      >
        Sovereign Access
      </button>

      {/* ── Level 3: SMOKECRAFT 360 top + 3 portals bottom ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>

        {/* SMOKECRAFT 360 — full width top section with hero photo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleSmokeTap}
          whileTap={{ scale: 0.995 }}
          style={{
            flex: "0 0 58%",
            position: "relative",
            overflow: "hidden",
            background: "#080502",
            borderBottom: "1px solid rgba(212,175,55,0.18)",
            cursor: "pointer",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* Hero photo */}
          <img
            src={IMG("cigar_hero.png")}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", zIndex: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Dark cinematic gradient */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(0,0,0,0.15) 0%, rgba(4,3,1,0.55) 45%, rgba(4,3,1,0.92) 100%)", zIndex: 1, pointerEvents: "none" }} />
          {/* Amber ember top glow */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 20% 0%, rgba(212,140,30,0.18) 0%, transparent 60%)", zIndex: 2, pointerEvents: "none" }} />

          {/* E.A.T. Engine button — top right */}
          <button
            onClick={e => { e.stopPropagation(); setPhase("eat_dashboard"); }}
            style={{
              position: "absolute", top: 20, right: 20, zIndex: 10,
              background: "rgba(0,0,0,0.60)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(212,175,55,0.35)", borderRadius: 8,
              color: "#D4AF37", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              padding: "10px 20px", cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            E.A.T. Engine
          </button>

          {/* Content */}
          <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "36px 52px" }}>
            <p style={{ fontSize: 11, letterSpacing: "0.52em", textTransform: "uppercase", color: "rgba(212,175,55,0.70)", margin: "0 0 12px", fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>
              Profound Innovations · SmokeCraft 360
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(48px, 5.5vw, 80px)", fontWeight: 300, letterSpacing: "0.06em", margin: "0 0 12px", color: "#D4AF37", lineHeight: 1.0, textShadow: "0 4px 32px rgba(0,0,0,0.80)" }}>
              SmokeCraft 360
            </h2>
            <p style={{ fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(240,232,212,0.75)", margin: "0 0 28px", fontFamily: "'Inter',sans-serif" }}>
              {smoke.sub}
            </p>
            <motion.button
              onClick={e => { e.stopPropagation(); handleSmokeTap(); }}
              whileTap={{ scale: 0.97 }}
              style={{ alignSelf: "flex-start", background: "rgba(212,175,55,0.15)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1.5px solid rgba(212,175,55,0.60)", color: "#D4AF37", padding: "18px 44px", fontSize: 14, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 0 28px rgba(212,175,55,0.18)" }}
            >
              Enter Masterclass
            </motion.button>
          </div>

          {/* Glow border pulse */}
          <motion.div animate={{ opacity: [0.10, 0.28, 0.10] }} transition={{ duration: 3.5, repeat: Infinity }} style={{ position: "absolute", inset: 0, border: "1px solid rgba(212,175,55,0.22)", pointerEvents: "none", zIndex: 5 }} />
        </motion.div>

        {/* Bottom row: POURCRAFT · BEERCRAFT · WINECRAFT */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: "0 0 42%", display: "flex", flexDirection: "row" }}
        >
          {bottomPortals.map((portal, i) => (
            <div
              key={portal.id}
              onClick={() => handlePortalClick(portal)}
              style={{
                flex: "1 1 0",
                position: "relative",
                overflow: "hidden",
                background: "rgba(8,7,5,0.96)",
                borderRight: i < bottomPortals.length - 1 ? "1px solid rgba(212,175,55,0.10)" : "none",
                cursor: "pointer",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,rgba(212,175,55,0.06) 0%,rgba(4,3,1,0.98) 60%)", zIndex: 1, pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "22px 28px" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(28px, 2.6vw, 38px)", fontWeight: 300, letterSpacing: "0.06em", margin: "0 0 8px", color: "#D4AF37", lineHeight: 1.1 }}>
                  {portal.title}
                </h3>
                <p style={{ fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(229,229,229,0.50)", margin: "0 0 16px", fontFamily: "'Inter',sans-serif" }}>
                  {portal.sub}
                </p>
                <button
                  onClick={e => handlePortalClick(portal, e as unknown as React.MouseEvent)}
                  style={{ alignSelf: "flex-start", background: "rgba(0,0,0,0.60)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(212,175,55,0.22)", color: "rgba(212,175,55,0.65)", padding: "12px 22px", fontSize: 11, fontWeight: 600, letterSpacing: "0.26em", textTransform: "uppercase", borderRadius: 4, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                >
                  {portal.active ? "Begin Experience" : "Coming Soon"}
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── 1.9s Sensory dissolve curtain ── */}
      <AnimatePresence>
        {dissolving && (
          <motion.div
            key="dissolve"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.9, ease: [0.4, 0, 1, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 9994, background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ scale: 0.05, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 1.9, ease: "easeOut" }}
              style={{ width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(212,175,55,0.40) 0%,transparent 70%)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Art of the Cigar overlay ── */}
      <AnimatePresence>
        {artOfCigar && (
          <motion.div
            key="art-of-cigar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: "fixed", inset: 0, zIndex: 9995, background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
          >
            <SmokeCanvas />
            <AmbientCigar />

            <div style={{ position: "relative", zIndex: 9998, textAlign: "center", maxWidth: 480, padding: "0 32px" }}>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.9 }}
                style={{ fontSize: 8, letterSpacing: "0.52em", textTransform: "uppercase", color: "rgba(212,175,55,0.48)", marginBottom: 18, fontFamily: "inherit" }}
              >
                NOVEÈ OS · SmokeCraft 360
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 300, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F0E8D4", margin: "0 0 44px", lineHeight: 1.1 }}
              >
                The Art of the Cigar
              </motion.h1>

              {/* BEGIN JOURNEY — oversized primary gold action block */}
              <motion.button
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                whileTap={{ scale: 0.97, y: 2 }}
                onClick={() => { setArtOfCigar(false); setPhase("reentry"); }}
                style={{ display: "block", width: "100%", padding: "22px 40px", marginBottom: 18, background: "linear-gradient(135deg,rgba(212,175,55,0.22) 0%,rgba(212,139,0,0.14) 100%)", border: "1.5px solid rgba(212,175,55,0.65)", borderRadius: 12, cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#D4AF37", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "inherit", boxShadow: "0 0 32px rgba(212,175,55,0.22),0 4px 16px rgba(0,0,0,0.4)", minHeight: 72, touchAction: "manipulation" }}
              >
                BEGIN JOURNEY
              </motion.button>

              {/* RETURNING MASTERCLASS GUEST — secondary text link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowReturn(true)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 0", fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(240,232,212,0.38)", fontFamily: "inherit", textDecoration: "underline", textDecorationColor: "rgba(212,175,55,0.18)", touchAction: "manipulation" }}
              >
                Returning Masterclass Guest
              </motion.button>
            </div>

            {/* Back */}
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
              onClick={() => setArtOfCigar(false)}
              style={{ position: "absolute", top: 20, left: 20, background: "none", border: "none", color: "rgba(255,255,255,0.18)", cursor: "pointer", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 12px", zIndex: 9999 }}
            >
              ← Back
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Returning Guest drawer ── */}
      <AnimatePresence>
        {showReturn && (
          <motion.div
            key="returning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setShowReturn(false)}
            style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 480, background: "rgba(10,8,6,0.98)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px 16px 0 0", padding: "32px 28px 40px", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            >
              <p style={{ fontSize: 8, letterSpacing: "0.42em", textTransform: "uppercase", color: "rgba(212,175,55,0.50)", marginBottom: 16, textAlign: "center" }}>Returning Masterclass Guest</p>
              <h3 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 300, color: "#F0E8D4", letterSpacing: "0.10em", margin: "0 0 24px", textAlign: "center" }}>Welcome Back</h3>
              <input placeholder="First name" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 6, padding: "14px 16px", color: "#F0E8D4", fontSize: 14, letterSpacing: "0.06em", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
              <input placeholder="Last 4 digits of phone" maxLength={4} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 6, padding: "14px 16px", color: "#F0E8D4", fontSize: 14, letterSpacing: "0.06em", outline: "none", boxSizing: "border-box", marginBottom: 20 }} />
              <button
                onClick={() => { setShowReturn(false); setPhase("reentry"); }}
                style={{ width: "100%", padding: "16px", background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.45)", borderRadius: 6, color: "#D4AF37", fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Find My Session →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Coming Soon overlay ── */}
      <AnimatePresence>
        {comingSoon && (
          <motion.div
            key="coming-soon"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => setComingSoon(null)}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ textAlign: "center", pointerEvents: "none" }}>
              <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(212,175,55,0.50)", marginBottom: 18 }}>Profound Innovations</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 300, letterSpacing: "0.12em", background: "linear-gradient(180deg,#fffcf5 0%,#dfba73 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: "0 0 16px" }}>
                {comingSoon}
              </h2>
              <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(1rem,2vw,1.25rem)", fontStyle: "italic", color: "rgba(255,252,245,0.40)", letterSpacing: "0.06em", margin: "0 0 40px" }}>
                In Private Development · Sovereign Preview Coming Soon
              </p>
              <p style={{ fontSize: 8, letterSpacing: "0.38em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)" }}>Tap anywhere to dismiss</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.8 }}
        style={{ position: "absolute", bottom: 10, left: 0, right: 0, zIndex: 10, fontSize: 7, letterSpacing: "0.38em", textTransform: "uppercase", color: "rgba(240,237,232,0.08)", textAlign: "center", pointerEvents: "none" }}
      >
        NOVEÈ OS 1.0 · Profound Innovations LLC · 360 Enterprise Services
      </motion.p>
    </div>
  );
}
