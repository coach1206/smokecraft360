import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntelligenceScore {
  overallScore:    number;
  engagementLevel: number;
  socialEnergy:    number;
  activeGuests:    number;
  decisionCount:   number;
}

interface TwinState {
  version:            number;
  environmentalState: { sceneId: string | null; moodScore: number; atmosphere: number };
  orchestrationStatus:{ active: boolean; rulesFired: number; guardActive: boolean };
  syncHealth:         number;
}

interface OrchestrationEvent {
  event:      string;
  venueId?:   string;
  trigger?:   string;
  confidence?:number;
  actions?:   Array<{ type: string; priority: number }>;
  status?:    string;
  ts?:        number;
}

interface AwarenessReport {
  overallScore:      number;
  staffReadiness:    number;
  guestSatisfaction: number;
  inventoryHealth:   number;
  socialMomentum:    number;
  temporalAlignment: number;
  environmentalFit:  number;
  riskLevel:         string;
  activeAlerts:      number;
  recommendations:   string[];
}

interface SocialCluster {
  clusterType:  string;
  groupSize:    number;
  socialEnergy: number;
  sharedOrders: number;
}

interface TemporalData {
  currentAlignment: number;
  patterns:         Array<{ hour_of_day: number; day_of_week: number; avg_engagement: number; confidence: number }>;
}

