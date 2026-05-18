/**
 * PresenceEngine — NOVEE OS Presence Engine UI
 * Route: /presence
 *
 * Tabs:
 *   Arrival Feed     — live arriving guests, VIP cards, acknowledge/dismiss
 *   Guest Roster     — full opted-in guest list, status, check-in controls
 *   Reserve Pass     — wallet pass generator (Apple/Google stub)
 *   Presence Intel   — arrival patterns, retention, geofence analytics
 *
 * Design: OLED luxury hospitality. Warm, personal, VIP-focused.
 * NO surveillance aesthetics. NO corporate location maps.
 * Cinematic imagery, tactile raised controls, hospitality warmth.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Wifi, CreditCard, Users, Brain,
  CheckCircle2, X, Star, Crown, Sparkles, Clock,
  Activity, Shield, QrCode, Zap, Heart, RotateCcw,
  ChevronRight, ChevronDown, Package, Eye,
} from "lucide-react";
import { useAxiomPresence } from "@/contexts/AxiomPresenceContext";
import {
  VIP_TIER_CONFIG, TRIGGER_LABEL, TRIGGER_COLOR,
  ACTION_LABEL, buildWalletPass,
  type PresenceGuest, type VipTier,
  type ArrivalTrigger,
} from "@/lib/axiomPresenceEngine";

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:      "#F5F2ED",
  glass:   "rgba(255,255,255,0.028)",
  glassMid:"rgba(255,255,255,0.048)",
  border:  "rgba(26,26,27,0.09)",
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.50)",
  text:    "#1A1A1B",
  muted:   "rgba(240,232,212,0.48)",
  dim:     "rgba(240,232,212,0.26)",
};

type Tab = "feed" | "roster" | "pass" | "intel";

// ── Helpers ────────────────────────────────────────────────────────────────────

function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <motion.div
      style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }}
      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.6, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function TabBtn({ label, active, badge, onClick }: {
  label: string; active: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        padding: "9px 18px", borderRadius: 10,
        border: `1px solid ${active ? `${C.gold}40` : C.border}`,
        background: active ? `${C.gold}12` : "transparent",
        color: active ? C.gold : C.muted,
        fontSize: 12, fontWeight: active ? 700 : 500,
        letterSpacing: "0.04em", cursor: "pointer",
        boxShadow: active ? `0 4px 16px ${C.gold}14, inset 0 1px 0 ${C.gold}18` : "none",
        display: "flex", alignItems: "center", gap: 6, position: "relative",
      }}
    >
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          background: "#f59e0b", color: "#1A1A1B", fontSize: 9, fontWeight: 800,
          padding: "1px 6px", borderRadius: 10, minWidth: 16, textAlign: "center",
        }}>{badge}</span>
      )}
    </motion.button>
  );
}

function TierBadge({ tier }: { tier: VipTier }) {
  const cfg = VIP_TIER_CONFIG[tier];
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, letterSpacing: "0.16em",
      textTransform: "uppercase", color: cfg.color,
      padding: "2px 8px", borderRadius: 20,
      background: cfg.bgColor, border: `1px solid ${cfg.color}28`,
    }}>
      {cfg.label}
    </span>
  );
}

function StatusDot({ status }: { status: PresenceGuest["status"] }) {
  const map: Record<PresenceGuest["status"], string> = {
    away: C.dim, nearby: "#f59e0b", arrived: "#22c55e", seated: "#34d399", departing: "#ef4444",
  };
  const color = map[status];
  return status === "arrived" || status === "seated" || status === "nearby"
    ? <PulseDot color={color} size={7} />
    : <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Guest avatar ───────────────────────────────────────────────────────────────

function GuestAvatar({ guest, size = 40 }: { guest: PresenceGuest; size?: number }) {
  const cfg = VIP_TIER_CONFIG[guest.vipTier];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${cfg.color}28, ${cfg.color}08)`,
      border: `1.5px solid ${cfg.color}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      fontSize: size * 0.38, fontWeight: 700, color: cfg.color,
      fontFamily: "'Playfair Display', serif",
      boxShadow: `0 0 12px ${cfg.color}14`,
    }}>
      {guest.firstName[0]}{guest.lastInitial}
    </div>
  );
}

// ── Arrival Event Card ─────────────────────────────────────────────────────────

function ArrivalCard({ event, onAck, onDismiss }: {
  event: ReturnType<typeof useAxiomPresence>["arrivals"][0];
  onAck: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(!event.acknowledged);
  const cfg        = VIP_TIER_CONFIG[event.vipTier];
  const trigColor  = TRIGGER_COLOR[event.trigger];
  const isDismissed = event.dismissed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: isDismissed ? 0.3 : 1, y: 0, scale: 1 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      style={{
        borderRadius: 18,
        border: `1px solid ${event.acknowledged ? C.border : `${cfg.color}35`}`,
        background: event.acknowledged ? C.glass : `${cfg.color}08`,
        backdropFilter: "blur(16px)",
        overflow: "hidden",
        boxShadow: event.acknowledged ? "none" : `0 8px 32px ${cfg.color}12`,
      }}
    >
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 17px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar with pulse ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}08)`,
            border: `2px solid ${cfg.color}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 700, color: cfg.color,
            fontFamily: "'Playfair Display', serif",
          }}>
            {event.guestName[0]}
          </div>
          {!event.acknowledged && (
            <motion.div style={{
              position: "absolute", inset: -4, borderRadius: "50%",
              border: `1.5px solid ${cfg.color}`,
              opacity: 0,
            }}
              animate={{ opacity: [0, 0.5, 0], scale: [0.9, 1.2, 0.9] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{event.guestName}</span>
            <TierBadge tier={event.vipTier} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              color: trigColor, background: `${trigColor}10`,
              border: `1px solid ${trigColor}22`, padding: "2px 8px", borderRadius: 20,
            }}>
              {TRIGGER_LABEL[event.trigger]}
            </span>
            <span style={{ fontSize: 10, color: C.dim }}>{timeAgo(event.arrivedAt)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {!event.acknowledged && <PulseDot color={cfg.color} />}
          <ChevronDown
            size={13} color={C.dim}
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          />
        </div>
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 17px 16px", display: "flex", flexDirection: "column", gap: 11 }}>

              {/* Mentor greeting */}
              {event.mentorGreeting && (
                <div style={{
                  padding: "12px 14px", borderRadius: 12,
                  background: `${cfg.color}06`, border: `1px solid ${cfg.color}18`,
                }}>
                  <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 5 }}>
                    Mentor Recognition
                  </div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55, fontStyle: "italic" }}>
                    "{event.mentorGreeting}"
                  </div>
                </div>
              )}

              {/* Atmosphere + Pairing */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {event.atmospherePreload && (
                  <div style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.16)",
                  }}>
                    <div style={{ fontSize: 8, color: "rgba(96,165,250,0.6)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 3 }}>
                      Atmosphere
                    </div>
                    <div style={{ fontSize: 11, color: C.text, fontWeight: 600, textTransform: "capitalize" }}>
                      {event.atmospherePreload}
                    </div>
                  </div>
                )}
                {event.pairingSuggestion && (
                  <div style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(212,139,0,0.06)", border: "1px solid rgba(212,139,0,0.16)",
                  }}>
                    <div style={{ fontSize: 8, color: C.goldDim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 3 }}>
                      Pairing Ready
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}>
                      {event.pairingSuggestion}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions triggered */}
              <div>
                <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
                  Actions Triggered
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {event.actionsTriggered.map(a => (
                    <span key={a} style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "#34d399", background: "rgba(52,211,153,0.08)",
                      border: "1px solid rgba(52,211,153,0.20)", padding: "3px 9px", borderRadius: 20,
                    }}>
                      {ACTION_LABEL[a]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Loyalty bonus */}
              {event.loyaltyBonus > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 12px", borderRadius: 10,
                  background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.20)",
                }}>
                  <Star size={12} color="#D48B00" />
                  <span style={{ fontSize: 11, color: "#D48B00", fontWeight: 600 }}>
                    +{event.loyaltyBonus} loyalty points awarded on arrival
                  </span>
                </div>
              )}

              {/* Controls */}
              {!event.acknowledged && (
                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={e => { e.stopPropagation(); onAck(); }}
                    style={{
                      flex: 1, padding: "11px", borderRadius: 10,
                      border: "1px solid #22c55e35", background: "rgba(34,197,94,0.10)",
                      color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      boxShadow: "0 4px 14px rgba(34,197,94,0.14)",
                    }}
                  >
                    <CheckCircle2 size={14} /> Acknowledge Arrival
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={e => { e.stopPropagation(); onDismiss(); }}
                    style={{
                      padding: "11px 16px", borderRadius: 10,
                      border: "1px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)",
                      color: "rgba(239,68,68,0.65)", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                    }}
                  >
                    <X size={13} /> Dismiss
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Tab: Arrival Feed ──────────────────────────────────────────────────────────

const DEMO_TRIGGERS: { id: string; label: string; trigger: ArrivalTrigger }[] = [
  { id: "g-001", label: "Simulate Marcus T. (Geofence)",   trigger: "geofence_enter" },
  { id: "g-004", label: "Simulate Camille R. (WiFi)",      trigger: "wifi_reconnect" },
  { id: "g-005", label: "Simulate Elias M. (Wallet Scan)", trigger: "wallet_scan" },
];

function ArrivalFeedTab() {
  const { arrivals, acknowledgeArrival, dismissArrival, simulateArrival } = useAxiomPresence();
  const [showDismissed, setShowDismissed] = useState(false);

  const visible = arrivals.filter(a => showDismissed ? true : !a.dismissed);
  const unacked = arrivals.filter(a => !a.acknowledged && !a.dismissed).length;

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DEMO_TRIGGERS.map(d => (
            <motion.button
              key={d.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => simulateArrival(d.id, d.trigger)}
              style={{
                padding: "7px 13px", borderRadius: 10,
                border: `1px solid ${TRIGGER_COLOR[d.trigger]}30`,
                background: `${TRIGGER_COLOR[d.trigger]}08`,
                color: TRIGGER_COLOR[d.trigger], fontSize: 10, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <Zap size={9} /> {d.label}
            </motion.button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDismissed(v => !v)}
          style={{
            padding: "7px 13px", borderRadius: 10,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.dim, fontSize: 10, cursor: "pointer",
          }}
        >
          {showDismissed ? "Hide dismissed" : "Show dismissed"}
        </motion.button>
      </div>

      {unacked > 0 && (
        <motion.div
          animate={{ scale: [1, 1.01, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 12, marginBottom: 14,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <PulseDot color="#f59e0b" />
          <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
            {unacked} guest{unacked > 1 ? "s" : ""} arriving — host action required
          </span>
        </motion.div>
      )}

      {visible.length === 0 ? (
        <div style={{
          padding: "40px", textAlign: "center", borderRadius: 16,
          border: `1px dashed ${C.border}`, background: "rgba(26,26,27,0.02)",
        }}>
          <Users size={28} color={C.dim} style={{ margin: "0 auto 10px" }} />
          <div style={{ fontSize: 13, color: C.muted }}>No arrivals yet.</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
            Use the simulate buttons above or enable geofence to detect real arrivals.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((a, i) => (
            <ArrivalCard
              key={a.id}
              event={a}
              onAck={() => acknowledgeArrival(a.id)}
              onDismiss={() => dismissArrival(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Guest Roster ──────────────────────────────────────────────────────────

function GuestRosterTab() {
  const { guests, checkInGuest, updateGuestStatus, simulateArrival } = useAxiomPresence();
  const [filter, setFilter] = useState<"all" | "present" | "opted_in">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = guests.filter(g => {
    if (filter === "present") return g.status === "arrived" || g.status === "seated";
    if (filter === "opted_in") return g.optedIntoPresence;
    return true;
  });

  const present = guests.filter(g => g.status === "arrived" || g.status === "seated").length;

  return (
    <div>
      {/* Filter row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {([
          ["all",      `All (${guests.length})`],
          ["present",  `In Lounge (${present})`],
          ["opted_in", `Presence Opt-in`],
        ] as const).map(([key, label]) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(key)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: `1px solid ${filter === key ? `${C.gold}40` : C.border}`,
              background: filter === key ? `${C.gold}10` : "transparent",
              color: filter === key ? C.gold : C.dim,
              fontSize: 11, fontWeight: filter === key ? 700 : 500, cursor: "pointer",
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(guest => {
          const cfg = VIP_TIER_CONFIG[guest.vipTier];
          const isExpanded = expanded === guest.id;

          return (
            <motion.div
              key={guest.id}
              layout
              style={{
                borderRadius: 14,
                border: `1px solid ${(guest.status === "arrived" || guest.status === "seated") ? `${cfg.color}28` : C.border}`,
                background: (guest.status === "arrived" || guest.status === "seated") ? `${cfg.color}05` : C.glass,
                overflow: "hidden",
              }}
            >
              {/* Row */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }}
                onClick={() => setExpanded(isExpanded ? null : guest.id)}
              >
                <GuestAvatar guest={guest} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    <StatusDot status={guest.status} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                      {guest.firstName} {guest.lastInitial}.
                    </span>
                    <TierBadge tier={guest.vipTier} />
                    {!guest.optedIntoPresence && (
                      <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>NO PRESENCE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim }}>
                    {guest.visitCount} visit{guest.visitCount !== 1 ? "s" : ""}
                    {guest.mentorName ? ` · ${guest.mentorName}` : ""}
                    {guest.arrivedAt ? ` · arrived ${timeAgo(guest.arrivedAt)}` : ""}
                    {guest.loyaltyPoints > 0 ? ` · ${guest.loyaltyPoints.toLocaleString()} pts` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                    color: guest.status === "arrived"  ? "#22c55e"
                         : guest.status === "seated"   ? "#34d399"
                         : guest.status === "nearby"   ? "#f59e0b"
                         : guest.status === "departing"? "#ef4444"
                         : C.dim,
                  }}>
                    {guest.status}
                  </span>
                  <ChevronRight
                    size={13} color={C.dim}
                    style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
                  />
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

                      {/* Flavor tags */}
                      {guest.flavorTags.length > 0 && (
                        <div>
                          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
                            Flavor Profile
                          </div>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {guest.flavorTags.map(tag => (
                              <span key={tag} style={{
                                fontSize: 10, color: C.gold, padding: "3px 10px", borderRadius: 20,
                                background: `${C.gold}10`, border: `1px solid ${C.gold}22`,
                              }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Saved blends */}
                      {guest.savedBlends.length > 0 && (
                        <div>
                          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
                            Saved Blends
                          </div>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {guest.savedBlends.map(b => (
                              <span key={b} style={{
                                fontSize: 10, color: C.muted, padding: "3px 10px", borderRadius: 20,
                                background: "rgba(26,26,27,0.06)", border: `1px solid ${C.border}`,
                              }}>{b}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reservation */}
                      {guest.activeReservation && (
                        <div style={{
                          padding: "9px 12px", borderRadius: 10,
                          background: `${cfg.color}08`, border: `1px solid ${cfg.color}20`,
                          fontSize: 11, color: cfg.color, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 7,
                        }}>
                          <Crown size={12} /> {guest.activeReservation}
                        </div>
                      )}

                      {/* Tier benefits */}
                      <div>
                        <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
                          {VIP_TIER_CONFIG[guest.vipTier].label} Benefits
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {VIP_TIER_CONFIG[guest.vipTier].benefits.map(b => (
                            <div key={b} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
                              <CheckCircle2 size={10} color={cfg.color} /> {b}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        {guest.status === "away" && guest.optedIntoPresence && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => checkInGuest(guest.id)}
                            style={{
                              padding: "8px 14px", borderRadius: 9,
                              border: "1px solid #22c55e30", background: "rgba(34,197,94,0.08)",
                              color: "#22c55e", fontSize: 11, fontWeight: 600, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 5,
                            }}
                          >
                            <CheckCircle2 size={11} /> Staff Check-in
                          </motion.button>
                        )}
                        {(guest.status === "arrived" || guest.status === "seated") && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateGuestStatus(guest.id, "departing")}
                            style={{
                              padding: "8px 14px", borderRadius: 9,
                              border: "1px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)",
                              color: "rgba(239,68,68,0.65)", fontSize: 11, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 5,
                            }}
                          >
                            <ArrowLeft size={11} /> Mark Departing
                          </motion.button>
                        )}
                        {guest.status === "away" && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => simulateArrival(guest.id, "geofence_enter")}
                            style={{
                              padding: "8px 14px", borderRadius: 9,
                              border: `1px solid ${TRIGGER_COLOR.geofence_enter}28`,
                              background: `${TRIGGER_COLOR.geofence_enter}07`,
                              color: TRIGGER_COLOR.geofence_enter, fontSize: 11, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 5,
                            }}
                          >
                            <MapPin size={11} /> Simulate Arrival
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Reserve Pass ──────────────────────────────────────────────────────────

function QRPattern({ data: _data }: { data: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" style={{ display: "block", imageRendering: "crisp-edges" }} aria-label="System mobile replication link">
      <rect width="220" height="220" fill="#ffffff"/>
      <g fill="#1A1A1B">
        <rect x="5" y="5" width="10" height="10"/><rect x="15" y="5" width="10" height="10"/><rect x="25" y="5" width="10" height="10"/><rect x="35" y="5" width="10" height="10"/><rect x="45" y="5" width="10" height="10"/><rect x="55" y="5" width="10" height="10"/><rect x="65" y="5" width="10" height="10"/><rect x="85" y="5" width="10" height="10"/><rect x="105" y="5" width="10" height="10"/><rect x="125" y="5" width="10" height="10"/><rect x="145" y="5" width="10" height="10"/><rect x="155" y="5" width="10" height="10"/><rect x="165" y="5" width="10" height="10"/><rect x="175" y="5" width="10" height="10"/><rect x="185" y="5" width="10" height="10"/><rect x="195" y="5" width="10" height="10"/><rect x="205" y="5" width="10" height="10"/>
        <rect x="5" y="15" width="10" height="10"/><rect x="65" y="15" width="10" height="10"/><rect x="95" y="15" width="10" height="10"/><rect x="115" y="15" width="10" height="10"/><rect x="145" y="15" width="10" height="10"/><rect x="205" y="15" width="10" height="10"/>
        <rect x="5" y="25" width="10" height="10"/><rect x="25" y="25" width="10" height="10"/><rect x="35" y="25" width="10" height="10"/><rect x="45" y="25" width="10" height="10"/><rect x="65" y="25" width="10" height="10"/><rect x="85" y="25" width="10" height="10"/><rect x="125" y="25" width="10" height="10"/><rect x="145" y="25" width="10" height="10"/><rect x="165" y="25" width="10" height="10"/><rect x="175" y="25" width="10" height="10"/><rect x="185" y="25" width="10" height="10"/><rect x="205" y="25" width="10" height="10"/>
        <rect x="5" y="35" width="10" height="10"/><rect x="25" y="35" width="10" height="10"/><rect x="35" y="35" width="10" height="10"/><rect x="45" y="35" width="10" height="10"/><rect x="65" y="35" width="10" height="10"/><rect x="95" y="35" width="10" height="10"/><rect x="105" y="35" width="10" height="10"/><rect x="145" y="35" width="10" height="10"/><rect x="165" y="35" width="10" height="10"/><rect x="175" y="35" width="10" height="10"/><rect x="185" y="35" width="10" height="10"/><rect x="205" y="35" width="10" height="10"/>
        <rect x="5" y="45" width="10" height="10"/><rect x="25" y="45" width="10" height="10"/><rect x="35" y="45" width="10" height="10"/><rect x="45" y="45" width="10" height="10"/><rect x="65" y="45" width="10" height="10"/><rect x="85" y="45" width="10" height="10"/><rect x="115" y="45" width="10" height="10"/><rect x="125" y="45" width="10" height="10"/><rect x="145" y="45" width="10" height="10"/><rect x="165" y="45" width="10" height="10"/><rect x="175" y="45" width="10" height="10"/><rect x="185" y="45" width="10" height="10"/><rect x="205" y="45" width="10" height="10"/>
        <rect x="5" y="55" width="10" height="10"/><rect x="65" y="55" width="10" height="10"/><rect x="95" y="55" width="10" height="10"/><rect x="105" y="55" width="10" height="10"/><rect x="145" y="55" width="10" height="10"/><rect x="205" y="55" width="10" height="10"/>
        <rect x="5" y="65" width="10" height="10"/><rect x="15" y="65" width="10" height="10"/><rect x="25" y="65" width="10" height="10"/><rect x="35" y="65" width="10" height="10"/><rect x="45" y="65" width="10" height="10"/><rect x="55" y="65" width="10" height="10"/><rect x="65" y="65" width="10" height="10"/><rect x="85" y="65" width="10" height="10"/><rect x="105" y="65" width="10" height="10"/><rect x="125" y="65" width="10" height="10"/><rect x="145" y="65" width="10" height="10"/><rect x="155" y="65" width="10" height="10"/><rect x="165" y="65" width="10" height="10"/><rect x="175" y="65" width="10" height="10"/><rect x="185" y="65" width="10" height="10"/><rect x="195" y="65" width="10" height="10"/><rect x="205" y="65" width="10" height="10"/>
        <rect x="85" y="75" width="10" height="10"/><rect x="95" y="75" width="10" height="10"/><rect x="115" y="75" width="10" height="10"/>
        <rect x="5" y="85" width="10" height="10"/><rect x="25" y="85" width="10" height="10"/><rect x="55" y="85" width="10" height="10"/><rect x="75" y="85" width="10" height="10"/><rect x="85" y="85" width="10" height="10"/><rect x="105" y="85" width="10" height="10"/><rect x="135" y="85" width="10" height="10"/><rect x="155" y="85" width="10" height="10"/><rect x="165" y="85" width="10" height="10"/><rect x="195" y="85" width="10" height="10"/>
        <rect x="15" y="95" width="10" height="10"/><rect x="35" y="95" width="10" height="10"/><rect x="45" y="95" width="10" height="10"/><rect x="65" y="95" width="10" height="10"/><rect x="95" y="95" width="10" height="10"/><rect x="115" y="95" width="10" height="10"/><rect x="125" y="95" width="10" height="10"/><rect x="145" y="95" width="10" height="10"/><rect x="175" y="95" width="10" height="10"/><rect x="185" y="95" width="10" height="10"/><rect x="205" y="95" width="10" height="10"/>
        <rect x="5" y="105" width="10" height="10"/><rect x="25" y="105" width="10" height="10"/><rect x="55" y="105" width="10" height="10"/><rect x="75" y="105" width="10" height="10"/><rect x="85" y="105" width="10" height="10"/><rect x="115" y="105" width="10" height="10"/><rect x="135" y="105" width="10" height="10"/><rect x="155" y="105" width="10" height="10"/><rect x="185" y="105" width="10" height="10"/>
        <rect x="15" y="115" width="10" height="10"/><rect x="25" y="115" width="10" height="10"/><rect x="45" y="115" width="10" height="10"/><rect x="65" y="115" width="10" height="10"/><rect x="95" y="115" width="10" height="10"/><rect x="105" y="115" width="10" height="10"/><rect x="125" y="115" width="10" height="10"/><rect x="145" y="115" width="10" height="10"/><rect x="165" y="115" width="10" height="10"/><rect x="175" y="115" width="10" height="10"/><rect x="195" y="115" width="10" height="10"/><rect x="205" y="115" width="10" height="10"/>
        <rect x="5" y="125" width="10" height="10"/><rect x="35" y="125" width="10" height="10"/><rect x="55" y="125" width="10" height="10"/><rect x="75" y="125" width="10" height="10"/><rect x="85" y="125" width="10" height="10"/><rect x="105" y="125" width="10" height="10"/><rect x="115" y="125" width="10" height="10"/><rect x="135" y="125" width="10" height="10"/><rect x="155" y="125" width="10" height="10"/><rect x="185" y="125" width="10" height="10"/><rect x="205" y="125" width="10" height="10"/>
        <rect x="95" y="135" width="10" height="10"/><rect x="125" y="135" width="10" height="10"/><rect x="145" y="135" width="10" height="10"/><rect x="165" y="135" width="10" height="10"/><rect x="195" y="135" width="10" height="10"/>
        <rect x="5" y="145" width="10" height="10"/><rect x="15" y="145" width="10" height="10"/><rect x="25" y="145" width="10" height="10"/><rect x="35" y="145" width="10" height="10"/><rect x="45" y="145" width="10" height="10"/><rect x="55" y="145" width="10" height="10"/><rect x="65" y="145" width="10" height="10"/><rect x="85" y="145" width="10" height="10"/><rect x="105" y="145" width="10" height="10"/><rect x="115" y="145" width="10" height="10"/><rect x="135" y="145" width="10" height="10"/><rect x="155" y="145" width="10" height="10"/><rect x="165" y="145" width="10" height="10"/><rect x="185" y="145" width="10" height="10"/><rect x="205" y="145" width="10" height="10"/>
        <rect x="5" y="155" width="10" height="10"/><rect x="65" y="155" width="10" height="10"/><rect x="95" y="155" width="10" height="10"/><rect x="125" y="155" width="10" height="10"/><rect x="145" y="155" width="10" height="10"/><rect x="175" y="155" width="10" height="10"/><rect x="195" y="155" width="10" height="10"/>
        <rect x="5" y="165" width="10" height="10"/><rect x="25" y="165" width="10" height="10"/><rect x="35" y="165" width="10" height="10"/><rect x="45" y="165" width="10" height="10"/><rect x="65" y="165" width="10" height="10"/><rect x="75" y="165" width="10" height="10"/><rect x="85" y="165" width="10" height="10"/><rect x="105" y="165" width="10" height="10"/><rect x="135" y="165" width="10" height="10"/><rect x="155" y="165" width="10" height="10"/><rect x="165" y="165" width="10" height="10"/><rect x="185" y="165" width="10" height="10"/><rect x="205" y="165" width="10" height="10"/>
        <rect x="5" y="175" width="10" height="10"/><rect x="25" y="175" width="10" height="10"/><rect x="35" y="175" width="10" height="10"/><rect x="45" y="175" width="10" height="10"/><rect x="65" y="175" width="10" height="10"/><rect x="95" y="175" width="10" height="10"/><rect x="115" y="175" width="10" height="10"/><rect x="125" y="175" width="10" height="10"/><rect x="145" y="175" width="10" height="10"/><rect x="175" y="175" width="10" height="10"/><rect x="195" y="175" width="10" height="10"/>
        <rect x="5" y="185" width="10" height="10"/><rect x="25" y="185" width="10" height="10"/><rect x="35" y="185" width="10" height="10"/><rect x="45" y="185" width="10" height="10"/><rect x="65" y="185" width="10" height="10"/><rect x="85" y="185" width="10" height="10"/><rect x="105" y="185" width="10" height="10"/><rect x="135" y="185" width="10" height="10"/><rect x="155" y="185" width="10" height="10"/><rect x="185" y="185" width="10" height="10"/><rect x="205" y="185" width="10" height="10"/>
        <rect x="5" y="195" width="10" height="10"/><rect x="65" y="195" width="10" height="10"/><rect x="95" y="195" width="10" height="10"/><rect x="115" y="195" width="10" height="10"/><rect x="125" y="195" width="10" height="10"/><rect x="145" y="195" width="10" height="10"/><rect x="165" y="195" width="10" height="10"/><rect x="175" y="195" width="10" height="10"/><rect x="195" y="195" width="10" height="10"/>
        <rect x="5" y="205" width="10" height="10"/><rect x="15" y="205" width="10" height="10"/><rect x="25" y="205" width="10" height="10"/><rect x="35" y="205" width="10" height="10"/><rect x="45" y="205" width="10" height="10"/><rect x="55" y="205" width="10" height="10"/><rect x="65" y="205" width="10" height="10"/><rect x="85" y="205" width="10" height="10"/><rect x="105" y="205" width="10" height="10"/><rect x="135" y="205" width="10" height="10"/><rect x="155" y="205" width="10" height="10"/><rect x="185" y="205" width="10" height="10"/><rect x="205" y="205" width="10" height="10"/>
      </g>
    </svg>
  );
}

function WalletPassCard({ pass }: { pass: NonNullable<ReturnType<typeof useAxiomPresence>["walletPass"]> }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div style={{ perspective: 1000 }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d", cursor: "pointer", position: "relative", height: 210 }}
        onClick={() => setFlipped(f => !f)}
      >
        {/* Front */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden",
          borderRadius: 20,
          background: `linear-gradient(135deg, ${pass.primaryColor}, rgba(6,4,10,0.95))`,
          border: `1px solid ${pass.accentColor}35`,
          padding: "24px 26px",
          boxShadow: `0 16px 48px ${pass.accentColor}18, 0 4px 16px rgba(26,26,27,0.26)`,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          overflow: "hidden",
        }}>
          {/* Shine overlay */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "40%",
            background: "linear-gradient(180deg, rgba(26,26,27,0.08) 0%, transparent 100%)",
            borderRadius: "20px 20px 0 0",
          }} />

          <div>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase",
              color: `${pass.accentColor}80`, marginBottom: 10,
            }}>
              NOVEE OS · SmokeCraft Reserve Pass
            </div>
            <div style={{
              fontSize: 24, fontWeight: 700, color: pass.accentColor,
              fontFamily: "'Playfair Display', serif", marginBottom: 4,
            }}>
              {pass.guestName}
            </div>
            {pass.mentorName && (
              <div style={{ fontSize: 11, color: `${pass.accentColor}70` }}>
                Guided by {pass.mentorName}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 9, color: `${pass.accentColor}55`, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>
                {VIP_TIER_CONFIG[pass.vipTier].label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: pass.accentColor, letterSpacing: "0.12em" }}>
                {pass.passCode}
              </div>
              <div style={{ fontSize: 9, color: `${pass.accentColor}50`, marginTop: 2 }}>
                Member since {pass.memberSince}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: `${pass.accentColor}55`, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Points
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: pass.accentColor }}>
                {pass.loyaltyPoints.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          borderRadius: 20,
          background: `linear-gradient(135deg, rgba(6,4,10,0.98), ${pass.primaryColor})`,
          border: `1px solid ${pass.accentColor}30`,
          padding: "20px 24px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 9, color: `${pass.accentColor}60`, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
              Member Benefits
            </div>
            {pass.benefits.map(b => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <CheckCircle2 size={10} color={pass.accentColor} />
                <span style={{ fontSize: 11, color: `${pass.accentColor}85` }}>{b}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{
              padding: "10px", borderRadius: 10,
              background: "rgba(255,255,255,0.92)",
            }}>
              <QRPattern data={pass.qrData} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: `${pass.accentColor}55`, letterSpacing: "0.12em" }}>PASS CODE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: pass.accentColor, letterSpacing: "0.14em" }}>
                {pass.passCode}
              </div>
              <div style={{ fontSize: 8, color: `${pass.accentColor}40`, marginTop: 2 }}>
                Tap to flip
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ReservePassTab() {
  const { walletPass, guests } = useAxiomPresence();
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  const optedGuests = guests.filter(g => g.optedIntoPresence);

  // Derive the active guest — selected or first opted-in
  const activeGuest = selectedGuestId
    ? guests.find(g => g.id === selectedGuestId) ?? optedGuests[0] ?? null
    : optedGuests[0] ?? null;

  // Build pass from active guest (or fall back to enrolled guest's wallet pass)
  const displayPass = activeGuest
    ? buildWalletPass(activeGuest, null)
    : walletPass;

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      {/* Guest selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
          Preview Pass For
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {optedGuests.map(g => {
            const cfg = VIP_TIER_CONFIG[g.vipTier];
            const sel = selectedGuestId === g.id || (!selectedGuestId && optedGuests[0]?.id === g.id);
            return (
              <motion.button
                key={g.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedGuestId(g.id)}
                style={{
                  padding: "7px 13px", borderRadius: 20,
                  border: `1px solid ${sel ? cfg.color + "40" : C.border}`,
                  background: sel ? cfg.bgColor : "transparent",
                  color: sel ? cfg.color : C.dim,
                  fontSize: 11, fontWeight: sel ? 700 : 500, cursor: "pointer",
                }}
              >
                {g.firstName} {g.lastInitial}. · {VIP_TIER_CONFIG[g.vipTier].label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Pass preview */}
      {displayPass ? (
        <>
          <div style={{ marginBottom: 6, fontSize: 10, color: C.dim, textAlign: "center" }}>
            Tap the card to flip
          </div>
          <WalletPassCard pass={displayPass} />

          {/* Wallet buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              style={{
                flex: 1, padding: "13px", borderRadius: 12,
                background: "linear-gradient(135deg, #1a1a1a, #000)",
                border: "1px solid rgba(26,26,27,0.17)",
                color: "#1A1A1B", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(26,26,27,0.18)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <path d="M13 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 10H4V4h8v8z"/>
              </svg>
              Add to Apple Wallet
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              style={{
                flex: 1, padding: "13px", borderRadius: 12,
                background: "linear-gradient(135deg, #1565C0, #0D47A1)",
                border: "1px solid rgba(26,26,27,0.17)",
                color: "#1A1A1B", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(13,71,161,0.4)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <circle cx="8" cy="8" r="7" fill="none" stroke="white" strokeWidth="1.5"/>
                <text x="8" y="11" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">G</text>
              </svg>
              Add to Google Wallet
            </motion.button>
          </div>

          <div style={{
            marginTop: 12, padding: "10px 13px", borderRadius: 10,
            background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`,
            fontSize: 10, color: C.dim, textAlign: "center",
          }}>
            Wallet issuance requires server-side certificate integration. Pass data is live — connect your Apple/Google developer account to activate.
          </div>
        </>
      ) : (
        <div style={{
          padding: "40px", textAlign: "center", borderRadius: 16,
          border: `1px dashed ${C.border}`,
        }}>
          <CreditCard size={28} color={C.dim} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13, color: C.muted }}>
            No enrolled guest with presence opt-in found.
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
            Complete the enrollment flow to generate a Reserve Pass.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Presence Intel ────────────────────────────────────────────────────────

function IntelMetric({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div style={{
      padding: "18px 20px", borderRadius: 16,
      background: `${accent}06`, border: `1px solid ${accent}18`,
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ fontSize: 9, color: `${accent}60`, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: C.dim, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function GeofencePanel() {
  const { geofenceActive, geofenceStatus, geofenceDistance, enableGeofence, disableGeofence } = useAxiomPresence();

  const statusConfig = {
    idle:      { label: "Not Active",       color: C.dim },
    requesting:{ label: "Requesting…",      color: "#f59e0b" },
    denied:    { label: "Permission Denied", color: "#ef4444" },
    active:    { label: "Active",           color: "#22c55e" },
    error:     { label: "Error",            color: "#ef4444" },
  };
  const sc = statusConfig[geofenceStatus];

  return (
    <div style={{
      padding: "18px 20px", borderRadius: 16,
      border: `1px solid ${geofenceActive ? "#22c55e28" : C.border}`,
      background: geofenceActive ? "rgba(34,197,94,0.05)" : C.glass,
      gridColumn: "1 / -1",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <MapPin size={14} color={geofenceActive ? "#22c55e" : C.dim} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Geofence Arrival Detection</span>
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>
            Permission-based · Opt-in only · Hospitality radius: 200m
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 10, color: sc.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            {geofenceActive && <PulseDot color="#22c55e" />}
            {sc.label}
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
            onClick={geofenceActive ? disableGeofence : enableGeofence}
            style={{
              padding: "9px 16px", borderRadius: 10,
              border: `1px solid ${geofenceActive ? "rgba(239,68,68,0.25)" : "#22c55e35"}`,
              background: geofenceActive ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.10)",
              color: geofenceActive ? "rgba(239,68,68,0.75)" : "#22c55e",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            {geofenceActive ? "Disable" : "Enable Geofence"}
          </motion.button>
        </div>
      </div>

      {geofenceActive && geofenceDistance != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(26,26,27,0.08)", overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${Math.max(5, 100 - Math.min(100, geofenceDistance / 2))}%` }}
              transition={{ duration: 0.8 }}
              style={{
                height: "100%", borderRadius: 3,
                background: `linear-gradient(90deg, #22c55e55, #22c55e)`,
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, flexShrink: 0 }}>
            {geofenceDistance}m from venue
          </span>
        </div>
      )}

      {geofenceStatus === "denied" && (
        <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>
          Location permission denied. Enable in browser settings to activate geofence arrival detection.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { icon: <Shield size={10} />, label: "Permission-based opt-in" },
          { icon: <Heart size={10} />, label: "Hospitality-first, never surveillance" },
          { icon: <Wifi size={10} />, label: "WiFi continuity fallback" },
        ].map(item => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, color: C.dim,
          }}>
            <span style={{ color: C.gold }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PresenceIntelTab() {
  const { presenceIntel, guests } = useAxiomPresence();
  const present = guests.filter(g => g.status === "arrived" || g.status === "seated");
  const opted   = guests.filter(g => g.optedIntoPresence);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Geofence panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <GeofencePanel />
      </div>

      {/* Metrics grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
      }}>
        <IntelMetric
          label="In Lounge Now"
          value={present.length}
          sub={`of ${guests.length} tracked guests`}
          accent="#22c55e"
        />
        <IntelMetric
          label="Presence Opt-in"
          value={opted.length}
          sub={`${Math.round(presenceIntel.geofenceOptInRate * 100)}% opt-in rate`}
          accent="#60a5fa"
        />
        <IntelMetric
          label="Guest Retention"
          value={`${Math.round(presenceIntel.guestRetentionRate * 100)}%`}
          sub="Guests with 2+ visits"
          accent="#34d399"
        />
        <IntelMetric
          label="Peak Arrival"
          value={`${presenceIntel.topReturnHour > 12 ? presenceIntel.topReturnHour - 12 : presenceIntel.topReturnHour}PM`}
          sub={`Most arrivals on ${presenceIntel.topReturnDay}`}
          accent={C.gold}
        />
        <IntelMetric
          label="VIP Arrival Rate"
          value={`${Math.round(presenceIntel.vipArrivalRate * 100)}%`}
          sub="Reserve+ tier guests"
          accent="#D48B00"
        />
        <IntelMetric
          label="Loyalty Activation"
          value={`${Math.round(presenceIntel.loyaltyActivationRate * 100)}%`}
          sub="Loyalty triggered on arrival"
          accent="#a78bfa"
        />
      </div>

      {/* WiFi continuity */}
      <div style={{
        padding: "16px 18px", borderRadius: 16,
        background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Wifi size={14} color="#60a5fa" />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>WiFi Continuity</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#22c55e", background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.20)", padding: "2px 8px", borderRadius: 20,
          }}>Fallback Active</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          When opted-in guests reconnect to the venue WiFi, NOVEE OS restores their session profile,
          activates loyalty systems, loads their atmosphere preference, and triggers mentor recognition —
          without requiring geolocation permission.
        </div>
      </div>

      {/* Top guests */}
      <div>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
          Top Presence Guests
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...guests]
            .sort((a, b) => b.visitCount - a.visitCount)
            .slice(0, 4)
            .map(g => {
              const cfg = VIP_TIER_CONFIG[g.vipTier];
              return (
                <div key={g.id} style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "10px 13px", borderRadius: 12,
                  background: C.glass, border: `1px solid ${C.border}`,
                }}>
                  <GuestAvatar guest={g} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {g.firstName} {g.lastInitial}.
                    </div>
                    <div style={{ fontSize: 10, color: C.dim }}>
                      {g.visitCount} visits · {g.loyaltyPoints.toLocaleString()} pts
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <TierBadge tier={g.vipTier} />
                    <StatusDot status={g.status} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PresenceEngine() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("feed");
  const { arrivals, guests, geofenceActive } = useAxiomPresence();

  const unacked  = arrivals.filter(a => !a.acknowledged && !a.dismissed).length;
  const present  = guests.filter(g => g.status === "arrived" || g.status === "seated").length;

  return (
    <div style={{
      position: "relative", minHeight: "100dvh",
      background: C.bg, display: "flex", flexDirection: "column",
      overflow: "hidden", color: C.text,
    }}>

      {/* Ambient layer */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/images/scenes/relaxed.jpg)",
          backgroundSize: "cover", backgroundPosition: "center 30%",
          opacity: 0.06, filter: "blur(6px) saturate(0.5)", transform: "scale(1.04)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,139,0,0.06) 0%, transparent 65%)," +
            "linear-gradient(180deg, transparent 0%, rgba(6,4,10,0.92) 100%)",
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.3), rgba(52,211,153,0.2), transparent)",
        }} />
      </div>

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(6,4,10,0.90)", backdropFilter: "blur(20px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(26,26,27,0.06)", border: `1px solid ${C.border}`,
              color: C.muted, cursor: "pointer",
            }}
          >
            <ArrowLeft size={19} />
          </motion.button>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              color: C.gold, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Sparkles size={16} color={C.gold} />
              NOVEE OS Presence Engine
            </div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 1 }}>
              VIP arrival · guest recognition · hospitality intelligence
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 10 }}>
          {unacked > 0 && (
            <motion.div
              animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 15px", borderRadius: 12,
                background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.28)",
              }}
            >
              <PulseDot color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{unacked}</span>
              <span style={{ fontSize: 10, color: "rgba(245,158,11,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Arriving</span>
            </motion.div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 15px", borderRadius: 12,
            background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.22)",
          }}>
            <Users size={13} color="#22c55e" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{present}</span>
            <span style={{ fontSize: 10, color: "rgba(34,197,94,0.55)", letterSpacing: "0.1em", textTransform: "uppercase" }}>In Lounge</span>
          </div>
          {geofenceActive && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 12,
              background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.20)",
            }}>
              <PulseDot color="#22c55e" size={5} />
              <span style={{ fontSize: 10, color: "#22c55e80", fontWeight: 600 }}>Geofence Active</span>
            </div>
          )}
        </div>
      </div>

      {/* System signal bar */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: 18,
        padding: "8px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(26,26,27,0.06)", backdropFilter: "blur(12px)",
        overflowX: "auto", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <Eye size={9} color={C.goldDim} />
          <span style={{ fontSize: 8.5, letterSpacing: "0.22em", color: C.dim, textTransform: "uppercase" }}>Presence</span>
        </div>
        {[
          { label: "VIP RECOGNITION",  state: "ACTIVE",   color: "#D48B00" },
          { label: "MENTOR LAYER",     state: "ONLINE",   color: "#D48B00" },
          { label: "WIFI CONTINUITY",  state: "READY",    color: "#60a5fa" },
          { label: "LOYALTY WATCH",    state: "TRACKING", color: "#34d399" },
          { label: "HOST ALERTS",      state: "LIVE",     color: "#22c55e" },
          { label: "WALLET PASS",      state: "STUB",     color: "#a78bfa" },
        ].map(n => (
          <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <motion.div
              style={{ width: 5, height: 5, borderRadius: "50%", background: n.color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.13em", textTransform: "uppercase" }}>{n.label}</span>
            <span style={{ fontSize: 8, color: n.color, fontWeight: 700 }}>{n.state}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", gap: 8, padding: "14px 20px 0",
        flexShrink: 0,
      }}>
        <TabBtn label="Arrival Feed"   active={tab === "feed"}   badge={unacked} onClick={() => setTab("feed")}   />
        <TabBtn label={`Guest Roster (${guests.length})`} active={tab === "roster"} onClick={() => setTab("roster")} />
        <TabBtn label="Reserve Pass"   active={tab === "pass"}   onClick={() => setTab("pass")}   />
        <TabBtn label="Presence Intel" active={tab === "intel"}  onClick={() => setTab("intel")}  />
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, overflowY: "auto",
        padding: "16px 20px 28px",
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24 }}
          >
            {tab === "feed"   && <ArrivalFeedTab />}
            {tab === "roster" && <GuestRosterTab />}
            {tab === "pass"   && <ReservePassTab />}
            {tab === "intel"  && <PresenceIntelTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "8px 20px",
        borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.16em",
        background: "rgba(6,4,10,0.80)", backdropFilter: "blur(14px)", flexShrink: 0,
      }}>
        <span>
          <Sparkles size={9} style={{ marginRight: 5, verticalAlign: "middle" }} />
          NOVEE OS · Presence Engine · Opt-in hospitality intelligence
        </span>
        <span>Permission-based · VIP-first · No surveillance</span>
      </div>
    </div>
  );
}
