/**
 * EEIE Unified Data Brain Tab — Data streams, Media Library stub, Distributor stub.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, Wifi, WifiOff, Upload, Link2, CheckCircle,
  AlertTriangle, RefreshCw, Eye, Trash2, BarChart2,
} from "lucide-react";
import { type Theme, Badge, Meter, Panel, LiveDot, triggerHaptic } from "./shared";

interface DataStream {
  id: string; label: string; status: "connected" | "syncing" | "delayed" | "offline" | "attention";
  lastSync: string; throughput: number; icon: string;
}

const STREAMS: DataStream[] = [
  { id: "pos",        label: "POS Adapter",       status: "connected", lastSync: "2s ago",  throughput: 98, icon: "⊞" },
  { id: "inventory",  label: "Inventory",          status: "connected", lastSync: "5s ago",  throughput: 95, icon: "◫" },
  { id: "media",      label: "Media Library",      status: "connected", lastSync: "12s ago", throughput: 87, icon: "◻" },
  { id: "dist",       label: "Distributor Library",status: "syncing",   lastSync: "28s ago", throughput: 70, icon: "◈" },
  { id: "bar",        label: "Bar System",         status: "connected", lastSync: "3s ago",  throughput: 92, icon: "◉" },
  { id: "kitchen",    label: "Kitchen System",     status: "delayed",   lastSync: "2m ago",  throughput: 54, icon: "◑" },
  { id: "guests",     label: "Guest Profiles",     status: "connected", lastSync: "8s ago",  throughput: 99, icon: "◎" },
  { id: "staff",      label: "Staff Actions",      status: "connected", lastSync: "1s ago",  throughput: 100, icon: "◆" },
  { id: "eventbus",   label: "Event Bus",          status: "connected", lastSync: "0.4s ago",throughput: 100, icon: "◇" },
  { id: "sensors",    label: "Sensor Layer",       status: "attention", lastSync: "45s ago", throughput: 41, icon: "◐" },
  { id: "ai",         label: "AI Predictions",     status: "connected", lastSync: "15s ago", throughput: 88, icon: "◧" },
  { id: "founder",    label: "Founder Control",    status: "connected", lastSync: "live",    throughput: 100, icon: "★" },
  { id: "devices",    label: "Device Ecosystem",   status: "connected", lastSync: "6s ago",  throughput: 91, icon: "▣" },
  { id: "mood",       label: "Mood Sensor",        status: "syncing",   lastSync: "18s ago", throughput: 65, icon: "▤" },
  { id: "heatmap",    label: "Venue Heatmap",      status: "connected", lastSync: "4s ago",  throughput: 94, icon: "▦" },
  { id: "haptic",     label: "Haptic Layer",       status: "offline",   lastSync: "never",   throughput: 0, icon: "▧" },
];

function streamStatusColor(s: DataStream["status"], T: Theme) {
  return {
    connected: T.green,
    syncing:   T.accent,
    delayed:   T.yellow,
    offline:   T.red,
    attention: "#F59E0B",
  }[s];
}

interface MediaAsset {
  id: string; title: string; category: string; status: "approved" | "pending" | "rejected";
  source: "upload" | "external_url"; imageColor: string; availability: string;
}

const MOCK_MEDIA: MediaAsset[] = [
  { id: "m1", title: "Padron 1964 Exclusivo",   category: "Cigars",   status: "approved", source: "upload",       imageColor: "#7C3AED", availability: "low_stock" },
  { id: "m2", title: "Woodford Reserve D.O.",   category: "Bourbon",  status: "approved", source: "upload",       imageColor: "#D97706", availability: "in_stock" },
  { id: "m3", title: "Hennessy VSOP",           category: "Cognac",   status: "pending",  source: "external_url", imageColor: "#B45309", availability: "in_stock" },
  { id: "m4", title: "Truffle Charcuterie",     category: "Food",     status: "pending",  source: "upload",       imageColor: "#065F46", availability: "in_stock" },
  { id: "m5", title: "Balvenie DoubleWood 17",  category: "Scotch",   status: "rejected", source: "external_url", imageColor: "#7C3AED", availability: "low_stock" },
  { id: "m6", title: "Smoked Short Rib Sliders",category: "Food",     status: "approved", source: "upload",       imageColor: "#DC2626", availability: "in_stock" },
];

const statusColor = (s: MediaAsset["status"], T: Theme) => ({
  approved: T.green, pending: T.yellow, rejected: T.red,
}[s]);

interface Props { T: Theme; }

export function DataBrainTab({ T }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>(MOCK_MEDIA);
  const [mediaFilter, setMediaFilter] = useState<string>("all");

  const connected = STREAMS.filter(s => s.status === "connected").length;
  const issues     = STREAMS.filter(s => s.status === "offline" || s.status === "delayed" || s.status === "attention").length;

  function approveMedia(id: string) {
    triggerHaptic("success");
    setMedia(p => p.map(m => m.id === id ? { ...m, status: "approved" } : m));
  }

  function rejectMedia(id: string) {
    setMedia(p => p.map(m => m.id === id ? { ...m, status: "rejected" } : m));
  }

  function simulateUpload() {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadMsg("Image uploaded and queued for approval.");
      triggerHaptic("success");
      setTimeout(() => setUploadMsg(null), 3000);
    }, 1200);
  }

  function previewUrl() {
    if (urlInput.includes("http")) setUrlPreview(urlInput);
  }

  const filteredMedia = mediaFilter === "all" ? media : media.filter(m => m.status === mediaFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Unified Data Brain overview */}
      <Panel title="Unified Data Brain" subtitle="All connected intelligence streams" icon={<Database size={14} />} T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Connected", value: String(connected), color: T.green },
            { label: "Syncing",   value: String(STREAMS.filter(s => s.status === "syncing").length), color: T.accent },
            { label: "Issues",    value: String(issues), color: issues > 0 ? T.red : T.green },
          ].map(m => (
            <div key={m.label} style={{ padding: "12px 14px", borderRadius: 12, background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STREAMS.map(s => {
            const sc = streamStatusColor(s.status, T);
            return (
              <motion.div key={s.id} whileHover={{ x: 2 }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: T.cardAlt, border: `1px solid ${s.status === "offline" ? `${T.red}25` : T.border}` }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${sc}12`, border: `1px solid ${sc}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: sc, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {s.status === "offline" ? <WifiOff size={9} color={T.red} /> : <Wifi size={9} color={sc} />}
                    <span style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono }}>{s.lastSync}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                  <Badge label={s.status} color={sc} bg={`${sc}10`} />
                  {s.status !== "offline" && (
                    <div style={{ width: 50 }}><Meter pct={s.throughput} color={sc} height={3} /></div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Panel>

      {/* Media Library */}
      <Panel title="Media Asset Library" subtitle="Upload, approve, and link product visuals" icon={<Upload size={14} />} T={T}>
        {/* Upload section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          {/* File upload */}
          <div style={{ padding: "16px", borderRadius: 12, border: `2px dashed ${T.border}`, background: `${T.accent}04` }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <Upload size={22} color={T.accent} style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Upload Image</div>
              <div style={{ fontSize: 9, color: T.textSub, marginTop: 2 }}>JPG, PNG, WebP · Max 5MB</div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={simulateUpload}
              disabled={uploading}
              style={{ width: "100%", padding: "12px", borderRadius: 10, background: uploading ? `${T.accent}30` : T.accent, border: "none", color: "#fff", cursor: uploading ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700 }}>
              {uploading ? (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                  Uploading…
                </motion.span>
              ) : "Choose File"}
            </motion.button>
            {uploadMsg && (
              <div style={{ marginTop: 8, fontSize: 9.5, color: T.green, textAlign: "center", fontFamily: T.mono }}>✓ {uploadMsg}</div>
            )}
          </div>

          {/* URL paste */}
          <div style={{ padding: "16px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.cardAlt }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              <Link2 size={12} style={{ display: "inline", marginRight: 5, color: T.accent }} />
              Paste Image URL
            </div>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onBlur={previewUrl}
              placeholder="https://brand.com/product.jpg"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.dark ? "rgba(255,255,255,0.04)" : "rgba(0,60,180,0.03)", color: T.text, fontSize: 11, outline: "none", boxSizing: "border-box" as const, marginBottom: 8 }}
            />
            {urlPreview && (
              <div style={{ height: 60, borderRadius: 8, background: `${T.accent}08`, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Eye size={14} color={T.textFaint} />
                <span style={{ fontSize: 9, color: T.textFaint, marginLeft: 6 }}>Preview URL saved</span>
              </div>
            )}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { triggerHaptic("success"); setUrlPreview(urlInput); }}
              style={{ width: "100%", padding: "10px", borderRadius: 9, background: `${T.accent}12`, border: `1px solid ${T.accent}30`, color: T.accent, cursor: "pointer", fontSize: 10.5, fontWeight: 700 }}>
              Link URL
            </motion.button>
          </div>
        </div>

        {/* Media filter + grid */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["all", "approved", "pending", "rejected"].map(f => (
            <motion.button key={f} whileTap={{ scale: 0.94 }} onClick={() => setMediaFilter(f)}
              style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${mediaFilter === f ? T.accent : T.border}`, background: mediaFilter === f ? `${T.accent}12` : "transparent", color: mediaFilter === f ? T.accent : T.textSub, cursor: "pointer", fontSize: 9, fontFamily: T.mono, textTransform: "uppercase" as const }}>
              {f}
            </motion.button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {filteredMedia.map(m => {
            const sc = statusColor(m.status, T);
            return (
              <motion.div key={m.id} whileHover={{ y: -1 }}
                style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, overflow: "hidden", boxShadow: T.shadow }}
              >
                <div style={{ height: 70, background: `linear-gradient(135deg, ${m.imageColor}14, ${m.imageColor}06)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.imageColor}20`, border: `1px solid ${m.imageColor}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: m.imageColor }}>◎</div>
                  <div style={{ position: "absolute", top: 6, right: 6 }}>
                    <Badge label={m.status} color={sc} bg={`${sc}14`} />
                  </div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text, marginBottom: 2 }}>{m.title}</div>
                  <div style={{ fontSize: 8.5, color: T.textSub, marginBottom: 8 }}>{m.category} · {m.source === "upload" ? "Uploaded" : "External URL"}</div>
                  {m.status === "pending" && (
                    <div style={{ display: "flex", gap: 5 }}>
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => approveMedia(m.id)}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>
                        <CheckCircle size={10} style={{ display: "inline", marginRight: 3 }} />Approve
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => rejectMedia(m.id)}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1px solid ${T.red}30`, background: `${T.red}0A`, color: T.red, cursor: "pointer", fontSize: 9, fontWeight: 700 }}>
                        <Trash2 size={10} style={{ display: "inline", marginRight: 3 }} />Reject
                      </motion.button>
                    </div>
                  )}
                  {m.status === "approved" && (
                    <div style={{ fontSize: 9, color: T.green, fontFamily: T.mono }}>✓ Visible to staff & guests</div>
                  )}
                  {m.status === "rejected" && (
                    <div style={{ fontSize: 9, color: T.red, fontFamily: T.mono }}>✗ Rejected · Not visible</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Panel>

      {/* Distributor Library stub */}
      <Panel title="Distributor Library" subtitle="Connect cigar, liquor, and supply distributors" icon={<BarChart2 size={14} />} T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "API Connection", icon: <Wifi size={18} />, desc: "Connect distributor REST API", color: T.accent, badge: "Ready" },
            { label: "CSV / Spreadsheet Import", icon: <Upload size={18} />, desc: "Upload distributor product file", color: T.green, badge: "Ready" },
            { label: "Manual Entry", icon: <Database size={18} />, desc: "Manually add distributor products", color: T.purple, badge: "Ready" },
          ].map(c => (
            <motion.div key={c.label} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ padding: "16px", borderRadius: 14, border: `1px solid ${c.color}28`, background: `${c.color}06`, cursor: "pointer", textAlign: "center" as const }}>
              <div style={{ color: c.color, marginBottom: 10, display: "flex", justifyContent: "center" }}>{c.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 9.5, color: T.textSub, marginBottom: 10 }}>{c.desc}</div>
              <Badge label={c.badge} color={c.color} bg={`${c.color}12`} />
            </motion.div>
          ))}
        </div>

        {/* Restock intelligence */}
        <div style={{ padding: "14px 16px", borderRadius: 12, background: `${T.yellow}06`, border: `1px solid ${T.yellow}20` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={14} color={T.yellow} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Restock Intelligence</span>
            <Badge label="2 URGENT" color={T.red} bg={`${T.red}10`} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { name: "Padron 1964 Exclusivo", stock: 3, threshold: 5, dist: "Available via Prime Cigar Co.", priority: "urgent" as const, lastUsage: "12/mo" },
              { name: "Macallan 18",           stock: 1, threshold: 4, dist: "Available via Premier Spirits", priority: "urgent" as const, lastUsage: "8/mo" },
              { name: "Balvenie DoubleWood 17",stock: 4, threshold: 6, dist: "Check Heritage Imports",        priority: "recommended" as const, lastUsage: "6/mo" },
            ].map(r => {
              const pc = r.priority === "urgent" ? T.red : T.yellow;
              return (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}>
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: pc, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{r.name}</div>
                    <div style={{ fontSize: 9, color: T.textSub }}>{r.dist}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: pc }}>{r.stock}</div>
                    <div style={{ fontSize: 8, color: T.textFaint }}>in stock</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: T.textSub }}>{r.lastUsage}</div>
                    <div style={{ fontSize: 8, color: T.textFaint }}>usage</div>
                  </div>
                  <Badge label={r.priority} color={pc} bg={`${pc}10`} />
                  <motion.button whileTap={{ scale: 0.93 }} onClick={() => { triggerHaptic("managerAlert"); }}
                    style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${pc}30`, background: `${pc}0E`, color: pc, cursor: "pointer", fontSize: 9.5, fontWeight: 700, whiteSpace: "nowrap" as const }}>
                    <RefreshCw size={10} style={{ display: "inline", marginRight: 4 }} />Restock Draft
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}
