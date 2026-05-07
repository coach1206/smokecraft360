/**
 * LogoAnchor — Venue-linked partner brand anchor.
 *
 * Renders a subtle prestige partner link for DayOne360 or WifeX.
 * Every click fires an affiliate log + builds the tracked URL.
 *
 * Usage:
 *   <LogoAnchor partner="DayOne360" />
 *   <LogoAnchor partner="WifeX" variant="inline" />
 */

import { motion } from "framer-motion";
import { handleOutboundRedirect, getVenueDisplayName } from "@/lib/affiliateLink";

// ── Partner config ─────────────────────────────────────────────────────────────

const PARTNERS = {
  DayOne360: {
    label:       "DayOne360",
    sub:         "Leisure & Corporate",
    url:         "https://dayone360.com",
    pillar:      "DAYONE360_LEISURE" as const,
    color:       "#3BBFA3",
    glyph:       "◈",
    tagline:     "Travel · Relocation · Corporate",
  },
  WifeX: {
    label:       "WifeX",
    sub:         "Concierge & Legal",
    url:         "https://wifex.com",
    pillar:      "WIFEX" as const,
    color:       "#a78bfa",
    glyph:       "◆",
    tagline:     "Advisory · Legal · Lifestyle",
  },
};

type Partner = keyof typeof PARTNERS;

interface Props {
  partner:  Partner;
  variant?: "bar" | "inline" | "badge";
}

// ── Bar variant (full-width strip) ────────────────────────────────────────────

function BarAnchor({ cfg }: { cfg: typeof PARTNERS[Partner] }) {
  const venueName = getVenueDisplayName();
  return (
    <motion.button
      whileHover={{ opacity: 0.9 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleOutboundRedirect(cfg.pillar, cfg.url)}
      style={{
        width: "100%", cursor: "pointer",
        background: "none", border: "none", padding: 0, textAlign: "left",
      }}
    >
      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            12,
        padding:        "10px 20px",
        background:     `${cfg.color}08`,
        borderTop:      `1px solid ${cfg.color}20`,
        borderBottom:   `1px solid ${cfg.color}20`,
      }}>
        <span style={{ fontSize: 13, color: cfg.color, flexShrink: 0 }}>{cfg.glyph}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, letterSpacing: "0.12em" }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: 9, color: `${cfg.color}88`, letterSpacing: "0.08em" }}>
              {cfg.tagline}
            </span>
          </div>
          <div style={{ fontSize: 9, color: "rgba(240,232,212,0.35)", marginTop: 1 }}>
            Preferred Partner of {venueName} · Exclusive rates applied
          </div>
        </div>
        <span style={{ fontSize: 9, color: `${cfg.color}66`, letterSpacing: "0.10em", flexShrink: 0 }}>
          VISIT →
        </span>
      </div>
    </motion.button>
  );
}

// ── Inline variant (compact pill) ─────────────────────────────────────────────

function InlineAnchor({ cfg }: { cfg: typeof PARTNERS[Partner] }) {
  return (
    <motion.button
      whileHover={{ opacity: 0.85 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => handleOutboundRedirect(cfg.pillar, cfg.url)}
      style={{
        cursor: "pointer", background: "none", border: "none", padding: 0,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      <span style={{
        display:    "inline-flex", alignItems: "center", gap: 5,
        padding:    "5px 12px", borderRadius: 20,
        background: `${cfg.color}10`,
        border:     `1px solid ${cfg.color}30`,
      }}>
        <span style={{ fontSize: 9, color: cfg.color }}>{cfg.glyph}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: "0.08em" }}>
          {cfg.label}
        </span>
      </span>
    </motion.button>
  );
}

// ── Badge variant (floating corner chip) ─────────────────────────────────────

function BadgeAnchor({ cfg }: { cfg: typeof PARTNERS[Partner] }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => handleOutboundRedirect(cfg.pillar, cfg.url)}
      style={{
        cursor: "pointer", background: "none", border: "none", padding: 0,
      }}
    >
      <div style={{
        padding:      "8px 14px", borderRadius: 10,
        background:   `${cfg.color}0C`,
        border:       `1px solid ${cfg.color}28`,
        textAlign:    "center",
      }}>
        <div style={{ fontSize: 14, color: cfg.color, marginBottom: 2 }}>{cfg.glyph}</div>
        <div style={{ fontSize: 9, fontWeight: 800, color: cfg.color, letterSpacing: "0.12em" }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 8, color: `${cfg.color}66`, marginTop: 1 }}>{cfg.sub}</div>
      </div>
    </motion.button>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function LogoAnchor({ partner, variant = "bar" }: Props) {
  const cfg = PARTNERS[partner];
  if (variant === "inline") return <InlineAnchor cfg={cfg} />;
  if (variant === "badge")  return <BadgeAnchor  cfg={cfg} />;
  return <BarAnchor cfg={cfg} />;
}
