/**
 * AmbientBackground — layered radial gradients + animated smoke wisps.
 * Sits fixed behind all content at z-0. Extremely subtle.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">

      {/* Deep warm base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(180,120,20,0.13) 0%, transparent 65%),
            radial-gradient(ellipse 60% 40% at 80% 60%,  rgba(140, 80, 15,0.09) 0%, transparent 55%),
            radial-gradient(ellipse 50% 35% at 20% 70%,  rgba(100, 55, 10,0.07) 0%, transparent 50%),
            hsl(22 18% 5%)
          `,
        }}
      />

      {/* Vignette edges */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 50%,
              transparent 40%,
              rgba(0,0,0,0.55) 100%)
          `,
        }}
      />

      {/* Subtle lounge texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Ambient smoke wisps — positioned off-center for realism */}
      <div
        className="smoke-puff absolute w-32 h-32 bg-amber-900/20"
        style={{ bottom: '30%', left: '15%', animationDelay: '0s', animationDuration: '8s' }}
      />
      <div
        className="smoke-puff-alt absolute w-24 h-24 bg-amber-800/15"
        style={{ bottom: '40%', left: '25%', animationDelay: '2.5s', animationDuration: '10s' }}
      />
      <div
        className="smoke-puff absolute w-20 h-20 bg-stone-700/15"
        style={{ bottom: '25%', right: '18%', animationDelay: '4s', animationDuration: '9s' }}
      />
      <div
        className="smoke-puff-alt absolute w-28 h-28 bg-amber-900/10"
        style={{ bottom: '50%', right: '30%', animationDelay: '1.5s', animationDuration: '12s' }}
      />
    </div>
  );
}
