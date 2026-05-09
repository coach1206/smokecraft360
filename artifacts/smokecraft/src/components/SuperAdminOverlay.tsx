/**
 * SuperAdminOverlay — Axiom OS Sovereign Ghost Layer
 *
 * 4-tab command surface: Kill Switches · Inventory Override · Feature Masking · Authority
 * Activated via GhostEntryTrigger (4-finger hold + directional swipe pattern).
 * Design: Brushed Graphite / Smoked Titanium / Warm Honey Amber.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { PermissionGate } from "@/components/PermissionGate";
import { AccessLevel, getTierLabel, type FeatureMask } from "@/lib/authorityEngine";
import { Shield, Power, Lock, Zap, Package, Eye, EyeOff, LogOut } from "lucide-react";

// ── Tokens ────────────────────────────────────────────────────────────────────
const GOLD     = "#D48B00";
const GRAPHITE = "#2A2A2A";
const TITANIUM = "#C0C0C0";
const OBSIDIAN = "#1A1A1B";
const CREAM    = "#F5F2ED";
const PANEL_BG = "rgba(22,20,18,0.97)";

type Tab = "kill" | "inventory" | "masking" | "authority";

const TABS: { id: Tab; label: string; icon: React.ReactNode; tier: AccessLevel }[] = [
  { id: "kill",      label: "Kill Switches",    icon: <Power size={13} />,  tier: AccessLevel.SHIFT_LEAD },
  { id: "inventory", label: "Inventory",        icon: <Package size={13} />, tier: AccessLevel.SHIFT_LEAD },
  { id: "masking",   label: "Feature Masking",  icon: <Eye size={13} />,    tier: AccessLevel.SHIFT_LEAD },
  { id: "authority", label: "Authority",        icon: <Shield size={13} />, tier: AccessLevel.SOVEREIGN  },
];

const FEATURE_LABELS: Record<FeatureMask, string> = {
  revenue_data:        "Revenue Data",
  kill_switches:       "Kill Switches Panel",
  inventory_override:  "Inventory Override",
  guest_intelligence:  "Guest Intelligence Feed",
  swipe_analytics:     "Swipe Analytics",
  authority_panel:     "Authority Panel",
};

// ── Inventory items for override (fetched or mocked) ─────────────────────────
const SAMPLE_ITEMS = [
  { id: "itm-001", name: "Padron 1964 Anniversary",  category: "Cigar" },
  { id: "itm-002", name: "Cohiba Siglo VI",           category: "Cigar" },
  { id: "itm-003", name: "Macallan 18 Sherry Oak",   category: "Spirit" },
  { id: "itm-004", name: "Glenfiddich 21 Gran Reserva", category: "Spirit" },
  { id: "itm-005", name: "Parabola Bourbon Stout",   category: "Brew" },
  { id: "itm-006", name: "Lost Coast Fog Walker",    category: "Brew" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function GhostHeader({ onClose }: { onClose: () => void }) {
  const { authority } = useSuperAdmin();
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "16px 24px 14px",
      borderBottom:   `1px solid ${GOLD}20`,
      background:     GRAPHITE,
      borderRadius:   "20px 20px 0 0",
      flexShrink:     0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: GOLD, boxShadow: `0 0 10px ${GOLD}`,
          }}
        />
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
            color: GOLD, textTransform: "uppercase",
            fontFamily: "'Space Mono', monospace",
          }}>
            GHOST LAYER — AXIOM OS
          </div>
          <div style={{
            fontSize: 8, color: `${TITANIUM}60`, letterSpacing: "0.14em",
            fontFamily: "'Space Mono', monospace", marginTop: 2,
          }}>
            {getTierLabel(authority.tier)} · {authority.name} · {authority.role.replace("_", " ").toUpperCase()}
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          display:     "flex", alignItems: "center", gap: 6,
          background:  "rgba(239,68,68,0.12)",
          border:      "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "7px 14px",
          color:       "rgba(239,68,68,0.85)", cursor: "pointer",
          fontSize:    9, letterSpacing: "0.16em", textTransform: "uppercase",
          fontFamily:  "'Space Mono', monospace",
        }}
      >
        <LogOut size={11} /> EXIT GHOST LAYER
      </button>
    </div>
  );
}

function TabBar({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  const { authority } = useSuperAdmin();
  return (
    <div style={{
      display:     "flex",
      gap:         4,
      padding:     "10px 20px",
      borderBottom: `1px solid ${GOLD}15`,
      flexShrink:  0,
    }}>
      {TABS.map(t => {
        const allowed = authority.tier <= t.tier;
        const sel     = active === t.id;
        return (
          <button
            key={t.id}
            disabled={!allowed}
            onClick={() => allowed && setActive(t.id)}
            style={{
              display:      "flex", alignItems: "center", gap: 6,
              padding:      "8px 14px", borderRadius: 8,
              border:       `1px solid ${sel ? GOLD : `${GOLD}15`}`,
              background:   sel ? `${GOLD}18` : "transparent",
              color:        sel ? GOLD : allowed ? `${CREAM}55` : `${CREAM}18`,
              fontSize:     9, letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily:   "'Space Mono', monospace",
              cursor:       allowed ? "pointer" : "not-allowed",
              transition:   "all 0.18s ease",
              fontWeight:   sel ? 700 : 400,
            }}
          >
            {t.icon} {t.label}
            {!allowed && <Lock size={9} style={{ opacity: 0.4 }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── Kill Switches Tab ─────────────────────────────────────────────────────────

function KillSwitchesTab() {
  const { killSwitches, toggleKillSwitch, authority } = useSuperAdmin();
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 8, color: `${CREAM}35`, letterSpacing: "0.18em", marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>
        GLOBAL KILL SWITCHES — CHANGES ARE LIVE AND IMMEDIATE
      </div>
      {killSwitches.map(sw => {
        const canToggle = authority.tier <= sw.tier;
        return (
          <PermissionGate key={sw.name} requiredTier={sw.tier} mask={false}>
            <div style={{
              display:     "flex", alignItems: "center", justifyContent: "space-between",
              padding:     "14px 16px", borderRadius: 12,
              border:      `1px solid ${sw.enabled ? "rgba(239,68,68,0.35)" : `${GOLD}15`}`,
              background:  sw.enabled ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)",
              transition:  "all 0.22s ease",
            }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: sw.enabled ? "#ef4444" : `${CREAM}88`,
                  letterSpacing: "0.08em", marginBottom: 3,
                  fontFamily: "'Space Mono', monospace",
                }}>
                  {sw.label}
                </div>
                <div style={{ fontSize: 9, color: `${CREAM}35`, fontFamily: "'Space Mono', monospace" }}>
                  {sw.description}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {sw.enabled && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ fontSize: 8, color: "#ef4444", fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em" }}
                  >
                    ACTIVE
                  </motion.div>
                )}
                <button
                  disabled={!canToggle}
                  onClick={() => canToggle && toggleKillSwitch(sw.name)}
                  style={{
                    width:      48, height: 26, borderRadius: 13,
                    border:     "none", cursor: canToggle ? "pointer" : "not-allowed",
                    background: sw.enabled
                      ? "linear-gradient(90deg, #dc2626, #ef4444)"
                      : `linear-gradient(90deg, ${GRAPHITE}, #3a3a3a)`,
                    boxShadow:  sw.enabled ? "0 0 16px rgba(239,68,68,0.4)" : "none",
                    transition: "all 0.22s ease",
                    position:   "relative",
                    opacity:    canToggle ? 1 : 0.35,
                  }}
                >
                  <motion.div
                    animate={{ x: sw.enabled ? 24 : 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                      position:     "absolute", top: 3,
                      width: 20, height: 20, borderRadius: "50%",
                      background:   "#fff",
                      boxShadow:    "0 1px 4px rgba(0,0,0,0.4)",
                    }}
                  />
                </button>
              </div>
            </div>
          </PermissionGate>
        );
      })}
    </div>
  );
}

// ── Inventory Override Tab ─────────────────────────────────────────────────────

function InventoryTab() {
  const { blockedInventory, toggleInventoryBlock } = useSuperAdmin();
  const [search, setSearch] = useState("");
  const filtered = SAMPLE_ITEMS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 8, color: `${CREAM}35`, letterSpacing: "0.18em", marginBottom: 2, fontFamily: "'Space Mono', monospace" }}>
        PAIRING ENGINE OVERRIDE — BLOCKED ITEMS ARE EXCLUDED GLOBALLY
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search inventory…"
        style={{
          background:   "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`,
          borderRadius: 8, padding: "9px 14px",
          color: CREAM, fontSize: 11, outline: "none",
          fontFamily: "'Space Mono', monospace",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map(item => {
          const blocked = blockedInventory.has(item.id);
          return (
            <div key={item.id} style={{
              display:    "flex", alignItems: "center", justifyContent: "space-between",
              padding:    "12px 14px", borderRadius: 10,
              border:     `1px solid ${blocked ? "rgba(239,68,68,0.3)" : `${GOLD}12`}`,
              background: blocked ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.015)",
              transition: "all 0.18s ease",
            }}>
              <div>
                <div style={{ fontSize: 11, color: blocked ? "rgba(239,68,68,0.75)" : `${CREAM}85`, fontFamily: "'Space Mono', monospace" }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 8, color: `${CREAM}30`, marginTop: 2, letterSpacing: "0.1em" }}>
                  {item.category}
                </div>
              </div>
              <button
                onClick={() => toggleInventoryBlock(item.id)}
                style={{
                  display:    "flex", alignItems: "center", gap: 5,
                  padding:    "6px 12px", borderRadius: 7,
                  border:     `1px solid ${blocked ? "rgba(239,68,68,0.4)" : `${GOLD}25`}`,
                  background: blocked ? "rgba(239,68,68,0.12)" : "transparent",
                  color:      blocked ? "#ef4444" : `${GOLD}80`,
                  fontSize:   8, letterSpacing: "0.14em", cursor: "pointer",
                  fontFamily: "'Space Mono', monospace", textTransform: "uppercase",
                }}
              >
                {blocked ? <><EyeOff size={9} /> BLOCKED</> : <><Eye size={9} /> ALLOW</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Feature Masking Tab ───────────────────────────────────────────────────────

const ALL_FEATURES: FeatureMask[] = [
  "revenue_data","kill_switches","inventory_override",
  "guest_intelligence","swipe_analytics","authority_panel",
];

const TIER_TARGETS: { tier: AccessLevel; label: string }[] = [
  { tier: AccessLevel.SHIFT_LEAD, label: "Shift Lead" },
  { tier: AccessLevel.MENTOR,     label: "Mentor" },
];

function MaskingTab() {
  const { featureOverrides, setFeatureOverride, authority } = useSuperAdmin();

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 8, color: `${CREAM}35`, letterSpacing: "0.18em", marginBottom: 16, fontFamily: "'Space Mono', monospace" }}>
        FEATURE MASKING — HIDE OR EXPOSE CAPABILITIES PER TIER
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {ALL_FEATURES.map(feature => {
          const override = featureOverrides[feature];
          const isVisible = override !== undefined ? override : authority.permissions.includes(feature);
          return (
            <div key={feature} style={{
              padding:    "12px 14px", borderRadius: 10,
              border:     `1px solid ${isVisible ? `${GOLD}20` : "rgba(239,68,68,0.2)"}`,
              background: isVisible ? "rgba(255,255,255,0.02)" : "rgba(239,68,68,0.04)",
              display:    "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
              <div style={{ fontSize: 9, color: isVisible ? `${CREAM}75` : `${CREAM}35`, fontFamily: "'Space Mono', monospace" }}>
                {FEATURE_LABELS[feature]}
              </div>
              <button
                onClick={() => setFeatureOverride(feature, !isVisible)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: isVisible ? GOLD : "rgba(239,68,68,0.6)", padding: 2,
                }}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Authority Tab ─────────────────────────────────────────────────────────────

function AuthorityTab() {
  const { authority } = useSuperAdmin();
  const tiers = [
    { tier: AccessLevel.SOVEREIGN,  label: "Sovereign", color: GOLD,      desc: "Absolute system control — all capabilities unlocked" },
    { tier: AccessLevel.SHIFT_LEAD, label: "Shift Lead", color: TITANIUM, desc: "Operational admin — inventory, audio, pairing controls" },
    { tier: AccessLevel.MENTOR,     label: "Mentor",     color: "#6B9BD2", desc: "Guest experience guidance — read-only intelligence" },
    { tier: AccessLevel.GUEST,      label: "Guest",      color: `${CREAM}30`, desc: "No internal access — patron-facing surfaces only" },
  ];

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 8, color: `${CREAM}35`, letterSpacing: "0.18em", marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>
        AUTHORITY TIERS — CURRENT SESSION: {getTierLabel(authority.tier)}
      </div>
      {tiers.map(t => {
        const active = authority.tier === t.tier;
        return (
          <div key={t.tier} style={{
            padding:    "14px 16px", borderRadius: 12,
            border:     `1px solid ${active ? t.color + "50" : `${GOLD}10`}`,
            background: active ? `${t.color}10` : "rgba(255,255,255,0.015)",
            display:    "flex", alignItems: "center", gap: 14,
            transition: "all 0.18s ease",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `1px solid ${t.color}60`,
              background: `${t.color}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: t.color, fontFamily: "'Space Mono', monospace", fontWeight: 700,
              flexShrink: 0,
            }}>
              {AccessLevel[t.tier][0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: active ? t.color : `${CREAM}70`,
                letterSpacing: "0.12em", fontFamily: "'Space Mono', monospace",
              }}>
                {t.label.toUpperCase()}
                {active && <span style={{ marginLeft: 8, fontSize: 7, opacity: 0.6 }}>← YOU</span>}
              </div>
              <div style={{ fontSize: 8, color: `${CREAM}35`, marginTop: 3 }}>{t.desc}</div>
            </div>
            <Zap size={12} style={{ color: active ? t.color : `${CREAM}15`, flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────

export default function SuperAdminOverlay() {
  const { ghostActive, deactivateGhost } = useSuperAdmin();
  const [tab, setTab] = useState<Tab>("kill");

  return (
    <AnimatePresence>
      {ghostActive && (
        <motion.div
          key="ghost-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9980,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(18px)",
            padding: "20px",
          }}
          onClick={e => { if (e.target === e.currentTarget) deactivateGhost(); }}
        >
          <motion.div
            initial={{ y: 32, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background:   PANEL_BG,
              border:       `1px solid ${GOLD}25`,
              borderRadius: 20,
              width:        "100%",
              maxWidth:     760,
              maxHeight:    "88vh",
              display:      "flex",
              flexDirection: "column",
              overflow:     "hidden",
              boxShadow:    `0 0 120px rgba(0,0,0,0.8), 0 0 60px ${GOLD}08, inset 0 1px 0 ${GOLD}15`,
            }}
          >
            <GhostHeader onClose={deactivateGhost} />
            <TabBar active={tab} setActive={setTab} />
            <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
              {tab === "kill"      && <KillSwitchesTab />}
              {tab === "inventory" && <InventoryTab />}
              {tab === "masking"   && <MaskingTab />}
              {tab === "authority" && (
                <PermissionGate requiredTier={AccessLevel.SOVEREIGN} mask={false}>
                  <AuthorityTab />
                </PermissionGate>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
