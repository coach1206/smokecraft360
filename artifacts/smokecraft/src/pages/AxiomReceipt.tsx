/**
 * AxiomReceipt — /receipt/:tabId
 * Cinematic post-payment session summary experience.
 *
 * Shows:
 *  - Guest name + session details
 *  - Items enjoyed + craft groups
 *  - Mentor note + flavor profile
 *  - Loyalty earned + VIP progress
 *  - Return invitation + next session suggestion
 *  - Delivery options: email, SMS, QR, print
 *
 * Visual: OLED black + warm gold cinematic reveal animations.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }          from "framer-motion";
import { useLocation, useParams }           from "wouter";
import QRCode                              from "qrcode";
import {
  ArrowLeft, Star, Gift, Mail, Smartphone, Printer,
  QrCode, CheckCircle, Flame, Coffee, Beer, Wind,
  ChevronRight, Sparkles, Heart, Smartphone as Phone,
} from "lucide-react";
import { useAxiomStore } from "@/store/axiomStore";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:        "#F5F2ED",
  surface:   "rgba(26,26,27,0.06)",
  border:    "rgba(212,139,0,0.18)",
  gold:      "#D48B00",
  goldBright:"#D48B00",
  goldDim:   "rgba(212,139,0,0.35)",
  text:      "rgba(26,26,27,0.90)",
  textMuted: "rgba(240,232,212,0.52)",
  textLight: "rgba(26,26,27,0.72)",
  green:     "#34d399",
  blue:      "#60a5fa",
  amber:     "#f59e0b",
  red:       "#ef4444",
  purple:    "#a78bfa",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
}

async function apiGet<R = any>(path: string): Promise<R> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<R>;
}

async function apiPost<R = any>(path: string, body: unknown = {}): Promise<R> {
  const res = await fetch(path, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<R>;
}

function fmtCents(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}

const CRAFT_ICONS: Record<string, React.ElementType> = {
  smoke: Flame,
  pour:  Coffee,
  brew:  Beer,
  vape:  Wind,
};

const CRAFT_COLORS: Record<string, string> = {
  smoke: "#D48B00",
  pour:  "#60a5fa",
  brew:  "#f59e0b",
  vape:  "#a78bfa",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceiptPayload {
  receiptVersion: string;
  tabId:          string;
  generatedAt:    string;
  guest: {
    name:       string;
    atmosphere: string | null;
    boldness:   string | null;
    mentorId:   string | null;
  };
  venue: { name: string; id: string };
  session: {
    date:              string;
    paidAt:            string | null;
    tableNumber:       string | null;
    craftGroups:       Record<string, string[]>;
    totalCents:        number;
    subtotalCents:     number;
    discountCents:     number;
    loyaltyCreditsUsed:number;
  };
  items: Array<{ name: string; craftType: string | null; quantity: number; unitCents: number; totalCents: number }>;
  loyalty: { pointsBalance: number; pointsEarned: number };
  continuity: {
    mentorNote:           string;
    returnRecommendation: string;
    returnGuestReward:    string;
    nextSessionTheme:     string;
    flavorProfile:        { atmosphere: string; boldness: string };
  };
}

// ── Small atoms ───────────────────────────────────────────────────────────────

function GlassCard({ children, style, glow }: {
  children: React.ReactNode; style?: React.CSSProperties; glow?: string;
}) {
  return (
    <div style={{
      background:   T.surface,
      border:       `1px solid ${T.border}`,
      borderRadius: 14,
      backdropFilter: "blur(12px)",
      boxShadow: glow
        ? `0 0 28px ${glow}22, inset 0 1px 0 rgba(26,26,27,0.07)`
        : "inset 0 1px 0 rgba(26,26,27,0.07)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function DividerLine() {
  return <div style={{ height: 1, background: T.border, margin: "16px 0", opacity: 0.6 }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, color: T.textMuted,
      textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ── Reveal animation wrapper ──────────────────────────────────────────────────

function RevealBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Delivery modal ────────────────────────────────────────────────────────────

function DeliveryModal({
  tabId,
  qrToken,
  onClose,
}: {
  tabId:   string;
  qrToken: string | null;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<"email" | "sms" | "print" | "qr" | null>(null);
  const [address, setAddress] = useState("");
  const [sent, setSent]       = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  const deliver = async () => {
    if (!channel || channel === "qr") return;
    setBusy(true);
    try {
      await apiPost(`/api/receipts/${tabId}/deliver`, { channel, address: address || undefined });
      setSent(channel);
    } catch { /* silent */ }
    setBusy(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(26,26,27,0.42)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        style={{
          background: "#0e0b14", border: `1px solid ${T.border}`,
          borderRadius: 18, padding: "28px 24px", maxWidth: 380, width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: T.gold, marginBottom: 4, fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.06em" }}>
          Receive Your Receipt
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 20 }}>
          Choose how to save your Axiom session summary.
        </div>

        {sent ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.green }}>
            <CheckCircle size={18} />
            <span style={{ fontSize: 13 }}>
              {sent === "email" ? "Email on its way" : sent === "sms" ? "SMS sent" : "Print job sent"}
            </span>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {([
                { key: "email", label: "Email", icon: Mail,        placeholder: "your@email.com" },
                { key: "sms",   label: "SMS",   icon: Smartphone,  placeholder: "+1 (555) 000-0000" },
                { key: "print", label: "Print", icon: Printer,     placeholder: null },
                { key: "qr",    label: "QR Code",icon: QrCode,     placeholder: null },
              ] as const).map(({ key, label, icon: Icon, placeholder }) => (
                <button
                  key={key}
                  onClick={() => setChannel(key === channel ? null : key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10,
                    background:  channel === key ? `${T.gold}18` : "transparent",
                    border:     `1px solid ${channel === key ? T.gold : T.border}`,
                    color:       channel === key ? T.gold : T.text,
                    cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {channel === "qr" && qrToken && (
              <div style={{ textAlign: "center", padding: "12px 0", color: T.textMuted, fontSize: 11 }}>
                QR token: <span style={{ fontFamily: "monospace", color: T.gold }}>{qrToken}</span>
                <br />Share this token for guest self-retrieval.
              </div>
            )}

            {(channel === "email" || channel === "sms") && (
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={channel === "email" ? "your@email.com" : "+1 (555) 000-0000"}
                style={{
                  width: "100%", background: "rgba(26,26,27,0.07)",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  color: T.text, fontSize: 12, padding: "9px 12px",
                  outline: "none", boxSizing: "border-box", marginBottom: 12,
                }}
              />
            )}

            {channel && channel !== "qr" && (
              <button
                onClick={deliver}
                disabled={busy}
                style={{
                  width: "100%", padding: "10px 0",
                  background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`,
                  border: "none", borderRadius: 9, color: "#F5F2ED",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? "Sending…" : "Send Receipt"}
              </button>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Craft group row ───────────────────────────────────────────────────────────

function CraftGroupRow({ craft, items }: { craft: string; items: string[] }) {
  const Icon  = CRAFT_ICONS[craft] ?? Flame;
  const color = CRAFT_COLORS[craft] ?? T.gold;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${color}18`, border: `1px solid ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={13} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 3 }}>
          {craft.charAt(0).toUpperCase() + craft.slice(1)}
        </div>
        <div style={{ fontSize: 12, color: T.textLight }}>
          {items.join(" · ")}
        </div>
      </div>
    </div>
  );
}

// ── Loyalty bar ───────────────────────────────────────────────────────────────

function LoyaltyBar({ balance, earned }: { balance: number; earned: number }) {
  const tierMax = 5000;
  const pct = Math.min((balance / tierMax) * 100, 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: T.textMuted }}>Loyalty Balance</span>
        <span style={{ fontSize: 11, color: T.gold, fontWeight: 600 }}>
          {balance.toLocaleString()} pts
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(26,26,27,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", background: `linear-gradient(90deg, ${T.gold}, ${T.goldBright})`, borderRadius: 2 }}
        />
      </div>
      {earned > 0 && (
        <div style={{ fontSize: 10, color: T.green, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
          <Sparkles size={10} />
          +{earned} points earned this session
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AxiomReceipt() {
  const { tabId }     = useParams<{ tabId: string }>();
  const [, navigate]  = useLocation();
  const [payload, setPayload] = useState<ReceiptPayload | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showDelivery,  setShowDelivery]  = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [mobileQrUrl,  setMobileQrUrl]  = useState<string>("");
  const { rank, xp } = useAxiomStore();

  const load = useCallback(async () => {
    if (!tabId) return;
    try {
      // Try to fetch existing receipt
      const data = await apiGet<{ receipt: { payload: ReceiptPayload; qrToken: string | null } }>(
        `/api/receipts/${tabId}`,
      );
      setPayload(data.receipt.payload);
      setQrToken(data.receipt.qrToken);
    } catch (err: any) {
      if (err.message === "404") {
        // Auto-generate
        try {
          setGenerating(true);
          const gen = await apiPost<{ receipt: { payload: ReceiptPayload; qrToken: string | null } }>(
            `/api/receipts/${tabId}/generate`,
          );
          setPayload(gen.receipt.payload);
          setQrToken(gen.receipt.qrToken);
        } catch {
          setError("Unable to generate receipt for this tab.");
        }
        setGenerating(false);
      } else {
        setError("Unable to load receipt.");
      }
    }
    setLoading(false);
  }, [tabId]);

  useEffect(() => { void load(); }, [load]);

  const handleExportPDF = useCallback(() => {
    if (!payload) return;
    setPdfExporting(true);
    const refId        = (qrToken ?? tabId ?? "NOVEE-0000").toUpperCase();
    const guestDisplay = payload.guest.name || "Sovereign Guest";
    const venueName    = payload.venue.name;
    const dateStr      = new Date(payload.session.date).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    const totalStr = `$${(payload.session.totalCents / 100).toFixed(2)}`;
    const itemRows = payload.items.map((it) =>
      `<tr>
        <td style="padding:7px 0;border-bottom:1px solid #e8e4d9;font-size:12px;color:#1a1a1b;">${it.name}</td>
        <td style="padding:7px 0;border-bottom:1px solid #e8e4d9;font-size:12px;color:#6b5e4e;text-align:center;">${it.quantity}</td>
        <td style="padding:7px 0;border-bottom:1px solid #e8e4d9;font-size:12px;color:#1a1a1b;text-align:right;">$${(it.totalCents / 100).toFixed(2)}</td>
      </tr>`,
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Sovereign Receipt · ${refId}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Space+Mono&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 28mm 20mm 24mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #F5F2ED; color: #1A1A1B;
    font-family: 'Space Mono', monospace; font-size: 11px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* Diagonal watermark */
  body::before {
    content: 'VILLA SOVEREIGN';
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-38deg);
    font-family: 'Cormorant Garamond', serif;
    font-size: 82px; font-weight: 700; letter-spacing: 0.12em;
    color: rgba(212,139,0,0.06);
    white-space: nowrap; pointer-events: none; z-index: 0;
  }
  .page { position: relative; z-index: 1; }
  .serif { font-family: 'Cormorant Garamond', serif; }
  .gold  { color: #D48B00; }
  .muted { color: #6B5E4E; }

  /* Header */
  .header { text-align: center; padding-bottom: 28px; border-bottom: 1px solid #D48B0033; margin-bottom: 28px; }
  .logo { font-family: 'Cormorant Garamond', serif; font-size: 38px; font-weight: 300; color: #1A1A1B; letter-spacing: 0.14em; }
  .logo span { color: #D48B00; }
  .tagline { font-size: 8px; letter-spacing: 0.28em; color: #6B5E4E; margin-top: 4px; text-transform: uppercase; }

  /* Reference ID box */
  .ref-box {
    border: 1px solid #D48B0055; border-radius: 10px;
    padding: 16px 20px; margin-bottom: 28px;
    background: rgba(212,139,0,0.04);
    display: flex; justify-content: space-between; align-items: center;
  }
  .ref-label { font-size: 8px; letter-spacing: 0.22em; color: #D48B00; text-transform: uppercase; margin-bottom: 4px; }
  .ref-id { font-family: 'Space Mono', monospace; font-size: 15px; color: #1A1A1B; letter-spacing: 0.12em; }
  .ref-meta { font-size: 9px; color: #6B5E4E; text-align: right; line-height: 1.7; }

  /* Guest + venue */
  .guest-name { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; color: #1A1A1B; margin-bottom: 2px; }
  .venue-line { font-size: 9px; color: #6B5E4E; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 24px; }

  /* Items table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { font-size: 8px; letter-spacing: 0.18em; color: #6B5E4E; text-transform: uppercase; padding: 0 0 8px; border-bottom: 1px solid #D48B0033; }
  th:last-child { text-align: right; }
  th:nth-child(2) { text-align: center; }

  .total-row { margin-top: 12px; padding-top: 12px; border-top: 1px solid #D48B0033; display: flex; justify-content: space-between; }
  .total-label { font-size: 10px; letter-spacing: 0.12em; color: #6B5E4E; text-transform: uppercase; }
  .total-value { font-size: 18px; font-family: 'Cormorant Garamond', serif; font-weight: 700; color: #D48B00; }

  /* Footer */
  .footer { margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #D48B0022; }
  .footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 16px; letter-spacing: 0.22em; color: #D48B0066; }
  .footer-sub { font-size: 7px; letter-spacing: 0.14em; color: #6B5E4E99; margin-top: 4px; text-transform: uppercase; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">NOVEE <span>OS</span></div>
    <div class="tagline">Villa Sovereign · Dominican Republic Private Reserve</div>
  </div>

  <div class="ref-box">
    <div>
      <div class="ref-label">Sovereign Reference ID</div>
      <div class="ref-id">${refId}</div>
    </div>
    <div class="ref-meta">
      ${dateStr}<br />
      ${venueName}
    </div>
  </div>

  <div class="guest-name">${guestDisplay}</div>
  <div class="venue-line">${venueName} · Sovereign Guest Receipt</div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Experience</th>
        <th>Qty</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>${itemRows || '<tr><td colspan="3" style="padding:12px 0;color:#6B5E4E;font-size:11px;">No items recorded</td></tr>'}</tbody>
  </table>

  <div class="total-row">
    <span class="total-label">Session Total</span>
    <span class="total-value">${totalStr}</span>
  </div>

  <div class="footer">
    <div class="footer-logo">VILLA SOVEREIGN</div>
    <div class="footer-sub">A luxury experience, elevated · novee.os</div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); window.close(); }, 600);
  };
</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=820,height=1100");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    setTimeout(() => setPdfExporting(false), 1500);
  }, [payload, qrToken, tabId]);

  useEffect(() => {
    if (!payload) return;
    const guestName = encodeURIComponent(payload.guest.name ?? "Guest");
    const hubUrl = `${window.location.origin}/mobile-hub?rank=${encodeURIComponent(rank)}&xp=${xp}&name=${guestName}`;
    QRCode.toDataURL(hubUrl, {
      width: 180, margin: 1,
      color: { dark: "C9A84C", light: "06040a" },
    }).then(setMobileQrUrl).catch(() => {});
  }, [payload, rank, xp]);

  if (loading || generating) {
    return (
      <div style={{
        minHeight: "100vh", background: T.bg,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", color: T.gold, letterSpacing: "0.12em" }}
        >
          AXIOM
        </motion.div>
        <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {generating ? "Composing your experience summary…" : "Loading…"}
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: T.textMuted }}>
          <div style={{ fontSize: 13, marginBottom: 16 }}>{error ?? "Receipt not found"}</div>
          <button onClick={() => navigate("/")} style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8,
            color: T.textMuted, fontSize: 11, padding: "8px 16px", cursor: "pointer",
          }}>
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const p = payload;
  const sessionDate = new Date(p.session.date);
  const craftEntries = Object.entries(p.session.craftGroups);

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "'Inter', 'SF Pro Display', sans-serif",
    }}>
      {/* ── Ambient top glow ── */}
      <div style={{
        position: "fixed", top: -80, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 200, background: `radial-gradient(ellipse, ${T.goldDim} 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "12px 20px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={() => navigate("/")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.textMuted, fontSize: 11,
          padding: "6px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={12} /> Home
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: T.gold,
            textTransform: "uppercase", letterSpacing: "0.16em",
          }}>
            AXIOM SESSION SUMMARY
          </div>
          <div style={{ fontSize: 10, color: T.textMuted }}>
            {p.venue.name} · {sessionDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <button
          onClick={() => setShowDelivery(true)}
          style={{
            background: `${T.gold}18`, border: `1px solid ${T.goldDim}`,
            borderRadius: 8, color: T.gold, fontSize: 11, fontWeight: 600,
            padding: "7px 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <QrCode size={12} /> Share
        </button>
        <button
          onClick={handleExportPDF}
          disabled={pdfExporting || !payload}
          style={{
            background:    pdfExporting ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.14)",
            border:        "1px solid rgba(201,168,76,0.55)",
            borderRadius:  8,
            color:         pdfExporting ? "rgba(201,168,76,0.45)" : "#C9A84C",
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: "0.10em",
            padding:       "7px 14px",
            cursor:        pdfExporting || !payload ? "default" : "pointer",
            display:       "flex",
            alignItems:    "center",
            gap:           5,
            transition:    "all 0.2s",
          }}
        >
          {pdfExporting ? "…" : "◈ PDF"}
        </button>
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 540, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Hero: guest greeting ── */}
        <RevealBlock delay={0.1}>
          <div style={{ textAlign: "center", marginBottom: 32, paddingTop: 8 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: `radial-gradient(circle, ${T.goldDim} 0%, transparent 70%)`,
                border: `1px solid ${T.goldDim}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Star size={22} color={T.gold} fill={T.gold} />
            </motion.div>
            <div style={{ fontSize: 26, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: T.gold, letterSpacing: "0.04em", marginBottom: 4 }}>
              {p.guest.name}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted }}>
              Your Experience Tonight at {p.venue.name}
            </div>
          </div>
        </RevealBlock>

        {/* ── Session details card ── */}
        <RevealBlock delay={0.25}>
          <GlassCard glow={T.gold} style={{ padding: "20px 22px", marginBottom: 14 }}>
            <SectionLabel>Your Experience Tonight</SectionLabel>

            {craftEntries.length > 0 ? (
              craftEntries.map(([craft, items]) => (
                <CraftGroupRow key={craft} craft={craft} items={items} />
              ))
            ) : (
              <div style={{ fontSize: 12, color: T.textMuted }}>No items recorded</div>
            )}

            {p.session.tableNumber && (
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 10 }}>
                Table {p.session.tableNumber}
              </div>
            )}
          </GlassCard>
        </RevealBlock>

        {/* ── Payment summary ── */}
        <RevealBlock delay={0.35}>
          <GlassCard style={{ padding: "18px 22px", marginBottom: 14 }}>
            <SectionLabel>Session Total</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>Subtotal</span>
                <span style={{ fontSize: 11, color: T.text }}>{fmtCents(p.session.subtotalCents)}</span>
              </div>
              {p.session.discountCents > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: T.textMuted }}>Discount</span>
                  <span style={{ fontSize: 11, color: T.green }}>−{fmtCents(p.session.discountCents)}</span>
                </div>
              )}
              {p.session.loyaltyCreditsUsed > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: T.textMuted }}>Loyalty Credits</span>
                  <span style={{ fontSize: 11, color: T.gold }}>−{p.session.loyaltyCreditsUsed} pts</span>
                </div>
              )}
              <DividerLine />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>Total Paid</span>
                <span style={{ fontSize: 14, color: T.gold, fontWeight: 700 }}>{fmtCents(p.session.totalCents)}</span>
              </div>
            </div>
          </GlassCard>
        </RevealBlock>

        {/* ── Loyalty ── */}
        <RevealBlock delay={0.45}>
          <GlassCard glow={T.green} style={{ padding: "18px 22px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Gift size={14} color={T.green} />
              <SectionLabel>Loyalty & Rewards</SectionLabel>
            </div>
            <LoyaltyBar balance={p.loyalty.pointsBalance} earned={p.loyalty.pointsEarned} />
          </GlassCard>
        </RevealBlock>

        {/* ── Mentor note ── */}
        <RevealBlock delay={0.55}>
          <GlassCard glow={T.purple} style={{ padding: "18px 22px", marginBottom: 14 }}>
            <SectionLabel>Mentor Notes</SectionLabel>
            <div style={{
              fontSize: 13, color: T.textLight, fontStyle: "italic",
              fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.7,
              letterSpacing: "0.02em",
            }}>
              "{p.continuity.mentorNote}"
            </div>
            {p.guest.atmosphere && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <span style={{
                  fontSize: 9, color: T.purple, border: `1px solid ${T.purple}40`,
                  borderRadius: 4, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.1em",
                }}>
                  {p.guest.atmosphere}
                </span>
                {p.guest.boldness && (
                  <span style={{
                    fontSize: 9, color: T.gold, border: `1px solid ${T.goldDim}`,
                    borderRadius: 4, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.1em",
                  }}>
                    {p.guest.boldness}
                  </span>
                )}
              </div>
            )}
          </GlassCard>
        </RevealBlock>

        {/* ── Return invitation ── */}
        <RevealBlock delay={0.65}>
          <GlassCard glow={T.gold} style={{ padding: "20px 22px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Heart size={13} color={T.gold} fill={T.gold} />
              <SectionLabel>Your Return Invitation</SectionLabel>
            </div>

            <div style={{ fontSize: 13, color: T.textLight, lineHeight: 1.65, marginBottom: 14 }}>
              {p.continuity.returnRecommendation}
            </div>

            <div style={{
              background: `${T.gold}0d`, border: `1px solid ${T.goldDim}`,
              borderRadius: 9, padding: "11px 14px", marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>
                Return Guest Reward
              </div>
              <div style={{ fontSize: 12, color: T.textLight }}>{p.continuity.returnGuestReward}</div>
            </div>

            <div style={{
              background: `${T.purple}0d`, border: `1px solid ${T.purple}30`,
              borderRadius: 9, padding: "11px 14px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.purple, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>
                Upcoming Event
              </div>
              <div style={{ fontSize: 12, color: T.textLight }}>{p.continuity.nextSessionTheme}</div>
            </div>
          </GlassCard>
        </RevealBlock>

        {/* ── Based on your preferences ── */}
        <RevealBlock delay={0.75}>
          <GlassCard style={{ padding: "18px 22px", marginBottom: 24 }}>
            <SectionLabel>Based on Your Preferences</SectionLabel>
            <div style={{ fontSize: 12, color: T.textLight, lineHeight: 1.65 }}>
              Your palate profile — <span style={{ color: T.gold }}>{p.continuity.flavorProfile.atmosphere}</span> atmosphere,
              {" "}<span style={{ color: T.gold }}>{p.continuity.flavorProfile.boldness}</span> boldness — has been updated.
              Your Axiom guide will use this on your next visit to craft a personalized journey.
            </div>
          </GlassCard>
        </RevealBlock>

        {/* ── Delivery CTA ── */}
        <RevealBlock delay={0.85}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { icon: Mail,       label: "Email",    ch: "email" },
              { icon: Smartphone, label: "SMS",      ch: "sms"   },
              { icon: Printer,    label: "Print",    ch: "print" },
              { icon: QrCode,     label: "QR Code",  ch: "qr"    },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => setShowDelivery(true)}
                style={{
                  flex: 1, minWidth: 80,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  padding: "12px 10px",
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 10, color: T.textMuted, fontSize: 10, fontWeight: 500,
                  cursor: "pointer", transition: "border-color 0.15s",
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </RevealBlock>

        {/* ── Continue Experience — QR portal to MobileHub ── */}
        <RevealBlock delay={0.95}>
          <div style={{
            margin: "0 0 20px",
            borderRadius: 18,
            overflow: "hidden",
            background: "rgba(26,26,27,0.05)",
            border: "1px solid rgba(212,139,0,0.18)",
            boxShadow: "0 0 32px rgba(212,139,0,0.08), inset 0 1px 0 rgba(26,26,27,0.06)",
          }}>
            {/* Header band */}
            <div style={{
              padding: "14px 20px",
              background: "linear-gradient(135deg, rgba(212,139,0,0.10), rgba(212,139,0,0.04))",
              borderBottom: "1px solid rgba(212,139,0,0.12)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Phone size={14} color={T.gold} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.gold, letterSpacing: "0.06em" }}>Continue Your Experience</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>Shop · Book · Explore — anytime, anywhere</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "18px 20px", display: "flex", gap: 18, alignItems: "center" }}>
              {/* QR code */}
              <div style={{ flexShrink: 0 }}>
                {mobileQrUrl ? (
                  <div style={{ padding: 8, borderRadius: 10, background: "#F5F2ED", border: "1px solid rgba(212,139,0,0.20)" }}>
                    <img src={mobileQrUrl} alt="Mobile Hub QR" style={{ width: 100, height: 100, display: "block", borderRadius: 4 }} />
                  </div>
                ) : (
                  <div style={{ width: 116, height: 116, borderRadius: 10, background: "rgba(212,139,0,0.04)", border: "1px solid rgba(212,139,0,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <motion.div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(212,139,0,0.2)", borderTopColor: T.gold }}
                      animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                  </div>
                )}
              </div>

              {/* Copy */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
                  Scan to open your <span style={{ color: T.gold, fontWeight: 600 }}>Axiom Mobile Hub</span> — your prestige rank and XP are encoded in the link.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "Shop cigars & spirits for home delivery",
                    "Book tomorrow's session — early-bird rates",
                    "Explore DayOne360 travel & lifestyle offers",
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.gold, marginTop: 5, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 9, color: T.textMuted, opacity: 0.6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Rank · {rank} &nbsp;·&nbsp; {xp.toLocaleString()} XP synced
                </div>
              </div>
            </div>
          </div>
        </RevealBlock>

        {/* ── Footer signature ── */}
        <RevealBlock delay={1.0}>
          <div style={{ textAlign: "center", marginTop: 36, paddingBottom: 32 }}>
            <div style={{
              fontSize: 18, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
              color: T.goldDim, letterSpacing: "0.2em",
            }}>
              AXIOM OS
            </div>
            <div style={{ fontSize: 9, color: T.textMuted, marginTop: 4, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              A luxury experience, elevated
            </div>
          </div>
        </RevealBlock>
      </div>

      {/* ── Delivery modal ── */}
      <AnimatePresence>
        {showDelivery && (
          <DeliveryModal
            tabId={tabId!}
            qrToken={qrToken}
            onClose={() => setShowDelivery(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
