/**
 * GlobalProviderControlCenter — Phase 1–5 master API control panel.
 *
 * Super-admin-only panel that provides:
 *  - Per-category global enable/disable toggles (12 categories)
 *  - Emergency shutdown with double-confirm guard
 *  - Restore operations
 *  - Per-venue access control grid (demo mode, lock/unlock, revoke, expiry)
 *
 * Wired to /api/integration-kernel/admin/* endpoints.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { key: "ai",        label: "AI Providers",   icon: "◈" },
  { key: "pos",       label: "POS Systems",    icon: "⊞" },
  { key: "payment",   label: "Payments",       icon: "◇" },
  { key: "music",     label: "Music & Audio",  icon: "♩" },
  { key: "lighting",  label: "Lighting",       icon: "✦" },
  { key: "sensor",    label: "Sensors",        icon: "◉" },
  { key: "crm",       label: "CRM & Comms",   icon: "⊛" },
  { key: "booking",   label: "Booking",        icon: "▦" },
  { key: "voice",     label: "Voice",          icon: "◎" },
  { key: "analytics", label: "Analytics",      icon: "▲" },
  { key: "device",    label: "Devices",        icon: "⊟" },
  { key: "custom",    label: "Custom APIs",    icon: "⟡" },
] as const;

interface CategoryState {
  key:       string;
  isEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason:    string | null;
}

interface VenueAccess {
  id:                string;
  venueId:           string;
  isEnabled:         boolean;
  isDemoMode:        boolean;
  demoExpiresAt:     string | null;
  isLocked:          boolean;
  lockedReason:      string | null;
  allowedCategories: string[] | null;
  updatedBy:         string | null;
  updatedAt:         string;
}

interface Props {
  GOLD:  string;
  CREAM: string;
}

type Tab = "categories" | "venues";

const AUTH = () => ({ Authorization: `Bearer ${localStorage.getItem("axiom_token") ?? ""}` });
const JSON_HDRS = () => ({ ...AUTH(), "Content-Type": "application/json" });

export function GlobalProviderControlCenter({ GOLD, CREAM }: Props) {
  const [tab,            setTab]            = useState<Tab>("categories");
  const [categories,     setCategories]     = useState<CategoryState[]>([]);
  const [shutdown,       setShutdown]       = useState(false);
  const [venueAccess,    setVenueAccess]    = useState<VenueAccess[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState<string | null>(null);
  const [confirmShutdown,setConfirmShutdown]= useState(false);
  const [newVenueId,     setNewVenueId]     = useState("");
  const [editVenue,      setEditVenue]      = useState<VenueAccess | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ctrlRes, venueRes] = await Promise.all([
        fetch("/api/integration-kernel/admin/global-controls", { headers: AUTH() }),
        fetch("/api/integration-kernel/admin/venue-access",   { headers: AUTH() }),
      ]);
      if (ctrlRes.ok) {
        const d = await ctrlRes.json() as { categories: CategoryState[]; emergencyShutdownActive: boolean };
        setCategories(d.categories ?? []);
        setShutdown(d.emergencyShutdownActive ?? false);
      }
      if (venueRes.ok) {
        const d = await venueRes.json() as { venueAccess: VenueAccess[] };
        setVenueAccess(d.venueAccess ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleCategory(key: string, current: boolean) {
    setSaving(`cat:${key}`);
    try {
      await fetch(`/api/integration-kernel/admin/global-controls/category:${key}`, {
        method: "PUT",
        headers: JSON_HDRS(),
        body: JSON.stringify({ isEnabled: !current }),
      });
      void load();
    } catch { /* silent */ }
    finally { setSaving(null); }
  }

  async function triggerEmergencyShutdown() {
    setSaving("shutdown");
    try {
      await fetch("/api/integration-kernel/admin/emergency-shutdown", {
        method: "POST",
        headers: JSON_HDRS(),
        body: JSON.stringify({ reason: "Emergency shutdown via Global Control Center" }),
      });
      setConfirmShutdown(false);
      void load();
    } catch { /* silent */ }
    finally { setSaving(null); }
  }

  async function triggerRestore() {
    setSaving("restore");
    try {
      await fetch("/api/integration-kernel/admin/restore-operations", {
        method: "POST",
        headers: JSON_HDRS(),
      });
      void load();
    } catch { /* silent */ }
    finally { setSaving(null); }
  }

  async function revokeVenue(venueId: string) {
    setSaving(`revoke:${venueId}`);
    try {
      await fetch(`/api/integration-kernel/admin/venue-access/${venueId}/revoke`, {
        method: "POST",
        headers: JSON_HDRS(),
        body: JSON.stringify({ reason: "Revoked via Global Control Center" }),
      });
      void load();
    } catch { /* silent */ }
    finally { setSaving(null); }
  }

  async function restoreVenue(venueId: string) {
    setSaving(`restore:${venueId}`);
    try {
      await fetch(`/api/integration-kernel/admin/venue-access/${venueId}/restore`, {
        method: "POST",
        headers: JSON_HDRS(),
      });
      void load();
    } catch { /* silent */ }
    finally { setSaving(null); }
  }

  async function saveVenueEdit() {
    if (!editVenue) return;
    setSaving(`edit:${editVenue.venueId}`);
    try {
      await fetch(`/api/integration-kernel/admin/venue-access/${editVenue.venueId}`, {
        method: "PUT",
        headers: JSON_HDRS(),
        body: JSON.stringify({
          isEnabled:      editVenue.isEnabled,
          isDemoMode:     editVenue.isDemoMode,
          demoExpiresAt:  editVenue.demoExpiresAt,
        }),
      });
      setEditVenue(null);
      void load();
    } catch { /* silent */ }
    finally { setSaving(null); }
  }

  async function addVenueAccess() {
    if (!newVenueId.trim()) return;
    setSaving("new-venue");
    try {
      await fetch(`/api/integration-kernel/admin/venue-access/${newVenueId.trim()}`, {
        method: "PUT",
        headers: JSON_HDRS(),
        body: JSON.stringify({ isEnabled: true }),
      });
      setNewVenueId("");
      void load();
    } catch { /* silent */ }
    finally { setSaving(null); }
  }

  const RED   = "#C84A4A";
  const GREEN = "#32B45A";
  const AMBER = "#C8A00A";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
            GLOBAL PROVIDER CONTROL CENTER
          </div>
          <div style={{ fontSize: 9, color: `${GOLD}55`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif", marginTop: 1 }}>
            MASTER API CONTROLS · SUPER ADMIN
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            padding: "3px 9px", borderRadius: 5,
            background: shutdown ? `${RED}18` : `${GREEN}18`,
            border: `1px solid ${shutdown ? RED : GREEN}44`,
            fontSize: 8, fontWeight: 700,
            color: shutdown ? RED : GREEN,
            fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em",
          }}>
            {shutdown ? "SHUTDOWN ACTIVE" : "SYSTEMS NOMINAL"}
          </div>
        </div>
      </div>

      {/* Emergency controls */}
      <div style={{ padding: "11px 13px", borderRadius: 9, background: shutdown ? `${RED}0C` : "rgba(255,255,255,0.025)", border: `1px solid ${shutdown ? RED + "44" : "rgba(255,255,255,0.08)"}` }}>
        <div style={{ fontSize: 9, color: `${GOLD}88`, letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif", marginBottom: 8 }}>
          EMERGENCY CONTROLS
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <AnimatePresence mode="wait">
            {!confirmShutdown && !shutdown && (
              <motion.button key="pre" type="button" whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirmShutdown(true)}
                style={{ flex: 1, padding: "10px", borderRadius: 7, border: `1px solid ${RED}55`, background: `${RED}12`, color: RED, fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>
                ⬛ EMERGENCY SHUTDOWN
              </motion.button>
            )}
            {confirmShutdown && (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 9, color: RED, fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em", textAlign: "center", padding: "5px 0" }}>
                  CONFIRM: This disables ALL providers across ALL venues immediately.
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => void triggerEmergencyShutdown()}
                    disabled={saving === "shutdown"}
                    style={{ flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${RED}77`, background: RED, color: "#fff", fontSize: 10, fontWeight: 900, cursor: "pointer", letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
                    {saving === "shutdown" ? "EXECUTING..." : "CONFIRM SHUTDOWN"}
                  </motion.button>
                  <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setConfirmShutdown(false)}
                    style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${GOLD}33`, background: "transparent", color: `${GOLD}66`, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                    CANCEL
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {shutdown && (
            <motion.button type="button" whileTap={{ scale: 0.95 }}
              onClick={() => void triggerRestore()}
              disabled={saving === "restore"}
              style={{ flex: 1, padding: "10px", borderRadius: 7, border: `1px solid ${GREEN}55`, background: `${GREEN}12`, color: GREEN, fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>
              {saving === "restore" ? "RESTORING..." : "▶ RESTORE OPERATIONS"}
            </motion.button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 5 }}>
        {(["categories", "venues"] as Tab[]).map(t => (
          <motion.button key={t} type="button" whileTap={{ scale: 0.95 }} onClick={() => setTab(t)}
            style={{ padding: "4px 11px", borderRadius: 5, border: `1px solid ${tab === t ? GOLD + "55" : GOLD + "18"}`, background: tab === t ? `rgba(212,175,55,0.12)` : "transparent", color: tab === t ? GOLD : `${GOLD}44`, fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif" }}>
            {t === "categories" ? "CATEGORY TOGGLES" : "VENUE ACCESS"}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Category toggles ── */}
        {tab === "categories" && (
          <motion.div key="cats" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {loading && <div style={{ textAlign: "center", padding: 14, color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>LOADING...</div>}
            {CATEGORIES.map(cat => {
              const state = categories.find(c => c.key === `category:${cat.key}`);
              const enabled = state?.isEnabled ?? true;
              const isSaving = saving === `cat:${cat.key}`;
              return (
                <motion.div key={cat.key} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                  style={{ padding: "10px 13px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: `1px solid ${enabled ? GOLD + "18" : RED + "33"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ fontSize: 14, color: enabled ? GOLD : `${RED}88`, width: 18, textAlign: "center" }}>{cat.icon}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: enabled ? CREAM : `${CREAM}66`, fontFamily: "'Inter',sans-serif" }}>{cat.label}</div>
                      {state?.reason && (
                        <div style={{ fontSize: 8, color: `${GOLD}44`, fontFamily: "'Inter',sans-serif", marginTop: 1 }}>{state.reason}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ padding: "2px 7px", borderRadius: 4, background: enabled ? `${GREEN}14` : `${RED}14`, border: `1px solid ${enabled ? GREEN : RED}44`, fontSize: 8, fontWeight: 700, color: enabled ? GREEN : RED, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em" }}>
                      {enabled ? "ENABLED" : "DISABLED"}
                    </div>
                    <motion.button type="button" whileTap={{ scale: 0.92 }}
                      onClick={() => void toggleCategory(cat.key, enabled)}
                      disabled={isSaving}
                      style={{
                        width: 38, height: 20, borderRadius: 10,
                        background: enabled ? `linear-gradient(90deg, ${GREEN}88, ${GREEN})` : "rgba(255,255,255,0.1)",
                        border: `1px solid ${enabled ? GREEN + "66" : "rgba(255,255,255,0.15)"}`,
                        cursor: "pointer", position: "relative", flexShrink: 0, opacity: isSaving ? 0.5 : 1,
                      }}>
                      <motion.div animate={{ x: enabled ? 18 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        style={{ position: "absolute", top: 2, left: 0, width: 14, height: 14, borderRadius: 7, background: enabled ? "#fff" : "rgba(255,255,255,0.5)" }} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
            <div style={{ padding: "7px 11px", borderRadius: 6, background: `rgba(212,175,55,0.06)`, border: `1px solid ${GOLD}15`, fontSize: 8, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
              Disabling a category blocks all requests to that integration type across every venue immediately. Re-enabling takes effect without deployment.
            </div>
          </motion.div>
        )}

        {/* ── Venue access ── */}
        {tab === "venues" && (
          <motion.div key="venues" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 7 }}>

            {/* Add venue */}
            <div style={{ display: "flex", gap: 6 }}>
              <input value={newVenueId} onChange={e => setNewVenueId(e.target.value)}
                placeholder="Venue ID to add..."
                style={{ flex: 1, padding: "7px 11px", borderRadius: 6, border: `1px solid ${GOLD}33`, background: "rgba(255,255,255,0.04)", color: CREAM, fontSize: 10, fontFamily: "'Inter',sans-serif", outline: "none" }} />
              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => void addVenueAccess()} disabled={!newVenueId.trim() || saving === "new-venue"}
                style={{ padding: "7px 12px", borderRadius: 6, border: `1px solid ${GOLD}44`, background: `rgba(212,175,55,0.12)`, color: GOLD, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                ADD
              </motion.button>
            </div>

            {loading && <div style={{ textAlign: "center", padding: 12, color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>LOADING...</div>}
            {!loading && venueAccess.length === 0 && (
              <div style={{ textAlign: "center", padding: 14, color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>No venue access records configured</div>
            )}

            {venueAccess.map(v => (
              <motion.div key={v.venueId} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: "11px 13px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: `1px solid ${v.isLocked ? RED + "44" : v.isDemoMode ? AMBER + "44" : GOLD + "18"}` }}>

                {editVenue?.venueId === v.venueId ? (
                  /* Inline editor */
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, fontFamily: "'Inter',sans-serif" }}>{v.venueId}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[
                        { label: "Access Enabled",  field: "isEnabled"   as const },
                        { label: "Demo Mode",        field: "isDemoMode"  as const },
                      ].map(item => (
                        <label key={item.field} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input type="checkbox" checked={editVenue[item.field] as boolean}
                            onChange={e => setEditVenue(ev => ev ? { ...ev, [item.field]: e.target.checked } : ev)}
                            style={{ accentColor: GOLD }} />
                          <span style={{ fontSize: 9, color: `${GOLD}88`, fontFamily: "'Inter',sans-serif" }}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    {editVenue.isDemoMode && (
                      <div>
                        <div style={{ fontSize: 8, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", marginBottom: 3 }}>DEMO EXPIRES AT</div>
                        <input type="datetime-local"
                          value={editVenue.demoExpiresAt ? editVenue.demoExpiresAt.slice(0, 16) : ""}
                          onChange={e => setEditVenue(ev => ev ? { ...ev, demoExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : null } : ev)}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 5, border: `1px solid ${GOLD}33`, background: "rgba(255,255,255,0.04)", color: CREAM, fontSize: 10, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => void saveVenueEdit()} disabled={saving === `edit:${v.venueId}`}
                        style={{ flex: 1, padding: "7px", borderRadius: 5, border: `1px solid ${GOLD}55`, background: `rgba(212,175,55,0.14)`, color: GOLD, fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                        {saving === `edit:${v.venueId}` ? "SAVING..." : "SAVE"}
                      </motion.button>
                      <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setEditVenue(null)}
                        style={{ padding: "7px 12px", borderRadius: 5, border: `1px solid ${GOLD}22`, background: "transparent", color: `${GOLD}55`, fontSize: 9, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                        CANCEL
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  /* Display row */
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: v.isLocked ? `${RED}CC` : CREAM, fontFamily: "'Inter',sans-serif" }}>{v.venueId}</div>
                        <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                          <span style={{ padding: "1px 6px", borderRadius: 3, background: v.isEnabled ? `${GREEN}14` : `${RED}14`, border: `1px solid ${v.isEnabled ? GREEN : RED}33`, fontSize: 7, fontWeight: 700, color: v.isEnabled ? GREEN : RED, fontFamily: "'Inter',sans-serif" }}>
                            {v.isEnabled ? "ENABLED" : "DISABLED"}
                          </span>
                          {v.isDemoMode && (
                            <span style={{ padding: "1px 6px", borderRadius: 3, background: `${AMBER}14`, border: `1px solid ${AMBER}33`, fontSize: 7, fontWeight: 700, color: AMBER, fontFamily: "'Inter',sans-serif" }}>
                              DEMO {v.demoExpiresAt ? `· EXP ${new Date(v.demoExpiresAt).toLocaleDateString()}` : ""}
                            </span>
                          )}
                          {v.isLocked && (
                            <span style={{ padding: "1px 6px", borderRadius: 3, background: `${RED}14`, border: `1px solid ${RED}33`, fontSize: 7, fontWeight: 700, color: RED, fontFamily: "'Inter',sans-serif" }}>
                              LOCKED {v.lockedReason ? `· ${v.lockedReason.slice(0, 24)}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <motion.button type="button" whileTap={{ scale: 0.93 }} onClick={() => setEditVenue(v)}
                          style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${GOLD}33`, background: "transparent", color: `${GOLD}88`, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                          EDIT
                        </motion.button>
                        {!v.isLocked ? (
                          <motion.button type="button" whileTap={{ scale: 0.93 }}
                            onClick={() => void revokeVenue(v.venueId)}
                            disabled={saving === `revoke:${v.venueId}`}
                            style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${RED}44`, background: `${RED}10`, color: RED, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                            {saving === `revoke:${v.venueId}` ? "..." : "REVOKE"}
                          </motion.button>
                        ) : (
                          <motion.button type="button" whileTap={{ scale: 0.93 }}
                            onClick={() => void restoreVenue(v.venueId)}
                            disabled={saving === `restore:${v.venueId}`}
                            style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${GREEN}44`, background: `${GREEN}10`, color: GREEN, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                            {saving === `restore:${v.venueId}` ? "..." : "RESTORE"}
                          </motion.button>
                        )}
                      </div>
                    </div>
                    {v.updatedAt && (
                      <div style={{ fontSize: 7, color: `${GOLD}33`, fontFamily: "'Inter',sans-serif" }}>
                        Last updated: {new Date(v.updatedAt).toLocaleString()} {v.updatedBy ? `by ${v.updatedBy}` : ""}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
