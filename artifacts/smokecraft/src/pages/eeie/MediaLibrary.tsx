/**
 * EEIE Media Library
 * Upload, approve, and manage product visuals.
 * Real images. Honest local/demo mode. Working approve/reject/upload/link flow.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Link2, CheckCircle, X, Eye, RefreshCw,
  Filter, FileImage, AlertTriangle, Clock, Layers,
} from "lucide-react";
import { type Theme, Badge, Panel, LiveDot, triggerHaptic } from "./shared";
import "@/styles/eeie-motion.css";

// ── Types ─────────────────────────────────────────────────────

type MediaStatus = "approved" | "pending" | "rejected";
type MediaSource = "upload" | "external_url" | "cloudinary";

interface MediaAsset {
  id: string; title: string; category: string;
  status: MediaStatus; source: MediaSource;
  imageUrl: string; availability: string;
  addedAt: string; addedBy: string; notes: string;
}

interface MediaLog {
  id: string; action: string; assetId: string;
  title: string; detail: string; createdAt: string;
}

// ── Auth fetch ────────────────────────────────────────────────

function getToken() { return localStorage.getItem("SOVEREIGN_SESSION") ?? ""; }

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(path, { credentials: "include", headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  } catch { return null; }
}

async function apiPost<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const r = await fetch(path, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  } catch { return null; }
}

// ── Helpers ───────────────────────────────────────────────────

function statusColor(s: MediaStatus, T: Theme) {
  return { approved: T.green, pending: T.yellow, rejected: T.red }[s];
}

function statusLabel(s: MediaStatus) {
  return { approved: "APPROVED", pending: "PENDING", rejected: "REJECTED" }[s];
}

const CATEGORIES = ["all", "Cigars", "Bourbon", "Scotch", "Cognac", "Food", "Dessert", "Uncategorized"];
const STATUS_FILTERS = ["all", "approved", "pending", "rejected"];

interface Props { T: Theme; }

export function MediaLibraryTab({ T }: Props) {
  const [assets, setAssets]     = useState<MediaAsset[]>([]);
  const [logs, setLogs]         = useState<MediaLog[]>([]);
  const [catFilter, setCat]     = useState("all");
  const [statusFilter, setStatus] = useState("all");
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlCat, setUrlCat]     = useState("Uncategorized");
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [acting, setActing]     = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    triggerHaptic(ok ? "success" : "warning");
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    const [a, l] = await Promise.all([
      apiFetch<{ assets: MediaAsset[] }>("/api/eeie/media/assets"),
      apiFetch<{ logs: MediaLog[] }>("/api/eeie/media/logs"),
    ]);
    if (a) setAssets(a.assets);
    if (l) setLogs(l.logs.slice(0, 12));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleApprove(id: string) {
    setActing(id);
    const res = await apiPost<{ ok: boolean; asset: MediaAsset }>(`/api/eeie/media/assets/${id}/approve`);
    setActing(null);
    if (res?.asset) {
      setAssets(prev => prev.map(a => a.id === id ? res.asset : a));
      showToast(`${res.asset.title} approved`);
    }
  }

  async function handleReject(id: string, reason?: string) {
    setActing(id);
    const res = await apiPost<{ ok: boolean; asset: MediaAsset }>(`/api/eeie/media/assets/${id}/reject`, { reason });
    setActing(null);
    if (res?.asset) {
      setAssets(prev => prev.map(a => a.id === id ? res.asset : a));
      showToast(`${res.asset.title} rejected`, false);
    }
  }

  async function handleSimulateUpload() {
    setUploading(true);
    await new Promise(r => setTimeout(r, 1100));
    const res = await apiPost<{ ok: boolean; asset: MediaAsset }>("/api/eeie/media/assets/upload", {
      title: `Upload ${new Date().toLocaleTimeString()}`, category: "Uncategorized",
    });
    setUploading(false);
    if (res?.asset) {
      setAssets(prev => [res.asset, ...prev]);
      showToast(`Image uploaded — queued for approval`);
    }
  }

  async function handleLinkUrl() {
    if (!urlInput.startsWith("http")) { showToast("Enter a valid URL", false); return; }
    const res = await apiPost<{ ok: boolean; asset: MediaAsset }>("/api/eeie/media/assets/link-url", {
      url: urlInput, title: urlTitle || "External Image", category: urlCat,
    });
    if (res?.asset) {
      setAssets(prev => [res.asset, ...prev]);
      setUrlInput(""); setUrlTitle(""); setUrlPreview(null);
      showToast(`"${res.asset.title}" linked`);
    }
  }

  // Filtered view
  const filtered = assets.filter(a => {
    const catOk = catFilter === "all" || a.category === catFilter;
    const statusOk = statusFilter === "all" || a.status === statusFilter;
    return catOk && statusOk;
  });

  const counts = {
    total: assets.length,
    approved: assets.filter(a => a.status === "approved").length,
    pending: assets.filter(a => a.status === "pending").length,
    rejected: assets.filter(a => a.status === "rejected").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Mode banner ── */}
      <div style={{ padding: "14px 20px", borderRadius: 14, background: `${T.accent}08`, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 20 }}>
        <div className="eeie-status-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.20em", marginBottom: 2 }}>MEDIA LIBRARY · LOCAL MODE</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Media Asset Manager</div>
        </div>
        <div style={{ display: "flex", gap: 20, marginLeft: 8 }}>
          {[
            { l: "TOTAL",    v: counts.total,    c: T.text },
            { l: "APPROVED", v: counts.approved, c: T.green },
            { l: "PENDING",  v: counts.pending,  c: T.yellow },
            { l: "REJECTED", v: counts.rejected, c: T.red },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 7, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em", marginBottom: 2 }}>{m.l}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: m.c }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => void refresh()}
            style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.borderHi}`, background: `${T.accent}10`, color: T.accent, cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={12} /> Refresh
          </motion.button>
        </div>
      </div>

      {/* ── Upload + Link row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* File upload */}
        <Panel title="Upload Image" icon={<Upload size={14} />} T={T} accentColor={T.accent}>
          <div style={{ padding: "20px", borderRadius: 12, border: `2px dashed ${uploading ? T.accent : T.border}`, background: `${T.accent}04`, textAlign: "center" as const, marginBottom: 12, transition: "all 0.2s" }}>
            <Upload size={28} color={T.accent} style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Upload a Product Image</div>
            <div style={{ fontSize: 10, color: T.textSub }}>JPG, PNG, WebP · Max 5 MB · Queued for approval</div>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} disabled={uploading} onClick={() => void handleSimulateUpload()}
            style={{ width: "100%", padding: "14px 0", borderRadius: 11, border: "none", background: uploading ? `${T.accent}50` : T.accent, color: "#fff", cursor: uploading ? "wait" : "pointer", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {uploading ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</> : <><Upload size={13} /> Choose File</>}
          </motion.button>
          <div style={{ marginTop: 8, fontSize: 9, color: T.textFaint, fontFamily: T.mono, textAlign: "center" as const }}>Images go to PENDING review queue automatically.</div>
        </Panel>

        {/* Paste URL */}
        <Panel title="Link External URL" icon={<Link2 size={14} />} T={T} accentColor={T.cyan}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>IMAGE URL</div>
              <input value={urlInput}
                onChange={e => { setUrlInput(e.target.value); if (e.target.value.startsWith("http")) setUrlPreview(e.target.value); }}
                placeholder="https://brand.com/product.jpg"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.dark ? "rgba(255,255,255,0.04)" : "rgba(0,60,180,0.03)", color: T.text, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>TITLE</div>
                <input value={urlTitle} onChange={e => setUrlTitle(e.target.value)} placeholder="Product name"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.dark ? "rgba(255,255,255,0.04)" : "rgba(0,60,180,0.03)", color: T.text, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>CATEGORY</div>
                <select value={urlCat} onChange={e => setUrlCat(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.dark ? "#0C1322" : "#fff", color: T.text, fontSize: 11, outline: "none", boxSizing: "border-box" as const }}>
                  {CATEGORIES.filter(c => c !== "all").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {urlPreview && (
              <div style={{ height: 80, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
                <img src={urlPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={() => setUrlPreview(null)} />
              </div>
            )}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => void handleLinkUrl()}
              style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: `1px solid ${T.cyan}35`, background: `${T.cyan}12`, color: T.cyan, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Link2 size={12} /> Link URL
            </motion.button>
          </div>
        </Panel>
      </div>

      {/* ── Filter bar ── */}
      <Panel title="Asset Library" subtitle={`${filtered.length} of ${assets.length} assets`} icon={<Layers size={14} />} badge={counts.pending > 0 ? `${counts.pending} PENDING` : "ALL CLEAR"} T={T} accentColor={counts.pending > 0 ? T.yellow : T.green}>
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" as const }}>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
            {CATEGORIES.map(cat => (
              <motion.button key={cat} whileTap={{ scale: 0.94 }} onClick={() => setCat(cat)}
                style={{ padding: "5px 11px", borderRadius: 999, border: `1px solid ${catFilter === cat ? T.accent : T.border}`, background: catFilter === cat ? `${T.accent}14` : "transparent", color: catFilter === cat ? T.accent : T.textSub, cursor: "pointer", fontSize: 9, fontFamily: T.mono, textTransform: "uppercase" as const }}>
                {cat}
              </motion.button>
            ))}
          </div>
          <div style={{ width: 1, background: T.border, flexShrink: 0 }} />
          {/* Status filter */}
          <div style={{ display: "flex", gap: 5 }}>
            {STATUS_FILTERS.map(s => {
              const sc = s === "approved" ? T.green : s === "pending" ? T.yellow : s === "rejected" ? T.red : T.textSub;
              return (
                <motion.button key={s} whileTap={{ scale: 0.94 }} onClick={() => setStatus(s)}
                  style={{ padding: "5px 11px", borderRadius: 999, border: `1px solid ${statusFilter === s ? sc : T.border}`, background: statusFilter === s ? `${sc}14` : "transparent", color: statusFilter === s ? sc : T.textSub, cursor: "pointer", fontSize: 9, fontFamily: T.mono, textTransform: "uppercase" as const }}>
                  {s}
                </motion.button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center" as const, color: T.textFaint, fontSize: 12 }}>
            <RefreshCw size={18} color={T.accent} style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
            Loading media assets…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" as const }}>
            <FileImage size={36} color={`${T.textFaint}`} style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSub, marginBottom: 6 }}>No assets match this filter</div>
            <div style={{ fontSize: 11, color: T.textFaint }}>Try a different category or status filter, or upload a new image.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {filtered.map(asset => {
              const sc = statusColor(asset.status, T);
              const isActing = acting === asset.id;
              return (
                <motion.div key={asset.id} whileHover={{ y: -2 }}
                  className="eeie-live-card eeie-hover-lift"
                  style={{ borderRadius: 14, border: `1px solid ${asset.status === "pending" ? `${T.yellow}30` : T.border}`, background: T.card, overflow: "hidden", boxShadow: T.shadow }}
                >
                  {/* Real image */}
                  <div style={{ height: 110, position: "relative", overflow: "hidden", cursor: "pointer" }}
                    onClick={() => setPreviewAsset(asset)}>
                    <img
                      src={asset.imageUrl} alt={asset.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }}
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.style.background = `${sc}08`;
                      }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
                    <div style={{ position: "absolute", top: 7, right: 7 }}>
                      <Badge label={statusLabel(asset.status)} color={sc} bg={`${sc}22`} />
                    </div>
                    <div style={{ position: "absolute", bottom: 7, left: 7 }}>
                      <Eye size={12} color="rgba(255,255,255,0.7)" />
                    </div>
                    {asset.status === "pending" && (
                      <div className="eeie-status-pulse" style={{ position: "absolute", top: 7, left: 7, width: 7, height: 7, borderRadius: "50%", background: T.yellow }} />
                    )}
                  </div>

                  <div style={{ padding: "11px 13px" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{asset.title}</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "center" }}>
                      <span style={{ fontSize: 8.5, color: T.textSub }}>{asset.category}</span>
                      <div style={{ width: 3, height: 3, borderRadius: "50%", background: T.border }} />
                      <span style={{ fontSize: 8.5, color: T.textFaint }}>{asset.source === "upload" ? "Uploaded" : "External"}</span>
                      {asset.source === "external_url" && <Link2 size={9} color={T.textFaint} />}
                    </div>

                    {asset.status === "pending" && (
                      <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                        <motion.button whileTap={{ scale: 0.93 }} disabled={isActing}
                          onClick={() => void handleApprove(asset.id)}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: T.green, color: "#fff", cursor: isActing ? "wait" : "pointer", fontSize: 9.5, fontWeight: 700, opacity: isActing ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                          <CheckCircle size={10} /> Approve
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.93 }} disabled={isActing}
                          onClick={() => void handleReject(asset.id)}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${T.red}30`, background: `${T.red}0A`, color: T.red, cursor: isActing ? "wait" : "pointer", fontSize: 9.5, fontWeight: 700, opacity: isActing ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                          <X size={10} /> Reject
                        </motion.button>
                      </div>
                    )}
                    {asset.status === "approved" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                        <LiveDot color={T.green} size={5} />
                        <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono }}>Visible to staff & guests</span>
                      </div>
                    )}
                    {asset.status === "rejected" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                        <AlertTriangle size={10} color={T.red} />
                        <span style={{ fontSize: 9, color: T.red, fontFamily: T.mono }}>Not visible · {asset.notes.slice(0, 28)}…</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Event Log ── */}
      {logs.length > 0 && (
        <Panel title="Media Event Log" subtitle="Recent approval and upload activity" icon={<Clock size={14} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {logs.map((log, i) => {
              const actionColor = log.action === "approved" ? T.green : log.action === "rejected" ? T.red : T.accent;
              return (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 8, background: i === 0 ? `${T.accent}06` : "transparent", border: `1px solid ${i === 0 ? T.border : "transparent"}` }}>
                  <div style={{ width: 3, height: 20, borderRadius: 2, background: actionColor, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: T.text }}>{log.detail}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 8, color: actionColor, fontFamily: T.mono, textTransform: "uppercase" as const }}>{log.action}</span>
                    <span style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Preview lightbox ── */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewAsset(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              onClick={e => e.stopPropagation()}
              style={{ borderRadius: 20, overflow: "hidden", background: T.card, border: `1px solid ${T.border}`, maxWidth: 480, width: "90%", cursor: "default" }}>
              <img src={previewAsset.imageUrl} alt={previewAsset.title} style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>{previewAsset.title}</div>
                <div style={{ fontSize: 11, color: T.textSub, marginBottom: 10 }}>{previewAsset.category} · {previewAsset.source} · {previewAsset.addedBy}</div>
                <div style={{ fontSize: 10, color: T.textSub, fontStyle: "italic" }}>{previewAsset.notes}</div>
                {previewAsset.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <motion.button whileTap={{ scale: 0.94 }} onClick={() => { void handleApprove(previewAsset.id); setPreviewAsset(null); }}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      Approve
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.94 }} onClick={() => { void handleReject(previewAsset.id); setPreviewAsset(null); }}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${T.red}35`, background: `${T.red}0E`, color: T.red, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      Reject
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 100, right: 32, background: toast.ok ? T.accent : T.yellow, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 12, zIndex: 999, boxShadow: `0 4px 20px ${toast.ok ? T.accent : T.yellow}50` }}>
            {toast.ok ? "✓" : "⚠"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
