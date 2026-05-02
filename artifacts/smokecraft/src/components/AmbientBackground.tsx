/**
 * AmbientBackground — full-screen luxury lounge atmosphere.
 *
 * Layers (bottom to top):
 *  0. Photographic lounge background (real image, fixed)
 *  1. Dark overlay — tone & consistency
 *  2. Overhead lamp light pools (3-point lighting sim)
 *  3. Leather / mahogany warmth fills
 *  4. Cinema vignette edges
 *  5. Film-grain texture
 *  6. Slow ambient smoke wisps (CSS animated)
 *  7. Top-center gold arc glow (brand accent)
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">

      {/* ── Layer 0: Real lounge photograph ───────────────────── */}
      <div className="absolute inset-0" style={{
        backgroundImage:    "url('/images/lounge-bg.png')",
        backgroundSize:     "cover",
        backgroundPosition: "center",
        backgroundRepeat:   "no-repeat",
        backgroundAttachment: "fixed",
      }} />

      {/* ── Layer 1: Atmosphere overlay — darken + warm tint ──── */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(rgba(12,8,3,0.60), rgba(14,9,4,0.72))",
      }} />

      {/* ── Layer 2: Overhead lamp pools (luxury lounge lighting) ─ */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 55% 35% at 50%   0%,  rgba(200,145,30,0.13)  0%, transparent 55%),
          radial-gradient(ellipse 30% 25% at 18%  15%,  rgba(160,100,20,0.09)  0%, transparent 50%),
          radial-gradient(ellipse 30% 25% at 82%  15%,  rgba(160,100,20,0.09)  0%, transparent 50%),
          radial-gradient(ellipse 20% 18% at 30%  55%,  rgba(120, 70,10,0.06)  0%, transparent 45%),
          radial-gradient(ellipse 20% 18% at 70%  55%,  rgba(120, 70,10,0.06)  0%, transparent 45%)
        `,
      }} />

      {/* ── Layer 3: Leather / mahogany warmth fills ─────────── */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 75% 70%,  rgba(110, 60,15,0.10)  0%, transparent 60%),
          radial-gradient(ellipse 60% 45% at 25% 75%,  rgba( 90, 45,10,0.08)  0%, transparent 55%),
          radial-gradient(ellipse 80% 40% at 50% 100%, rgba( 80, 40, 8,0.14)  0%, transparent 50%)
        `,
      }} />

      {/* ── Layer 4: Cinema vignette ──────────────────────────── */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 120% 120% at 50% 50%,
            transparent 35%,
            rgba(0,0,0,0.32) 65%,
            rgba(0,0,0,0.60) 100%)
        `,
      }} />
      <div className="absolute inset-0" style={{
        background: `
          linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 18%),
          linear-gradient(0deg,   rgba(0,0,0,0.25) 0%, transparent 20%)
        `,
      }} />

      {/* ── Layer 5: Film-grain texture ───────────────────────── */}
      <div className="absolute inset-0 opacity-[0.028]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
      }} />

      {/* ── Layer 6: Ambient smoke wisps ──────────────────────── */}
      <div className="smoke-puff absolute w-40 h-40 bg-amber-900/[0.14]"
        style={{ bottom: "28%", left: "8%",  animationDelay: "0s",   animationDuration: "10s" }} />
      <div className="smoke-puff-alt absolute w-28 h-28 bg-amber-800/[0.10]"
        style={{ bottom: "42%", left: "20%", animationDelay: "3s",   animationDuration: "13s" }} />
      <div className="smoke-puff absolute w-20 h-20 bg-stone-700/[0.09]"
        style={{ bottom: "18%", left: "32%", animationDelay: "6.5s", animationDuration: "11s" }} />
      <div className="smoke-puff-alt absolute w-36 h-36 bg-amber-900/[0.12]"
        style={{ bottom: "35%", right: "10%", animationDelay: "1.5s", animationDuration: "12s" }} />
      <div className="smoke-puff absolute w-24 h-24 bg-stone-600/[0.08]"
        style={{ bottom: "22%", right: "25%", animationDelay: "4.5s", animationDuration: "9s"  }} />
      <div className="smoke-puff-alt absolute w-32 h-32 bg-amber-800/[0.07]"
        style={{ bottom: "52%", right: "38%", animationDelay: "2s",   animationDuration: "14s" }} />

      {/* ── Layer 7: Top gold arc (brand accent) ──────────────── */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.22), rgba(212,175,55,0.38), rgba(212,175,55,0.22), transparent)",
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 pointer-events-none" style={{
        background: "radial-gradient(ellipse 100% 100% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 70%)",
      }} />

    </div>
  );
}
