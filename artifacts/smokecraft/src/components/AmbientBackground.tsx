/**
 * AmbientBackground — full-screen luxury lounge atmosphere.
 *
 * Uses a real Unsplash luxury bar photograph.
 * Overlay graduates left→right: 88% opacity left (sidebar legibility),
 * ~50% centre, ~15% far right (photo visible through content area).
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">

      {/* ── Layer 0: Real luxury bar photograph ───────────────────── */}
      <div className="absolute inset-0" style={{
        backgroundImage:      "url('/images/lounge-bg.jpg')",
        backgroundSize:       "cover",
        backgroundPosition:   "center",
        backgroundRepeat:     "no-repeat",
        backgroundAttachment: "fixed",
      }} />

      {/* ── Layer 1: Left-to-right atmospheric overlay ────────────
           Left (sidebar zone)  → 88% dark  — sidebar text stays readable
           Centre (form zone)   → 55% dark  — cream cards sit on this
           Right (open lounge)  → 16% dark  — photo breathes through       */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(90deg, rgba(10,6,3,0.88) 0%, rgba(10,6,3,0.72) 22%, rgba(10,6,3,0.52) 42%, rgba(10,6,3,0.28) 68%, rgba(10,6,3,0.14) 85%, rgba(10,6,3,0.08) 100%)",
      }} />

      {/* ── Layer 2: Vertical warm-tone fill (lamp warmth from top) ─ */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 60% 38% at 50%   0%,  rgba(200,145,30,0.10)  0%, transparent 55%),
          radial-gradient(ellipse 30% 28% at 18%  14%,  rgba(160,100,20,0.07)  0%, transparent 50%),
          radial-gradient(ellipse 30% 28% at 82%  14%,  rgba(160,100,20,0.07)  0%, transparent 50%)
        `,
      }} />

      {/* ── Layer 3: Bottom warmth / depth ───────────────────────── */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(0deg, rgba(8,4,2,0.38) 0%, transparent 28%)",
      }} />

      {/* ── Layer 4: Top edge shadow ──────────────────────────────── */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, rgba(26,26,27,0.06) 0%, transparent 16%)",
      }} />

      {/* ── Layer 5: Film-grain texture (very subtle) ─────────────── */}
      <div className="absolute inset-0 opacity-[0.022]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
      }} />

      {/* ── Layer 6: Ambient smoke wisps ──────────────────────────── */}
      <div className="smoke-puff absolute w-40 h-40 bg-amber-900/[0.10]"
        style={{ bottom: "28%", left: "18%",  animationDelay: "0s",   animationDuration: "12s" }} />
      <div className="smoke-puff-alt absolute w-28 h-28 bg-amber-800/[0.08]"
        style={{ bottom: "42%", left: "28%", animationDelay: "4s",   animationDuration: "15s" }} />
      <div className="smoke-puff absolute w-24 h-24 bg-stone-700/[0.07]"
        style={{ bottom: "20%", left: "38%", animationDelay: "7s",   animationDuration: "13s" }} />

      {/* ── Layer 7: Thin gold top line ───────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.20), rgba(212,139,0,0.32), rgba(212,139,0,0.20), transparent)",
      }} />

    </div>
  );
}
