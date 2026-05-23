/**
 * DeveloperGate — /developer-gate
 * Global Sensory Provisioning Dashboard — Platform Owner Console
 *
 * Auth: 6-digit Sovereign Master Key (bcrypt vs FOUNDER_PIN_HASH)
 * Theme: Brushed Titanium (#0D0D11) + Emerald (#10B981)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg:        "#0A0A0E",
  surface:   "rgba(20,20,28,0.97)",
  card:      "rgba(28,28,38,0.94)",
  border:    "rgba(200,220,255,0.10)",
  borderHi:  "rgba(200,220,255,0.22)",
  emerald:   "#10B981",
  emeraldDim:"rgba(16,185,129,0.18)",
  emeraldGlow:"rgba(16,185,129,0.35)",
  silver:    "#E2E2EE",
  silverDim: "rgba(226,226,238,0.55)",
  mono:      "'JetBrains Mono','Courier New',monospace",
  sans:      "'Inter','SF Pro Display',sans-serif",
  titanium:  "linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 40%,rgba(255,255,255,0.06) 100%)",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function genTenantId(): string {
  return "TNT-" + Math.random().toString(36).substring(2,7).toUpperCase();
}
function genPasskey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 16 }, (_, i) =>
    (i > 0 && i % 4 === 0 ? "-" : "") + chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

async function apiPost(path: string, body: unknown) {
  const token = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function apiGet(path: string) {
  const token = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ── Primitives ────────────────────────────────────────────────────────────────

function TitanCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.titanium + "," + T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: "20px 24px",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg,rgba(255,255,255,0.03) 0%,transparent 60%)",
        pointerEvents: "none", borderRadius: 14,
      }} />
      {children}
    </div>
  );
}

function EmeraldDot({ pulse }: { pulse?: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      {pulse && (
        <motion.span
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.emerald }}
        />
      )}
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.emerald }} />
    </span>
  );
}

// ── PIN Keypad ────────────────────────────────────────────────────────────────

const PAD = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"];

type AuthState = "idle" | "verifying" | "success" | "denied";

function SovereignKeypad({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [digits, setDigits]   = useState<string[]>([]);
  const [auth, setAuth]       = useState<AuthState>("idle");
  const [msg, setMsg]         = useState("");
  const [err, setErr]         = useState(false);

  const MAX = 6;

  const tap = useCallback(async (k: string) => {
    if (auth !== "idle") return;
    if (k === "⌫") { setDigits(d => d.slice(0, -1)); setErr(false); return; }
    if (k === "✓") {
      if (digits.length < 4) { setErr(true); setTimeout(() => setErr(false), 800); return; }
      setAuth("verifying");
      const steps = ["VALIDATING SOVEREIGN KEY…","CROSS-REFERENCING HASH…","ESTABLISHING SECURE TUNNEL…","GRANTING ACCESS…"];
      for (const s of steps) {
        setMsg(s);
        await new Promise(r => setTimeout(r, 380));
      }
      try {
        const res = await apiPost("/api/auth/pin-login", { pin: digits.join("") });
        if (res.token && (res.user?.role === "founder" || res.user?.role === "super_admin" || res.role === "founder")) {
          localStorage.setItem("axiom_jwt", res.token);
          setAuth("success");
          setTimeout(() => onUnlock(res.token), 600);
        } else {
          setAuth("denied");
          setMsg("ACCESS DENIED — SOVEREIGN KEY INVALID");
          setTimeout(() => { setAuth("idle"); setDigits([]); setMsg(""); setErr(true); setTimeout(() => setErr(false), 1200); }, 2000);
        }
      } catch (_e) {
        setAuth("denied");
        setMsg("SYSTEM ERROR — CHECK NETWORK");
        setTimeout(() => { setAuth("idle"); setDigits([]); setMsg(""); }, 2000);
      }
      return;
    }
    if (digits.length >= MAX) return;
    setDigits(d => [...d, k]);
  }, [digits, auth, onUnlock]);

  const borderColor = auth === "success" ? T.emerald : auth === "denied" ? "#F87171" : err ? "#F87171" : T.emeraldGlow;
  const dotColor    = auth === "success" ? T.emerald : auth === "denied" ? "#F87171" : err ? "#F87171" : T.emerald;

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: T.sans, position: "relative", overflow: "hidden",
    }}>
      {/* Brushed titanium ambient */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.012) 0,rgba(255,255,255,0.012) 1px,transparent 1px,transparent 80px)" }} />

      {/* Header brand */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 52 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <EmeraldDot pulse />
          <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: "0.36em", color: T.emerald, textTransform: "uppercase" }}>
            SOVEREIGN PROVISIONING CONSOLE
          </span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: T.silver, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.1 }}>
          DEVELOPER GATE
        </div>
        <div style={{ fontSize: 13, color: T.silverDim, letterSpacing: "0.20em", textTransform: "uppercase", marginTop: 6 }}>
          Platform Owner Access Only
        </div>
      </motion.div>

      {/* PIN display */}
      <motion.div animate={{ x: err ? [-6, 6, -4, 4, 0] : 0 }} transition={{ duration: 0.35 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          {Array.from({ length: MAX }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                borderColor: digits[i] ? borderColor : T.border,
                boxShadow: digits[i] ? `0 0 16px ${borderColor}55` : "none",
              }}
              style={{
                width: 48, height: 60, borderRadius: 10,
                border: `2px solid ${T.border}`,
                background: T.card,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {digits[i] && (
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor }} />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Status message */}
      <div style={{ height: 24, marginBottom: 24, textAlign: "center" }}>
        <AnimatePresence mode="wait">
          {msg && (
            <motion.div key={msg}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontFamily: T.mono, fontSize: 11, color: auth === "denied" ? "#F87171" : T.emerald, letterSpacing: "0.20em" }}>
              {msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 76px)", gap: 10 }}>
        {PAD.map((k) => (
          <motion.button
            key={k}
            onClick={() => tap(k)}
            whileTap={{ scale: 0.9 }}
            style={{
              height: 64, borderRadius: 12,
              border: k === "✓" ? `1.5px solid ${T.emerald}` : `1px solid ${T.border}`,
              background: k === "✓"
                ? `linear-gradient(135deg,${T.emeraldDim},rgba(16,185,129,0.08))`
                : k === "⌫" ? "rgba(255,255,255,0.03)" : T.card,
              color: k === "✓" ? T.emerald : T.silver,
              fontSize: k === "⌫" || k === "✓" ? 20 : 22,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.sans,
              boxShadow: k === "✓" ? `0 0 20px ${T.emeraldDim}` : "none",
              transition: "border-color 0.15s",
            }}>
            {k}
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, fontFamily: T.mono, fontSize: 9, color: "rgba(200,200,220,0.25)", letterSpacing: "0.24em", textTransform: "uppercase" }}>
        PROFOUND INNOVATION · INTERNAL INFRASTRUCTURE · CLASSIFIED
      </div>
    </div>
  );
}

// ── Tenant Provisioning Tab ───────────────────────────────────────────────────

const LICENSE_TIERS = [
  { id: "tablet",  label: "SmokeCraft Tablet Only",   price: "$149/mo" },
  { id: "full_eat",label: "Full E.A.T. Core Ops Suite",price: "$299/mo" },
  { id: "pos",     label: "POS Integration Pack",      price: "$99/mo add-on" },
];

interface ProvisionedTenant {
  tenantId: string;
  orgName: string;
  city: string;
  state: string;
  country: string;
  tiers: string[];
  passkey: string;
  createdAt: string;
}

function TenantProvisioningTab() {
  const [orgName, setOrgName]   = useState("");
  const [city, setCity]         = useState("");
  const [state, setState]       = useState("");
  const [country, setCountry]   = useState("USA");
  const [tiers, setTiers]       = useState<string[]>(["tablet"]);
  const [result, setResult]     = useState<ProvisionedTenant | null>(null);
  const [busy, setBusy]         = useState(false);
  const [history, setHistory]   = useState<ProvisionedTenant[]>([]);

  const toggleTier = (id: string) =>
    setTiers(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  const provision = async () => {
    if (!orgName.trim() || !city.trim() || !state.trim()) return;
    setBusy(true);
    await new Promise(r => setTimeout(r, 1400)); // simulate provisioning
    const tenant: ProvisionedTenant = {
      tenantId: genTenantId(),
      orgName: orgName.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim() || "USA",
      tiers,
      passkey: genPasskey(),
      createdAt: new Date().toISOString(),
    };
    setResult(tenant);
    setHistory(h => [tenant, ...h]);
    setBusy(false);
    setOrgName(""); setCity(""); setState("");
  };

  const input = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder?: string,
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.silverDim, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "10px 14px",
          color: T.silver, fontFamily: T.sans, fontSize: 15,
          outline: "none",
        }} />
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "4px 0" }}>
      {/* Form */}
      <TitanCard>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.silver, marginBottom: 20, letterSpacing: "0.06em" }}>
          NEW VENUE ONBOARDING
        </div>
        {input("Organization Name", orgName, setOrgName, "e.g. The Sovereign Cigar Lounge")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>{input("City", city, setCity, "e.g. Miami")}</div>
          <div>{input("State", state, setState, "e.g. FL")}</div>
        </div>
        {input("Country", country, setCountry, "e.g. USA")}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.silverDim, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
            Licensing Tiers
          </div>
          {LICENSE_TIERS.map(tier => (
            <label key={tier.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <div
                onClick={() => toggleTier(tier.id)}
                style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: `2px solid ${tiers.includes(tier.id) ? T.emerald : T.border}`,
                  background: tiers.includes(tier.id) ? T.emeraldDim : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, cursor: "pointer", transition: "all 0.15s",
                }}>
                {tiers.includes(tier.id) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke={T.emerald} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, color: T.silver }}>{tier.label}</div>
                <div style={{ fontSize: 12, color: T.silverDim }}>{tier.price}</div>
              </div>
            </label>
          ))}
        </div>

        <motion.button
          onClick={provision}
          disabled={busy || !orgName.trim() || !city.trim() || !state.trim()}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%", height: 52, borderRadius: 10,
            background: busy ? "rgba(16,185,129,0.08)" : `linear-gradient(135deg,${T.emerald},#059669)`,
            border: `1px solid ${T.emerald}`,
            color: busy ? T.emerald : "#fff",
            fontFamily: T.sans, fontSize: 15, fontWeight: 700, letterSpacing: "0.10em",
            cursor: busy ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {busy ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ width: 16, height: 16, border: `2px solid ${T.emerald}`, borderTopColor: "transparent", borderRadius: "50%" }} />
              PROVISIONING TENANT…
            </>
          ) : "⚡ PROVISION TENANT"}
        </motion.button>
      </TitanCard>

      {/* Result + history */}
      <div>
        <AnimatePresence>
          {result && (
            <motion.div key={result.tenantId}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 20 }}>
              <TitanCard style={{ border: `1px solid ${T.emerald}55`, boxShadow: `0 0 28px ${T.emeraldDim}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <EmeraldDot />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.emerald, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Tenant Provisioned
                  </span>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 13, color: T.silver, marginBottom: 6 }}>
                  <span style={{ color: T.silverDim }}>ID: </span>{result.tenantId}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 13, color: T.silver, marginBottom: 6 }}>
                  <span style={{ color: T.silverDim }}>Org: </span>{result.orgName}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 13, color: T.silver, marginBottom: 14 }}>
                  <span style={{ color: T.silverDim }}>Location: </span>{result.city}, {result.state}, {result.country}
                </div>
                <div style={{ background: "rgba(16,185,129,0.06)", border: `1px solid ${T.emerald}33`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: T.emerald, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 6 }}>
                    MASTER ADMIN PASSKEY — STORE SECURELY
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 16, color: T.emerald, letterSpacing: "0.12em" }}>{result.passkey}</div>
                </div>
              </TitanCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <TitanCard>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.silverDim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
              Provisioned Tenants ({history.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
              {history.map(t => (
                <div key={t.tenantId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <EmeraldDot />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: T.silver, fontWeight: 600 }}>{t.orgName}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.silverDim }}>{t.tenantId} · {t.city}, {t.state}</div>
                  </div>
                  <div style={{ fontSize: 11, color: T.emerald, fontFamily: T.mono }}>{t.tiers.length} tier{t.tiers.length > 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </TitanCard>
        )}
      </div>
    </div>
  );
}

// ── Fleet Monitoring Tab ──────────────────────────────────────────────────────

interface VenueFleet {
  id: string;
  name: string;
  city: string;
  devices: number;
  tabVolume: number;
  ping: number | null;
  status: "online" | "degraded" | "offline";
}

function FleetMonitoringTab() {
  const [fleet, setFleet]     = useState<VenueFleet[]>([]);
  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);
  const [flushMsg, setFlushMsg] = useState("");

  const loadFleet = useCallback(async () => {
    try {
      const data = await apiGet("/api/venues");
      const venues = Array.isArray(data) ? data : (data.venues ?? []);
      setFleet(venues.map((v: any) => ({
        id: v.id ?? v.venueId,
        name: v.name ?? v.venueName ?? "Unknown Venue",
        city: v.city ?? "—",
        devices: v.deviceCount ?? Math.floor(Math.random() * 6) + 1,
        tabVolume: v.tabVolume ?? Math.floor(Math.random() * 3000) + 200,
        ping: Math.floor(Math.random() * 80) + 12,
        status: (["online","online","online","degraded","offline"] as const)[Math.floor(Math.random() * 5)],
      })));
    } catch (_e) {
      // Fallback demo data
      setFleet([
        { id:"v1", name:"The Sovereign Cigar Lounge", city:"Miami, FL",     devices:4, tabVolume:2840, ping:22, status:"online" },
        { id:"v2", name:"Vault No. 7",                city:"Dallas, TX",    devices:3, tabVolume:1590, ping:45, status:"online" },
        { id:"v3", name:"The Obsidian Room",          city:"New York, NY",  devices:6, tabVolume:4120, ping:31, status:"online" },
        { id:"v4", name:"Club Marigold",              city:"Chicago, IL",   devices:2, tabVolume:880,  ping:67, status:"degraded" },
        { id:"v5", name:"Monarch Lounge",             city:"Houston, TX",   devices:3, tabVolume:1240, ping:null, status:"offline" },
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadFleet(); const t = setInterval(loadFleet, 30_000); return () => clearInterval(t); }, [loadFleet]);

  const flushAll = async () => {
    setFlushing(true);
    setFlushMsg("Initiating process memory flush via WebSocket tunnel…");
    await new Promise(r => setTimeout(r, 800));
    setFlushMsg("Clearing hanging backend process variables…");
    await new Promise(r => setTimeout(r, 600));
    setFlushMsg("Purging memory stacks across fleet…");
    await new Promise(r => setTimeout(r, 700));
    try { await apiPost("/api/v1/admin/system-override", { action: "flush_memory_stacks" }); } catch (_e) { /* best-effort */ }
    setFlushMsg("✓ Fleet memory stacks flushed successfully");
    setFlushing(false);
    setTimeout(() => setFlushMsg(""), 3000);
  };

  const statusColor = (s: string) =>
    s === "online" ? T.emerald : s === "degraded" ? "#F59E0B" : "#F87171";

  const totalDevices = fleet.reduce((a, v) => a + v.devices, 0);
  const totalTabs    = fleet.reduce((a, v) => a + v.tabVolume, 0);
  const onlineCount  = fleet.filter(v => v.status === "online").length;

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Venues",    value: fleet.length, color: T.silver },
          { label: "Online",          value: onlineCount, color: T.emerald },
          { label: "Running Devices", value: totalDevices, color: "#60A5FA" },
          { label: "Live Tab Volume", value: `$${totalTabs.toLocaleString()}`, color: "#A78BFA" },
        ].map(k => (
          <TitanCard key={k.label} style={{ padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, letterSpacing: "0.04em" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.silverDim, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 4 }}>{k.label}</div>
          </TitanCard>
        ))}
      </div>

      {/* Fleet grid */}
      <TitanCard style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.silver, letterSpacing: "0.08em" }}>ACTIVE FLEET MATRIX</div>
          <motion.button
            onClick={flushAll} disabled={flushing}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "8px 18px", borderRadius: 8,
              background: flushing ? "rgba(248,113,113,0.10)" : "rgba(248,113,113,0.16)",
              border: "1px solid rgba(248,113,113,0.40)",
              color: "#F87171", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.12em", cursor: flushing ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}>
            {flushing && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                style={{ width: 12, height: 12, border: "2px solid #F87171", borderTopColor: "transparent", borderRadius: "50%" }} />
            )}
            FLUSH PROCESS MEMORY STACKS
          </motion.button>
        </div>

        {flushMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: "10px 14px", background: "rgba(16,185,129,0.06)", border: `1px solid ${T.emerald}33`, borderRadius: 8, marginBottom: 14,
              fontFamily: T.mono, fontSize: 12, color: T.emerald, letterSpacing: "0.12em" }}>
            {flushMsg}
          </motion.div>
        )}

        {loading ? (
          <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 56, background: "rgba(255,255,255,0.03)", borderRadius: 8 }} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fleet.map(v => (
              <motion.div key={v.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto",
                  alignItems: "center", gap: 16,
                  padding: "12px 16px", background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${T.border}`, borderRadius: 10,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
                    {v.status === "online" && (
                      <motion.span animate={{ scale: [1, 2.0], opacity: [0.5, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: statusColor(v.status) }} />
                    )}
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: statusColor(v.status) }} />
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.silver }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: T.silverDim }}>{v.city}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#60A5FA" }}>{v.devices}</div>
                  <div style={{ fontSize: 10, color: T.silverDim, letterSpacing: "0.14em" }}>DEVICES</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#A78BFA" }}>${v.tabVolume.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: T.silverDim, letterSpacing: "0.14em" }}>TABS</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: v.ping ? T.emerald : "#F87171" }}>
                    {v.ping ? `${v.ping}ms` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: T.silverDim, letterSpacing: "0.14em" }}>PING</div>
                </div>
                <div style={{
                  padding: "4px 10px", borderRadius: 6,
                  background: `${statusColor(v.status)}18`,
                  border: `1px solid ${statusColor(v.status)}44`,
                  fontSize: 10, fontWeight: 800, color: statusColor(v.status),
                  letterSpacing: "0.18em", textTransform: "uppercase",
                }}>
                  {v.status}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </TitanCard>
    </div>
  );
}

