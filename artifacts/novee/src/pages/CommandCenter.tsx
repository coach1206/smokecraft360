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
  trafficHeatmap:     number[][];
  orchestrationStatus:{ active: boolean; rulesFired: number; guardActive: boolean };
  syncHealth:         number;
}

interface OrchestrationEvent {
  event:      string;
  venueId:    string;
  trigger?:   string;
  confidence?:number;
  actions?:   Array<{ type: string; priority: number }>;
  status?:    string;
  ts?:        number;
}

interface AmbientUpdate {
  sceneId:   string;
  sceneName: string;
  moodScore: number;
  intensity: number;
  triggeredBy:string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL ?? "/";
const API  = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
const DEMO_VENUE = "demo-venue-001";

function fmt(n: number, decimals = 1): string {
  return (Math.round(n * 10 ** decimals) / 10 ** decimals).toFixed(decimals);
}

function scoreBg(n: number): string {
  if (n >= 0.75) return "#2d5a27";
  if (n >= 0.5)  return "#5a4a0a";
  return "#5a1a1a";
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function Heatmap({ data }: { data: number[][] }) {
  if (!data.length) return <div style={{ color: "#6B5E4E", fontSize: 13 }}>No heatmap data</div>;
  return (
    <div style={{ display: "grid", gridTemplateRows: `repeat(${data.length}, 1fr)`, gap: 3 }}>
      {data.map((row, ri) => (
        <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 3 }}>
          {row.map((val, ci) => (
            <div
              key={ci}
              title={fmt(val)}
              style={{
                height:       28,
                borderRadius: 4,
                background:   `rgba(212,139,0,${Math.min(val, 1)})`,
                border:       "1px solid rgba(212,139,0,0.2)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Score Ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ value, label, size = 88 }: { value: number; label: string; size?: number }) {
  const radius   = (size - 12) / 2;
  const circ     = 2 * Math.PI * radius;
  const stroke   = circ * (1 - value);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(212,139,0,0.15)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="#D48B00" strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
          fill="#1A1A1B" fontFamily="Cormorant Garamond, serif" fontSize={size * 0.22} fontWeight={600}>
          {Math.round(value * 100)}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: "#6B5E4E", fontFamily: "Cormorant Garamond, serif", letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

// ── Event Feed ─────────────────────────────────────────────────────────────────

function EventFeed({ events }: { events: OrchestrationEvent[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <AnimatePresence initial={false}>
        {events.slice(0, 12).map((ev, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background:   "rgba(26,26,27,0.05)",
              borderLeft:   `3px solid ${ev.status === "blocked" ? "#c0392b" : "#D48B00"}`,
              borderRadius: "0 6px 6px 0",
              padding:      "7px 10px",
              fontSize:     12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: "#1A1A1B", fontFamily: "Cormorant Garamond, serif" }}>
                {ev.event}
              </span>
              {ev.confidence !== undefined && (
                <span style={{ fontSize: 11, color: "#6B5E4E" }}>
                  {Math.round(ev.confidence * 100)}% conf
                </span>
              )}
            </div>
            {ev.trigger && (
              <div style={{ color: "#6B5E4E", fontSize: 11, marginTop: 2 }}>
                Trigger: {ev.trigger}
                {ev.actions && ` · ${ev.actions.length} actions`}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {events.length === 0 && (
        <div style={{ color: "#6B5E4E", fontSize: 13, textAlign: "center", padding: 16 }}>
          Waiting for orchestration events…
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CommandCenter() {
  const [venueId,       setVenueId]       = useState(DEMO_VENUE);
  const [inputVenueId,  setInputVenueId]  = useState(DEMO_VENUE);
  const [connected,     setConnected]     = useState(false);
  const [score,         setScore]         = useState<IntelligenceScore | null>(null);
  const [twin,          setTwin]          = useState<TwinState | null>(null);
  const [scene,         setScene]         = useState<AmbientUpdate | null>(null);
  const [events,        setEvents]        = useState<OrchestrationEvent[]>([]);
  const [guardrailsOn,  setGuardrailsOn]  = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const pushEvent = useCallback((ev: OrchestrationEvent) => {
    setEvents((prev) => [{ ...ev, ts: Date.now() }, ...prev].slice(0, 30));
  }, []);

  // REST: initial data load
  const loadData = useCallback(async (vid: string) => {
    try {
      const [ctxRes, twinRes] = await Promise.allSettled([
        fetch(`${API}/api/intelligence/context/${vid}`),
        fetch(`${API}/api/intelligence/twin/${vid}`),
      ]);
      if (ctxRes.status === "fulfilled" && ctxRes.value.ok) {
        const ctx = await ctxRes.value.json() as {
          engagementLevel: number; socialEnergy: number; activeGuests: number;
        };
        setScore({
          overallScore:    (ctx.engagementLevel + ctx.socialEnergy) / 2,
          engagementLevel: ctx.engagementLevel,
          socialEnergy:    ctx.socialEnergy,
          activeGuests:    ctx.activeGuests,
          decisionCount:   0,
        });
      }
      if (twinRes.status === "fulfilled" && twinRes.value.ok) {
        const t = await twinRes.value.json() as TwinState;
        setTwin(t);
      }
    } catch { /* non-critical */ }
  }, []);

  // Socket.IO connection
  useEffect(() => {
    const sock = io(window.location.origin, {
      path:       `${API}/api/socket.io`,
      transports: ["websocket", "polling"],
    });
    socketRef.current = sock;

    sock.on("connect",    () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));

    sock.on("intelligence_update", (data: Record<string, unknown>) => {
      if (data["venueId"] !== venueId) return;
      if (data["event"] === "INTELLIGENCE_SCORE_UPDATED") {
        setScore({
          overallScore:    data["overallScore"] as number,
          engagementLevel: data["engagementLevel"] as number,
          socialEnergy:    data["socialEnergy"] as number,
          activeGuests:    data["activeGuests"] as number,
          decisionCount:   data["decisionCount"] as number,
        });
      }
      pushEvent({ event: data["event"] as string, venueId: data["venueId"] as string });
    });

    sock.on("orchestration_event", (data: Record<string, unknown>) => {
      if (data["venueId"] !== venueId) return;
      pushEvent(data as OrchestrationEvent);
    });

    sock.on("twin_update", (data: Record<string, unknown>) => {
      if (data["venueId"] !== venueId) return;
      setTwin(data as unknown as TwinState);
    });

    sock.on("ambient_update", (data: Record<string, unknown>) => {
      if (data["venueId"] !== venueId) return;
      setScene(data as unknown as AmbientUpdate);
      pushEvent({ event: `SCENE: ${(data["sceneName"] as string) ?? data["sceneId"]}`, venueId: data["venueId"] as string });
    });

    sock.emit("join_ops",          { venueId });
    sock.emit("join_intelligence",  { venueId });

    loadData(venueId);

    return () => { sock.disconnect(); };
  }, [venueId, pushEvent, loadData]);

  const handleVenueChange = () => {
    if (inputVenueId.trim()) setVenueId(inputVenueId.trim());
  };

  const triggerEvaluation = async () => {
    try {
      const res = await fetch(`${API}/api/intelligence/evaluate/${venueId}`, { method: "POST" });
      const data = await res.json() as { decisions: number };
      pushEvent({ event: `MANUAL_EVALUATE — ${data.decisions} decisions`, venueId });
    } catch { /* */ }
  };

  const activateScene = async (sceneId: string) => {
    try {
      await fetch(`${API}/api/intelligence/scene`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ venueId, sceneId, triggeredBy: "operator" }),
      });
    } catch { /* */ }
  };

  const emergencyStop = async () => {
    try {
      await fetch(`${API}/api/orchestration/guardrails/${venueId}/stop`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ operator: "operator", reason: "Manual emergency stop" }),
      });
      setGuardrailsOn(false);
      pushEvent({ event: "EMERGENCY_STOP", venueId });
    } catch { /* */ }
  };

  const resumeAutomation = async () => {
    try {
      await fetch(`${API}/api/orchestration/guardrails/${venueId}/resume`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ operator: "operator" }),
      });
      setGuardrailsOn(true);
      pushEvent({ event: "AUTOMATION_RESUMED", venueId });
    } catch { /* */ }
  };

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:   "100vh",
      background:  "#F5F2ED",
      fontFamily:  "system-ui, sans-serif",
      padding:     24,
    }}>
      {/* Header */}
      <div style={{
        background:    "#1A1A1B",
        borderRadius:  12,
        padding:       "20px 28px",
        marginBottom:  24,
        display:       "flex",
        alignItems:    "center",
        justifyContent:"space-between",
      }}>
        <div>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 700, color: "#D48B00", letterSpacing: "0.04em" }}>
            COMMAND CENTER
          </div>
          <div style={{ fontSize: 12, color: "#6B5E4E", marginTop: 2, letterSpacing: "0.08em" }}>
            EEIS / E.A.T — Autonomous Hospitality Intelligence
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? "#27ae60" : "#e74c3c",
            boxShadow:  connected ? "0 0 8px #27ae60" : "0 0 8px #e74c3c",
          }} />
          <span style={{ fontSize: 12, color: connected ? "#27ae60" : "#e74c3c", letterSpacing: "0.06em" }}>
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Venue Selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={inputVenueId}
          onChange={(e) => setInputVenueId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVenueChange()}
          placeholder="Venue ID"
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            border: "1px solid rgba(26,26,27,0.15)", background: "white",
            fontSize: 13, color: "#1A1A1B", outline: "none",
          }}
        />
        <button
          onClick={handleVenueChange}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#D48B00", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          Connect
        </button>
      </div>

