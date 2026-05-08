/**
 * SalesTiersTab — Axiom OS Commercial Pricing Control (super_admin only).
 *
 * Surfaces:
 *   1. Tier comparison grid (CORE / PRO / XEI / BLACK)
 *   2. À la carte module catalog
 *   3. Hardware leasing pricing
 *   4. Software-only deployment config
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Package, Cpu, Layers, Check } from "lucide-react";
import {
  AXIOM_TIERS,
  AXIOM_MODULES,
  HARDWARE_PRICING,
  SOFTWARE_ONLY,
  DynamicPricingEngine,
  type TierId,
} from "@/lib/axiomSalesConfig";

// ── Design tokens ──────────────────────────────────────────────────────────

const GOLD   = "#D48B00";
const CREAM  = "#F5F2ED";
const DARK   = "#1A1A1B";
const CARD_BG = "rgba(245,242,237,0.05)";
const BORDER  = "rgba(212,139,0,0.18)";

const TIER_ACCENT: Record<TierId, string> = {
  CORE:  "#8A9BB0",
  PRO:   "#D48B00",
  XEI:   "#C4A96D",
  BLACK: "#2A2A2A",
};

const TIER_LABEL: Record<TierId, string> = {
  CORE:  "Entry",
  PRO:   "Professional",
  XEI:   "Elite",
  BLACK: "Enterprise",
};

type Panel = "tiers" | "modules" | "hardware" | "software";

const PANELS: { id: Panel; label: string; icon: React.ReactNode }[] = [
  { id: "tiers",    label: "Sales Tiers",    icon: <Layers  size={13} /> },
  { id: "modules",  label: "Modules",        icon: <Package size={13} /> },
  { id: "hardware", label: "Hardware",       icon: <Cpu     size={13} /> },
  { id: "software", label: "Software Only",  icon: <DollarSign size={13} /> },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ── Tier grid ──────────────────────────────────────────────────────────────

function TierGrid() {
  const tiers = Object.values(AXIOM_TIERS);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
      {tiers.map((tier, i) => {
        const accent  = TIER_ACCENT[tier.id];
        const savings = DynamicPricingEngine.annualSavings(tier.id);
        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            style={{
              borderRadius: 20,
              border: `1px solid ${accent}40`,
              background: tier.id === "BLACK"
                ? "rgba(20,20,22,0.9)"
                : CARD_BG,
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Header */}
            <div>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
                textTransform: "uppercase", color: accent, display: "block", marginBottom: 6,
              }}>
                {TIER_LABEL[tier.id]}
              </span>
              <div style={{ fontSize: 18, fontWeight: 600, color: CREAM, letterSpacing: "0.06em" }}>
                {tier.displayName}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: accent }}>
                  {fmt(tier.monthlyPrice)}
                </span>
                <span style={{ fontSize: 11, color: "rgba(245,242,237,0.45)" }}>/mo</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,242,237,0.4)", marginTop: 2 }}>
                {fmt(tier.annualPrice)}/yr · saves {fmt(savings)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,242,237,0.35)", marginTop: 2 }}>
                Setup: {fmt(tier.setupFee)}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Devices", value: tier.maxDevices === 999 ? "Unlimited" : String(tier.maxDevices) },
                { label: "Support", value: tier.supportLevel.replace("_", " ") },
                { label: "Hardware", value: tier.hardwareSupport ? "Yes" : "No" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8, padding: "5px 10px",
                }}>
                  <div style={{ fontSize: 9, color: "rgba(245,242,237,0.35)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: CREAM, marginTop: 2, textTransform: "capitalize" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Features */}
            <div style={{ borderTop: `1px solid ${accent}20`, paddingTop: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,242,237,0.35)", marginBottom: 8 }}>
                Included Features
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {tier.allowedFeatures.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={9} color={accent} />
                    <span style={{ fontSize: 11, color: "rgba(245,242,237,0.6)", letterSpacing: "0.04em" }}>
                      {f.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Module catalog ─────────────────────────────────────────────────────────

function ModuleCatalog() {
  const catColors: Record<string, string> = {
    analytics: "#D48B00", environment: "#5E9E6E",
    ai: "#9B8EC4", behavior: "#E87040", enterprise: "#C4A96D",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {AXIOM_MODULES.map((mod, i) => (
        <motion.div
          key={mod.key}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.07 }}
          style={{
            borderRadius: 14,
            border: BORDER,
            background: CARD_BG,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: catColors[mod.category] ?? GOLD, flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{mod.name}</div>
              <div style={{ fontSize: 10, color: "rgba(245,242,237,0.4)", textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 2 }}>
                {mod.category}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>
            {fmt(mod.monthlyPrice)}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(245,242,237,0.4)" }}>/mo</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Hardware pricing ───────────────────────────────────────────────────────

const HARDWARE_LABELS: Record<string, string> = {
  tabletLease:     "Tablet Lease",
  kioskLease:      "Kiosk Lease",
  lightingHub:     "Lighting Hub",
  audioController: "Audio Controller",
  smartHumidor:    "Smart Humidor",
};

function HardwarePricing() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      {(Object.entries(HARDWARE_PRICING) as [string, { monthly: number; replacementFee?: number }][]).map(([key, val], i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          style={{
            borderRadius: 16, border: BORDER,
            background: CARD_BG, padding: "18px 16px",
          }}
        >
          <div style={{ fontSize: 10, color: "rgba(245,242,237,0.4)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
            {HARDWARE_LABELS[key] ?? key}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>
            {fmt(val.monthly)}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(245,242,237,0.4)" }}>/mo</span>
          </div>
          {"replacementFee" in val && (
            <div style={{ fontSize: 10, color: "rgba(245,242,237,0.35)", marginTop: 6 }}>
              Replacement: {fmt(val.replacementFee!)}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Software-only ──────────────────────────────────────────────────────────

function SoftwareOnly() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        maxWidth: 480,
        borderRadius: 20, border: `1px solid ${GOLD}30`,
        background: CARD_BG, padding: "28px 24px",
      }}
    >
      <div style={{ fontSize: 11, color: "rgba(245,242,237,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
        Software-Only Deployment
      </div>
      {[
        { label: "Activation Fee",   value: fmt(SOFTWARE_ONLY.activationFee) },
        { label: "Monthly Base",     value: `${fmt(SOFTWARE_ONLY.monthlyBase)}/mo` },
        { label: "Max Devices",      value: String(SOFTWARE_ONLY.maxDevices) },
        { label: "Includes Support", value: SOFTWARE_ONLY.includesSupport ? "Yes" : "No" },
      ].map(({ label, value }) => (
        <div key={label} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 0", borderBottom: `1px solid rgba(245,242,237,0.07)`,
        }}>
          <span style={{ fontSize: 13, color: "rgba(245,242,237,0.6)" }}>{label}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: CREAM }}>{value}</span>
        </div>
      ))}
    </motion.div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function SalesTiersTab() {
  const [panel, setPanel] = useState<Panel>("tiers");

  return (
    <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{
            fontSize: 22, fontWeight: 300, color: CREAM,
            letterSpacing: "0.14em", textTransform: "uppercase",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            margin: 0,
          }}>
            Sales &amp; Licensing
          </h2>
          <p style={{ fontSize: 11, color: "rgba(245,242,237,0.4)", margin: "4px 0 0", letterSpacing: "0.08em" }}>
            Commercial infrastructure · AXIOM OS tiers + modules
          </p>
        </div>
      </div>

      {/* Panel selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPanel(p.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 999,
              border: `1px solid ${panel === p.id ? GOLD : "rgba(245,242,237,0.12)"}`,
              background: panel === p.id ? `${GOLD}18` : "transparent",
              color: panel === p.id ? GOLD : "rgba(245,242,237,0.55)",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {p.icon}{p.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {panel === "tiers"    && <TierGrid />}
      {panel === "modules"  && <ModuleCatalog />}
      {panel === "hardware" && <HardwarePricing />}
      {panel === "software" && <SoftwareOnly />}
    </div>
  );
}

export default SalesTiersTab;
