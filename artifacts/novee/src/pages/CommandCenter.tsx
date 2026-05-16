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

interface SupplyEntry {
  id:              string;
  sku:             string;
  productName:     string;
  category:        string;
  quantityOnHand:  number;
  reorderThreshold:number;
  unit:            string;
  status:          string;
  supplierName?:   string | null;
  lastMutatedAt:   string;
}

interface SupplyLedgerEntry {
  id:               string;
  entryId:          string;
  mutationType:     string;
  quantityDelta:    number;
  previousQuantity: number;
  newQuantity:      number;
  operatorId?:      string | null;
  broadcastedAt?:   string | null;
  createdAt:        string;
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
  const [tab,       setTab]       = useState<"overview"|"awareness"|"social"|"temporal"|"adaptive"|"edge"|"learning"|"knowledge"|"compliance"|"experience"|"supply">("overview");

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

  // Edge layer state
  const [edgeStatuses,  setEdgeStatuses]  = useState<Array<{ venueId: string; mode: string; queueDepth: number; inferenceReady: boolean }>>([]);
  const [inferenceReady, setInferenceReady] = useState(false);

  // Learning layer state
  const [rlWeights,     setRlWeights]     = useState<Record<string, number> | null>(null);
  const [recWeights,    setRecWeights]    = useState<Record<string, number> | null>(null);
  const [trainingJobs,  setTrainingJobs]  = useState<Array<{ id: string; domain: string; status: string; startedAt?: number; completedAt?: number }>>([]);

  // Knowledge layer state
  const [graphStats,    setGraphStats]    = useState<Record<string, { nodes: number; edges: number }> | null>(null);

  // Compliance layer state
  const [retentionPolicies, setRetentionPolicies] = useState<Array<{ entityType: string; retainDays: number; action: string }>>([]);
  const [venuePolicy,       setVenuePolicy]       = useState<{ region: string; regulations: string[]; requiresConsent: boolean; maxRetentionDays: number } | null>(null);

  // Experience layer state
  const [ambientState,  setAmbientState]  = useState<{ sceneName: string; accentColor: string; glowIntensity: number; backgroundVariant: string } | null>(null);
  const [motionTokens,  setMotionTokens]  = useState<Record<string, { label: string; color: string; animate: boolean; priority: number }> | null>(null);