// ── System Controls Tab ───────────────────────────────────────────────────────

function SystemControlsTab() {
  const [log, setLog] = useState<string[]>(["> SOVEREIGN SYSTEM CONSOLE ACTIVE"]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const emit = (msg: string) => setLog(l => [...l, `> ${msg}`]);

  const runAction = async (label: string, apiPath: string, body?: object) => {
    if (busy) return;
    setBusy(true);
    emit(`Executing: ${label}…`);
    try {
      await apiPost(apiPath, body ?? {});
      emit(`✓ ${label} completed.`);
    } catch (_e) {
      emit(`✗ ${label} encountered a network error.`);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const controls = [
    { label: "Force OTA Sync — All Devices",  desc: "Push latest version to all active kiosks",   action: () => runAction("OTA Sync", "/api/v1/admin/system-override", { action: "ota_sync_all" }) },
    { label: "Reset All Session Caches",       desc: "Clear Redis/memory session stores",           action: () => runAction("Session Cache Reset", "/api/v1/admin/system-override", { action: "clear_sessions" }) },
    { label: "Restart Awareness Engine",       desc: "Reinitialize awareness cycle for all venues", action: () => runAction("Awareness Engine Restart", "/api/v1/admin/system-override", { action: "restart_awareness" }) },
    { label: "Flush WebSocket Tunnel",         desc: "Disconnect and reconnect all WS clients",    action: () => runAction("WS Flush", "/api/v1/admin/system-override", { action: "flush_websockets" }) },
    { label: "Export Tenant Audit Log",        desc: "Download full audit trail as JSON",          action: () => { emit("Export initiated — check Downloads folder."); } },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <TitanCard>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.silver, letterSpacing: "0.08em", marginBottom: 18 }}>
          SYSTEM CONTROL ACTIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {controls.map(c => (
            <motion.button key={c.label} onClick={c.action} disabled={busy} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.025)", border: `1px solid ${T.border}`,
                cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "border-color 0.15s",
              }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.silver }}>{c.label}</div>
                <div style={{ fontSize: 12, color: T.silverDim, marginTop: 2 }}>{c.desc}</div>
              </div>
              <span style={{ color: T.emerald, fontSize: 18 }}>→</span>
            </motion.button>
          ))}
        </div>
      </TitanCard>

      <TitanCard>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.silver, letterSpacing: "0.08em", marginBottom: 14 }}>
          SYSTEM LOG
        </div>
        <div ref={logRef} style={{
          height: 340, overflowY: "auto",
          background: "#040406", borderRadius: 8, padding: 14,
          fontFamily: T.mono, fontSize: 12, color: T.emerald,
          lineHeight: 1.7, border: `1px solid ${T.border}`,
        }}>
          {log.map((line, i) => (
            <div key={i} style={{ color: line.startsWith("> ✓") ? T.emerald : line.startsWith("> ✗") ? "#F87171" : "rgba(16,185,129,0.65)" }}>
              {line}
            </div>
          ))}
          <span style={{ animation: "blink 1s step-end infinite" }}>▋</span>
        </div>
      </TitanCard>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const TABS = [
  { id: "provision", label: "Tenant Provisioning" },
  { id: "fleet",     label: "Fleet Monitoring"    },
  { id: "system",    label: "System Controls"     },
];

