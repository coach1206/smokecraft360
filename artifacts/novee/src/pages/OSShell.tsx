/**
 * NOVEE OS Shell — Titan Kernel Foundation
 *
 * Top-level OS shell with:
 *  - Profound Innovations wordmark + Sovereign/Essential mode indicator
 *  - Mode toggle (admin-only, mocked via local state)
 *  - Module dock (registered modules from /api/kernel/modules)
 *  - Quick nav to E.A.T. Engine dashboard
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

interface KernelModule {
  id: string;
  name: string;
  craftType: "smoke" | "pour" | "brew" | "vape" | "none";
  slug: string;
  status: "active" | "inactive" | "suspended";
  description: string | null;
  launchUrl: string | null;
  registeredAt: string;
}

type KernelMode = "sovereign" | "essential";

const CRAFT_COLORS: Record<string, string> = {
  smoke: "#C4610A",
  pour:  "#D4AF37",
  brew:  "#B87333",
  vape:  "#8b5cf6",
  none:  "#6b7280",
};

const CRAFT_ICONS: Record<string, string> = {
  smoke: "🪨",
  pour:  "🥃",
  brew:  "🍺",
  vape:  "💨",
  none:  "◆",
};

const SOVEREIGN_TILES = [
  { id: "craft",    label: "CRAFT MODULES",     sub: "Swipe · Build · Reveal",       icon: "◈" },
  { id: "eat",      label: "E.A.T. ENGINE",      sub: "Telemetry · Engagement",       icon: "⬡" },
  { id: "pulse",    label: "NOVEE PULSE",         sub: "Venue vitals · AI predictions", icon: "◉" },
  { id: "ops",      label: "OPERATIONS",          sub: "POS · Inventory · Staff",       icon: "⚙" },
  { id: "revenue",  label: "REVENUE BRAIN",       sub: "Forecasting · Margin",          icon: "▲" },
  { id: "loyalty",  label: "LOYALTY ENGINE",      sub: "Tiers · Rewards · XP",          icon: "◇" },
];

const ESSENTIAL_TILES = [
  { id: "craft", label: "CRAFT MODULES", sub: "Active experience modules",  icon: "◈" },
  { id: "eat",   label: "E.A.T. ENGINE", sub: "Telemetry dashboard",        icon: "⬡" },
  { id: "ops",   label: "OPERATIONS",   sub: "Core operational tools",      icon: "⚙" },
];

/** Resolve the active venue ID from localStorage (written by SmokeCraft's VenueContext).
 *  Falls back to the well-known demo UUID when no venue is loaded. */
const FALLBACK_VENUE_ID = "00000000-0000-0000-0000-000000000001";
function resolveVenueId(): string {
  try {
    return localStorage.getItem("smokecraft_venue") ?? FALLBACK_VENUE_ID;
  } catch {
    return FALLBACK_VENUE_ID;
  }
}

