import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Activity, Monitor, Clock, FileText, Layers, ShieldAlert, Paintbrush, Image, Type, Palette, Check, RotateCcw } from "lucide-react";
import { useCommandCenter, POS_MODE_INFO, type PosOperatingMode } from "@/contexts/CommandCenterContext";
import { usePosContext } from "@/contexts/PosContext";
import { useVenueContext, BACKGROUND_LABELS, DEFAULT_BACKGROUNDS, type BackgroundKey } from "@/contexts/VenueContext";
import ConfirmModal from "@/components/ConfirmModal";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const POS_MODES: PosOperatingMode[] = ["overlay", "hybrid", "full_pos"];

const PRESET_COLORS = [
  "#D4AF37", "#e85d26", "#ef4444", "#ec4899",
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
      cc.addAuditEntry("access.denied", `Unauthorized attempt: change POS mode to ${POS_MODE_INFO[mode].label}`, pos.currentUser?.name);
      return;
    }
    setPendingMode(mode);
  }

  function confirmModeChange() {
    if (pendingMode) {
      cc.setPosMode(pendingMode);
      setPendingMode(null);
    }
  }

  return (
    <BackgroundLayer image={getBackground("settings")} style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b" }}>System & Security</div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Status, devices, and audit trail</div>
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
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${item.color}20`,
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
                  <div style={{ fontSize: 10, color: "rgba(232,224,200,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: `1px solid ${brandColor}20`,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Paintbrush size={14} color={brandColor} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Venue Branding</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Type size={12} /> Venue Name
              </label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e8e0c8", outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Type size={12} /> Tagline
              </label>
              <input
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e8e0c8", outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <Image size={12} /> Logo Image URL
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 10, fontSize: 13,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e8e0c8", outline: "none",
                }}
                onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
              {brandLogoUrl && (
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
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
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
                  {brandColor === c && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>
              ))}
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                style={{
                  width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
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
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>{brandTagline || "Your tagline"}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "rgba(232,224,200,0.3)", textTransform: "uppercase" }}>Preview</div>
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
              border: "none", fontSize: 14, fontWeight: 700, color: "#fff",
              letterSpacing: "0.05em",
              opacity: brandSaving ? 0.6 : 1,
            }}
          >
            {brandSaving ? "Saving..." : brandSaved ? "Branding Saved!" : "Save Branding"}
          </motion.button>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: `1px solid ${brandColor}20`,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Image size={14} color={brandColor} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Background Images</span>
            </div>
            {bgSaved && (
              <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>Saved!</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.35)", marginBottom: 14, lineHeight: 1.5 }}>
            Customize background images for each screen. Paste an image URL or leave blank for the default.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(Object.keys(BACKGROUND_LABELS) as BackgroundKey[]).map((key) => {
              const current = getBackground(key);
              const isCustom = venue.backgrounds[key] !== undefined;
              return (
                <div key={key} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: isCustom ? `${brandColor}08` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isCustom ? `${brandColor}30` : "rgba(255,255,255,0.06)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isCustom ? brandColor : "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(232,224,200,0.4)", padding: 0,
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
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "#e8e0c8", outline: "none", minWidth: 0,
                      }}
                      onFocus={(e) => { e.target.style.borderColor = `${brandColor}60`; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Layers size={14} color="rgba(232,224,200,0.5)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Operating Mode</span>
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
                    background: selected ? `${info.color}10` : "rgba(255,255,255,0.02)",
                    border: `2px solid ${selected ? info.color : "rgba(255,255,255,0.06)"}`,
                    textAlign: "left", position: "relative", overflow: "hidden",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    border: `2px solid ${selected ? info.color : "rgba(255,255,255,0.15)"}`,
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
                    <div style={{ fontSize: 15, fontWeight: 700, color: selected ? info.color : "#e8e0c8", marginBottom: 4 }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(232,224,200,0.45)", lineHeight: 1.5 }}>
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
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Active Session
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Current User</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0c8" }}>{pos.currentUser?.name ?? "None"}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Role</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#d4af37", textTransform: "capitalize" }}>{pos.currentUser?.role ?? "—"}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Orders This Session</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0c8" }}>{pos.orders.length}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Cart Items</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0c8" }}>{pos.cart.reduce((s, c) => s + c.quantity, 0)}</div>
            </div>
          </div>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <FileText size={14} color="rgba(232,224,200,0.5)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent Audit Log</span>
          </div>
          {cc.auditLog.slice(0, 10).map((entry, i) => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{
                  display: "flex", gap: 12, padding: "10px 0",
                  borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.03)" : "none",
                }}>
                <div style={{ fontSize: 11, color: "rgba(232,224,200,0.25)", minWidth: 50, flexShrink: 0 }}>{timeStr}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(232,224,200,0.6)" }}>{entry.details}</div>
                  <div style={{ fontSize: 10, color: "rgba(232,224,200,0.25)", marginTop: 2 }}>{entry.user} · {entry.action}</div>
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
        title="Change POS Mode"
        message={pendingMode ? `Switch to ${POS_MODE_INFO[pendingMode].label} mode? This affects how the system processes transactions and syncs with external POS systems.` : ""}
        confirmLabel="Switch Mode"
        onConfirm={confirmModeChange}
        onCancel={() => setPendingMode(null)}
      />
    </BackgroundLayer>
  );
}