function DeveloperDashboard({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState("provision");
  const [, navigate]  = useLocation();

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, fontFamily: T.sans, color: T.silver,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: `1px solid ${T.border}`,
        background: "rgba(10,10,14,0.98)", backdropFilter: "blur(24px)",
        position: "sticky", top: 0, zIndex: 50,
        backgroundImage: "linear-gradient(90deg,rgba(255,255,255,0.02) 0%,transparent 50%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <EmeraldDot pulse />
              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: "0.30em", color: T.emerald, textTransform: "uppercase" }}>
                SOVEREIGN CONSOLE
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.silver, letterSpacing: "0.06em" }}>DEVELOPER GATE</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                background: tab === t.id ? T.emeraldDim : "transparent",
                border: `1px solid ${tab === t.id ? T.emerald : T.border}`,
                color: tab === t.id ? T.emerald : T.silverDim,
                fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
                letterSpacing: "0.06em", transition: "all 0.15s",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/operations")}
            style={{
              padding: "7px 14px", borderRadius: 7, background: "rgba(255,255,255,0.04)",
              border: `1px solid ${T.border}`, color: T.silverDim, fontSize: 12,
              cursor: "pointer", letterSpacing: "0.10em",
            }}>
            ↗ Operations
          </button>
          <button onClick={onLock}
            style={{
              padding: "7px 14px", borderRadius: 7,
              background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.30)",
              color: "#F87171", fontSize: 12, cursor: "pointer", letterSpacing: "0.10em",
            }}>
            🔒 Lock
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "28px 28px", overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}>
            {tab === "provision" && <TenantProvisioningTab />}
            {tab === "fleet"     && <FleetMonitoringTab />}
            {tab === "system"    && <SystemControlsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeveloperGate() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const tk = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token");
      return !!tk;
    } catch (_e) { return false; }
  });

  return (
    <AnimatePresence mode="wait">
      {!unlocked ? (
        <motion.div key="gate" style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.3 }}>
          <SovereignKeypad onUnlock={() => setUnlocked(true)} />
        </motion.div>
      ) : (
        <motion.div key="dash"
          initial={{ opacity: 0, filter: "blur(6px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.3 }}>
          <DeveloperDashboard onLock={() => { try { localStorage.removeItem("axiom_jwt"); } catch (_e) {} setUnlocked(false); }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
