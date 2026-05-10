/**
 * VillaSovereign — DR Luxury Market · Concierge Ritual
 *
 * Route: /villa-sovereign
 *
 * A private concierge experience exclusive to the Dominican Republic
 * luxury deployment (Casa de Campo · Santo Domingo high-end venues).
 *
 * Flow:
 *   1. Guest recognition — pulls firstName + lastInitial from GuestProfileContext
 *   2. Palate Oracle    — reveals dominant flavor from CrossSessionMemory
 *   3. DR Pairings      — 2 curated estate cigars matched to that flavor profile
 *   4. Reserve CTA      — navigates to /artisan-360 to commission a blend
 *
 * Design: Smoked Cream & Obsidian system with Cormorant Garamond serif headers.
 * Patron cards use Vellum surface (#F5F2ED) with Obsidian text per design spec.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { crossSessionMemory } from "@/lib/crossSessionMemory";
import { useGuestProfile }   from "@/contexts/GuestProfileContext";
import { playClink, playSwitch } from "@/lib/audioEngine";

// ── DR Exclusive Pairing Catalog ──────────────────────────────────────────────

interface DrPairing {
  name:      string;
  estate:    string;
  origin:    string;
  notes:     string[];
  strength:  string;
  rarity:    string;
  accolades: string;
}

const DR_CATALOG: Record<string, DrPairing[]> = {
  earthy: [
    {
      name:      "La Romana Reserve Maduro",
      estate:    "Casa de Campo · La Romana",
      origin:    "Dominican Republic",
      notes:     ["Dark earth", "aged cedar", "leather finish", "black coffee"],
      strength:  "Full",
      rarity:    "Estate Reserve",
      accolades: "96 pts — Cigar Aficionado",
    },
    {
      name:      "Flor Dominicana Gran Toro",
      estate:    "Tabacalera La Flor",
      origin:    "Santiago de los Caballeros",
      notes:     ["Rich soil", "black pepper", "dried fig", "cocoa nib"],
      strength:  "Full-Plus",
      rarity:    "Small Batch — 500 boxes",
      accolades: "94 pts — Cigar Snob",
    },
  ],
  cedar: [
    {
      name:      "Davidoff Winston Churchill",
      estate:    "Villa González Estate",
      origin:    "Santiago, Dominican Republic",
      notes:     ["Crisp cedar", "white pepper", "cream", "toasted almond"],
      strength:  "Medium-Full",
      rarity:    "Limited Vintage",
      accolades: "97 pts — Cigar Journal",
    },
    {
      name:      "La Galera 1936 Habano",
      estate:    "Tamboril Valley",
      origin:    "Dominican Republic",
      notes:     ["Cedar toast", "mild honey", "warm spice", "floral"],
      strength:  "Medium",
      rarity:    "Heritage Series",
      accolades: "92 pts — Cigar Aficionado",
    },
  ],
  leather: [
    {
      name:      "Arturo Fuente Opus X",
      estate:    "Chateau de la Fuente",
      origin:    "Bonao, Dominican Republic",
      notes:     ["Rich leather", "espresso", "dark chocolate", "cedar spice"],
      strength:  "Full",
      rarity:    "Ultra Rare — Invitation Only",
      accolades: "99 pts — Cigar Aficionado",
    },
    {
      name:      "Macanudo Inspirado Black",
      estate:    "General Cigar · Santiago",
      origin:    "Dominican Republic",
      notes:     ["Bold leather", "mineral earth", "cracked pepper", "oak"],
      strength:  "Full",
      rarity:    "Reserve Collection",
      accolades: "93 pts — Halfwheel",
    },
  ],
  spiced: [
    {
      name:      "Rocky Patel Vintage 1990",
      estate:    "Tamboril Rollers Guild",
      origin:    "Dominican Republic",
      notes:     ["Cinnamon", "allspice", "toasted almond", "dried cherry"],
      strength:  "Medium-Full",
      rarity:    "Vintage Aged — 15 Year",
      accolades: "95 pts — Cigar Snob",
    },
    {
      name:      "Perdomo Reserve Champagne",
      estate:    "Perdomo Cigars",
      origin:    "Dominican / Nicaraguan Estate",
      notes:     ["Warm spice", "dried cherry", "silk finish", "subtle cream"],
      strength:  "Medium",
      rarity:    "Champagne Barrel Aged",
      accolades: "91 pts — Cigar Journal",
    },
  ],
  default: [
    {
      name:      "Davidoff Grand Cru No. 2",
      estate:    "Villa González Estate",
      origin:    "Santiago, Dominican Republic",
      notes:     ["White pepper", "fresh cedar", "light cream", "floral"],
      strength:  "Mild-Medium",
      rarity:    "Grand Cru Series",
      accolades: "94 pts — Cigar Aficionado",
    },
    {
      name:      "Montecristo Platinum",
      estate:    "Montecristo × Altadis",
      origin:    "Dominican Republic",
      notes:     ["Buttery cedar", "subtle earth", "mild spice", "smooth finish"],
      strength:  "Medium",
      rarity:    "Platinum Reserve",
      accolades: "93 pts — Cigar Journal",
    },
  ],
};

const FLAVOR_LABELS: Record<string, string> = {
  earthy:  "TERROIR EARTH",
  cedar:   "AGED CEDAR",
  leather: "DARK LEATHER",
  spiced:  "SOVEREIGN SPICE",
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD        = "#D48B00";
const CREAM       = "#F5F2ED";
const OBSIDIAN    = "#1A1A1B";
const PARCHMENT   = "#EFEBE0";
const MUTED_GOLD  = "rgba(212,139,0,0.55)";
const FONT_SERIF  = "'Cormorant Garamond', Georgia, serif";
const FONT_MONO   = "'Space Mono', 'Courier New', monospace";

// ── Pairing Card ──────────────────────────────────────────────────────────────

function PairingCard({ pairing, index }: { pairing: DrPairing; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 + index * 0.18, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
      style={{
        background:   PARCHMENT,
        borderRadius: 16,
        padding:      "28px 28px 24px",
        border:       `1px solid ${hovered ? GOLD : "rgba(212,139,0,0.18)"}`,
        boxShadow:    hovered
          ? `0 16px 48px rgba(0,0,0,0.40), 0 0 32px rgba(212,139,0,0.14)`
          : `0 4px 24px rgba(0,0,0,0.28)`,
        transition:   "border-color 0.25s, box-shadow 0.25s",
        position:     "relative",
        overflow:     "hidden",
      }}
    >
      {/* Rarity badge */}
      <div style={{
        position:      "absolute",
        top:           16,
        right:         16,
        fontSize:      7,
        fontFamily:    FONT_MONO,
        fontWeight:    700,
        letterSpacing: "0.16em",
        color:         GOLD,
        background:    "rgba(212,139,0,0.12)",
        border:        `1px solid rgba(212,139,0,0.30)`,
        borderRadius:  4,
        padding:       "3px 8px",
      }}>
        {pairing.rarity}
      </div>

      {/* Name */}
      <div style={{
        fontFamily:    FONT_SERIF,
        fontSize:      22,
        fontWeight:    600,
        color:         OBSIDIAN,
        letterSpacing: "0.02em",
        lineHeight:    1.2,
        marginBottom:  4,
        paddingRight:  80,
      }}>
        {pairing.name}
      </div>

      {/* Estate */}
      <div style={{
        fontFamily:    FONT_MONO,
        fontSize:      8,
        letterSpacing: "0.18em",
        color:         GOLD,
        marginBottom:  16,
      }}>
        {pairing.estate} · {pairing.origin}
      </div>

      {/* Flavor notes */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {pairing.notes.map((note) => (
          <span key={note} style={{
            fontFamily:    FONT_MONO,
            fontSize:      8,
            letterSpacing: "0.10em",
            color:         OBSIDIAN,
            background:    "rgba(26,26,27,0.07)",
            borderRadius:  4,
            padding:       "4px 9px",
            border:        "1px solid rgba(26,26,27,0.12)",
          }}>
            {note}
          </span>
        ))}
      </div>

      {/* Strength + Accolades */}
      <div style={{
        display:    "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 14,
        borderTop:  "1px solid rgba(26,26,27,0.08)",
      }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: "rgba(26,26,27,0.45)", letterSpacing: "0.12em" }}>
          {pairing.strength} Body
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: GOLD, letterSpacing: "0.10em" }}>
          {pairing.accolades}
        </div>
      </div>

      {/* Hover glow layer */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 100%, rgba(212,139,0,0.06) 0%, transparent 70%)`,
          pointerEvents: "none",
          borderRadius: 16,
        }}
      />
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VillaSovereign() {
  const [, navigate]        = useLocation();
  const { guestProfile }    = useGuestProfile();
  const [phase, setPhase]   = useState<"greeting" | "oracle" | "pairings" | "ready">("greeting");

  const dominantFlavor  = crossSessionMemory.getDominantFlavor();
  const memory          = crossSessionMemory.getMemory();
  const tier            = crossSessionMemory.getGuestTier();
  const pairings        = DR_CATALOG[dominantFlavor ?? "default"] ?? DR_CATALOG.default;
  const flavorLabel     = dominantFlavor ? (FLAVOR_LABELS[dominantFlavor] ?? dominantFlavor.toUpperCase()) : "SOVEREIGN BLEND";

  const guestName = guestProfile
    ? `${guestProfile.firstName} ${guestProfile.lastInitial}.`
    : "Sovereign Guest";

  const hasHistory = memory.flavorHistory.length > 0;

  // Auto-advance phases
  useEffect(() => {
    const t1 = setTimeout(() => { setPhase("oracle"); playClink(); }, 1400);
    const t2 = setTimeout(() => { setPhase("pairings"); }, 2800);
    const t3 = setTimeout(() => { setPhase("ready"); }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position:        "fixed",
      inset:           0,
      background:      OBSIDIAN,
      overflowY:       "auto",
      overflowX:       "hidden",
      WebkitOverflowScrolling: "touch",
    }}>

      {/* ── Ambient gold top glow ── */}
      <div style={{
        position:   "absolute",
        top:        0, left: "15%",
        width:      "70%", height: "38%",
        background: `radial-gradient(ellipse at 50% 0%, rgba(212,139,0,0.14) 0%, transparent 68%)`,
        pointerEvents: "none",
      }} />

      {/* ── Film grain ── */}
      <div style={{
        position:   "absolute", inset: 0,
        opacity:    0.032,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
        pointerEvents:  "none",
      }} />

      <div style={{
        position:  "relative",
        maxWidth:  640,
        margin:    "0 auto",
        padding:   "72px 24px 100px",
        minHeight: "100vh",
      }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 48 }}
        >
          <div style={{
            fontFamily:    FONT_MONO,
            fontSize:      8,
            letterSpacing: "0.28em",
            color:         MUTED_GOLD,
            marginBottom:  10,
            display:       "flex",
            alignItems:    "center",
            gap:           8,
          }}>
            <div style={{
              width: 20, height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD})`,
            }} />
            VILLA SOVEREIGN · PRIVATE RESERVE
            <div style={{
              width: 20, height: 1,
              background: `linear-gradient(90deg, ${GOLD}, transparent)`,
            }} />
          </div>

          <div style={{
            fontFamily:    FONT_SERIF,
            fontSize:      38,
            fontWeight:    300,
            color:         CREAM,
            letterSpacing: "0.04em",
            lineHeight:    1.1,
            marginBottom:  10,
          }}>
            The Concierge<br />Ritual
          </div>

          <div style={{
            fontFamily:    FONT_MONO,
            fontSize:      8,
            letterSpacing: "0.14em",
            color:         MUTED_GOLD,
          }}>
            Dominican Republic · Estate Selection
          </div>
        </motion.div>

        {/* ── Guest recognition ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            background:   "rgba(212,139,0,0.06)",
            border:       `1px solid rgba(212,139,0,0.18)`,
            borderRadius: 12,
            padding:      "20px 22px",
            marginBottom: 32,
          }}
        >
          <div style={{
            fontFamily:    FONT_MONO,
            fontSize:      7.5,
            letterSpacing: "0.22em",
            color:         MUTED_GOLD,
            marginBottom:  8,
          }}>
            SOVEREIGN GUEST RECOGNIZED
          </div>
          <div style={{
            fontFamily:    FONT_SERIF,
            fontSize:      24,
            fontWeight:    500,
            color:         CREAM,
            letterSpacing: "0.04em",
          }}>
            {guestName}
          </div>
          <div style={{
            fontFamily:    FONT_MONO,
            fontSize:      8,
            letterSpacing: "0.14em",
            color:         MUTED_GOLD,
            marginTop:     6,
          }}>
            {tier} · {memory.totalSessions} sessions archived
          </div>
        </motion.div>

        {/* ── Palate Oracle ── */}
        <AnimatePresence>
          {phase !== "greeting" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginBottom: 40 }}
            >
              <div style={{
                fontFamily:    FONT_MONO,
                fontSize:      7.5,
                letterSpacing: "0.22em",
                color:         MUTED_GOLD,
                marginBottom:  10,
              }}>
                THE PALATE ORACLE HAS SPOKEN
              </div>

              <div style={{
                fontFamily:    FONT_SERIF,
                fontSize:      hasHistory ? 42 : 28,
                fontWeight:    300,
                color:         GOLD,
                letterSpacing: "0.08em",
                marginBottom:  10,
              }}>
                {hasHistory ? flavorLabel : "VIRGIN PALATE"}
              </div>

              <div style={{
                fontFamily:    FONT_MONO,
                fontSize:      9,
                color:         "rgba(245,242,237,0.50)",
                letterSpacing: "0.10em",
                lineHeight:    1.6,
              }}>
                {hasHistory
                  ? `Your sessions reveal a dominant affinity for ${dominantFlavor} profiles. The Oracle has selected two estate cigars from the Dominican Republic that honor this memory.`
                  : "Your palate is uncharted. The Oracle presents the pinnacle of Dominican cigar craft — a sovereign starting point for your ritual journey."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pairing Cards ── */}
        <AnimatePresence>
          {phase === "pairings" || phase === "ready" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 48 }}
            >
              <div style={{
                fontFamily:    FONT_MONO,
                fontSize:      7.5,
                letterSpacing: "0.22em",
                color:         MUTED_GOLD,
                marginBottom:  4,
              }}>
                YOUR CURATED ESTATE SELECTIONS
              </div>
              {pairings.map((p, i) => (
                <PairingCard key={p.name} pairing={p} index={i} />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Reserve CTA ── */}
        <AnimatePresence>
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { playSwitch(); navigate("/artisan-360"); }}
                onTouchStart={() => playSwitch()}
                style={{
                  width:         "100%",
                  padding:       "20px 28px",
                  background:    `linear-gradient(135deg, rgba(212,139,0,0.18) 0%, rgba(212,139,0,0.08) 100%)`,
                  border:        `1px solid ${GOLD}`,
                  borderRadius:  12,
                  cursor:        "pointer",
                  fontFamily:    FONT_MONO,
                  fontSize:      10,
                  fontWeight:    700,
                  letterSpacing: "0.20em",
                  color:         GOLD,
                  boxShadow:     `0 0 32px rgba(212,139,0,0.16)`,
                  touchAction:   "manipulation",
                }}
              >
                ◈ COMMISSION A PRIVATE BLEND
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/craft-hub")}
                style={{
                  width:         "100%",
                  padding:       "16px 28px",
                  background:    "transparent",
                  border:        `1px solid rgba(245,242,237,0.12)`,
                  borderRadius:  12,
                  cursor:        "pointer",
                  fontFamily:    FONT_MONO,
                  fontSize:      9,
                  letterSpacing: "0.16em",
                  color:         "rgba(245,242,237,0.40)",
                  touchAction:   "manipulation",
                }}
              >
                RETURN TO CRAFT HUB
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