interface AdaptiveLog {
  optimizationType: string;
  deltaScore:       number;
  confidence:       number;
  applied:          boolean;
  createdAt:        string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const DEMO_VENUE = "demo-venue-001";

function fmt(n: number, d = 1) { return (Math.round(n * 10 ** d) / 10 ** d).toFixed(d); }

function riskColor(level: string) {
  if (level === "low")      return "#2d5a27";
  if (level === "moderate") return "#5a4a0a";
  if (level === "high")     return "#7a2a0a";
  return "#8b0000";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreRing({ value, label, size = 80, color = "#D48B00" }: {
  value: number; label: string; size?: number; color?: string;
}) {
  const r    = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(212,139,0,.15)" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.max(0, Math.min(value, 1)))}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
          fill="#1A1A1B" fontFamily="Cormorant Garamond, serif" fontSize={size * 0.22} fontWeight={600}>
          {Math.round(value * 100)}
        </text>
      </svg>
      <span style={{ fontSize:11, color:"#6B5E4E", fontFamily:"Cormorant Garamond, serif", letterSpacing:"0.05em", textAlign:"center" }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

function MeterBar({ label, value, color = "#D48B00" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B5E4E" }}>
        <span>{label}</span>
        <span style={{ color:"#1A1A1B", fontWeight:600 }}>{Math.round(value * 100)}%</span>
      </div>
      <div style={{ height:6, background:"rgba(212,139,0,.12)", borderRadius:3, overflow:"hidden" }}>
        <motion.div
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ height:"100%", background:color, borderRadius:3 }}
        />
      </div>
    </div>
  );
}

function Panel({ title, badge, children, accent = false }: {
  title: string; badge?: string; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div style={{
      background: accent ? "rgba(212,139,0,.06)" : "#EFEBE0",
      border: `1px solid ${accent ? "rgba(212,139,0,.35)" : "rgba(26,26,27,.08)"}`,
      borderRadius: 12, padding: "18px 20px", display:"flex", flexDirection:"column", gap:14,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"#6B5E4E", fontFamily:"Cormorant Garamond, serif" }}>
          {title.toUpperCase()}
        </span>
        {badge && (
          <span style={{ fontSize:10, background:"rgba(212,139,0,.18)", color:"#7A5000",
            borderRadius:20, padding:"2px 8px", fontWeight:700, letterSpacing:"0.05em" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EventFeed({ events }: { events: OrchestrationEvent[] }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:200, overflowY:"auto" }}>
      <AnimatePresence initial={false}>
        {events.length === 0 && (
          <span style={{ fontSize:12, color:"#9A8A7A", textAlign:"center", padding:"20px 0" }}>
            Waiting for orchestration events…
          </span>
        )}
        {events.slice(0, 10).map((ev, i) => (
          <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
            exit={{ opacity:0 }} transition={{ duration:0.25 }}
            style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"8px 10px",
              background:"rgba(212,139,0,.06)", borderRadius:8, fontSize:11 }}>
            <span style={{ color:"#D48B00", fontSize:16, lineHeight:1 }}>◆</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, color:"#1A1A1B" }}>{ev.event ?? ev.trigger ?? "event"}</div>
              {ev.confidence !== undefined && (
                <div style={{ color:"#6B5E4E" }}>
                  confidence {Math.round((ev.confidence ?? 0) * 100)}%
                  {ev.actions && ` · ${ev.actions.length} action(s)`}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CommandCenter() {
  const [venueId,   setVenueId]   = useState(DEMO_VENUE);
  const [connected, setConnected] = useState(false);
  const [tab,       setTab]       = useState<"overview"|"awareness"|"social"|"temporal"|"adaptive">("overview");

  const [intelligence, setIntelligence] = useState<IntelligenceScore>({
    overallScore:0, engagementLevel:0, socialEnergy:0, activeGuests:0, decisionCount:0,
  });
  const [twin,       setTwin]       = useState<TwinState | null>(null);
  const [events,     setEvents]     = useState<OrchestrationEvent[]>([]);
  const [awareness,  setAwareness]  = useState<AwarenessReport | null>(null);
  const [clusters,   setClusters]   = useState<SocialCluster[]>([]);
  const [temporal,   setTemporal]   = useState<TemporalData | null>(null);
  const [adaptiveLogs, setAdaptiveLogs] = useState<AdaptiveLog[]>([]);
  const [activeScene, setActiveScene]   = useState<string>("STANDARD");
  const [loadingScene, setLoadingScene] = useState(false);
  const [loadingRun,   setLoadingRun]   = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const fetchPanelData = useCallback(async (vid: string) => {
    const base = `${BASE}/api`;
    await Promise.allSettled([
      fetch(`${base}/cognitive/awareness/${vid}`).then(r => r.json()).then((d: { report?: AwarenessReport }) => { if (d.report) setAwareness(d.report); }),
      fetch(`${base}/cognitive/social/${vid}`).then(r => r.json()).then((d: { clusters?: SocialCluster[] }) => { if (d.clusters) setClusters(d.clusters); }),
      fetch(`${base}/cognitive/temporal/${vid}`).then(r => r.json()).then((d: TemporalData & { ok?: boolean }) => { if (d.ok !== false) setTemporal(d); }),
      fetch(`${base}/cognitive/adaptive/${vid}/history`).then(r => r.json()).then((d: { logs?: AdaptiveLog[] }) => { if (d.logs) setAdaptiveLogs(d.logs.slice(0, 20)); }),
    ]);
  }, []);

  const connect = useCallback((vid: string) => {
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    const origin = window.location.origin;
    const socket = io(origin, { path: "/api/socket.io", transports: ["websocket","polling"] });
    socket.on("connect",    () => { setConnected(true);  socket.emit("join_intelligence", { venueId: vid }); });
    socket.on("disconnect", () => setConnected(false));

    socket.on("intelligence_update", (p: Partial<IntelligenceScore> & { overallScore?: number }) => {
      setIntelligence(prev => ({ ...prev, ...p }));
    });
    socket.on("twin_update", (p: TwinState) => setTwin(p));
    socket.on("orchestration_event", (p: OrchestrationEvent) => {
      setEvents(prev => [p, ...prev].slice(0, 50));
    });
    socket.on("awareness_update", (p: Partial<AwarenessReport>) => {
      setAwareness(prev => prev ? { ...prev, ...p } : null);
    });
    socket.on("social_update", () => { fetchPanelData(vid).catch(() => {}); });
    socket.on("temporal_update", () => { fetchPanelData(vid).catch(() => {}); });
    socket.on("cognition_update", () => { fetchPanelData(vid).catch(() => {}); });

    socketRef.current = socket;
    fetchPanelData(vid).catch(() => {});
  }, [fetchPanelData]);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  const handleConnect = () => { const v = inputRef.current?.value.trim() || venueId; setVenueId(v); connect(v); };

  const triggerScene = async (scene: string) => {
    setLoadingScene(true);
    try {
      await fetch(`${BASE}/api/intelligence/ambient/${venueId}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ sceneId: scene.toLowerCase().replace(/ /g,"_") }),
      });
      setActiveScene(scene);
    } catch { /* */ } finally { setLoadingScene(false); }
  };

  const runAwarenessNow = async () => {
    setLoadingRun(true);
    try {
      const r = await fetch(`${BASE}/api/cognitive/awareness/${venueId}/run`, { method:"POST" });
      const d = await r.json() as { report?: AwarenessReport };
      if (d.report) setAwareness(d.report);
    } catch { /* */ } finally { setLoadingRun(false); }
  };

  const TABS = ["overview","awareness","social","temporal","adaptive"] as const;

  return (
    <div style={{ minHeight:"100vh", background:"#F5F2ED", fontFamily:"'Cormorant Garamond', serif", padding:"0 0 60px" }}>
      {/* Header */}
      <div style={{ background:"#1A1A1B", padding:"20px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:"0.12em", color:"#F5F2ED" }}>COMMAND CENTER</div>
          <div style={{ fontSize:12, color:"rgba(245,242,237,.5)", marginTop:2 }}>EEIS / E.A.T — Autonomous Hospitality Intelligence</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <motion.div animate={{ scale: connected ? [1,1.2,1] : 1 }} transition={{ repeat:Infinity, duration:2 }}
            style={{ width:10, height:10, borderRadius:"50%", background: connected ? "#4CAF50" : "#ef5350" }}/>
          <span style={{ fontSize:12, color: connected ? "#4CAF50" : "#ef5350", fontWeight:700 }}>
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      <div style={{ padding:"20px 28px 0", display:"flex", gap:12, alignItems:"center" }}>
        <input ref={inputRef} defaultValue={DEMO_VENUE}
          style={{ flex:1, height:40, padding:"0 14px", borderRadius:8, border:"1.5px solid rgba(26,26,27,.15)",
            background:"#fff", fontSize:13, fontFamily:"inherit", outline:"none", color:"#1A1A1B" }}
          placeholder="Venue ID"
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        <button onClick={handleConnect}
          style={{ height:40, padding:"0 22px", background:"#D48B00", color:"#fff", border:"none",
            borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer", letterSpacing:"0.05em",
            fontFamily:"inherit" }}>
          Connect
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, padding:"16px 28px 0", borderBottom:"1.5px solid rgba(26,26,27,.08)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"8px 18px", background: tab===t ? "#D48B00" : "transparent",
              color: tab===t ? "#fff" : "#6B5E4E", border:"none", borderRadius:"8px 8px 0 0",
              cursor:"pointer", fontSize:12, fontWeight:700, letterSpacing:"0.07em",
              fontFamily:"inherit", textTransform:"uppercase" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:16 }}>
        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <>
            {/* Score rings */}
            <Panel title="Intelligence Scores">
              <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"space-around" }}>
                <ScoreRing value={intelligence.overallScore}    label="Overall"/>
                <ScoreRing value={intelligence.engagementLevel} label="Engagement"/>
                <ScoreRing value={intelligence.socialEnergy}    label="Social"/>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <span style={{ fontSize:36, fontWeight:700, color:"#1A1A1B" }}>{intelligence.activeGuests}</span>
                  <span style={{ fontSize:11, color:"#6B5E4E", letterSpacing:"0.05em" }}>ACTIVE GUESTS</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <span style={{ fontSize:36, fontWeight:700, color:"#D48B00" }}>{intelligence.decisionCount}</span>
                  <span style={{ fontSize:11, color:"#6B5E4E", letterSpacing:"0.05em" }}>DECISIONS</span>
                </div>
              </div>
            </Panel>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
              {/* Digital twin */}
              <Panel title={`Digital Twin — v${twin?.version ?? 0}`}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["MOOD",    fmt(twin?.environmentalState.moodScore    ?? 0)],
                    ["ATMOS",   fmt(twin?.environmentalState.atmosphere    ?? 0)],
                    ["RULES",   String(twin?.orchestrationStatus.rulesFired ?? 0)],
                    ["SYNC",    `${Math.round((twin?.syncHealth ?? 0) * 100)}%`],
                  ].map(([k,v]) => (
                    <div key={k} style={{ background:"rgba(212,139,0,.07)", borderRadius:8,
                      padding:"10px 12px" }}>
                      <div style={{ fontSize:10, color:"#9A8A7A", letterSpacing:"0.07em" }}>{k}</div>
                      <div style={{ fontSize:18, fontWeight:700, color:"#1A1A1B", marginTop:2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Orchestration feed */}
              <Panel title="Orchestration Feed">
                <EventFeed events={events}/>
              </Panel>

              {/* Ambient control */}
              <Panel title="Ambient Control">
                {["PREMIUM LOUNGE","SOCIAL LOUNGE","ENERGIZE","INTIMATE","STANDARD"].map(scene => (
                  <button key={scene} onClick={() => triggerScene(scene)} disabled={loadingScene}
                    style={{ width:"100%", padding:"10px 16px", marginBottom:6,
                      background: activeScene===scene ? "rgba(212,139,0,.18)" : "#fff",
                      border: activeScene===scene ? "1.5px solid #D48B00" : "1.5px solid rgba(26,26,27,.1)",
                      borderRadius:8, color: activeScene===scene ? "#7A5000" : "#1A1A1B",
                      fontSize:12, fontWeight:700, letterSpacing:"0.07em", cursor:"pointer",
                      fontFamily:"inherit", textTransform:"uppercase" as const }}>
                    {scene}
                  </button>
                ))}
              </Panel>
            </div>
          </>
        )}

        {/* ── Awareness Tab ── */}
        {tab === "awareness" && (
          <>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={runAwarenessNow} disabled={loadingRun}
                style={{ padding:"8px 20px", background:"#D48B00", color:"#fff", border:"none",
                  borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer",
                  letterSpacing:"0.07em", fontFamily:"inherit", opacity: loadingRun ? 0.6 : 1 }}>
                {loadingRun ? "RUNNING…" : "▶ RUN NOW"}
              </button>
            </div>

            {awareness ? (
              <>
                <Panel title="Overall Awareness" badge={awareness.riskLevel.toUpperCase()}
                  accent={awareness.riskLevel === "high" || awareness.riskLevel === "critical"}>
                  <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"space-around", alignItems:"center" }}>
                    <ScoreRing value={awareness.overallScore} label="Awareness" size={100}
                      color={riskColor(awareness.riskLevel)}/>
                    <div style={{ flex:1, minWidth:200, display:"flex", flexDirection:"column", gap:10 }}>
                      <MeterBar label="Staff Readiness"    value={awareness.staffReadiness}/>
                      <MeterBar label="Guest Satisfaction" value={awareness.guestSatisfaction}/>
                      <MeterBar label="Inventory Health"   value={awareness.inventoryHealth}/>
                      <MeterBar label="Social Momentum"    value={awareness.socialMomentum} color="#6B8DD6"/>
                      <MeterBar label="Temporal Alignment" value={awareness.temporalAlignment} color="#7BC67E"/>
                      <MeterBar label="Environmental Fit"  value={awareness.environmentalFit} color="#E9956A"/>
                    </div>
                  </div>
                </Panel>

                {awareness.recommendations.length > 0 && (
                  <Panel title="Recommendations" badge={`${awareness.recommendations.length}`} accent>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {awareness.recommendations.map((rec, i) => (
                        <div key={i} style={{ display:"flex", gap:10, padding:"10px 12px",
                          background:"rgba(212,139,0,.08)", borderRadius:8, fontSize:13 }}>
                          <span style={{ color:"#D48B00" }}>→</span>
                          <span style={{ color:"#1A1A1B" }}>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#9A8A7A", fontSize:14 }}>
                Connect to a venue to view awareness data
              </div>
            )}
          </>
        )}

        {/* ── Social Tab ── */}
        {tab === "social" && (
          <Panel title="Social Engagement Clusters" badge={`${clusters.length} GROUPS`}>
            {clusters.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#9A8A7A", fontSize:13 }}>
                No active social clusters detected
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:12 }}>
                {clusters.map((c, i) => {
                  const clusterColors: Record<string, string> = {
                    party:"#D48B00", group:"#6B8DD6", pair:"#7BC67E", solo:"#9A8A7A",
                  };
                  const color = clusterColors[c.clusterType] ?? "#9A8A7A";
                  return (
                    <div key={i} style={{ background:"#fff", borderRadius:10, padding:"14px 16px",
                      border:`2px solid ${color}30` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <span style={{ fontSize:11, fontWeight:700, color, textTransform:"uppercase",
                          letterSpacing:"0.07em" }}>{c.clusterType}</span>
                        <span style={{ fontSize:10, color:"#6B5E4E" }}>{c.groupSize} guests</span>
                      </div>
                      <MeterBar label="Social Energy"  value={c.socialEnergy}  color={color}/>
                      <div style={{ marginTop:8 }}>
                        <MeterBar label="Shared Orders" value={Math.min(c.sharedOrders / 10, 1)} color={color}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {/* ── Temporal Tab ── */}
        {tab === "temporal" && (
          <>
            <Panel title="Temporal Alignment">
              <div style={{ display:"flex", alignItems:"center", gap:24 }}>
                <ScoreRing value={temporal?.currentAlignment ?? 0} label="Now" color="#7BC67E"/>
                <div style={{ flex:1, fontSize:13, color:"#6B5E4E", lineHeight:1.7 }}>
                  <div><strong style={{ color:"#1A1A1B" }}>Hour:</strong> {new Date().getHours()}:00</div>
                  <div><strong style={{ color:"#1A1A1B" }}>Day:</strong> {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()]}</div>
                  <div><strong style={{ color:"#1A1A1B" }}>Patterns learned:</strong> {temporal?.patterns.length ?? 0}</div>
                </div>
              </div>
            </Panel>

            {temporal?.patterns && temporal.patterns.length > 0 && (
              <Panel title="Hourly Engagement Pattern">
                <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:80 }}>
                  {Array.from({ length: 24 }, (_, h) => {
                    const match = temporal.patterns.find(p => p.hour_of_day === h);
                    const val   = match ? match.avg_engagement : 0;
                    const isNow = h === new Date().getHours();
                    return (
                      <div key={h} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                        <div style={{
                          width:"100%", height: `${Math.max(4, val * 70)}px`,
                          background: isNow ? "#D48B00" : "rgba(212,139,0,.3)",
                          borderRadius:"2px 2px 0 0", transition:"height .3s",
                        }} title={`${h}:00 — ${fmt(val)}`}/>
                        {h % 6 === 0 && <span style={{ fontSize:8, color:"#9A8A7A" }}>{h}h</span>}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}
          </>
        )}

        {/* ── Adaptive Tab ── */}
        {tab === "adaptive" && (
          <Panel title="Adaptive Optimization Log" badge={`${adaptiveLogs.filter(l => l.applied).length} APPLIED`}>
            {adaptiveLogs.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#9A8A7A", fontSize:13 }}>
                No optimization history yet — system is learning
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {adaptiveLogs.map((log, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto",
                    gap:12, padding:"10px 14px", background: log.applied ? "rgba(212,139,0,.07)" : "#fff",
                    borderRadius:8, border:"1px solid rgba(26,26,27,.08)", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1B",
                        textTransform:"uppercase" as const }}>{log.optimizationType}</div>
                      <div style={{ fontSize:11, color:"#6B5E4E", marginTop:2 }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:16, fontWeight:700,
                        color: log.deltaScore > 0 ? "#2d5a27" : "#8b0000" }}>
                        {log.deltaScore > 0 ? "+" : ""}{fmt(log.deltaScore, 2)}
                      </div>
                      <div style={{ fontSize:10, color:"#9A8A7A" }}>Δ score</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{
                        fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20,
                        background: log.applied ? "rgba(76,175,80,.15)" : "rgba(158,158,158,.12)",
                        color: log.applied ? "#2d5a27" : "#6B5E4E",
                        textTransform:"uppercase" as const,
                      }}>
                        {log.applied ? "applied" : "skipped"}
                      </div>
                      <div style={{ fontSize:10, color:"#9A8A7A", marginTop:2 }}>
                        {Math.round(log.confidence * 100)}% conf
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* Transport badge */}
      <div style={{ position:"fixed", bottom:16, right:16, fontSize:10, color:"#9A8A7A",
        background:"rgba(245,242,237,.9)", padding:"4px 10px", borderRadius:20,
        border:"1px solid rgba(26,26,27,.1)", backdropFilter:"blur(8px)" }}>
        E.A.T / EEIS · Transport: PostgreSQL LISTEN/NOTIFY · Redis-ready
      </div>
    </div>
  );
}