      {/* Score Rings Row */}
      <div style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(212,139,0,0.2)",
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <ScoreRing value={score?.overallScore    ?? 0} label="Overall" />
        <ScoreRing value={score?.engagementLevel ?? 0} label="Engagement" />
        <ScoreRing value={score?.socialEnergy    ?? 0} label="Social" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{
            fontSize: 36, fontWeight: 700, color: "#1A1A1B",
            fontFamily: "Cormorant Garamond, serif",
          }}>
            {score?.activeGuests ?? 0}
          </div>
          <span style={{ fontSize: 11, color: "#6B5E4E", letterSpacing: "0.05em" }}>ACTIVE GUESTS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{
            fontSize: 36, fontWeight: 700, color: "#D48B00",
            fontFamily: "Cormorant Garamond, serif",
          }}>
            {score?.decisionCount ?? 0}
          </div>
          <span style={{ fontSize: 11, color: "#6B5E4E", letterSpacing: "0.05em" }}>DECISIONS</span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Digital Twin */}
        <div style={{
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(212,139,0,0.2)", borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#6B5E4E", marginBottom: 12, fontWeight: 600 }}>
            DIGITAL TWIN — v{twin?.version ?? 0}
          </div>
          <Heatmap data={twin?.trafficHeatmap ?? []} />
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Mood",      value: fmt(twin?.environmentalState.moodScore ?? 0) },
              { label: "Atmosphere",value: fmt(twin?.environmentalState.atmosphere ?? 0) },
              { label: "Rules fired",value: String(twin?.orchestrationStatus.rulesFired ?? 0) },
              { label: "Sync",      value: `${Math.round((twin?.syncHealth ?? 0) * 100)}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "rgba(26,26,27,0.04)", borderRadius: 8, padding: "8px 12px",
              }}>
                <div style={{ fontSize: 10, color: "#6B5E4E", letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1B", fontFamily: "Cormorant Garamond, serif" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orchestration Event Feed */}
        <div style={{
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(212,139,0,0.2)", borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#6B5E4E", marginBottom: 12, fontWeight: 600 }}>
            ORCHESTRATION FEED
          </div>
          <EventFeed events={events} />
        </div>

        {/* Ambient Control */}
        <div style={{
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(212,139,0,0.2)", borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#6B5E4E", marginBottom: 12, fontWeight: 600 }}>
            AMBIENT CONTROL
          </div>
          {scene && (
            <div style={{
              background: "rgba(212,139,0,0.1)", borderRadius: 8, padding: "10px 14px", marginBottom: 12,
              border: "1px solid rgba(212,139,0,0.3)",
            }}>
              <div style={{ fontSize: 11, color: "#6B5E4E" }}>ACTIVE SCENE</div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, fontWeight: 700, color: "#D48B00" }}>
                {scene.sceneName}
              </div>
              <div style={{ fontSize: 11, color: "#6B5E4E" }}>
                Mood {fmt(scene.moodScore)} · Intensity {fmt(scene.intensity)} · by {scene.triggeredBy}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["premium-lounge","social-lounge","energize","intimate","standard"].map((s) => (
              <button
                key={s}
                onClick={() => activateScene(s)}
                style={{
                  padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(212,139,0,0.3)",
                  background: scene?.sceneId === s ? "#D48B00" : "transparent",
                  color:      scene?.sceneId === s ? "white"   : "#1A1A1B",
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                {s.replace(/-/g, " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div style={{
        background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(212,139,0,0.2)", borderRadius: 12, padding: "16px 24px",
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#6B5E4E", fontWeight: 600, marginRight: 8 }}>
          OPERATOR CONTROLS
        </div>
        <button
          onClick={triggerEvaluation}
          style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: "#D48B00", color: "white", cursor: "pointer",
            fontSize: 12, fontWeight: 600,
          }}
        >
          RUN EVALUATION
        </button>
        {guardrailsOn ? (
          <button
            onClick={emergencyStop}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "#c0392b", color: "white", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
            }}
          >
            EMERGENCY STOP
          </button>
        ) : (
          <button
            onClick={resumeAutomation}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "#27ae60", color: "white", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
            }}
          >
            RESUME AUTOMATION
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#6B5E4E" }}>
          Venue: <strong style={{ color: "#1A1A1B" }}>{venueId}</strong>
        </div>
      </div>
    </div>
  );
}