  // Supply Chain & Logistics state
  const [supplyEntries, setSupplyEntries] = useState<SupplyEntry[]>([]);
  const [supplyLedger,  setSupplyLedger]  = useState<SupplyLedgerEntry[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const fetchPanelData = useCallback(async (vid: string) => {
    const base = `${BASE}/api`;
    await Promise.allSettled([
      fetch(`${base}/cognitive/awareness/${vid}`).then(r => r.json()).then((d: { report?: AwarenessReport }) => { if (d.report) setAwareness(d.report); }),
      fetch(`${base}/cognitive/social/${vid}`).then(r => r.json()).then((d: { clusters?: SocialCluster[] }) => { if (d.clusters) setClusters(d.clusters); }),
      fetch(`${base}/cognitive/temporal/${vid}`).then(r => r.json()).then((d: TemporalData & { ok?: boolean }) => { if (d.ok !== false) setTemporal(d); }),
      fetch(`${base}/cognitive/adaptive/${vid}/history`).then(r => r.json()).then((d: { logs?: AdaptiveLog[] }) => { if (d.logs) setAdaptiveLogs(d.logs.slice(0, 20)); }),
      // Edge layer
      fetch(`${base}/edge/status`).then(r => r.json()).then((d: { statuses?: typeof edgeStatuses; inferenceReady?: boolean }) => {
        if (Array.isArray(d.statuses)) setEdgeStatuses(d.statuses);
        if (d.inferenceReady !== undefined) setInferenceReady(d.inferenceReady);
      }),
      // Learning layer
      fetch(`${base}/learning/jobs`).then(r => r.json()).then((d: unknown) => { if (Array.isArray(d)) setTrainingJobs(d.slice(0, 10)); }),
      fetch(`${base}/learning/rec-weights/${vid}`).then(r => r.json()).then((d: Record<string, number>) => setRecWeights(d)),
      // Knowledge layer
      fetch(`${base}/knowledge/stats`).then(r => r.json()).then((d: Record<string, { nodes: number; edges: number }>) => setGraphStats(d)),
      // Compliance layer
      fetch(`${base}/compliance/retention/policies`).then(r => r.json()).then((d: unknown) => { if (Array.isArray(d)) setRetentionPolicies(d); }),
      fetch(`${base}/compliance/regions/${vid}`).then(r => r.json()).then((d: typeof venuePolicy) => setVenuePolicy(d)),
      // Experience layer
      fetch(`${base}/experience/ambient/${vid}`).then(r => r.json()).then((d: typeof ambientState) => setAmbientState(d)).catch(() => {}),
      fetch(`${base}/experience/tokens`).then(r => r.json()).then((d: typeof motionTokens) => setMotionTokens(d)),
      fetch(`${base}/supply/inventory/${vid}`).then(r => r.json()).then((d: { entries?: SupplyEntry[] }) => { if (Array.isArray(d.entries)) setSupplyEntries(d.entries); }).catch(() => {}),
      fetch(`${base}/supply/ledger/${vid}`).then(r => r.json()).then((d: { entries?: SupplyLedgerEntry[] }) => { if (Array.isArray(d.entries)) setSupplyLedger(d.entries); }).catch(() => {}),
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
    socket.on("supply_update", (p: Partial<{ venueId: string; sku: string; productName: string; mutationType: string; quantityDelta: number; previousQuantity: number; newQuantity: number; status: string; broadcastedAt: string; ledgerId: string; entryId: string }>) => {
      if (p.entryId) {
        // Prepend a ledger entry from the live payload
        const liveRow: SupplyLedgerEntry = {
          id:               p.ledgerId ?? p.entryId ?? String(Date.now()),
          entryId:          p.entryId ?? "",
          mutationType:     p.mutationType ?? "adjustment",
          quantityDelta:    p.quantityDelta ?? 0,
          previousQuantity: p.previousQuantity ?? 0,
          newQuantity:      p.newQuantity ?? 0,
          operatorId:       null,
          broadcastedAt:    p.broadcastedAt ?? new Date().toISOString(),
          createdAt:        p.broadcastedAt ?? new Date().toISOString(),
        };
        setSupplyLedger(prev => [liveRow, ...prev].slice(0, 50));
      }
      // Refresh full inventory list in background
      fetchPanelData(vid).catch(() => {});
    });

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

  const TABS = ["overview","awareness","social","temporal","adaptive","edge","learning","knowledge","compliance","experience","supply"] as const;

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

        {/* ── Edge Tab ── */}
        {tab === "edge" && (
          <>
            <Panel title="Edge Layer" badge={inferenceReady ? "INFERENCE READY" : "WARMING"} accent={inferenceReady}>
              <div style={{ display:"flex", gap:12, marginBottom:4, alignItems:"center" }}>
                <div style={{ width:10, height:10, borderRadius:"50%",
                  background: inferenceReady ? "#4CAF50" : "#9A8A7A" }}/>
                <span style={{ fontSize:12, color: inferenceReady ? "#2d5a27" : "#6B5E4E", fontWeight:700 }}>
                  {inferenceReady ? "Local inference active" : "Cloud mode — inference not needed"}
                </span>
              </div>
              {edgeStatuses.length === 0 ? (
                <div style={{ textAlign:"center", padding:"30px 0", color:"#9A8A7A", fontSize:13 }}>
                  No edge nodes active — all venues connected to cloud
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
                  {edgeStatuses.map((s, i) => {
                    const modeColor: Record<string, string> = {
                      online:"#4CAF50", degraded:"#F59E0B", offline:"#EF4444", recovering:"#8B5CF6",
                    };
                    return (
                      <div key={i} style={{ background:"#EFEBE0", borderRadius:10, padding:"14px 16px",
                        border:`1.5px solid ${(modeColor[s.mode] ?? "#9A8A7A")}40` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#1A1A1B", fontFamily:"monospace" }}>
                            {s.venueId.slice(0, 12)}…
                          </span>
                          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                            background:`${(modeColor[s.mode] ?? "#9A8A7A")}20`,
                            color: modeColor[s.mode] ?? "#9A8A7A", textTransform:"uppercase" as const }}>
                            {s.mode}
                          </span>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B5E4E" }}>
                          <span>Queue depth</span>
                          <span style={{ fontWeight:700, color:"#1A1A1B" }}>{s.queueDepth ?? 0}</span>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B5E4E", marginTop:4 }}>
                          <span>Inference</span>
                          <span style={{ fontWeight:700, color: s.inferenceReady ? "#2d5a27" : "#9A8A7A" }}>
                            {s.inferenceReady ? "local" : "cloud"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="Edge Capabilities">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {[
                  { cap:"Offline Inference",     desc:"Local recommendation scoring" },
                  { cap:"Ambient Execution",     desc:"Scene scheduling without cloud" },
                  { cap:"Buffer Replay",          desc:"Event queue with cloud sync" },
                  { cap:"State Sync",             desc:"Conflict-safe reconciliation" },
                  { cap:"Local Failover",         desc:"Auto-detect disconnection" },
                  { cap:"Offline Venue Mode",     desc:"Full autonomy for 24+ hours" },
                ].map(({ cap, desc }) => (
                  <div key={cap} style={{ background:"rgba(212,139,0,.06)", borderRadius:8,
                    padding:"12px 14px", border:"1px solid rgba(212,139,0,.2)" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1A1A1B", marginBottom:3 }}>{cap}</div>
                    <div style={{ fontSize:10, color:"#6B5E4E" }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ── Learning Tab ── */}
        {tab === "learning" && (
          <>
            <Panel title="Training Jobs" badge={`${trainingJobs.length}`}>
              {trainingJobs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"30px 0", color:"#9A8A7A", fontSize:13 }}>
                  No training jobs — system uses real-time RL updates
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {trainingJobs.map((job, i) => {
                    const statusColor: Record<string, string> = {
                      complete:"#4CAF50", pending:"#F59E0B", running:"#6B8DD6", failed:"#EF4444",
                    };
                    return (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto",
                        gap:12, padding:"10px 14px", background:"#EFEBE0", borderRadius:8,
                        border:"1px solid rgba(26,26,27,.08)", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1B", textTransform:"uppercase" as const }}>
                            {job.domain}
                          </div>
                          {job.startedAt && (
                            <div style={{ fontSize:10, color:"#6B5E4E", marginTop:2 }}>
                              {new Date(job.startedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20,
                          background:`${(statusColor[job.status] ?? "#9A8A7A")}20`,
                          color: statusColor[job.status] ?? "#9A8A7A", textTransform:"uppercase" as const }}>
                          {job.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {recWeights && (
              <Panel title="Recommendation Weight Matrix" badge="LIVE">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
                  {Object.entries(recWeights).map(([key, val]) => (
                    <div key={key} style={{ background:"rgba(212,139,0,.07)", borderRadius:8, padding:"12px 14px" }}>
                      <div style={{ fontSize:10, color:"#9A8A7A", letterSpacing:"0.07em", marginBottom:4 }}>
                        {key.toUpperCase()}
                      </div>
                      <div style={{ fontSize:20, fontWeight:700, color:"#D48B00" }}>
                        {Math.round(Number(val) * 100)}%
                      </div>
                      <div style={{ marginTop:6, height:4, background:"rgba(212,139,0,.12)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Number(val) * 100}%`, background:"#D48B00", borderRadius:2 }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="Learning Domains">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { domain:"Recommendations", desc:"Taste/margin/stock weight optimisation" },
                  { domain:"Orchestration",   desc:"Rule priority from outcome history" },
                  { domain:"Environmental",   desc:"Scene→engagement correlation" },
                  { domain:"Behavioral",      desc:"32-dim guest embeddings" },
                  { domain:"Venue",           desc:"Cross-venue transfer learning" },
                  { domain:"Preference",      desc:"Flavor/mood affinity vectors" },
                ].map(({ domain, desc }) => (
                  <div key={domain} style={{ background:"rgba(212,139,0,.05)", borderRadius:8,
                    padding:"10px 14px", border:"1px solid rgba(212,139,0,.15)" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1B" }}>{domain}</div>
                    <div style={{ fontSize:11, color:"#6B5E4E", marginTop:3 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ── Knowledge Tab ── */}
        {tab === "knowledge" && (
          <>
            <Panel title="Knowledge Graph Statistics" badge="5 GRAPHS">
              {graphStats ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
                  {Object.entries(graphStats).filter(([k]) => k !== "entityRegistry").map(([name, stat]) => (
                    <div key={name} style={{ background:"rgba(212,139,0,.07)", borderRadius:10,
                      padding:"14px 16px", border:"1px solid rgba(212,139,0,.2)" }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#9A8A7A",
                        letterSpacing:"0.08em", marginBottom:8, textTransform:"uppercase" as const }}>
                        {name}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, color:"#6B5E4E" }}>Nodes</span>
                        <span style={{ fontSize:16, fontWeight:700, color:"#1A1A1B" }}>{(stat as { nodes: number }).nodes}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:11, color:"#6B5E4E" }}>Edges</span>
                        <span style={{ fontSize:16, fontWeight:700, color:"#D48B00" }}>{(stat as { edges: number }).edges}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"30px 0", color:"#9A8A7A", fontSize:13 }}>
                  Connect to venue to load knowledge graphs
                </div>
              )}
            </Panel>

            <Panel title="Graph Topology">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { graph:"Behavioral",     desc:"Guest ↔ product ↔ session relations",     icon:"◎" },
                  { graph:"Venue",          desc:"Cross-venue guest affinity network",        icon:"⬡" },
                  { graph:"Recommendation", desc:"Pairing graph + acceptance rates",          icon:"◈" },
                  { graph:"Environmental",  desc:"Scene → engagement → craft mappings",       icon:"◉" },
                  { graph:"Operational",    desc:"Rule → trigger → action chains",            icon:"◆" },
                  { graph:"Entity Registry",desc:"Canonical ID resolution across systems",   icon:"⬤" },
                ].map(({ graph, desc, icon }) => (
                  <div key={graph} style={{ display:"flex", gap:12, padding:"10px 14px",
                    background:"#EFEBE0", borderRadius:8, alignItems:"flex-start",
                    border:"1px solid rgba(26,26,27,.07)" }}>
                    <span style={{ fontSize:20, color:"#D48B00", lineHeight:1, flexShrink:0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1B" }}>{graph}</div>
                      <div style={{ fontSize:11, color:"#6B5E4E", marginTop:2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ── Compliance Tab ── */}
        {tab === "compliance" && (
          <>
            {venuePolicy && (
              <Panel title="Regional Policy" badge={venuePolicy.region} accent>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <div style={{ fontSize:11, color:"#9A8A7A", marginBottom:4 }}>REGULATIONS</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {venuePolicy.regulations.length === 0
                        ? <span style={{ color:"#9A8A7A", fontSize:12 }}>None configured</span>
                        : venuePolicy.regulations.map(r => (
                          <span key={r} style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                            background:"rgba(212,139,0,.15)", borderRadius:20, color:"#7A5000" }}>{r}</span>
                        ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                      <span style={{ color:"#6B5E4E" }}>Consent required</span>
                      <span style={{ fontWeight:700, color: venuePolicy.requiresConsent ? "#D48B00" : "#4CAF50" }}>
                        {venuePolicy.requiresConsent ? "Yes" : "No"}
                      </span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                      <span style={{ color:"#6B5E4E" }}>Max retention</span>
                      <span style={{ fontWeight:700, color:"#1A1A1B" }}>{venuePolicy.maxRetentionDays}d</span>
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            <Panel title="Retention Policies" badge={`${retentionPolicies.length}`}>
              {retentionPolicies.length === 0 ? (
                <div style={{ textAlign:"center", padding:"30px 0", color:"#9A8A7A", fontSize:13 }}>
                  Loading retention policies…
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {retentionPolicies.map((p, i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto",
                      gap:12, padding:"8px 12px", background:"#EFEBE0",
                      borderRadius:8, border:"1px solid rgba(26,26,27,.07)", alignItems:"center" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#1A1A1B",
                        textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>
                        {p.entityType}
                      </div>
                      <div style={{ fontSize:11, color:"#6B5E4E" }}>{p.retainDays}d</div>
                      <div style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                        background: p.action === "delete" ? "rgba(239,68,68,.1)" : "rgba(212,139,0,.12)",
                        color: p.action === "delete" ? "#EF4444" : "#D48B00",
                        textTransform:"uppercase" as const }}>
                        {p.action}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Compliance Modules">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
                {[
                  { mod:"Consent Tracking",  desc:"Grant/revoke audit log" },
                  { mod:"AI Explainability", desc:"Decision transparency reports" },
                  { mod:"Privacy Controls",  desc:"Role-gated data access" },
                  { mod:"Retention Engine",  desc:"Daily automated purge cycle" },
                  { mod:"Regional Policies", desc:"GDPR/CCPA/PIPEDA rule sets" },
                  { mod:"Compliance Exports",desc:"Portability + audit exports" },
                ].map(({ mod, desc }) => (
                  <div key={mod} style={{ background:"rgba(212,139,0,.05)", borderRadius:8,
                    padding:"10px 12px", border:"1px solid rgba(212,139,0,.12)" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1A1A1B", marginBottom:3 }}>{mod}</div>
                    <div style={{ fontSize:10, color:"#6B5E4E" }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ── Experience Tab ── */}
        {tab === "experience" && (
          <>
            {ambientState && (
              <Panel title="Ambient UI State" badge={ambientState.sceneName} accent>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"center" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:24, height:24, borderRadius:"50%",
                        background: ambientState.accentColor,
                        boxShadow:`0 0 ${ambientState.glowIntensity * 16}px ${ambientState.accentColor}` }}/>
                      <span style={{ fontSize:12, color:"#1A1A1B", fontWeight:600 }}>
                        {ambientState.accentColor}
                      </span>
                    </div>
                    <MeterBar label="Glow Intensity" value={ambientState.glowIntensity} color={ambientState.accentColor}/>
                    <div style={{ fontSize:11, color:"#6B5E4E" }}>
                      Background: <strong style={{ color:"#1A1A1B" }}>{ambientState.backgroundVariant}</strong>
                    </div>
                  </div>
                  <div style={{ background:"rgba(212,139,0,.07)", borderRadius:10,
                    padding:"20px", textAlign:"center",
                    boxShadow:`inset 0 0 ${ambientState.glowIntensity * 30}px ${ambientState.accentColor}20` }}>
                    <div style={{ fontSize:18, fontWeight:700, color:"#1A1A1B", letterSpacing:"0.1em" }}>
                      {ambientState.sceneName}
                    </div>
                    <div style={{ fontSize:11, color:"#6B5E4E", marginTop:4 }}>Active Scene</div>
                  </div>
                </div>
              </Panel>
            )}

            {motionTokens && (
              <Panel title="Operational Visual Tokens">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
                  {Object.entries(motionTokens).map(([state, token]) => (
                    <div key={state} style={{ borderRadius:8, padding:"10px 14px",
                      background:(token as { bgColor?: string }).bgColor ?? "rgba(212,139,0,.06)",
                      border:`1px solid ${token.color}30` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                        <span style={{ fontSize:14, color: token.color }}>{(token as { icon?: string }).icon ?? "●"}</span>
                        <span style={{ fontSize:11, fontWeight:700, color: token.color, letterSpacing:"0.06em" }}>
                          {token.label}
                        </span>
                        {token.animate && (
                          <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:1.5 }}
                            style={{ width:6, height:6, borderRadius:"50%", background:token.color, marginLeft:"auto" }}/>
                        )}
                      </div>
                      <div style={{ fontSize:10, color:"#6B5E4E" }}>P{token.priority}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="Experience Modules">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {[
                  { mod:"Cinematic Transitions", desc:"Cross-scene animation choreography" },
                  { mod:"Adaptive Engine",        desc:"Context-to-directive translation" },
                  { mod:"Orchestration Motion",  desc:"Event → animation directives" },
                  { mod:"Predictive UI",          desc:"Next-screen pre-fetching" },
                  { mod:"Ambient Interface Sync", desc:"Real-time scene → frontend tokens" },
                  { mod:"Visual Language",        desc:"Operational state tokens + badges" },
                ].map(({ mod, desc }) => (
                  <div key={mod} style={{ background:"rgba(212,139,0,.05)", borderRadius:8,
                    padding:"10px 12px", border:"1px solid rgba(212,139,0,.12)" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1A1A1B", marginBottom:3 }}>{mod}</div>
                    <div style={{ fontSize:10, color:"#6B5E4E" }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Panel>
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


        {/* ── Supply Chain & Logistics Tab ── */}
        {tab === "supply" && (
          <>
            <Panel title="Supply Chain Ledger — Live Feed">
              {supplyLedger.length === 0 ? (
                <div style={{ color:"#9A8A7A", fontSize:13, textAlign:"center", padding:"20px 0" }}>
                  Awaiting SUPPLY_LEDGER_MUTATION events…
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {supplyLedger.slice(0, 20).map((row, i) => (
                    <motion.div key={row.id + i}
                      initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                      style={{ background:"#fff", borderRadius:8, padding:"10px 14px",
                        border:"1px solid rgba(26,26,27,.08)", display:"flex",
                        alignItems:"center", justifyContent:"space-between", gap:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em",
                          textTransform:"uppercase", color:
                            row.mutationType === "restock"  ? "#2E7D32" :
                            row.mutationType === "depletion"? "#C62828" :
                            row.mutationType === "back_order"? "#E65100" :
                            row.mutationType === "allocation"? "#1565C0" : "#6B5E4E",
                          background:
                            row.mutationType === "restock"  ? "rgba(46,125,50,.1)"  :
                            row.mutationType === "depletion"? "rgba(198,40,40,.1)"  :
                            row.mutationType === "back_order"? "rgba(230,81,0,.1)"  :
                            row.mutationType === "allocation"? "rgba(21,101,192,.1)" : "rgba(107,94,78,.1)",
                          padding:"2px 8px", borderRadius:20 }}>
                          {row.mutationType}
                        </span>
                        <span style={{ fontSize:12, color:"#1A1A1B", fontWeight:600 }}>
                          {row.quantityDelta > 0 ? "+" : ""}{row.quantityDelta} units
                        </span>
                        <span style={{ fontSize:11, color:"#9A8A7A" }}>
                          {row.previousQuantity} → {row.newQuantity}
                        </span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {row.operatorId && (
                          <span style={{ fontSize:10, color:"#6B5E4E" }}>{row.operatorId}</span>
                        )}
                        <span style={{ fontSize:10, color:"#9A8A7A" }}>
                          {row.broadcastedAt ? new Date(row.broadcastedAt).toLocaleTimeString() : "—"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Current Inventory">
              {supplyEntries.length === 0 ? (
                <div style={{ color:"#9A8A7A", fontSize:13, textAlign:"center", padding:"20px 0" }}>
                  No inventory entries. POST to /api/supply/mutation to populate.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {supplyEntries.slice(0, 30).map(entry => (
                    <div key={entry.id}
                      style={{ background:"#fff", borderRadius:8, padding:"10px 14px",
                        border:"1px solid rgba(26,26,27,.08)", display:"flex",
                        alignItems:"center", justifyContent:"space-between", gap:12 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1B" }}>{entry.productName}</div>
                        <div style={{ fontSize:11, color:"#9A8A7A" }}>{entry.sku} · {entry.category}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:15, fontWeight:700, color:
                            entry.status === "in_stock"   ? "#2E7D32" :
                            entry.status === "low_stock"  ? "#E65100" :
                            entry.status === "back_ordered"? "#C62828" : "#6B5E4E" }}>
                            {entry.quantityOnHand} {entry.unit}
                          </div>
                          <div style={{ fontSize:10, color:"#9A8A7A", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                            {entry.status.replace(/_/g, " ")}
                          </div>
                        </div>
                        {entry.quantityOnHand <= entry.reorderThreshold && (
                          <span style={{ fontSize:9, fontWeight:700, color:"#fff",
                            background:"#C62828", padding:"2px 7px", borderRadius:20,
                            letterSpacing:"0.1em", textTransform:"uppercase" }}>
                            REORDER
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Channel Status">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { label:"pgPubSub Channel",   value:"supply — LISTEN active",                  ok:true  },
                  { label:"Socket.IO Event",     value:"supply_update → ops:<venueId>",            ok:true  },
                  { label:"Mutation Endpoint",   value:"POST /api/supply/mutation",               ok:true  },
                  { label:"Ledger Endpoint",     value:"GET /api/supply/ledger/:venueId",         ok:true  },
                  { label:"Inventory Endpoint",  value:"GET /api/supply/inventory/:venueId",      ok:true  },
                  { label:"Live Ledger Entries", value:`${supplyLedger.length} in buffer`,        ok:supplyLedger.length > 0 },
                  { label:"Inventory Entries",   value:`${supplyEntries.length} tracked`,         ok:supplyEntries.length > 0 },
                ].map(row => (
                  <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"6px 0",
                    borderBottom:"1px solid rgba(26,26,27,.06)" }}>
                    <span style={{ fontSize:12, color:"#6B5E4E" }}>{row.label}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:12, color:"#1A1A1B", fontFamily:"monospace" }}>{row.value}</span>
                      <span style={{ fontSize:9, fontWeight:700,
                        color: row.ok ? "#2E7D32" : "#9A8A7A",
                        background: row.ok ? "rgba(46,125,50,.1)" : "rgba(107,94,78,.1)",
                        padding:"2px 6px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                        {row.ok ? "LIVE" : "IDLE"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

      {/* Transport badge */}
      <div style={{ position:"fixed", bottom:16, right:16, fontSize:10, color:"#9A8A7A",
        background:"rgba(245,242,237,.9)", padding:"4px 10px", borderRadius:20,
        border:"1px solid rgba(26,26,27,.1)", backdropFilter:"blur(8px)" }}>
        E.A.T / EEIS · Transport: PostgreSQL LISTEN/NOTIFY · Redis-ready
      </div>
    </div>
  );
}
