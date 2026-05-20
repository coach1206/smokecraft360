/* Photorealistic macro cigar SVG — pure CSS/SVG, no external assets */
export function NoveeCigarHero({ wrapperTone = "corojo" }: { wrapperTone?: "connecticut" | "corojo" | "criollo" }) {
  const tones = {
    connecticut: { hi: "#C8A86A", mid: "#8B6830", lo: "#5C3E14", shadow: "#2A1608", vein: "0.08 0.25" },
    criollo:     { hi: "#9A6824", mid: "#6B3E0E", lo: "#3E2008", shadow: "#1A0A02", vein: "0.02 0.28" },
    corojo:      { hi: "#7A5018", mid: "#4A2C08", lo: "#2E1604", shadow: "#120802", vein: "0.02 0.32" },
  };
  const t = tones[wrapperTone];

  return (
    <svg
      viewBox="0 0 760 200"
      style={{ width: "100%", height: "auto", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        {/* Wrapper longitudinal grain — low X freq, high Y for veins */}
        <filter id="cig_wrapper" x="-4%" y="-8%" width="108%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency={`${t.vein}`} numOctaves="5" seed="14" stitchTiles="stitch" result="grain" />
          <feColorMatrix type="matrix"
            values="0 0 0 0 0.10  0 0 0 0 0.05  0 0 0 0 0.01  0 0 0 0.52 0"
            in="grain" result="cGrain" />
          <feBlend in="SourceGraphic" in2="cGrain" mode="multiply" result="grained" />
          <feGaussianBlur in="grained" stdDeviation="0.20" result="blurred" />
          <feComposite in="SourceGraphic" in2="blurred" operator="arithmetic" k1="0" k2="0.72" k3="0.28" k4="0" />
        </filter>

        {/* Soft depth blur for bokeh feel on edges */}
        <filter id="cig_bokeh" x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>

        {/* Ember glow */}
        <filter id="ember_glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Drop shadow */}
        <filter id="cig_shadow" x="-5%" y="-20%" width="110%" height="150%">
          <feDropShadow dx="0" dy="18" stdDeviation="12" floodColor="rgba(0,0,0,0.85)" />
        </filter>

        {/* Main cylindrical gradient — top-lit */}
        <linearGradient id="cig_body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={t.hi}     stopOpacity="1" />
          <stop offset="8%"   stopColor={t.hi}     stopOpacity="1" />
          <stop offset="22%"  stopColor={t.mid}    stopOpacity="1" />
          <stop offset="60%"  stopColor={t.lo}     stopOpacity="1" />
          <stop offset="88%"  stopColor={t.shadow} stopOpacity="1" />
          <stop offset="100%" stopColor="#080300"  stopOpacity="1" />
        </linearGradient>

        {/* Specular sheen */}
        <linearGradient id="cig_sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,225,140,0.28)" stopOpacity="1" />
          <stop offset="18%"  stopColor="rgba(255,225,140,0.08)" stopOpacity="1" />
          <stop offset="35%"  stopColor="rgba(255,225,140,0)"    stopOpacity="0" />
        </linearGradient>

        {/* Gold band gradient */}
        <linearGradient id="band_body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F0D060" />
          <stop offset="28%"  stopColor="#D4AF37" />
          <stop offset="52%"  stopColor="#B89020" />
          <stop offset="78%"  stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8A6010" />
        </linearGradient>

        {/* Cap gradient */}
        <radialGradient id="cap_grad" cx="30%" cy="30%" r="70%">
          <stop offset="0%"   stopColor={t.hi} />
          <stop offset="55%"  stopColor={t.mid} />
          <stop offset="100%" stopColor={t.shadow} />
        </radialGradient>

        {/* Tobacco foot interior */}
        <radialGradient id="tobacco_foot" cx="50%" cy="45%" r="60%">
          <stop offset="0%"   stopColor="#7A4510" />
          <stop offset="45%"  stopColor="#4A2808" />
          <stop offset="80%"  stopColor="#2A1404" />
          <stop offset="100%" stopColor="#100600" />
        </radialGradient>

        {/* Ember core */}
        <radialGradient id="ember_core" cx="45%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#FFF0A0" stopOpacity="1" />
          <stop offset="20%"  stopColor="#FFAA00" stopOpacity="1" />
          <stop offset="55%"  stopColor="#FF4800" stopOpacity="0.85" />
          <stop offset="80%"  stopColor="#880000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#440000" stopOpacity="0" />
        </radialGradient>

        {/* Ash gradient */}
        <linearGradient id="ash_grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#E8E0D8" />
          <stop offset="40%"  stopColor="#C8C0B0" />
          <stop offset="100%" stopColor="#A09080" />
        </linearGradient>

        {/* Reflection beneath cigar */}
        <linearGradient id="reflection" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(212,175,55,0.12)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0)" />
        </linearGradient>
      </defs>

      {/* ── All elements rotated together ── */}
      <g transform="rotate(-9, 380, 100)">

        {/* Cast shadow on surface */}
        <ellipse cx="395" cy="172" rx="310" ry="14"
          fill="rgba(0,0,0,0.60)" filter="url(#cig_bokeh)" />

        {/* Surface reflection glow */}
        <ellipse cx="395" cy="178" rx="260" ry="10"
          fill="url(#reflection)" />

        {/* ── CIGAR BODY ── */}
        <g filter="url(#cig_shadow)">

          {/* Main wrapper body — rounded on left (cap), blunt on right (foot) */}
          <path
            d="M130 70
               C 110 70, 95 78, 90 100
               C 95 122, 110 130, 130 130
               L 610 130
               L 610 70
               Z"
            fill={`url(#cig_body)`}
            filter="url(#cig_wrapper)"
          />

          {/* Specular highlight band along top */}
          <path
            d="M130 70 C110 70,95 78,90 100 C95 78,110 75,130 75 L 610 75 L 610 70 Z"
            fill="url(#cig_sheen)"
          />

          {/* Fine edge highlight line */}
          <path
            d="M130 70 C110 70,95 78,90 100 C95 78,110 70,130 70 L 610 70"
            stroke="rgba(255,225,120,0.18)" strokeWidth="1.5" fill="none"
          />

          {/* Bottom shadow edge */}
          <path
            d="M130 130 L 610 130 L 610 123 C 500 127, 300 128, 130 126 Z"
            fill="rgba(0,0,0,0.45)"
          />

          {/* Cap — tapered rounded head */}
          <path
            d="M130 70
               C 110 70, 95 78, 90 100
               C 95 122, 110 130, 130 130
               C 115 130, 102 124, 96 112
               C 90 106, 88 103, 88 100
               C 88 97, 90 94, 96 88
               C 102 76, 115 70, 130 70 Z"
            fill="url(#cap_grad)"
          />

          {/* Shoulder seam at cap */}
          <path d="M130 70 C122 72,116 76,112 82" stroke="rgba(0,0,0,0.30)" strokeWidth="1" fill="none" />
          <path d="M130 130 C122 128,116 124,112 118" stroke="rgba(0,0,0,0.30)" strokeWidth="1" fill="none" />

          {/* ── ASH SECTION ── */}
          <path
            d="M610 70 L 655 70 L 655 130 L 610 130 Z"
            fill="url(#ash_grad)"
            opacity="0.85"
          />
          {/* Ash cracks */}
          {[76, 84, 93, 100, 108, 118, 125].map((y, i) => (
            <line key={i} x1={612} y1={y} x2={648} y2={y + (i % 2 === 0 ? 1 : -1)}
              stroke="rgba(100,90,80,0.40)" strokeWidth="0.8" />
          ))}
          {/* Ash texture */}
          <rect x="610" y="70" width="45" height="60" fill="rgba(180,170,158,0.12)" />

          {/* ── TOBACCO FOOT (cut end) ── */}
          <ellipse cx="655" cy="100" rx="6" ry="30"
            fill="url(#tobacco_foot)" />

          {/* Individual tobacco strands visible at foot */}
          {[-18, -12, -6, 0, 6, 12, 18].map((offset, i) => (
            <ellipse key={i} cx="655" cy={100 + offset} rx={2 + Math.abs(offset) * 0.05} ry="2.5"
              fill={`rgba(${60 + i * 4},${30 + i * 2},${8 + i},${0.50 + i * 0.04})`} />
          ))}

          {/* ── EMBER / CHERRY ── */}
          <ellipse cx="662" cy="100" rx="18" ry="18"
            fill="url(#ember_core)"
            filter="url(#ember_glow)"
          />
          {/* Ember hot core */}
          <ellipse cx="660" cy="99" rx="5" ry="5"
            fill="rgba(255,255,200,0.95)"
          />

          {/* ── GOLD CIGAR BAND ── */}
          <rect x="190" y="70" width="44" height="60" fill="url(#band_body)" rx="1" />
          {/* Band border lines */}
          <rect x="190" y="70" width="44" height="3" fill="rgba(255,245,180,0.55)" />
          <rect x="190" y="127" width="44" height="3" fill="rgba(80,50,0,0.50)" />
          {/* Band center ornament line */}
          <rect x="190" y="98" width="44" height="1.5" fill="rgba(255,245,180,0.30)" />
          {/* Band text */}
          <text x="212" y="91" textAnchor="middle" fontFamily="'Inter',sans-serif"
            fontSize="6" fontWeight="900" letterSpacing="1.5"
            fill="rgba(50,30,0,0.90)" transform="rotate(0,212,91)">
            SC·360
          </text>
          <text x="212" y="110" textAnchor="middle" fontFamily="Georgia,serif"
            fontSize="7.5" fontWeight="400" letterSpacing="0.8"
            fill="rgba(40,20,0,0.80)">
            SmokeCraft
          </text>
          {/* Band micro ornament dots */}
          {[196, 204, 212, 220, 228].map(x => (
            <circle key={x} cx={x} cy="122" r="1.2" fill="rgba(50,30,0,0.55)" />
          ))}
        </g>

        {/* ── SMOKE WISPS from ember ── */}
        <g opacity="0.55">
          {/* Wisp 1 */}
          <path d="M666 92 C670 80, 660 68, 668 55 C674 44, 662 34, 670 22"
            stroke="rgba(220,210,200,0.50)" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Wisp 2 */}
          <path d="M662 90 C654 74, 665 62, 658 48 C652 36, 660 26, 654 14"
            stroke="rgba(220,210,200,0.30)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Wisp 3 */}
          <path d="M669 88 C678 74, 668 62, 676 50"
            stroke="rgba(220,210,200,0.20)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>

        {/* Ember ambient light on ash */}
        <rect x="610" y="70" width="52" height="60"
          fill="rgba(255,100,20,0.08)" />
      </g>
    </svg>
  );
}
