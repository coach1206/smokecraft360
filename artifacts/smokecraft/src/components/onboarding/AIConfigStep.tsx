import { useLocation } from "wouter";
import { motion }       from "framer-motion";
import {
  Brain, CheckCircle2, ChevronRight, Server,
  Shield, Zap, ExternalLink, Lock,
} from "lucide-react";

const C = {
  bg:     "#F5F2ED",
  gold:   "#D48B00",
  text:   "#1A1A1B",
  muted:  "rgba(26,26,27,0.48)",
  dim:    "rgba(26,26,27,0.30)",
  card:   "rgba(26,26,27,0.05)",
  border: "rgba(26,26,27,0.10)",
  green:  "#22c55e",
  purple: "#a78bfa",
  blue:   "#5b8def",
};

type AiMode = "managed" | "byok";

interface Props {
  pricingTier: string;
  aiMode:      string;
  onModeChange:(mode: AiMode) => void;
}

type PkgKey = "core" | "pro" | "xei" | "black";

const PKG_MAP: Record<string, PkgKey> = {
  budget:  "core",
  mid:     "pro",
  premium: "xei",
  luxury:  "black",
};

const PKG_INFO: Record<PkgKey, { label: string; color: string; canBYOK: boolean; desc: string }> = {
  core:  { label: "AXIOM CORE",  color: C.blue,   canBYOK: false, desc: "Managed AI fully included · no provider account needed" },
  pro:   { label: "AXIOM PRO",   color: C.green,  canBYOK: false, desc: "Managed AI fully included · optimized for scale" },
  xei:   { label: "AXIOM XEI",   color: C.purple, canBYOK: true,  desc: "Enterprise tier · BYOK unlocked · full provider control" },
  black: { label: "AXIOM BLACK", color: C.gold,   canBYOK: true,  desc: "Sovereign tier · unlimited BYOK · dedicated infrastructure" },
};

const MODE_OPTIONS: { id: AiMode; label: string; sub: string; icon: typeof Brain; color: string }[] = [
  {
    id:    "managed",
    label: "Managed AI — Included with Axiom",
    sub:   "Axiom hosts, routes, and bills all AI. No provider account required. Usage metered by plan.",
    icon:  Shield,
    color: C.green,
  },
  {
    id:    "byok",
    label: "Bring Your Own AI — BYOK",
    sub:   "Connect your own OpenAI / Anthropic / Gemini key. You own the billing, usage limits, and provider relationship.",
    icon:  Server,
    color: C.purple,
  },
];

export default function AIConfigStep({ pricingTier, aiMode, onModeChange }: Props) {
  const [, navigate] = useLocation();
  const pkg  = PKG_MAP[pricingTier] ?? "core";
  const info = PKG_INFO[pkg];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Package badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px", borderRadius: 12,
        background: `${info.color}0c`, border: `1px solid ${info.color}28`,
      }}>
        <Brain size={18} color={info.color} />
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: info.color, letterSpacing: "0.20em", textTransform: "uppercase" }}>
            DETECTED PACKAGE
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: info.color }}>{info.label}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{info.desc}</div>
        </div>
      </div>

      {/* Mode selection */}
      <div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          {info.canBYOK ? "Choose Your AI Ownership Model" : "AI Ownership Model"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MODE_OPTIONS.map((opt) => {
            const Icon     = opt.icon;
            const selected = aiMode === opt.id;
            const locked   = opt.id === "byok" && !info.canBYOK;

            return (
              <motion.button
                key={opt.id}
                whileTap={locked ? {} : { scale: 0.98 }}
                onClick={() => { if (!locked) onModeChange(opt.id); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "16px", borderRadius: 12, cursor: locked ? "not-allowed" : "pointer",
                  background: selected ? `${opt.color}10` : C.card,
                  border: `2px solid ${selected ? opt.color : C.border}`,
                  textAlign: "left", opacity: locked ? 0.45 : 1,
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `${opt.color}12`, border: `1px solid ${opt.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {locked ? <Lock size={16} color={C.dim} /> : <Icon size={18} color={opt.color} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: selected ? opt.color : C.text }}>{opt.label}</span>
                    {selected && <CheckCircle2 size={14} color={opt.color} />}
                    {locked && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: C.muted,
                        padding: "2px 7px", borderRadius: 4,
                        background: C.card, border: `1px solid ${C.border}`,
                        letterSpacing: "0.14em", textTransform: "uppercase",
                      }}>
                        XEI / BLACK
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{opt.sub}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Responsibility row */}
      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: aiMode === "managed"
          ? "rgba(34,197,94,0.06)"
          : "rgba(167,139,250,0.06)",
        border: `1px solid ${aiMode === "managed" ? "rgba(34,197,94,0.2)" : "rgba(167,139,250,0.2)"}`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
          Responsibility Summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6, columnGap: 16 }}>
          {[
            ["AI Infrastructure",       aiMode === "managed" ? "AXIOM"  : "YOU"],
            ["API Key Management",       aiMode === "managed" ? "AXIOM"  : "YOU"],
            ["Provider Billing",         aiMode === "managed" ? "AXIOM"  : "YOU"],
            ["Usage Caps",               aiMode === "managed" ? "AXIOM CAPS" : "YOUR CAPS"],
            ["Failover / Routing",       aiMode === "managed" ? "AXIOM"  : "AXIOM + YOURS"],
          ].map(([label, owner]) => (
            <div key={label} style={{ display: "contents" }}>
              <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
              <span style={{
                fontSize: 10, fontWeight: 800,
                color: owner === "AXIOM" ? C.green : owner.startsWith("AXIOM") ? C.blue : C.gold,
                textAlign: "right", letterSpacing: "0.08em",
              }}>
                {owner}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Configure CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/enterprise/ai-config")}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderRadius: 12, cursor: "pointer",
          background: `linear-gradient(135deg, ${C.gold}18, ${C.gold}08)`,
          border: `1px solid ${C.gold}35`, color: C.gold,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={16} color={C.gold} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Configure Your Intelligence Infrastructure</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              Full provider setup, API keys, failover chain, usage limits
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ExternalLink size={13} color={C.gold} />
          <ChevronRight size={14} color={C.gold} />
        </div>
      </motion.button>

    </div>
  );
}