export default function OSShell() {
  const [, navigate]    = useLocation();
  const [mode, setMode] = useState<KernelMode>("sovereign");
  const [modules, setModules] = useState<KernelModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [modeChanging, setModeChanging] = useState(false);
  const [showModuleDock, setShowModuleDock] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [bootPhase, setBootPhase] = useState<"boot" | "ready">("boot");
  const [bootProgress, setBootProgress] = useState(0);

  // Boot animation
  useEffect(() => {
    const start = Date.now();
    const duration = 2200;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setBootProgress(p);
      if (p < 1) requestAnimationFrame(tick);
      else setBootPhase("ready");
    };
    requestAnimationFrame(tick);
  }, []);

  // Load mode config from API — venueId resolved from shared localStorage key
  useEffect(() => {
    const venueId = resolveVenueId();
    apiFetch<{ mode: KernelMode }>(`/mode/${venueId}`)
      .then((d) => setMode(d.mode))
      .catch(() => setMode("sovereign"));
  }, []);

  // Load modules
  useEffect(() => {
    setLoadingModules(true);
    apiFetch<{ modules: KernelModule[] }>("/modules")
      .then((d) => setModules(d.modules))
      .catch(() => setModules([]))
      .finally(() => setLoadingModules(false));
  }, []);

  const [modeError, setModeError]     = useState<string | null>(null);
  /** Read auth JWT from the shared keys written by SmokeCraft / Axiom OS auth flows.
   *  Falls back to any NOVEE-specific override stored during this session. */
  const [adminToken, setAdminToken]   = useState<string>(() => {
    try {
      return (
        localStorage.getItem("axiom_jwt") ??
        localStorage.getItem("auth_token") ??
        localStorage.getItem("novee_admin_token") ??
        ""
      );
    } catch { return ""; }
  });
  const [showTokenInput, setShowTokenInput] = useState(false);

  const toggleMode = useCallback(async () => {
    if (!adminToken) {
      setShowTokenInput(true);
      return;
    }
    const next: KernelMode = mode === "sovereign" ? "essential" : "sovereign";
    setModeChanging(true);
    setModeError(null);
    try {
      const result = await apiFetch<{ mode: KernelMode }>(`/mode/${resolveVenueId()}`, {
        method: "PATCH",
        body: JSON.stringify({ mode: next }),
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setMode(result.mode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update mode";
      setModeError(msg);
      if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("forbidden")) {
        setAdminToken("");
        try { localStorage.removeItem("novee_admin_token"); } catch { /**/ }
        setShowTokenInput(true);
      }
    } finally {
      setModeChanging(false);
    }
  }, [mode, adminToken]);

  const handleTileClick = (id: string) => {
    if (id === "eat") navigate("/eat-engine");
    else if (id === "craft") setShowModuleDock(true);
  };

  const launchModule = (mod: KernelModule) => {
    const url = mod.launchUrl ?? "/";
    window.open(url, "_blank");
  };

  const tiles = mode === "sovereign" ? SOVEREIGN_TILES : ESSENTIAL_TILES;

  if (bootPhase === "boot") {
    return <BootScreen progress={bootProgress} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0E", color: "#F5EDD8", position: "relative", overflow: "hidden" }}>

      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(196,97,10,0.06) 0%, transparent 65%)",
      }} />

      {/* Top bezel nav */}
      <header className="novee-bezel novee-glow-top" style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56,
      }}>
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 28, height: 28,
            border: "1.5px solid rgba(196,97,10,0.6)",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "#C4610A", letterSpacing: "0.05em",
          }}>N</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: "#F5EDD8" }}>NOVEE OS</div>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(196,97,10,0.6)", marginTop: -1 }}>PROFOUND INNOVATIONS</div>
          </div>
        </div>

        {/* Mode indicator + toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)" }}>
            KERNEL MODE
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <button
              onClick={toggleMode}
              disabled={modeChanging}
              className={mode === "sovereign" ? "novee-sovereign" : "novee-essential"}
              title={adminToken ? "Toggle kernel mode (admin)" : "Admin credentials required to change mode"}
              style={{
                borderRadius: 100, padding: "4px 14px",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
                cursor: modeChanging ? "not-allowed" : "pointer",
                opacity: modeChanging ? 0.6 : 1,
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {modeChanging ? "…" : mode === "sovereign" ? "SOVEREIGN" : "ESSENTIAL"}
              {!adminToken && <span style={{ fontSize: 8, opacity: 0.6 }}>🔒</span>}
            </button>
            {modeError && (
              <div style={{ fontSize: 9, color: "#f87171", letterSpacing: "0.05em", maxWidth: 160, textAlign: "right" }}>
                {modeError}
              </div>
            )}
          </div>

          {/* E.A.T. Engine quick-link */}
          <button
            onClick={() => navigate("/eat-engine")}
            style={{
              background: "rgba(196,97,10,0.08)", border: "1px solid rgba(196,97,10,0.2)",
              borderRadius: 6, padding: "6px 12px",
              color: "#C4610A", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em",
              cursor: "pointer",
            }}
          >
            E.A.T. ENGINE
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: "40px 32px 80px", maxWidth: 1200, margin: "0 auto" }}>

        {/* OS header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 8 }}>
            TITAN KERNEL v1.0 · {modules.length} MODULE{modules.length !== 1 ? "S" : ""} REGISTERED
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 300, letterSpacing: "0.12em", margin: 0 }}>
            NOVEE OS
          </h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "rgba(245,237,216,0.45)", letterSpacing: "0.06em", maxWidth: 480 }}>
            {mode === "sovereign"
              ? "Full luxury craft experience platform · All systems armed"
              : "Essential operating mode · Minimal surface · Safety focus"}
          </p>
        </div>

        {/* Feature tile grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 56,
        }}>
          {tiles.map((tile) => (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              className="novee-module-card"
              style={{
                borderRadius: 12, padding: "24px 20px",
                textAlign: "left", cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 12,
                background: tile.id === "eat" ? "rgba(196,97,10,0.06)" : undefined,
              }}
            >
              <div style={{ fontSize: 22, color: "#C4610A", lineHeight: 1 }}>{tile.icon}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "#F5EDD8" }}>
                  {tile.label}
                </div>
                <div style={{ fontSize: 11, color: "rgba(245,237,216,0.4)", marginTop: 4 }}>
                  {tile.sub}
                </div>
              </div>
              {tile.id === "craft" && (
                <div style={{ fontSize: 10, color: "rgba(196,97,10,0.7)", letterSpacing: "0.1em" }}>
                  {modules.filter(m => m.status === "active").length} active →
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Module Registry */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 4 }}>
                KERNEL REGISTRY
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.1em", margin: 0 }}>
                Registered Modules
              </h2>
            </div>
            {adminToken && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="novee-btn-primary"
                style={{ padding: "8px 18px", fontSize: 11, letterSpacing: "0.15em" }}
              >
                + REGISTER MODULE
              </button>
            )}
          </div>

          {loadingModules ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "24px 0" }}>
              <div style={{ width: 16, height: 16, border: "1.5px solid rgba(196,97,10,0.3)", borderTopColor: "#C4610A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12, color: "rgba(245,237,216,0.4)" }}>Loading module registry…</span>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : modules.length === 0 ? (
            <div className="novee-glass" style={{ borderRadius: 12, padding: "32px 24px", textAlign: "center", color: "rgba(245,237,216,0.35)", fontSize: 13 }}>
              No modules registered in kernel
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {modules.map((mod) => (
                <ModuleCard key={mod.id} mod={mod} onLaunch={launchModule} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Module dock overlay */}
      {showModuleDock && (
        <ModuleDock
          modules={modules}
          onClose={() => setShowModuleDock(false)}
          onLaunch={launchModule}
        />
      )}

      {/* Register Module modal */}
      {showRegisterModal && (
        <RegisterModuleModal
          adminToken={adminToken}
          onSuccess={(newMod) => {
            setModules((prev) => [newMod, ...prev]);
            setShowRegisterModal(false);
          }}
          onClose={() => setShowRegisterModal(false)}
        />
      )}

      {/* Admin token input modal */}
      {showTokenInput && (
        <AdminTokenModal
          onSubmit={(token) => {
            setAdminToken(token);
            try { localStorage.setItem("novee_admin_token", token); } catch { /**/ }
            setShowTokenInput(false);
            setModeError(null);
          }}
          onClose={() => setShowTokenInput(false)}
        />
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function BootScreen({ progress }: { progress: number }) {
  const lines = [
    "KERNEL INIT ............. STARTING",
    "MODULE REGISTRY ......... SCANNING",
    "TELEMETRY ENGINE ........ ARMED",
    "MODE CONFIG ............. LOADED",
    "E.A.T. ENGINE ........... ONLINE",
  ];
  const visibleCount = Math.floor(progress * lines.length);
  const R = 64;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0D0D0E",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32,
    }}>
      {/* Arc ring */}
      <div style={{ position: "relative", width: 148, height: 148 }}>
        <svg width="148" height="148" style={{ position: "absolute", inset: 0 }}>
          <circle cx="74" cy="74" r={R} stroke="rgba(196,97,10,0.12)" strokeWidth="1" fill="none" />
          <circle cx="74" cy="74" r={R} stroke="#C4610A" strokeWidth="1.5" fill="none"
            strokeDasharray={`${progress * 2 * Math.PI * R} ${2 * Math.PI * R}`}
            strokeLinecap="round"
            style={{ transformOrigin: "74px 74px", transform: "rotate(-90deg)", transition: "stroke-dasharray 0.05s linear" }} />
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg - 90) * Math.PI / 180;
            return <circle key={i} cx={74 + R * Math.cos(rad)} cy={74 + R * Math.sin(rad)} r={i % 3 === 0 ? 2.5 : 1.5}
              fill="#C4610A" opacity={progress > i * 0.15 ? 0.8 : 0.15} />;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "#C4610A", fontWeight: 800 }}>NOVEE OS</div>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(196,97,10,0.5)" }}>{Math.round(progress * 100)}%</div>
        </div>
      </div>

      {/* Telemetry lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 280 }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontSize: 9, letterSpacing: "0.16em", fontFamily: "monospace",
            color: "#C4610A", opacity: i < visibleCount ? 1 : 0.1,
            transition: "opacity 0.3s ease",
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Wordmark */}
      <div style={{ fontSize: 9, letterSpacing: "0.4em", color: "rgba(196,97,10,0.35)", marginTop: 8 }}>
        PROFOUND INNOVATIONS
      </div>
    </div>
  );
}

