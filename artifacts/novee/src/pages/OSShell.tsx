/**
 * NOVEE OS Shell — Titan Kernel Foundation
 *
 * Top-level OS shell with:
 *  - Profound Innovations wordmark + Sovereign/Essential mode indicator
 *  - Mode toggle (admin-only, mocked via local state)
 *  - Module dock (registered modules from /api/kernel/modules)
 *  - Quick nav to E.A.T. Engine dashboard
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
  deletedAt: string | null;
  deletedBy: string | null;
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
  const [editingModule, setEditingModule] = useState<KernelModule | null>(null);
  const [deletingModule, setDeletingModule] = useState<KernelModule | null>(null);
  const [showDeletedHistory, setShowDeletedHistory] = useState(false);
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
  /** Read auth JWT from the shared keys written by SmokeCraft / NOVEE OS auth flows.
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
    if (id === "eat") {
      window.dispatchEvent(new CustomEvent("eat:enter"));
      navigate("/eat-engine");
    } else if (id === "craft") setShowModuleDock(true);
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
            onClick={() => { window.dispatchEvent(new CustomEvent("eat:enter")); navigate("/eat-engine"); }}
            className="novee-btn-ghost"
            style={{ fontSize: 10, padding: "0 14px", minHeight: 40, letterSpacing: "0.18em" }}
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
              className={tile.id === "eat" ? "novee-module-card novee-glass-ember" : "novee-module-card novee-card"}
              style={{
                borderRadius: 14, padding: "28px 22px",
                textAlign: "left", cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 14,
                minHeight: 120,
              }}
            >
              <div style={{ fontSize: 26, color: "#C4610A", lineHeight: 1,
                filter: tile.id === "eat" ? "drop-shadow(0 0 8px rgba(196,97,10,0.5))" : undefined }}>{tile.icon}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.20em", color: "#F5EDD8", fontFamily: "'Cormorant Garamond', serif" }}>
                  {tile.label}
                </div>
                <div style={{ fontSize: 11, color: "rgba(245,237,216,0.45)", marginTop: 5, letterSpacing: "0.04em" }}>
                  {tile.sub}
                </div>
              </div>
              {tile.id === "craft" && (
                <div style={{ fontSize: 10, color: "#C4610A", letterSpacing: "0.12em", fontWeight: 700 }}>
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
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowDeletedHistory(true)}
                  className="novee-btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em" }}
                >
                  🗑 DELETION LOG
                </button>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="novee-btn-primary"
                  style={{ padding: "8px 18px", fontSize: 11, letterSpacing: "0.15em" }}
                >
                  + REGISTER MODULE
                </button>
              </div>
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
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  onLaunch={launchModule}
                  onEdit={adminToken ? () => setEditingModule(mod) : undefined}
                  onDelete={adminToken ? () => setDeletingModule(mod) : undefined}
                />
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

      {/* Edit Module modal */}
      {editingModule && (
        <EditModuleModal
          adminToken={adminToken}
          module={editingModule}
          onSuccess={(updated) => {
            setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setEditingModule(null);
          }}
          onClose={() => setEditingModule(null)}
        />
      )}

      {/* Confirm Delete modal */}
      {deletingModule && (
        <ConfirmDeleteModal
          adminToken={adminToken}
          module={deletingModule}
          onSuccess={(id) => {
            setModules((prev) => prev.filter((m) => m.id !== id));
            setDeletingModule(null);
          }}
          onClose={() => setDeletingModule(null)}
        />
      )}

      {/* Deleted Modules History panel */}
      {showDeletedHistory && (
        <DeletedModulesPanel
          adminToken={adminToken}
          onClose={() => setShowDeletedHistory(false)}
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

function ModuleCard({
  mod,
  onLaunch,
  onEdit,
  onDelete,
}: {
  mod: KernelModule;
  onLaunch: (m: KernelModule) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
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
        {onEdit && (
          <button
            onClick={onEdit}
            className="novee-btn-ghost"
            style={{ padding: "6px 14px", fontSize: 11, minHeight: 32 }}
          >
            EDIT
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="novee-btn-ghost"
            style={{ padding: "6px 14px", fontSize: 11, minHeight: 32, color: "#e05252", borderColor: "rgba(224,82,82,0.3)" }}
          >
            DELETE
          </button>
        )}
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

function ConfirmDeleteModal({
  adminToken,
  module: mod,
  onSuccess,
  onClose,
}: {
  adminToken: string;
  module: KernelModule;
  onSuccess: (id: string) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/modules/${mod.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      onSuccess(mod.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete module");
      setLoading(false);
    }
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
        style={{ borderRadius: 16, padding: "32px 28px", width: "min(420px, 92vw)" }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(224,82,82,0.6)", marginBottom: 6 }}>KERNEL REGISTRY · REMOVE MODULE</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.08em" }}>Delete Module?</div>
          <div style={{ fontSize: 13, color: "rgba(245,237,216,0.55)", marginTop: 10, lineHeight: 1.6 }}>
            <span style={{ color: "#F5EDD8", fontWeight: 600 }}>{mod.name}</span>{" "}
            will be removed from the active registry. A record of this removal will be kept in the audit log for review by administrators.
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#e05252", marginBottom: 14, padding: "8px 12px", background: "rgba(224,82,82,0.08)", borderRadius: 6 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(224,82,82,0.4)",
              background: loading ? "rgba(224,82,82,0.06)" : "rgba(224,82,82,0.12)",
              color: "#e05252", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "DELETING…" : "DELETE"}
          </button>
          <button onClick={onClose} className="novee-btn-ghost" style={{ flex: 1 }} disabled={loading}>
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
  const [name,          setName]          = useState("");
  const [slug,          setSlug]          = useState("");
  const [craftType,     setCraftType]     = useState<KernelModule["craftType"]>("none");
  const [status,        setStatus]        = useState<KernelModule["status"]>("active");
  const [description,   setDescription]   = useState("");
  const [launchUrl,     setLaunchUrl]     = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [slugConflict,  setSlugConflict]  = useState<string | null>(null);
  const [slugChecking,  setSlugChecking]  = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIdRef   = useRef(0);

  const slugFormatError = slug && !SLUG_RE.test(slug)
    ? "Slug must be lowercase letters, numbers, hyphens, or underscores"
    : null;

  const slugFieldError = slugFormatError ?? slugConflict;

  const canSubmit =
    name.trim() && slug.trim() && !slugFormatError && !slugConflict && !slugChecking && !submitting;

  // Debounced slug availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSlugConflict(null);

    const trimmed = slug.trim();
    if (!trimmed || !SLUG_RE.test(trimmed)) {
      setSlugChecking(false);
      return;
    }

    setSlugChecking(true);
    const myId = ++checkIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await apiFetch<{ available: boolean }>(`/modules?slug=${encodeURIComponent(trimmed)}`);
        // Discard result if a newer check has already been issued
        if (checkIdRef.current !== myId) return;
        if (!result.available) setSlugConflict("Slug already in use");
      } catch {
        // Silent — submission will surface the real error
      } finally {
        if (checkIdRef.current === myId) setSlugChecking(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSlugConflict(null);
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
      const status = (err as { status?: number }).status;
      if (status === 409) {
        setSlugConflict("Slug already in use");
      } else {
        setError(err instanceof Error ? err.message : "Failed to register module");
      }
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
          <label style={labelStyle}>
            SLUG *
            {slugChecking && (
              <span style={{ marginLeft: 6, fontSize: 9, color: "rgba(196,97,10,0.5)", letterSpacing: "0.1em" }}>
                CHECKING…
              </span>
            )}
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="e.g. smoke-experience"
            style={{ ...inputStyle, borderColor: slugFieldError ? "rgba(248,113,113,0.5)" : "rgba(196,97,10,0.25)" }}
          />
          {slugFieldError && (
            <div style={{ fontSize: 10, color: "#f87171", marginTop: -8, marginBottom: 12 }}>{slugFieldError}</div>
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

interface AuditEntry {
  id: string;
  moduleId: string;
  changedBy: string;
  changedAt: string;
  diff: Record<string, { before: unknown; after: unknown }>;
}

function EditModuleModal({
  adminToken,
  module: mod,
  onSuccess,
  onClose,
}: {
  adminToken: string;
  module: KernelModule;
  onSuccess: (updated: KernelModule) => void;
  onClose: () => void;
}) {
  const [name,          setName]          = useState(mod.name);
  const [slug,          setSlug]          = useState(mod.slug);
  const [craftType,     setCraftType]     = useState<KernelModule["craftType"]>(mod.craftType);
  const [status,        setStatus]        = useState<KernelModule["status"]>(mod.status);
  const [description,   setDescription]   = useState(mod.description ?? "");
  const [launchUrl,     setLaunchUrl]     = useState(mod.launchUrl ?? "");
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [slugConflict,  setSlugConflict]  = useState<string | null>(null);
  const [slugChecking,  setSlugChecking]  = useState(false);
  const [slugHistory,   setSlugHistory]   = useState<{ id: string; oldSlug: string; newSlug: string; changedBy: string; changedAt: string }[]>([]);
  const [slugHistoryLoading, setSlugHistoryLoading] = useState(false);
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [history,        setHistory]        = useState<AuditEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal,   setHistoryTotal]   = useState(0);
  const [historyPage,    setHistoryPage]    = useState(1);
  const [historyPages,   setHistoryPages]   = useState(1);
  const [historyField,   setHistoryField]   = useState("");
  const [historySince,   setHistorySince]   = useState("");
  const [historyUntil,   setHistoryUntil]   = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIdRef  = useRef(0);

  // Load slug change history on mount
  useEffect(() => {
    setSlugHistoryLoading(true);
    apiFetch<{ slugHistory: { id: string; oldSlug: string; newSlug: string; changedBy: string; changedAt: string }[] }>(
      `/modules/${mod.id}/slug-history`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    )
      .then((r) => setSlugHistory(r.slugHistory))
      .catch(() => setSlugHistory([]))
      .finally(() => setSlugHistoryLoading(false));
  }, [mod.id, adminToken]);

  const HISTORY_PAGE_SIZE = 10;

  const loadHistory = useCallback(async (page: number, field: string, since: string, until: string) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(HISTORY_PAGE_SIZE) });
      if (field)  params.set("field",  field);
      if (since)  params.set("since",  new Date(since).toISOString());
      if (until) {
        const d = new Date(until);
        d.setHours(23, 59, 59, 999);
        params.set("until", d.toISOString());
      }
      const result = await apiFetch<{ history: AuditEntry[]; total: number; page: number; totalPages: number }>(
        `/modules/${mod.id}/history?${params.toString()}`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      setHistory(result.history);
      setHistoryTotal(result.total);
      setHistoryPage(result.page);
      setHistoryPages(result.totalPages);
    } catch {
      // Silently fail — history is informational only
    } finally {
      setHistoryLoading(false);
    }
  }, [mod.id, adminToken]);

  const toggleHistory = useCallback(() => {
    if (!historyOpen) {
      void loadHistory(1, historyField, historySince, historyUntil);
    }
    setHistoryOpen((v) => !v);
  }, [historyOpen, loadHistory, historyField, historySince, historyUntil]);

  const applyHistoryFilters = useCallback(() => {
    setHistoryPage(1);
    void loadHistory(1, historyField, historySince, historyUntil);
  }, [loadHistory, historyField, historySince, historyUntil]);

  const slugFormatError = slug && !SLUG_RE.test(slug)
    ? "Slug must be lowercase letters, numbers, hyphens, or underscores"
    : null;

  const slugFieldError = slugFormatError ?? slugConflict;

  const canSubmit =
    name.trim() && slug.trim() && !slugFormatError && !slugConflict && !slugChecking && !submitting;

  // Debounced slug availability check — excludes this module's own ID
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSlugConflict(null);

    const trimmed = slug.trim();
    if (!trimmed || !SLUG_RE.test(trimmed)) {
      setSlugChecking(false);
      return;
    }

    // If slug is unchanged, skip the network check
    if (trimmed === mod.slug) {
      setSlugChecking(false);
      return;
    }

    setSlugChecking(true);
    const myId = ++checkIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await apiFetch<{ available: boolean }>(
          `/modules?slug=${encodeURIComponent(trimmed)}&excludeId=${encodeURIComponent(mod.id)}`
        );
        if (checkIdRef.current !== myId) return;
        if (!result.available) setSlugConflict("Slug already in use");
      } catch {
        // Silent — submission will surface the real error
      } finally {
        if (checkIdRef.current === myId) setSlugChecking(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug, mod.slug, mod.id]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSlugConflict(null);
    try {
      const result = await apiFetch<{ module: KernelModule }>(`/modules/${mod.id}`, {
        method: "PATCH",
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
      const s = (err as { status?: number }).status;
      if (s === 409) {
        setSlugConflict("Slug already in use");
      } else {
        setError(err instanceof Error ? err.message : "Failed to update module");
      }
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
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.08em" }}>Edit Module</div>
          <div style={{ fontSize: 12, color: "rgba(245,237,216,0.4)", marginTop: 6, lineHeight: 1.5 }}>
            Update the details for <span style={{ color: "rgba(196,97,10,0.8)" }}>{mod.name}</span>.
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
          <label style={labelStyle}>
            SLUG *
            {slugChecking && (
              <span style={{ marginLeft: 6, fontSize: 9, color: "rgba(196,97,10,0.5)", letterSpacing: "0.1em" }}>
                CHECKING…
              </span>
            )}
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="e.g. smoke-experience"
            style={{ ...inputStyle, borderColor: slugFieldError ? "rgba(248,113,113,0.5)" : "rgba(196,97,10,0.25)" }}
          />
          {slugFieldError && (
            <div style={{ fontSize: 10, color: "#f87171", marginTop: -8, marginBottom: 12 }}>{slugFieldError}</div>
          )}
          {!slugFieldError && slug.trim() !== mod.slug && (
            <div style={{ fontSize: 10, color: "#ca8a04", marginTop: -8, marginBottom: 12 }}>
              Changing the slug will invalidate any existing links or integrations using the old slug.
            </div>
          )}

          {/* Previous slugs */}
          {!slugHistoryLoading && slugHistory.length > 0 && (
            <div style={{
              marginTop: -4, marginBottom: 12,
              background: "rgba(196,97,10,0.05)", border: "1px solid rgba(196,97,10,0.15)",
              borderRadius: 8, padding: "8px 12px",
            }}>
              <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(196,97,10,0.55)", marginBottom: 6 }}>
                PREVIOUSLY ACCESSIBLE AS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {slugHistory.map((entry) => (
                  <div key={entry.id} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <code style={{ fontSize: 10, color: "rgba(245,237,216,0.6)", fontFamily: "monospace", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>
                      /{entry.oldSlug}
                    </code>
                    <span style={{ fontSize: 9, color: "rgba(245,237,216,0.3)" }}>
                      → /{entry.newSlug}
                    </span>
                    <span style={{ fontSize: 9, color: "rgba(245,237,216,0.25)", marginLeft: "auto" }}>
                      {new Date(entry.changedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "rgba(245,237,216,0.3)", marginTop: 6 }}>
                Old links to these slugs will automatically redirect to the current slug.
              </div>
            </div>
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
          {launchUrl.trim() !== (mod.launchUrl ?? "") && (
            <div style={{ fontSize: 10, color: "#ca8a04", marginTop: -8, marginBottom: 12 }}>
              Changing the launch URL will break any saved shortcuts or bookmarks pointing to this module.
            </div>
          )}
        </div>

        {error && (
          <div style={{ fontSize: 11, color: "#f87171", marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 6 }}>
            {error}
          </div>
        )}

        {/* ── Edit history ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16, borderTop: "1px solid rgba(196,97,10,0.15)", paddingTop: 14 }}>
          <button
            onClick={toggleHistory}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, padding: 0,
              color: "rgba(196,97,10,0.7)", fontSize: 9, letterSpacing: "0.2em",
            }}
          >
            <span style={{ fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: historyOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
            EDIT HISTORY
            {historyLoading && <span style={{ opacity: 0.5 }}>…</span>}
            {historyOpen && !historyLoading && (
              <span style={{ fontSize: 9, color: "rgba(245,237,216,0.35)", letterSpacing: "0.1em", marginLeft: 4 }}>
                {historyTotal} RESULT{historyTotal !== 1 ? "S" : ""}
              </span>
            )}
          </button>

          {historyOpen && (
            <div style={{ marginTop: 10 }}>
              {/* Filter bar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: "0 0 auto" }}>
                  <span style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(196,97,10,0.55)" }}>FIELD</span>
                  <select
                    value={historyField}
                    onChange={(e) => setHistoryField(e.target.value)}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,97,10,0.2)",
                      borderRadius: 6, padding: "5px 8px", color: "#F5EDD8",
                      fontSize: 10, outline: "none", fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    <option value="">All fields</option>
                    <option value="name">name</option>
                    <option value="slug">slug</option>
                    <option value="craftType">craftType</option>
                    <option value="status">status</option>
                    <option value="description">description</option>
                    <option value="launchUrl">launchUrl</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: "1 1 100px" }}>
                  <span style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(196,97,10,0.55)" }}>FROM</span>
                  <input
                    type="date"
                    value={historySince}
                    onChange={(e) => setHistorySince(e.target.value)}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,97,10,0.2)",
                      borderRadius: 6, padding: "5px 8px", color: "#F5EDD8",
                      fontSize: 10, outline: "none", fontFamily: "inherit",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: "1 1 100px" }}>
                  <span style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(196,97,10,0.55)" }}>TO</span>
                  <input
                    type="date"
                    value={historyUntil}
                    onChange={(e) => setHistoryUntil(e.target.value)}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,97,10,0.2)",
                      borderRadius: 6, padding: "5px 8px", color: "#F5EDD8",
                      fontSize: 10, outline: "none", fontFamily: "inherit",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, flex: "0 0 auto", paddingBottom: 1 }}>
                  <button
                    onClick={applyHistoryFilters}
                    disabled={historyLoading}
                    style={{
                      background: "rgba(196,97,10,0.15)", border: "1px solid rgba(196,97,10,0.35)",
                      borderRadius: 6, padding: "5px 10px", color: "#C4610A",
                      fontSize: 9, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
                      opacity: historyLoading ? 0.5 : 1,
                    }}
                  >
                    APPLY
                  </button>
                  {(historyField || historySince || historyUntil) && (
                    <button
                      onClick={() => {
                        setHistoryField("");
                        setHistorySince("");
                        setHistoryUntil("");
                        void loadHistory(1, "", "", "");
                      }}
                      style={{
                        background: "none", border: "1px solid rgba(245,237,216,0.12)",
                        borderRadius: 6, padding: "5px 10px", color: "rgba(245,237,216,0.4)",
                        fontSize: 9, letterSpacing: "0.12em", cursor: "pointer",
                      }}
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              {history.length === 0 && !historyLoading ? (
                <div style={{ fontSize: 10, color: "rgba(245,237,216,0.3)", padding: "8px 0" }}>
                  No edits match the current filters.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,97,10,0.12)",
                        borderRadius: 8, padding: "8px 12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: "rgba(196,97,10,0.6)", letterSpacing: "0.1em" }}>
                          {entry.changedBy}
                        </span>
                        <span style={{ fontSize: 9, color: "rgba(245,237,216,0.3)" }}>
                          {new Date(entry.changedAt).toLocaleString()}
                        </span>
                      </div>
                      {Object.keys(entry.diff).length === 0 ? (
                        <div style={{ fontSize: 10, color: "rgba(245,237,216,0.3)" }}>No field changes detected</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {Object.entries(entry.diff).map(([field, { before, after }]) => (
                            <div key={field} style={{ fontSize: 10, color: "rgba(245,237,216,0.6)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ color: "rgba(196,97,10,0.7)", letterSpacing: "0.05em" }}>{field}</span>
                              <span style={{ color: "rgba(248,113,113,0.7)" }}>{String(before ?? "—")}</span>
                              <span style={{ color: "rgba(245,237,216,0.3)" }}>→</span>
                              <span style={{ color: "rgba(134,239,172,0.7)" }}>{String(after ?? "—")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {historyPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(196,97,10,0.1)" }}>
                  <button
                    disabled={historyPage <= 1 || historyLoading}
                    onClick={() => {
                      const prev = historyPage - 1;
                      setHistoryPage(prev);
                      void loadHistory(prev, historyField, historySince, historyUntil);
                    }}
                    style={{
                      background: "none", border: "1px solid rgba(196,97,10,0.25)",
                      borderRadius: 5, padding: "4px 10px", color: "rgba(196,97,10,0.7)",
                      fontSize: 9, letterSpacing: "0.1em", cursor: historyPage <= 1 ? "not-allowed" : "pointer",
                      opacity: historyPage <= 1 ? 0.35 : 1,
                    }}
                  >
                    ← PREV
                  </button>
                  <span style={{ fontSize: 9, color: "rgba(245,237,216,0.3)", letterSpacing: "0.1em" }}>
                    PAGE {historyPage} / {historyPages}
                  </span>
                  <button
                    disabled={historyPage >= historyPages || historyLoading}
                    onClick={() => {
                      const next = historyPage + 1;
                      setHistoryPage(next);
                      void loadHistory(next, historyField, historySince, historyUntil);
                    }}
                    style={{
                      background: "none", border: "1px solid rgba(196,97,10,0.25)",
                      borderRadius: 5, padding: "4px 10px", color: "rgba(196,97,10,0.7)",
                      fontSize: 9, letterSpacing: "0.1em", cursor: historyPage >= historyPages ? "not-allowed" : "pointer",
                      opacity: historyPage >= historyPages ? 0.35 : 1,
                    }}
                  >
                    NEXT →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            className="novee-btn-primary"
            style={{ flex: 1, opacity: canSubmit ? 1 : 0.5 }}
            disabled={!canSubmit}
          >
            {submitting ? "SAVING…" : "SAVE CHANGES"}
          </button>
          <button onClick={onClose} className="novee-btn-ghost" style={{ flex: 1 }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

function DeletedModulesPanel({
  adminToken,
  onClose,
}: {
  adminToken: string;
  onClose: () => void;
}) {
  const [deleted, setDeleted]   = useState<KernelModule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<{ modules: KernelModule[] }>("/modules/deleted", {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((d) => setDeleted(d.modules))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load deletion log"))
      .finally(() => setLoading(false));
  }, [adminToken]);

  const fmt = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)", zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="novee-glass"
        style={{
          borderRadius: 16, padding: "28px 28px 24px",
          width: "min(680px, 95vw)", maxHeight: "80vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(224,82,82,0.6)", marginBottom: 4 }}>
              KERNEL REGISTRY · AUDIT LOG
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.08em" }}>Deleted Modules</div>
            <div style={{ fontSize: 12, color: "rgba(245,237,216,0.4)", marginTop: 4 }}>
              Soft-deleted entries — retained for audit purposes
            </div>
          </div>
          <button
            onClick={onClose}
            className="novee-btn-ghost"
            style={{ padding: "6px 14px", fontSize: 10, letterSpacing: "0.12em", flexShrink: 0 }}
          >
            CLOSE
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "24px 0" }}>
              <div style={{ width: 14, height: 14, border: "1.5px solid rgba(196,97,10,0.3)", borderTopColor: "#C4610A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12, color: "rgba(245,237,216,0.4)" }}>Loading deletion log…</span>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : error ? (
            <div style={{ padding: "16px", background: "rgba(224,82,82,0.08)", borderRadius: 8, fontSize: 13, color: "#e05252" }}>
              {error}
            </div>
          ) : deleted.length === 0 ? (
            <div style={{
              borderRadius: 10, padding: "32px 24px", textAlign: "center",
              color: "rgba(245,237,216,0.35)", fontSize: 13,
              border: "1px solid rgba(245,237,216,0.06)",
            }}>
              No modules have been deleted yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deleted.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    borderRadius: 10, padding: "14px 16px",
                    background: "rgba(224,82,82,0.04)",
                    border: "1px solid rgba(224,82,82,0.14)",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, color: CRAFT_COLORS[mod.craftType] ?? "#6b7280" }}>
                        {CRAFT_ICONS[mod.craftType] ?? "◆"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", color: "#F5EDD8" }}>
                        {mod.name}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(245,237,216,0.35)", letterSpacing: "0.08em" }}>
                        /{mod.slug}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 9, letterSpacing: "0.12em", padding: "2px 8px", borderRadius: 4,
                      background: "rgba(224,82,82,0.1)", color: "#e05252", fontWeight: 700,
                    }}>
                      DELETED
                    </span>
                  </div>
                  {mod.description && (
                    <div style={{ fontSize: 11, color: "rgba(245,237,216,0.4)", paddingLeft: 22 }}>
                      {mod.description}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 16, paddingLeft: 22, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: "rgba(245,237,216,0.3)", letterSpacing: "0.06em" }}>
                      Removed: <span style={{ color: "rgba(245,237,216,0.55)" }}>{fmt(mod.deletedAt)}</span>
                    </span>
                    {mod.deletedBy && (
                      <span style={{ fontSize: 10, color: "rgba(245,237,216,0.3)", letterSpacing: "0.06em" }}>
                        By: <span style={{ color: "rgba(245,237,216,0.55)" }}>{mod.deletedBy}</span>
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "rgba(245,237,216,0.3)", letterSpacing: "0.06em" }}>
                      Craft: <span style={{ color: CRAFT_COLORS[mod.craftType] ?? "#6b7280" }}>{mod.craftType}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && !error && deleted.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(245,237,216,0.07)", fontSize: 10, letterSpacing: "0.1em", color: "rgba(245,237,216,0.25)" }}>
            {deleted.length} DELETED MODULE{deleted.length !== 1 ? "S" : ""} ON RECORD
          </div>
        )}
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
