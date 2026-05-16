import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shield, Activity, Monitor, Clock, FileText, Layers, ShieldAlert, Paintbrush, Image, Type, Palette, Check, RotateCcw, Brain, ExternalLink, ChevronRight, Crown, Zap, RefreshCw } from "lucide-react";
import { SovereignGate } from "@/components/SovereignGate";
import { useCommandCenter, POS_MODE_INFO, type PosOperatingMode } from "@/contexts/CommandCenterContext";
import { usePosContext } from "@/contexts/PosContext";
import { useVenueContext, BACKGROUND_LABELS, DEFAULT_BACKGROUNDS, type BackgroundKey } from "@/contexts/VenueContext";
import { useKernelMode, type KernelMode } from "@/contexts/KernelModeContext";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmModal from "@/components/ConfirmModal";

const POS_MODES: PosOperatingMode[] = ["overlay", "hybrid", "full_pos"];

const PRESET_COLORS = [
  "#D48B00", "#e85d26", "#ef4444", "#ec4899",
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4",
  "#14b8a6", "#22c55e", "#84cc16", "#f59e0b",
];

export default function SettingsModule() {
  const [, navigate] = useLocation();
  const cc = useCommandCenter();
  const pos = usePosContext();
  const { config: venue, updateBranding, updateBackground, getBackground } = useVenueContext();

  const statusColor = cc.systemStatus === "operational" ? "#34d399" : cc.systemStatus === "degraded" ? "#f59e0b" : "#ef4444";
  const onlineDevices = cc.devices.filter(d => d.status === "online").length;
  const lockedDevices = cc.devices.filter(d => d.locked).length;
  const activeStaff = cc.staff.filter(s => s.status === "active").length;
  const modeInfo = POS_MODE_INFO[cc.posMode];

  const kernel = useKernelMode();
  const { user: authUser, token: authToken } = useAuth();
  const isKernelAdmin =
    authUser?.role === "super_admin" ||
    (authUser?.role === "venue_owner" &&
      authUser.venueId != null &&
      authUser.venueId === venue.id);
  const [kernelError, setKernelError] = useState("");
  const [kernelSuccess, setKernelSuccess] = useState(false);
  const [pendingKernelMode, setPendingKernelMode] = useState<KernelMode | null>(null);
  const [kernelRefreshing, setKernelRefreshing] = useState(false);
  const [kernelRefreshSuccess, setKernelRefreshSuccess] = useState(false);
  const [activeOrderCount, setActiveOrderCount] = useState<number | null>(null);
  const [activeOrderCountLoading, setActiveOrderCountLoading] = useState(false);
  const [ownedVenueName, setOwnedVenueName] = useState<string | null>(null);
  const [sovereignReadiness, setSovereignReadiness] = useState<{ ready: boolean; missing: string[] } | null>(null);
  const [sovereignReadinessLoading, setSovereignReadinessLoading] = useState(false);
  const [sovereignReadinessError, setSovereignReadinessError] = useState(false);

  useEffect(() => {
    setOwnedVenueName(null);
    if (isKernelAdmin || authUser?.role !== "venue_owner" || !authUser.venueId) return;
    fetch(`/api/venues/${encodeURIComponent(authUser.venueId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { logoText?: string } | null) => {
        if (data?.logoText) setOwnedVenueName(data.logoText);
      })
      .catch(() => {});
  }, [isKernelAdmin, authUser?.role, authUser?.venueId]);

  async function handleKernelRefresh() {
    setKernelRefreshing(true);
    setKernelRefreshSuccess(false);
    setKernelError("");
    try {
      await kernel.refresh();
      setKernelRefreshSuccess(true);
      setTimeout(() => setKernelRefreshSuccess(false), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refresh failed";
      setKernelError(msg);
      setTimeout(() => setKernelError(""), 5000);
    } finally {
      setKernelRefreshing(false);
    }
  }

  async function applyKernelMode(newMode: KernelMode) {
    if (!authToken) {
      setKernelError("Not authenticated — please log in first");
      setTimeout(() => setKernelError(""), 4000);
      return;
    }
    setKernelError("");
    try {
      await kernel.setMode(newMode, authToken);
      setKernelSuccess(true);
      setTimeout(() => setKernelSuccess(false), 2500);
      cc.addAuditEntry(
        "kernel.mode.change",
        `Kernel mode changed to ${newMode}`,
        authUser?.name ?? pos.currentUser?.name,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update kernel mode";
      setKernelError(msg);
      setTimeout(() => setKernelError(""), 5000);
    }
    setPendingKernelMode(null);
  }

  const isPrivileged = pos.currentUser?.role === "owner" || pos.currentUser?.role === "manager";
  const [pendingMode, setPendingMode] = useState<PosOperatingMode | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [brandName, setBrandName] = useState(venue.logoText);
  const [brandTagline, setBrandTagline] = useState(venue.tagline);
  const [brandColor, setBrandColor] = useState(venue.primaryColor);
  const [brandLogoUrl, setBrandLogoUrl] = useState(venue.logoUrl ?? "");
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState("");
  const [bgSaved, setBgSaved] = useState(false);

  async function saveBranding() {
    if (!brandName.trim()) {
      setBrandError("Venue name is required");
      setTimeout(() => setBrandError(""), 3000);
      return;
    }
    setBrandSaving(true);
    setBrandError("");

    updateBranding({
      logoText: brandName.trim(),
      tagline: brandTagline.trim(),
      primaryColor: brandColor,
      logoUrl: brandLogoUrl.trim() || null,
    });

    try {
      const token = localStorage.getItem("smokecraft_token");
      if (token && venue.id !== "default") {
        await fetch(`/api/venues/${venue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: brandName.trim(),
            tagline: brandTagline.trim(),
            primaryColor: brandColor,
            logoUrl: brandLogoUrl.trim() || null,
          }),
        });
      }
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2500);
      cc.addAuditEntry("branding.update", `Updated venue branding: "${brandName.trim()}"`, pos.currentUser?.name);
    } catch {
      setBrandError("Failed to save — changes applied locally");
      setTimeout(() => setBrandError(""), 4000);
    } finally {
      setBrandSaving(false);
    }
  }

  function handleModeSelect(mode: PosOperatingMode) {
    if (mode === cc.posMode) return;
    if (!isPrivileged) {
      setAccessDenied(true);
      setTimeout(() => setAccessDenied(false), 2500);
      cc.addAuditEntry("access.denied", `Unauthorized attempt: change Commerce mode to ${POS_MODE_INFO[mode].label}`, pos.currentUser?.name);
      return;
    }
    setPendingMode(mode);
  }

  function confirmModeChange() {
    if (pendingMode) {
      const actor = authUser?.name ?? pos.currentUser?.name ?? "Unknown";
      cc.setPosMode(pendingMode, actor);
      setPendingMode(null);
    }
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#1A1A1B", overflow: "hidden", background: "#F5F2ED" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 24px",
        borderBottom: "1px solid rgba(212,139,0,0.10)",
        background: "linear-gradient(180deg, #12100E 0%, #EFEBE0ee 100%)",
        backdropFilter: "blur(16px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(212,139,0,0.06), 0 4px 20px rgba(26,26,27,0.06)",
      }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#2A2A2A", border: "1px solid rgba(212,139,0,0.18)", color: "#6B5E4E", cursor: "pointer", boxShadow: "0 2px 8px rgba(26,26,27,0.06)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#D48B00" }}>System & Security</div>
          <div style={{ fontSize: 13, color: "#6B5E4E" }}>Status, devices, and audit trail</div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 20,
          background: `${modeInfo.color}15`, border: `1px solid ${modeInfo.color}30`,
        }}>
          <Layers size={12} color={modeInfo.color} />
          <span style={{ fontSize: 11, fontWeight: 600, color: modeInfo.color }}>{modeInfo.label} Mode</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { icon: Activity, label: "System Status", value: cc.systemStatus, color: statusColor },
            { icon: Monitor, label: "Devices Online", value: `${onlineDevices}/${cc.devices.length}`, color: "#5b8def" },
            { icon: Shield, label: "Devices Locked", value: `${lockedDevices}`, color: lockedDevices > 0 ? "#ef4444" : "#34d399" },
            { icon: Clock, label: "Active Staff", value: `${activeStaff}`, color: "#a78bfa" },
            { icon: Layers, label: "Operating Mode", value: modeInfo.label, color: modeInfo.color },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{
                  padding: "18px 16px", borderRadius: 14,
                  background: "rgba(26,26,27,0.05)", border: `1px solid ${item.color}20`,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${item.color}10`, border: `1px solid ${item.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color, textTransform: "capitalize" }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(26,26,27,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(26,26,27,0.05)", border: `1px solid ${brandColor}20`,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Paintbrush size={14} color={brandColor} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Venue Branding</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Type size={12} /> Venue Name
              </label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
                  color: "#1A1A1B", outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(26,26,27,0.10)"; }}
              />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Type size={12} /> Tagline
              </label>
              <input
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14,
                  background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
                  color: "#1A1A1B", outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(26,26,27,0.10)"; }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <Image size={12} /> Logo Image URL
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 10, fontSize: 13,
                  background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
                  color: "#1A1A1B", outline: "none",
                }}
                onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(26,26,27,0.10)"; }}
              />
              {brandLogoUrl && (
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: "rgba(26,26,27,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  <img
                    src={brandLogoUrl}
                    alt="Logo preview"
                    style={{ maxWidth: 40, maxHeight: 40, objectFit: "contain" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <Palette size={12} /> Primary Color
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrandColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                    background: c, border: brandColor === c ? "2px solid #e8e0c8" : "2px solid transparent",
                    boxShadow: brandColor === c ? `0 0 10px ${c}60` : "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {brandColor === c && <Check size={14} color="#1A1A1B" strokeWidth={3} />}
                </button>
              ))}
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                style={{
                  width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                  border: "1px solid rgba(26,26,27,0.17)", background: "transparent",
                  padding: 0,
                }}
                title="Custom color"
              />
            </div>
          </div>

          <div style={{
            padding: "14px 16px", borderRadius: 12, marginBottom: 14,
            background: `${brandColor}08`, border: `1px solid ${brandColor}20`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${brandColor}20`, border: `1px solid ${brandColor}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: brandColor,
              }}>
                {brandName.charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: brandColor }}>{brandName || "Venue Name"}</div>
              <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)" }}>{brandTagline || "Your tagline"}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "rgba(26,26,27,0.30)", textTransform: "uppercase" }}>Preview</div>
          </div>

          {brandError && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 10,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              fontSize: 12, color: "#ef4444",
            }}>
              {brandError}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveBranding}
            disabled={brandSaving}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              cursor: brandSaving ? "wait" : "pointer",
              background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
              border: "none", fontSize: 14, fontWeight: 700, color: "#1A1A1B",
              letterSpacing: "0.05em",
              opacity: brandSaving ? 0.6 : 1,
            }}
          >
            {brandSaving ? "Saving..." : brandSaved ? "Branding Saved!" : "Save Branding"}
          </motion.button>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(26,26,27,0.05)", border: `1px solid ${brandColor}20`,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Image size={14} color={brandColor} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Background Images</span>
            </div>
            {bgSaved && (
              <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>Saved!</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "rgba(26,26,27,0.35)", marginBottom: 14, lineHeight: 1.5 }}>
            Customize background images for each screen. Paste an image URL or leave blank for the default.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(Object.keys(BACKGROUND_LABELS) as BackgroundKey[]).map((key) => {
              const current = getBackground(key);
              const isCustom = venue.backgrounds[key] !== undefined;
              return (
                <div key={key} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: isCustom ? `${brandColor}08` : "rgba(26,26,27,0.04)",
                  border: `1px solid ${isCustom ? `${brandColor}30` : "rgba(26,26,27,0.08)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isCustom ? brandColor : "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {BACKGROUND_LABELS[key]}
                    </span>
                    {isCustom && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          updateBackground(key, "");
                          setBgSaved(true);
                          setTimeout(() => setBgSaved(false), 2000);
                          cc.addAuditEntry("background.reset", `Reset ${BACKGROUND_LABELS[key]} background to default`, pos.currentUser?.name);
                        }}
                        title="Reset to default"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                          background: "rgba(26,26,27,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(26,26,27,0.40)", padding: 0,
                        }}
                      >
                        <RotateCcw size={10} />
                      </motion.button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                      backgroundImage: `url(${current})`,
                      backgroundSize: "cover", backgroundPosition: "center",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }} />
                    <input
                      value={venue.backgrounds[key] ?? ""}
                      onChange={(e) => {
                        updateBackground(key, e.target.value);
                        setBgSaved(true);
                        setTimeout(() => setBgSaved(false), 2000);
                      }}
                      placeholder={DEFAULT_BACKGROUNDS[key]}
                      style={{
                        flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 11,
                        background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
                        color: "#1A1A1B", outline: "none", minWidth: 0,
                      }}
                      onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(26,26,27,0.10)"; }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.08)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Layers size={14} color="rgba(26,26,27,0.48)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Operating Mode</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {POS_MODES.map((mode) => {
              const info = POS_MODE_INFO[mode];
              const selected = cc.posMode === mode;
              return (
                <motion.button
                  key={mode}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect(mode)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    padding: "16px", borderRadius: 12, cursor: "pointer",
                    background: selected ? `${info.color}10` : "rgba(26,26,27,0.04)",
                    border: `2px solid ${selected ? info.color : "rgba(26,26,27,0.08)"}`,
                    textAlign: "left", position: "relative", overflow: "hidden",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    border: `2px solid ${selected ? info.color : "rgba(26,26,27,0.17)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "border-color 0.2s",
                  }}>
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        style={{ width: 12, height: 12, borderRadius: "50%", background: info.color }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: selected ? info.color : "#1A1A1B", marginBottom: 4 }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(26,26,27,0.44)", lineHeight: 1.5 }}>
                      {info.description}
                    </div>
                  </div>
                  {selected && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: info.color,
                      padding: "3px 8px", borderRadius: 6,
                      background: `${info.color}20`,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      flexShrink: 0,
                    }}>
                      Active
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {(cc.posModeChangedBy || cc.posModeChangedAt) && (
            <div style={{
              marginTop: 12, display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "rgba(26,26,27,0.40)",
            }}>
              <ShieldAlert size={11} color="rgba(26,26,27,0.30)" />
              <span>
                Last changed
                {cc.posModeChangedBy ? <> by <strong style={{ color: "rgba(26,26,27,0.60)", fontWeight: 600 }}>{cc.posModeChangedBy}</strong></> : null}
                {cc.posModeChangedAt ? <> on {cc.posModeChangedAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} at {cc.posModeChangedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</> : null}
              </span>
            </div>
          )}
        </div>

        {/* ── Kernel Mode ── */}
        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.08)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Crown size={14} color="#D48B00" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Kernel Mode
              </span>
            </div>
            <AnimatePresence>
              {kernelSuccess && (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}
                >
                  Saved!
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div style={{ fontSize: 12, color: "rgba(26,26,27,0.42)", lineHeight: 1.55, marginBottom: 14 }}>
            Controls which feature tier is active for this venue. <strong>Sovereign</strong> unlocks luxury add-ons, AI personalization, and premium analytics. <strong>Essential</strong> locks those features.
            {!isKernelAdmin && (
              <span style={{ display: "block", marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
                {authUser?.role === "venue_owner" ? (
                  <>
                    <span style={{ display: "block", color: "#ef4444", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      Access restricted — this is not your venue.
                    </span>
                    <span style={{ display: "block", color: "rgba(26,26,27,0.55)", fontSize: 11, lineHeight: 1.5 }}>
                      You can only manage kernel mode for{" "}
                      {authUser.venueId ? (
                        <a
                          href={`/?venue=${encodeURIComponent(authUser.venueId)}`}
                          style={{ color: "#D48B00", fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
                          title="Go to your venue's settings"
                        >
                          {ownedVenueName ?? authUser.venueId}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600 }}>your assigned venue</span>
                      )}
                      . Switch to that venue to adjust this setting.
                    </span>
                  </>
                ) : (
                  <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>
                    Super Admin or Venue Owner role required to change this setting.
                  </span>
                )}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {(["sovereign", "essential"] as KernelMode[]).map((m) => {
              const isCurrent = kernel.mode === m;
              const isSovereign = m === "sovereign";
              const accentColor = isSovereign ? "#D48B00" : "#6B5E4E";
              const ModeIcon = isSovereign ? Crown : Zap;
              return (
                <motion.button
                  key={m}
                  whileTap={isKernelAdmin && !kernel.saving ? { scale: 0.97 } : {}}
                  onClick={async () => {
                    if (!isKernelAdmin || isCurrent || kernel.saving) return;
                    setActiveOrderCount(null);
                    setSovereignReadiness(null);
                    setPendingKernelMode(m);
                    if (m === "essential") {
                      setActiveOrderCountLoading(true);
                      try {
                        const qs = authUser?.role === "super_admin" && venue.id && venue.id !== "default"
                          ? `?venueId=${venue.id}`
                          : "";
                        const headers: HeadersInit = {};
                        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
                        const res = await fetch(`/api/swipe-orders/active-count${qs}`, { headers });
                        if (res.ok) {
                          const data = await res.json() as { count: number };
                          setActiveOrderCount(data.count);
                        }
                      } catch {
                        // non-blocking — skip warning on fetch error
                      } finally {
                        setActiveOrderCountLoading(false);
                      }
                    }
                    if (m === "sovereign") {
                      setSovereignReadinessLoading(true);
                      setSovereignReadinessError(false);
                      try {
                        const qs = venue.id && venue.id !== "default" ? `?venueId=${venue.id}` : "";
                        const headers: HeadersInit = {};
                        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
                        const res = await fetch(`/api/kernel/sovereign-readiness${qs}`, { headers });
                        if (res.ok) {
                          const data = await res.json() as { ready: boolean; missing: string[] };
                          setSovereignReadiness(data);
                        } else {
                          setSovereignReadinessError(true);
                        }
                      } catch {
                        setSovereignReadinessError(true);
                      } finally {
                        setSovereignReadinessLoading(false);
                      }
                    }
                  }}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    padding: "16px 12px", borderRadius: 12, cursor: isKernelAdmin && !isCurrent && !kernel.saving ? "pointer" : "default",
                    background: isCurrent ? `${accentColor}12` : "rgba(26,26,27,0.04)",
                    border: `2px solid ${isCurrent ? accentColor : "rgba(26,26,27,0.10)"}`,
                    opacity: kernel.loading || (kernel.saving && !isCurrent) ? 0.5 : 1,
                    transition: "border-color 0.2s, background 0.2s, opacity 0.2s",
                    position: "relative",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: isCurrent ? `${accentColor}18` : "rgba(26,26,27,0.06)",
                    border: `1px solid ${isCurrent ? `${accentColor}35` : "rgba(26,26,27,0.10)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <ModeIcon size={18} color={isCurrent ? accentColor : "rgba(26,26,27,0.30)"} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? accentColor : "rgba(26,26,27,0.40)", textTransform: "capitalize", marginBottom: 2 }}>
                      {m}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,26,27,0.35)", lineHeight: 1.4 }}>
                      {isSovereign ? "Full luxury features" : "Core features only"}
                    </div>
                  </div>
                  {isCurrent && (
                    <span style={{
                      position: "absolute", top: 8, right: 8,
                      fontSize: 9, fontWeight: 700, color: accentColor,
                      padding: "2px 6px", borderRadius: 4,
                      background: `${accentColor}18`,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>
                      {kernel.saving ? "…" : "Active"}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {(kernel.updatedByName || kernel.updatedAt) && (
            <div style={{
              marginTop: 12, display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "rgba(26,26,27,0.40)",
            }}>
              <ShieldAlert size={11} color="rgba(26,26,27,0.30)" />
              <span>
                Last changed
                {kernel.updatedByName ? <> by <strong style={{ color: "rgba(26,26,27,0.60)", fontWeight: 600 }}>{kernel.updatedByName}</strong></> : null}
                {kernel.updatedAt ? <> on {kernel.updatedAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} at {kernel.updatedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</> : null}
              </span>
            </div>
          )}

          {isKernelAdmin && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <motion.button
                whileTap={!kernelRefreshing ? { scale: 0.96 } : {}}
                onClick={handleKernelRefresh}
                disabled={kernelRefreshing}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 10, cursor: kernelRefreshing ? "default" : "pointer",
                  background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.12)",
                  fontSize: 12, fontWeight: 600, color: "rgba(26,26,27,0.55)",
                  opacity: kernelRefreshing ? 0.6 : 1, transition: "opacity 0.2s",
                }}
              >
                <motion.span
                  animate={kernelRefreshing ? { rotate: 360 } : { rotate: 0 }}
                  transition={kernelRefreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
                  style={{ display: "flex" }}
                >
                  <RefreshCw size={13} />
                </motion.span>
                {kernelRefreshing ? "Refreshing…" : "Force Refresh"}
              </motion.button>
              <AnimatePresence>
                {kernelRefreshSuccess && (
                  <motion.span
                    key="refresh-ok"
                    initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}
                  >
                    Up to date!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence>
            {kernelError && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginTop: 10, padding: "10px 14px", borderRadius: 10,
                  background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)",
                  fontSize: 12, color: "#ef4444",
                }}
              >
                {kernelError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Intelligence Systems (Sovereign-gated) ── */}
        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(212,139,0,0.04)", border: "1px solid rgba(212,139,0,0.14)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Brain size={14} color="#D48B00" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Intelligence Systems
            </span>
          </div>
          <SovereignGate
            variant="inline"
            featureName="Intelligence Systems"
            description="AI infrastructure configuration, provider ownership, and BYOK settings are available on the Sovereign plan. Upgrade to unlock full control over how AI is hosted and billed for your venue."
          >
            <div style={{ fontSize: 12, color: "rgba(26,26,27,0.42)", lineHeight: 1.55, marginBottom: 14 }}>
              Configure how AI is owned, hosted, and billed across your venue deployment.
              Choose between NOVEE OS-managed AI or connecting your own provider keys (BYOK).
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "AI Provider",  value: "Managed",  color: "#34d399" },
                { label: "Routing",      value: "NOVEE",    color: "#D48B00" },
                { label: "Failover",     value: "Active",   color: "#5b8def" },
              ].map(item => (
                <div key={item.label} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: `${item.color}0c`, border: `1px solid ${item.color}22`,
                }}>
                  <div style={{ fontSize: 10, color: "rgba(26,26,27,0.35)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/enterprise/ai-config")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                background: "linear-gradient(135deg, rgba(212,139,0,0.12), rgba(212,139,0,0.06))",
                border: "1px solid rgba(212,139,0,0.30)", color: "#D48B00",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Brain size={15} color="#D48B00" />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#D48B00" }}>AI Infrastructure Settings</div>
                  <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", marginTop: 2 }}>
                    Settings → Intelligence Systems → Provider Ownership
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <ExternalLink size={12} color="#D48B00" />
                <ChevronRight size={14} color="#D48B00" />
              </div>
            </motion.button>
          </SovereignGate>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.08)",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Active Session
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(26,26,27,0.30)", marginBottom: 4 }}>Current User</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1B" }}>{pos.currentUser?.name ?? "None"}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(26,26,27,0.30)", marginBottom: 4 }}>Role</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#D48B00", textTransform: "capitalize" }}>{pos.currentUser?.role ?? "—"}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(26,26,27,0.30)", marginBottom: 4 }}>Orders This Session</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1B" }}>{pos.orders.length}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(26,26,27,0.30)", marginBottom: 4 }}>Cart Items</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1B" }}>{pos.cart.reduce((s, c) => s + c.quantity, 0)}</div>
            </div>
          </div>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <FileText size={14} color="rgba(26,26,27,0.48)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent Audit Log</span>
          </div>
          {cc.auditLog.slice(0, 10).map((entry, i) => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{
                  display: "flex", gap: 12, padding: "10px 0",
                  borderBottom: i < 9 ? "1px solid rgba(26,26,27,0.05)" : "none",
                }}>
                <div style={{ fontSize: 11, color: "rgba(26,26,27,0.25)", minWidth: 50, flexShrink: 0 }}>{timeStr}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(26,26,27,0.58)" }}>{entry.details}</div>
                  <div style={{ fontSize: 10, color: "rgba(26,26,27,0.25)", marginTop: 2 }}>{entry.user} · {entry.action}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {accessDenied && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, padding: "14px 24px", borderRadius: 14,
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <ShieldAlert size={18} color="#ef4444" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>Access Denied — Owner or Manager role required</span>
        </motion.div>
      )}

      <ConfirmModal
        open={!!pendingMode}
        title="Change Operating Mode"
        message={pendingMode ? `Switch to ${POS_MODE_INFO[pendingMode].label} mode? This affects how the system processes transactions and syncs with external POS systems.` : ""}
        confirmLabel="Switch Mode"
        onConfirm={confirmModeChange}
        onCancel={() => setPendingMode(null)}
      />

      <ConfirmModal
        open={!!pendingKernelMode}
        title="Change Kernel Mode"
        message={pendingKernelMode ? `Switch to ${pendingKernelMode.charAt(0).toUpperCase() + pendingKernelMode.slice(1)} mode? ${pendingKernelMode === "essential" ? "This will lock luxury features for this venue." : "This will unlock luxury add-ons, AI personalization, and premium analytics for this venue."}` : ""}
        warning={
          pendingKernelMode === "essential" && activeOrderCount != null && activeOrderCount > 0
            ? `${activeOrderCount} active session${activeOrderCount === 1 ? "" : "s"} will lose access to premium features immediately.`
            : pendingKernelMode === "sovereign" && sovereignReadinessError
              ? "AI readiness could not be verified — confirm AI provider configuration before proceeding to avoid silent feature failures."
              : pendingKernelMode === "sovereign" && sovereignReadiness != null && !sovereignReadiness.ready
                ? "AI personalization is unavailable — configure a provider first. Sovereign features requiring AI will silently fail until a provider is set up."
                : undefined
        }
        danger={pendingKernelMode === "essential"}
        confirmDisabled={
          (pendingKernelMode === "essential" && activeOrderCountLoading) ||
          (pendingKernelMode === "sovereign" && sovereignReadinessLoading)
        }
        confirmPhrase={pendingKernelMode === "essential" ? "ESSENTIAL" : undefined}
        confirmLabel={pendingKernelMode === "sovereign" && sovereignReadinessLoading ? "Checking…" : "Confirm Change"}
        onConfirm={() => pendingKernelMode && applyKernelMode(pendingKernelMode)}
        onCancel={() => { setPendingKernelMode(null); setActiveOrderCount(null); setSovereignReadiness(null); setSovereignReadinessError(false); }}
      />
    </div>
  );
}