function ModuleCard({ mod, onLaunch }: { mod: KernelModule; onLaunch: (m: KernelModule) => void }) {
  const color = CRAFT_COLORS[mod.craftType] ?? "#6b7280";
  const icon  = CRAFT_ICONS[mod.craftType]  ?? "◆";

  return (
    <div className="novee-module-card" style={{
      borderRadius: 10, padding: "16px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `rgba(${hexToRgb(color)},0.12)`,
          border: `1px solid rgba(${hexToRgb(color)},0.25)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#F5EDD8", letterSpacing: "0.04em" }}>
            {mod.name}
          </div>
          {mod.description && (
            <div style={{ fontSize: 11, color: "rgba(245,237,216,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {mod.description}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span className={mod.status === "active" ? "novee-badge-active" : "novee-badge-inactive"}>
          {mod.status}
        </span>
        <button
          onClick={() => onLaunch(mod)}
          className="novee-btn-ghost"
          style={{ padding: "6px 14px", fontSize: 11, minHeight: 32 }}
        >
          LAUNCH →
        </button>
      </div>
    </div>
  );
}

function ModuleDock({
  modules,
  onClose,
  onLaunch,
}: {
  modules: KernelModule[];
  onClose: () => void;
  onLaunch: (m: KernelModule) => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="novee-glass"
        style={{
          width: "100%", maxWidth: 680, borderRadius: "16px 16px 0 0",
          padding: "28px 24px 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 4 }}>KERNEL</div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.1em" }}>MODULE DOCK</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(245,237,216,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
          {modules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} onLaunch={(m) => { onLaunch(m); onClose(); }} />
          ))}
          {modules.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "rgba(245,237,216,0.3)" }}>
              No modules registered
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminTokenModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (token: string) => void;
  onClose: () => void;
}) {
  const [token, setToken] = useState("");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="novee-glass"
        style={{ borderRadius: 16, padding: "32px 28px", width: "min(400px, 92vw)" }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 6 }}>KERNEL AUTHORIZATION</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.08em" }}>Admin Credentials Required</div>
          <div style={{ fontSize: 12, color: "rgba(245,237,216,0.4)", marginTop: 6, lineHeight: 1.5 }}>
            Kernel mode changes require an admin or super_admin JWT. Paste your bearer token below. It will be stored in localStorage for this session.
          </div>
        </div>

        <input
          autoFocus
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && token.trim()) onSubmit(token.trim()); }}
          placeholder="Bearer token…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,97,10,0.25)",
            borderRadius: 8, padding: "10px 14px", color: "#F5EDD8",
            fontSize: 12, fontFamily: "monospace", outline: "none",
            marginBottom: 16,
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { if (token.trim()) onSubmit(token.trim()); }}
            className="novee-btn-primary"
            style={{ flex: 1 }}
            disabled={!token.trim()}
          >
            AUTHORIZE
          </button>
          <button onClick={onClose} className="novee-btn-ghost" style={{ flex: 1 }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

function RegisterModuleModal({
  adminToken,
  onSuccess,
  onClose,
}: {
  adminToken: string;
  onSuccess: (mod: KernelModule) => void;
  onClose: () => void;
}) {
  const [name,        setName]        = useState("");
  const [slug,        setSlug]        = useState("");
  const [craftType,   setCraftType]   = useState<KernelModule["craftType"]>("none");
  const [status,      setStatus]      = useState<KernelModule["status"]>("active");
  const [description, setDescription] = useState("");
  const [launchUrl,   setLaunchUrl]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const slugError = slug && !SLUG_RE.test(slug)
    ? "Slug must be lowercase letters, numbers, hyphens, or underscores"
    : null;

  const canSubmit = name.trim() && slug.trim() && !slugError && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<{ module: KernelModule }>("/modules", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          craftType,
          status,
          description: description.trim() || undefined,
          launchUrl: launchUrl.trim() || undefined,
        }),
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      onSuccess(result.module);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register module");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,97,10,0.25)",
    borderRadius: 8, padding: "10px 14px", color: "#F5EDD8",
    fontSize: 12, outline: "none", fontFamily: "inherit",
    marginBottom: 12,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9, letterSpacing: "0.2em", color: "rgba(196,97,10,0.6)",
    display: "block", marginBottom: 4,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="novee-glass"
        style={{ borderRadius: 16, padding: "32px 28px", width: "min(480px, 94vw)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 6 }}>KERNEL REGISTRY</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.08em" }}>Register New Module</div>
          <div style={{ fontSize: 12, color: "rgba(245,237,216,0.4)", marginTop: 6, lineHeight: 1.5 }}>
            Add a new craft module to the kernel registry.
          </div>
        </div>

        <div>
          <label style={labelStyle}>NAME *</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smoke Experience"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>SLUG *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="e.g. smoke-experience"
            style={{ ...inputStyle, borderColor: slugError ? "rgba(248,113,113,0.5)" : "rgba(196,97,10,0.25)" }}
          />
          {slugError && (
            <div style={{ fontSize: 10, color: "#f87171", marginTop: -8, marginBottom: 12 }}>{slugError}</div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>CRAFT TYPE</label>
            <select
              value={craftType}
              onChange={(e) => setCraftType(e.target.value as KernelModule["craftType"])}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            >
              <option value="none">None</option>
              <option value="smoke">Smoke</option>
              <option value="pour">Pour</option>
              <option value="brew">Brew</option>
              <option value="vape">Vape</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>STATUS</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as KernelModule["status"])}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>DESCRIPTION</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief module description (optional)"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>LAUNCH URL</label>
          <input
            type="text"
            value={launchUrl}
            onChange={(e) => setLaunchUrl(e.target.value)}
            placeholder="https://… or /path (optional)"
            style={inputStyle}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 11, color: "#f87171", marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 6 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            className="novee-btn-primary"
            style={{ flex: 1, opacity: canSubmit ? 1 : 0.5 }}
            disabled={!canSubmit}
          >
            {submitting ? "REGISTERING…" : "REGISTER MODULE"}
          </button>
          <button onClick={onClose} className="novee-btn-ghost" style={{ flex: 1 }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r},${g},${b}`;
  }
  return "196,97,10";
}
