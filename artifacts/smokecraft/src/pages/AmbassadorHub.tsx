/**
 * AmbassadorHub — /ambassador-hub
 * Clark's limited command deck. Demo-mode only.
 * No revenue, no distribution, no financial data.
 * Three tools: Master Artisan 3D · Setup New Device · Node Ping
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Star, Cpu, Tablet, Radio, LogOut, ChevronRight, Check, Wifi, WifiOff, Loader } from "lucide-react";
import { socket } from "@/lib/socket";
import AmbassadorWatermark from "@/components/AmbassadorWatermark";

export const AMBASSADOR_SESSION_KEY = "AMBASSADOR_SESSION";

const C = {
  bg:     "#050505",
  surface:"rgba(18,15,12,0.98)",
  gold:   "#D4AF37",
  amber:  "#B89030",
  ink:    "#F5F2ED",
  muted:  "rgba(245,242,237,0.45)",
  dim:    "rgba(245,242,237,0.22)",
  border: "rgba(212,175,55,0.20)",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
  green:  "#22c55e",
  red:    "#ef4444",
};

// ── Setup Guide Steps ─────────────────────────────────────────────────────────

const SETUP_STEPS = [
  {
    step: 1,
    title: "Power On the Device",
    detail: "Plug in the mirror or table and power it on. Wait for the screen to boot.",
    icon: "⚡",
  },
  {
    step: 2,
    title: "Connect to WiFi",
    detail: "Tap the WiFi icon in the bottom corner. Connect to the venue's network using the provided credentials.",
    icon: "📶",
  },
  {
    step: 3,
    title: "Open the Browser",
    detail: "Open the browser on the device and navigate to the NOVEE OS URL provided in the shipment kit.",
    icon: "🌐",
  },
  {
    step: 4,
    title: "Sovereign Lock Screen Appears",
    detail: "The device will display a gold QR code and 'WAITING FOR SOVEREIGN AUTHORIZATION'. This is correct — the system is working.",
    icon: "🔒",
  },
  {
    step: 5,
    title: "Device Appears in Admin Hub",
    detail: "A new device will appear in the Sovereign Admin's 'Live Nodes' list within 30 seconds.",
    icon: "📡",
  },
  {
    step: 6,
    title: "Contact JC to Authorize",
    detail: "Text or call JC at 360 Enterprises. He will activate the device remotely. The lock screen melts and the full experience launches.",
    icon: "🗝️",
  },
] as const;

// ── Node Ping ────────────────────────────────────────────────────────────────

type PingStatus = "idle" | "pinging" | "online" | "offline";

interface NodeRow {
  id: number;
  serial_number: string;
  status: string;
  batch_id: number;
}

// ── Main Hub ─────────────────────────────────────────────────────────────────

type Panel = "home" | "setup" | "ping";

export default function AmbassadorHub() {
  const [, navigate] = useLocation();
  const [panel, setPanel] = useState<Panel>("home");
  const [setupStep, setSetupStep] = useState(0);
  const [nodes, setNodes]         = useState<NodeRow[]>([]);
  const [pingStatus, setPingStatus] = useState<PingStatus>("idle");
  const [pingResults, setPingResults] = useState<Record<number, "online" | "offline">>({});

  // Gate check
  useEffect(() => {
    if (!localStorage.getItem(AMBASSADOR_SESSION_KEY)) {
      navigate("/ambassador-gate");
    }
  }, [navigate]);

  // Sovereign global-revoke kills Ambassador session too
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(AMBASSADOR_SESSION_KEY);
      navigate("/ambassador-gate");
    };
    socket.on("SOVEREIGN_SESSION_REVOKED", handler);
    return () => { socket.off("SOVEREIGN_SESSION_REVOKED", handler); };
  }, [navigate]);

  // Load nodes for ping panel
  const loadNodes = async () => {
    setPingStatus("pinging");
    try {
      const res  = await fetch("/api/distribution/nodes");
      const data = await res.json() as { nodes?: NodeRow[] };
      const list = data.nodes ?? [];
      setNodes(list);
      // Simulate ping result per node (real-time status from DB)
      const results: Record<number, "online" | "offline"> = {};
      list.forEach(n => {
        results[n.id] = n.status === "AUTHORIZED" ? "online" : "offline";
      });
      setPingResults(results);
      setPingStatus(list.length > 0 ? "online" : "idle");
    } catch {
      setPingStatus("offline");
    }
  };

  const signOut = () => {
    localStorage.removeItem(AMBASSADOR_SESSION_KEY);
    navigate("/ambassador-gate");
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.ink, fontFamily: C.mono, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 180, background: "radial-gradient(ellipse,rgba(212,175,55,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,5,5,0.96)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Star size={16} color={C.gold} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em" }}>
            AMBASSADOR COMMAND DECK
          </div>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>
            NOVEE OS · DEMO MODE · CLARK // 360 ENTERPRISES SERVICES LLC
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2.4, repeat: Infinity }}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: C.green, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            DEMO ACTIVE
          </motion.div>
          <motion.button whileTap={{ scale: 0.93 }} onClick={signOut}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#ef4444", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}>
            <LogOut size={11} /> SIGN OUT
          </motion.button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px" }}>
        <AnimatePresence mode="wait">

          {/* HOME — 3 tool tiles */}
          {panel === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em", marginBottom: 28 }}>
                SELECT A TOOL
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, maxWidth: 900 }}>

                {/* Master Artisan 3D */}
                <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/design-playground")}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 24px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle,${C.gold}08,transparent)`, borderRadius: "0 12px 0 100%" }} />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.gold}14`, border: `1px solid ${C.gold}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Cpu size={20} color={C.gold} />
                  </div>
                  <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 8, fontWeight: 400 }}>
                    MASTER ARTISAN 3D
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
                    Demo the luxury product builder. Let clients explore flavors, craft their experience, and see the NOVEE OS magic in real time.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: C.amber, fontWeight: 700, letterSpacing: "0.14em" }}>
                    LAUNCH BUILDER <ChevronRight size={11} />
                  </div>
                </motion.div>

                {/* Setup New Device */}
                <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setPanel("setup"); setSetupStep(0); }}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 24px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle,${C.gold}08,transparent)`, borderRadius: "0 12px 0 100%" }} />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.gold}14`, border: `1px solid ${C.gold}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Tablet size={20} color={C.gold} />
                  </div>
                  <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 8, fontWeight: 400 }}>
                    SETUP NEW DEVICE
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
                    Step-by-step guide to onboard a new client mirror or table without calling JC. Walk through the full activation process.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: C.amber, fontWeight: 700, letterSpacing: "0.14em" }}>
                    OPEN GUIDE <ChevronRight size={11} />
                  </div>
                </motion.div>

                {/* Node Ping */}
                <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setPanel("ping"); loadNodes(); }}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 24px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle,${C.gold}08,transparent)`, borderRadius: "0 12px 0 100%" }} />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.gold}14`, border: `1px solid ${C.gold}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Radio size={20} color={C.gold} />
                  </div>
                  <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 8, fontWeight: 400 }}>
                    NODE PING
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
                    Check if a local device is online and communicating with the NOVEE OS network. Instant status read from the system.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: C.amber, fontWeight: 700, letterSpacing: "0.14em" }}>
                    CHECK NODES <ChevronRight size={11} />
                  </div>
                </motion.div>

              </div>

              {/* Info strip */}
              <div style={{ marginTop: 36, padding: "14px 20px", borderRadius: 10, background: "rgba(212,175,55,0.05)", border: `1px solid ${C.border}`, maxWidth: 520 }}>
                <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 6 }}>AMBASSADOR PERMISSIONS</div>
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
                  You have access to demo tools and device setup.<br/>
                  Revenue data, manufacturer packaging, and distribution controls<br/>
                  are restricted to the Sovereign operator.
                </div>
              </div>
            </motion.div>
          )}

          {/* SETUP GUIDE */}
          {panel === "setup" && (
            <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setPanel("home")}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>
                  ← Back
                </motion.button>
                <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em" }}>DEVICE SETUP GUIDE</div>
              </div>

              {/* Progress bar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 32, maxWidth: 480 }}>
                {SETUP_STEPS.map((s, i) => (
                  <div key={s.step} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= setupStep ? C.gold : "rgba(212,175,55,0.15)", transition: "background 0.3s" }} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={setupStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                  style={{ maxWidth: 520, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "36px 32px" }}>
                  <div style={{ fontSize: 32, marginBottom: 20 }}>{SETUP_STEPS[setupStep].icon}</div>
                  <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.22em", marginBottom: 10 }}>
                    STEP {SETUP_STEPS[setupStep].step} OF {SETUP_STEPS.length}
                  </div>
                  <div style={{ fontSize: 20, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 16, fontWeight: 300 }}>
                    {SETUP_STEPS[setupStep].title}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, marginBottom: 32 }}>
                    {SETUP_STEPS[setupStep].detail}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    {setupStep > 0 && (
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSetupStep(s => s - 1)}
                        style={{ padding: "10px 22px", borderRadius: 8, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.10em" }}>
                        BACK
                      </motion.button>
                    )}
                    {setupStep < SETUP_STEPS.length - 1 ? (
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSetupStep(s => s + 1)}
                        style={{ padding: "10px 24px", borderRadius: 8, background: C.gold, border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 8 }}>
                        NEXT STEP <ChevronRight size={13} />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => { setSetupStep(0); setPanel("home"); }}
                        style={{ padding: "10px 24px", borderRadius: 8, background: C.green, border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 8 }}>
                        <Check size={13} /> SETUP COMPLETE
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* NODE PING */}
          {panel === "ping" && (
            <motion.div key="ping" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setPanel("home")}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>
                  ← Back
                </motion.button>
                <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em" }}>NODE PING</div>
                <motion.button whileTap={{ scale: 0.93 }} onClick={loadNodes} style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, color: C.gold, fontSize: 9, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 6 }}>
                  {pingStatus === "pinging" ? <Loader size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Radio size={11} />}
                  REFRESH
                </motion.button>
              </div>

              {pingStatus === "pinging" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                  <Loader size={14} color={C.gold} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em" }}>PINGING NETWORK…</span>
                </div>
              )}

              {nodes.length === 0 && pingStatus !== "pinging" && (
                <div style={{ padding: "32px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.16em" }}>NO REGISTERED NODES FOUND</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 8 }}>Devices appear here once powered on and connected.</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
                {nodes.map(node => {
                  const status = pingResults[node.id];
                  return (
                    <motion.div key={node.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: status === "online" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.08)", border: `1px solid ${status === "online" ? "rgba(34,197,94,0.30)" : "rgba(239,68,68,0.22)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {status === "online"
                          ? <Wifi size={16} color={C.green} />
                          : <WifiOff size={16} color={C.red} />
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.ink, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 2 }}>
                          {node.serial_number}
                        </div>
                        <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>
                          BATCH {node.batch_id} · STATUS: {node.status}
                        </div>
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        <motion.div animate={status === "online" ? { opacity: [1, 0.4, 1] } : {}} transition={{ duration: 1.6, repeat: Infinity }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: status === "online" ? C.green : C.red, letterSpacing: "0.14em" }}>
                            {status === "online" ? "● ONLINE" : "● OFFLINE"}
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AmbassadorWatermark />

      {/* Footer */}
      <div style={{ padding: "8px 24px", borderTop: `1px solid ${C.border}`, background: "rgba(5,5,5,0.96)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: C.mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em" }}>
          AUTHORIZED AMBASSADOR: CLARK · 360 ENTERPRISES SERVICES LLC
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 8, color: `${C.gold}45`, letterSpacing: "0.14em" }}>
          NOVEE OS · DEMO MODE · TITAN V 5.2.0
        </span>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
