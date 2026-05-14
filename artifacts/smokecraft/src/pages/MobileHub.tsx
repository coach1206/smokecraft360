/**
 * MobileHub — /mobile-hub
 * After-Hours Concierge: passive revenue while the lounge is closed.
 *
 * URL params: ?rank=Connoisseur&xp=750&name=Marcus
 *
 * Sections:
 *  1. Prestige Identity  — rank badge + XP sync from lounge session
 *  2. Daily Streak       — Web Notification registration
 *  3. Retail Bridge      — buy cigars / spirits for home delivery
 *  4. Booking Engine     — Reserve for Tomorrow with early-bird pricing
 *  5. Travel & Lifestyle — DayOne360 affiliate partner offers
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Star, ShoppingBag, CalendarDays, Plane, Bell, BellOff,
  ExternalLink, ChevronRight, Check, Clock, Percent,
  Flame, Wine, Gift, Sparkles, MapPin, Crown,
} from "lucide-react";
import QRCode from "qrcode";

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:       "#F5F2ED",
  surface:  "rgba(26,26,27,0.05)",
  surfaceMid:"rgba(26,26,27,0.07)",
  border:   "rgba(212,139,0,0.16)",
  borderSoft:"rgba(212,139,0,0.09)",
  gold:     "#D48B00",
  goldDim:  "rgba(212,139,0,0.45)",
  text:     "rgba(26,26,27,0.90)",
  muted:    "rgba(26,26,27,0.52)",
  dim:      "rgba(26,26,27,0.28)",
  green:    "#34d399",
  blue:     "#60a5fa",
  purple:   "#a78bfa",
  pink:     "#ec4899",
};

// ── Prestige config ────────────────────────────────────────────────────────────

const RANK_CONFIG: Record<string, { color: string; ring: string; icon: typeof Star }> = {
  Novice:      { color: "#6B5E4E", ring: "rgba(179,155,119,0.3)",  icon: Star   },
  Connoisseur: { color: "#D48B00", ring: "rgba(212,139,0,0.35)",  icon: Star   },
  Master:      { color: "#A78BFA", ring: "rgba(167,139,250,0.35)", icon: Crown  },
  Legend:      { color: "#ef4444", ring: "rgba(239,68,68,0.30)",   icon: Flame  },
};

// ── Booking time slots ─────────────────────────────────────────────────────────

interface TimeSlot {
  id:       string;
  time:     string;
  label:    string;
  base:     number;
  discount: number;
  avail:    number;
}

function buildSlots(): TimeSlot[] {
  return [
    { id: "a", time: "2:00 PM", label: "Afternoon Reserve", base: 45, discount: 25, avail: 8 },
    { id: "b", time: "4:30 PM", label: "Pre-Evening",       base: 55, discount: 15, avail: 5 },
    { id: "c", time: "7:00 PM", label: "Prime Hour",        base: 65, discount: 0,  avail: 2 },
    { id: "d", time: "9:00 PM", label: "Late Reserve",      base: 55, discount: 15, avail: 6 },
  ];
}

// ── Retail products ────────────────────────────────────────────────────────────

const RETAIL_PRODUCTS = [
  {
    id: "r1", name: "Cohiba Reserva",
    type: "Cigar · Box of 25", price: 89,
    icon: Flame, color: "#D48B00",
    desc: "Full-body Dominican reserve. Hand-selected, triple-fermented.",
    href: "https://shopify.com",
  },
  {
    id: "r2", name: "Pappy Van Winkle 12yr",
    type: "Bourbon · 750 mL", price: 149,
    icon: Wine, color: "#60a5fa",
    desc: "Wheated bourbon. Notes of vanilla, caramel, oak. 90.4 proof.",
    href: "https://shopify.com",
  },
  {
    id: "r3", name: "NOVEE Reserve Sampler",
    type: "Gift Set · 5 pieces", price: 49,
    icon: Gift, color: "#A78BFA",
    desc: "Curated selection from tonight's menu. Perfect for gifting.",
    href: "https://shopify.com",
  },
];

// ── Tomorrow's date string ─────────────────────────────────────────────────────

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ── Small atoms ────────────────────────────────────────────────────────────────

function GlassCard({ children, style, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${accent ? `${accent}22` : C.border}`,
      borderRadius: 18,
      backdropFilter: "blur(14px)",
      boxShadow: accent
        ? `0 0 24px ${accent}14, inset 0 1px 0 rgba(26,26,27,0.06)`
        : "inset 0 1px 0 rgba(26,26,27,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, color = C.gold }: { icon: typeof Star; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={13} color={color} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.2em" }}>{label}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MobileHub() {
  const params = new URLSearchParams(window.location.search);
  const rank   = params.get("rank")  ?? "Novice";
  const xp     = Number(params.get("xp") ?? 0);
  const name   = params.get("name") ?? "Guest";

  const rc = RANK_CONFIG[rank] ?? RANK_CONFIG.Novice;
  const RankIcon = rc.icon;

  const [slots]          = useState(buildSlots);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [notifState, setNotifState] = useState<"idle" | "requesting" | "granted" | "denied">(() => {
    if (typeof Notification === "undefined") return "denied";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied")  return "denied";
    return "idle";
  });
  const [selfQr, setSelfQr] = useState<string>("");

  useEffect(() => {
    const shareUrl = window.location.href;
    QRCode.toDataURL(shareUrl, {
      width: 140, margin: 1,
      color: { dark: C.gold.replace("#", ""), light: "06040a" },
    }).then(setSelfQr).catch(() => {});
  }, []);

  const requestNotification = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    setNotifState("requesting");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifState("granted");
      new Notification("🥃 Axiom Daily Streak", {
        body: `Good morning, ${name}! Your ${rank} prestige awaits — book a session or explore today's specials.`,
        icon: "/favicon.ico",
      });
      localStorage.setItem("axiom_streak_enabled", "1");
    } else {
      setNotifState("denied");
    }
  }, [name, rank]);

  const today = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "system-ui, sans-serif" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse 120% 40% at 50% 0%, ${rc.color}0A 0%, transparent 60%)` }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", padding: "0 0 48px" }}>

        {/* ── Top bar ── */}
        <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: C.goldDim, letterSpacing: "0.18em" }}>
            NOVEE OS
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>{today}</div>
        </div>

        {/* ── After-Hours Banner ── */}
        <div style={{ padding: "0 16px 20px" }}>
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(8,6,4,0.94) 0%, rgba(20,14,6,0.96) 100%)",
              border: "1px solid rgba(212,139,0,0.22)",
              padding: "16px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              boxShadow: "0 0 32px rgba(212,139,0,0.08), inset 0 1px 0 rgba(212,139,0,0.10)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <motion.div
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171", flexShrink: 0 }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", letterSpacing: "0.22em", textTransform: "uppercase" }}>
                    Lounge Closed
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F0E8D4", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.04em" }}>
                  After-Hours Concierge
                </div>
                <div style={{ fontSize: 10, color: "rgba(240,232,212,0.42)", marginTop: 3 }}>
                  Reopens tomorrow · 4:00 PM — book now for early-bird pricing
                </div>
              </div>
              <a
                href="/craft-hub"
                style={{
                  flexShrink: 0,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                  color: C.gold, textDecoration: "none",
                  padding: "8px 14px", borderRadius: 10,
                  border: "1px solid rgba(212,139,0,0.30)",
                  background: "rgba(212,139,0,0.08)",
                  display: "flex", alignItems: "center", gap: 5,
                  whiteSpace: "nowrap",
                }}
              >
                ← Lounge
              </a>
            </div>
          </motion.div>
        </div>

        {/* ── 1. PRESTIGE IDENTITY ── */}
        <div style={{ padding: "8px 16px 20px" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassCard accent={rc.color} style={{ padding: "24px 20px", textAlign: "center" }}>
              {/* Rank ring */}
              <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 16px" }}>
                <svg width={88} height={88} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                  <circle cx={44} cy={44} r={38} fill="none" stroke="rgba(26,26,27,0.08)" strokeWidth={6} />
                  <motion.circle cx={44} cy={44} r={38} fill="none"
                    stroke={rc.color} strokeWidth={6} strokeLinecap="round"
                    strokeDasharray={`${Math.min(1, xp / 2000) * 238.76} 238.76`}
                    initial={{ strokeDasharray: `0 238.76` }}
                    animate={{ strokeDasharray: `${Math.min(1, xp / 2000) * 238.76} 238.76` }}
                    transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${rc.color}12`, border: `1px solid ${rc.color}28`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RankIcon size={24} color={rc.color} />
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
                Welcome back
              </div>
              <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {name}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 99, background: `${rc.color}12`, border: `1px solid ${rc.color}28`, marginBottom: 12 }}>
                <RankIcon size={11} color={rc.color} />
                <span style={{ fontSize: 11, fontWeight: 700, color: rc.color, letterSpacing: "0.1em" }}>{rank}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim }}>
                {xp.toLocaleString()} XP · synced from your lounge session
              </div>

              {/* Share QR */}
              {selfQr && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.14em" }}>Share your profile</div>
                  <img src={selfQr} alt="QR" style={{ width: 80, height: 80, borderRadius: 8, opacity: 0.8 }} />
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* ── 2. DAILY STREAK ── */}
        <div style={{ padding: "0 16px 20px" }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <GlassCard accent={C.green} style={{ padding: "18px 20px" }}>
              <SectionHeader icon={Bell} label="Daily Streak" color={C.green} />
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
                Get a morning nudge to maintain your prestige streak — exclusive specials, early access, and loyalty bonuses every day you engage.
              </div>
              <AnimatePresence mode="wait">
                {notifState === "granted" ? (
                  <motion.div key="granted"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: `${C.green}0C`, border: `1px solid ${C.green}28` }}>
                    <Check size={16} color={C.green} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Daily streak activated</div>
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>You'll receive a morning reminder each day</div>
                    </div>
                  </motion.div>
                ) : notifState === "denied" ? (
                  <motion.div key="denied"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}>
                    <BellOff size={14} color="#ef4444" />
                    <span style={{ fontSize: 11, color: "#ef4444" }}>Notifications blocked — enable in browser settings to activate streak</span>
                  </motion.div>
                ) : (
                  <motion.button key="idle" whileTap={{ scale: 0.97 }} onClick={requestNotification}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 12, cursor: "pointer",
                      background: `linear-gradient(135deg, ${C.green}18, ${C.green}08)`,
                      border: `1px solid ${C.green}35`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontSize: 13, fontWeight: 600, color: C.green,
                    }}>
                    {notifState === "requesting" ? (
                      <motion.div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.green}40`, borderTopColor: C.green }}
                        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                    ) : <Bell size={15} />}
                    Enable Daily Streak Reminders
                  </motion.button>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        </div>

        {/* ── 3. RETAIL BRIDGE ── */}
        <div style={{ padding: "0 16px 20px" }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <SectionHeader icon={ShoppingBag} label="Take It Home · Retail Bridge" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RETAIL_PRODUCTS.map((p, i) => {
                const PIcon = p.icon;
                return (
                  <motion.a
                    key={p.id} href={p.href} target="_blank" rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 + i * 0.07 }}
                    style={{ textDecoration: "none", display: "block" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <GlassCard accent={p.color} style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}14`, border: `1px solid ${p.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <PIcon size={20} color={p.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: p.color, marginTop: 2, letterSpacing: "0.06em" }}>{p.type}</div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>{p.desc}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: p.color }}>${p.price}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                          <span style={{ fontSize: 10, color: C.dim }}>Shop</span>
                          <ExternalLink size={10} color={C.dim} />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── 4. BOOKING ENGINE ── */}
        <div style={{ padding: "0 16px 20px" }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}>
            <SectionHeader icon={CalendarDays} label="Reserve for Tomorrow" color={C.blue} />
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 14, letterSpacing: "0.03em" }}>
              {tomorrowLabel()} · Early-bird discounts for slow hours
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slots.map((slot, i) => {
                const finalPrice = Math.round(slot.base * (1 - slot.discount / 100));
                const isBooked   = bookedSlot === slot.id;
                const isLow      = slot.avail <= 3;
                return (
                  <motion.button
                    key={slot.id} whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 + i * 0.06 }}
                    onClick={() => setBookedSlot(isBooked ? null : slot.id)}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      padding: "14px 16px", borderRadius: 14,
                      background: isBooked ? `${C.green}0C` : C.surface,
                      border: `1px solid ${isBooked ? `${C.green}35` : C.borderSoft}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: isBooked ? `${C.green}12` : "rgba(26,26,27,0.06)", border: `1px solid ${isBooked ? `${C.green}28` : C.borderSoft}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isBooked ? <Check size={16} color={C.green} /> : <Clock size={14} color={C.muted} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: isBooked ? C.green : C.text }}>{slot.time}</div>
                        <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{slot.label}</div>
                        {isLow && (
                          <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                            <Sparkles size={9} /> {slot.avail} spots left
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isBooked ? C.green : C.text }}>${finalPrice}/pp</div>
                      {slot.discount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 3 }}>
                          <Percent size={9} color={C.gold} />
                          <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>{slot.discount}% early bird</span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {bookedSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  style={{
                    marginTop: 14, padding: "14px 16px", borderRadius: 14,
                    background: `${C.green}0A`, border: `1px solid ${C.green}28`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                  <Check size={18} color={C.green} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Reservation confirmed</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>A confirmation link has been sent · tap to reschedule</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── 5. TRAVEL & LIFESTYLE ── */}
        <div style={{ padding: "0 16px 20px" }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <SectionHeader icon={Plane} label="Travel & Lifestyle · DayOne360" color={C.purple} />
            <motion.a
              href="https://dayone360.com" target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }} whileTap={{ scale: 0.98 }}>
              <GlassCard accent={C.purple} style={{ padding: "0", overflow: "hidden" }}>
                {/* Banner */}
                <div style={{
                  height: 110, position: "relative",
                  background: `linear-gradient(135deg, #1a0a2e 0%, #0d0614 50%, #0e0b18 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${C.purple}18, transparent)` }} />
                  <div style={{ position: "relative", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: C.purple, letterSpacing: "0.12em" }}>DayOne360</div>
                    <div style={{ fontSize: 9, color: "rgba(167,139,250,0.55)", letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 4 }}>
                      Curated Travel · Premium Lounges
                    </div>
                  </div>
                  {/* Star particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div key={i}
                      style={{ position: "absolute", width: 2, height: 2, borderRadius: "50%", background: C.purple,
                        left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%`, opacity: 0.3 + i * 0.08 }}
                      animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.5, 1] }}
                      transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </div>
                {/* Body */}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65, marginBottom: 14 }}>
                    Exclusive getaways paired with premium lounge access. Flights, hotels, and private transfers — all curated for the Axiom lifestyle.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {[
                      { icon: MapPin, text: "Havana Cigar Trail — 5 nights from $1,299" },
                      { icon: Wine,   text: "Scotch Highlands Weekend — Edinburgh from $899" },
                      { icon: Plane,  text: "Miami Members Retreat — seasonal early-bird rates" },
                    ].map((item, i) => {
                      const ItemIcon = item.icon;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ItemIcon size={12} color={C.purple} />
                          <span style={{ fontSize: 11, color: C.muted }}>{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 16px", borderRadius: 12,
                    background: `${C.purple}12`, border: `1px solid ${C.purple}28`,
                    fontSize: 13, fontWeight: 600, color: C.purple,
                  }}>
                    Explore DayOne360 Offers <ChevronRight size={14} />
                  </div>
                </div>
              </GlassCard>
            </motion.a>
          </motion.div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "0 16px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: C.goldDim, letterSpacing: "0.2em" }}>
            NOVEE OS
          </div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 4, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            A luxury experience, elevated
          </div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 8, opacity: 0.5 }}>
            Retail links connect to venue-configured storefronts · Booking subject to availability
          </div>
        </div>

      </div>
    </div>
  );
}
