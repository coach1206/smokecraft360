/**
 * StaffFloorCockpit — live floor overview for staff.
 * Route: /staff/floor
 *
 * NOT a spreadsheet. Cinematic obsidian tiles with live guest data,
 * AI insights, and quick action controls.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LiveLeaderboard from "@/components/LiveLeaderboard";
import VenueStatus from "@/components/VenueStatus";

interface GuestTile {
  sessionId:      string;
  guestProfileId: string | null;
  craftType:      string;
  startedAt:      string;
  swipeCount:     number;
  sessionScore:   number;
  guest:          { firstName: string; lastInitial: string; masteryTier: string };
  xpTotal:        number;
  recentTags:     string[];
  inHandoff:      boolean;
  handoffNote:    string | null;
  aiInsight:      string;
}

const CRAFT_ACCENT: Record<string, string> = {
  smoke: "#E85D26",
  pour:  "#D4AF37",
  brew:  "#D97706",
  vape:  "#A855F7",
};

const CRAFT_LABEL: Record<string, string> = {
  smoke: "SmokeCraft",
  pour:  "PourCraft",
  brew:  "BrewCraft",
  vape:  "VapeCraft",
};

const TIER_BADGE: Record<string, string> = {
  explorer:    "Explorer",
  enthusiast:  "Enthusiast",
  specialist:  "Specialist",
  aficionado:  "Aficionado",
  golden_box:  "Golden Box",
};

const TIER_COLOR: Record<string, string> = {
  explorer:    "#6B8A9A",
  enthusiast:  "#7EC8A0",
  specialist:  "#D48B00",
  aficionado:  "#CE93D8",
  golden_box:  "#FFD700",
};

type QuickAction = "handoff" | "end-handoff" | "push-pairing" | "vip";

export default function StaffFloorCockpit() {
  const [guests,       setGuests]       = useState<GuestTile[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [actionMsg,    setActionMsg]    = useState<string | null>(null);
  const [aiLoading,    setAiLoading]    = useState<string | null>(null);
  const [aiInsights,   setAiInsights]   = useState<Record<string, string>>({});
  const [resumingAll,  setResumingAll]  = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  async function fetchFloor() {
    try {
      const res  = await fetch("/api/staff/floor");
      if (!res.ok) return;
      const data = await res.json() as { guests: GuestTile[] };
      setGuests(data.guests ?? []);
      setLastUpdated(new Date());
      setLoading(false);
    } catch { setLoading(false); }
  }

  useEffect(() => {
    fetchFloor();
    pollRef.current = setInterval(fetchFloor, 8000);
    return () => { if (pollRef.current !== undefined) clearInterval(pollRef.current); };
  }, []);

  async function resumeAllSessions() {
    const active = guests.filter(g => g.inHandoff);
    if (active.length === 0) { showMsg("No active handoffs to resume"); return; }
    setResumingAll(true);
    try {
      await Promise.all(active.map(g =>
        fetch("/api/operational/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffSessionId: `floor-resume-${g.sessionId}`,
            staffUserId:    "floor-staff",
            snapshotId:     null,
          }),
        }).catch(() => {}),
      ));
      showMsg(`${active.length} session${active.length > 1 ? "s" : ""} resumed`);
      fetchFloor();
    } finally {
      setResumingAll(false);
    }
  }

  async function handleAction(action: QuickAction, guest: GuestTile) {
    if (!guest.guestProfileId) return;

    if (action === "handoff") {
      await fetch("/api/staff/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestProfileId: guest.guestProfileId, staffNote: "A Craft Specialist is preparing your experience." }),
      });
      showMsg(`Assisted discovery activated for ${guest.guest.firstName}`);
      fetchFloor();
    }

    if (action === "end-handoff") {
      await fetch(`/api/staff/handoff/${guest.guestProfileId}`, { method: "DELETE" });
      showMsg(`${guest.guest.firstName}'s session restored`);
      fetchFloor();
    }

    if (action === "push-pairing") {
      const craftMap: Record<string, string> = {
        smoke: "A Nicaraguan Robusto paired with an aged Scotch would be a perfect combination for your profile.",
        pour:  "A 12-year Speyside single malt with our house selection of artisanal chocolates has been prepared.",
        brew:  "Our barrel-aged stout has just been tapped — selected specifically for your profile.",
        vape:  "A premium nicotine salt collection matching your flavor preferences has been reserved for you.",
      };
      const rec = craftMap[guest.craftType] ?? "A special selection has been prepared for you.";
      await fetch("/api/staff/push-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestProfileId: guest.guestProfileId, recommendation: rec, type: "pairing" }),
      });
      showMsg(`Pairing pushed to ${guest.guest.firstName}`);
      fetchFloor();
    }

    if (action === "vip") {
      await fetch("/api/staff/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestProfileId: guest.guestProfileId,
          staffNote: "VIP recognition in progress. Your elevated experience is being prepared.",
        }),
      });
      showMsg(`VIP experience escalated for ${guest.guest.firstName}`);
      fetchFloor();
    }
  }

  async function requestAiInsight(guest: GuestTile) {
    const key = guest.sessionId;
    setAiLoading(key);
    try {
      const res = await fetch("/api/staff/floor/ai-insight", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          craftType:    guest.craftType,
          recentTags:   guest.recentTags,
          sessionScore: guest.sessionScore,
          xpTotal:      guest.xpTotal,
          guestName:    guest.guest.firstName,
        }),
      });
      const data = await res.json() as { insight: string };
      setAiInsights(prev => ({ ...prev, [key]: data.insight }));
    } finally {
      setAiLoading(null);
    }
  }

  function showMsg(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  }

  function elapsed(date: string) {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    return mins < 1 ? "just now" : `${mins}m ago`;
  }

  return (
    <div style={{
      minHeight:   "100dvh",
      background:  "#0A0A0B",
      color:       "#F5F2ED",
      fontFamily:  "'Cormorant Garamond', serif",
      padding:     "24px",
      paddingTop:  "68px",
      overflowY:   "auto",
    }}>
      {/* ── Fixed top status bar ─────────────────────────────────────────────── */}
      <VenueStatus guests={guests} lastUpdated={lastUpdated} />

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{
              fontSize:      "10px",
              letterSpacing: "0.25em",
              color:         "#D48B00",
              textTransform: "uppercase",
              marginBottom:  "4px",
            }}>
              NOVEE OS — SECTOR INTERFACE
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, color: "#F5F2ED", margin: 0 }}>
              Live Floor Overview
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Resume All button */}
            <motion.button
              onClick={resumeAllSessions}
              whileTap={{ scale: 0.95 }}
              disabled={resumingAll}
              style={{
                background:    guests.some(g => g.inHandoff)
                  ? "linear-gradient(135deg, #D48B00, #C87820)"
                  : "rgba(255,255,255,0.05)",
                border:        guests.some(g => g.inHandoff)
                  ? "none"
                  : "1px solid rgba(255,255,255,0.1)",
                color:         guests.some(g => g.inHandoff) ? "#0A0A0B" : "#6B5E4E",
                padding:       "10px 20px",
                borderRadius:  "24px",
                fontSize:      "12px",
                fontWeight:    700,
                letterSpacing: "0.06em",
                cursor:        resumingAll ? "wait" : "pointer",
                fontFamily:    "'Cormorant Garamond', serif",
                boxShadow:     guests.some(g => g.inHandoff)
                  ? "0 4px 18px rgba(212,139,0,0.35)"
                  : "none",
                transition:    "all 0.25s ease",
                whiteSpace:    "nowrap",
              }}
            >
              {resumingAll ? "Resuming…" : "Resume Guest Experience"}
            </motion.button>

            <div style={{ textAlign: "right" }}>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}
              >
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#7EC8A0" }} />
                <span style={{ fontSize: "11px", color: "#7EC8A0", letterSpacing: "0.1em" }}>LIVE</span>
              </motion.div>
              {lastUpdated && (
                <div style={{ fontSize: "10px", color: "#6B5E4E", marginTop: "2px" }}>
                  Updated {elapsed(lastUpdated.toISOString())}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display:       "flex",
          gap:           "24px",
          marginTop:     "16px",
          padding:       "12px 16px",
          background:    "rgba(255,255,255,0.04)",
          borderRadius:  "10px",
          border:        "1px solid rgba(255,255,255,0.06)",
        }}>
          {[
            { label: "Active Guests",       value: guests.length          },
            { label: "In Handoff",          value: guests.filter(g => g.inHandoff).length },
            { label: "Avg Score",           value: guests.length ? Math.round(guests.reduce((s, g) => s + g.sessionScore, 0) / guests.length) : 0 },
            { label: "Craft Sessions",      value: guests.length          },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "#D48B00" }}>{stat.value}</div>
              <div style={{ fontSize: "10px", color: "#6B5E4E", letterSpacing: "0.08em", textTransform: "uppercase" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live Leaderboard panel ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "flex-end" }}>
        <LiveLeaderboard craftType="global" compact limit={8} />
      </div>

      {/* Guest tiles */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#6B5E4E", paddingTop: "60px", fontSize: "16px", fontStyle: "italic" }}>
          Synchronizing floor intelligence…
        </div>
      ) : guests.length === 0 ? (
        <div style={{
          textAlign:      "center",
          paddingTop:     "80px",
          color:          "#6B5E4E",
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.4 }}>⬡</div>
          <p style={{ fontSize: "16px", fontStyle: "italic" }}>No active guests at this time.</p>
          <p style={{ fontSize: "12px", marginTop: "8px" }}>Floor will populate as guests begin their craft experience.</p>
        </div>
      ) : (
        <div style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
          gap:                 "16px",
        }}>
          {guests.map(guest => {
            const accent     = CRAFT_ACCENT[guest.craftType] ?? "#D48B00";
            const tierColor  = TIER_COLOR[guest.guest.masteryTier] ?? "#D48B00";
            const liveInsight = aiInsights[guest.sessionId] ?? guest.aiInsight;

            return (
              <motion.div
                key={guest.sessionId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                transition={{ duration: 0.4 }}
                style={{
                  background:     "rgba(255,255,255,0.04)",
                  border:         `1px solid ${guest.inHandoff ? accent + "66" : "rgba(255,255,255,0.07)"}`,
                  borderRadius:   "14px",
                  padding:        "16px",
                  position:       "relative",
                  overflow:       "hidden",
                  boxShadow:      guest.inHandoff ? `0 0 20px ${accent}22` : "none",
                  transition:     "border-color 0.3s, box-shadow 0.3s",
                }}
              >
                {/* Craft accent bar */}
                <div style={{
                  position:    "absolute",
                  top:         0,
                  left:        0,
                  right:       0,
                  height:      "2px",
                  background:  `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
                }} />

                {/* Guest header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Avatar */}
                    <div style={{
                      width:          "38px",
                      height:         "38px",
                      borderRadius:   "50%",
                      background:     `radial-gradient(circle at 35% 35%, ${accent}88, ${accent}33)`,
                      border:         `1px solid ${accent}44`,
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      fontSize:       "16px",
                      fontWeight:     600,
                      color:          "#F5F2ED",
                      flexShrink:     0,
                    }}>
                      {guest.guest.firstName[0]?.toUpperCase() ?? "?"}
                    </div>

                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "#F5F2ED" }}>
                        {guest.guest.firstName} {guest.guest.lastInitial}.
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <div style={{
                          width:  "6px", height: "6px", borderRadius: "50%",
                          background: tierColor,
                        }} />
                        <span style={{ fontSize: "10px", color: tierColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {TIER_BADGE[guest.guest.masteryTier] ?? "Explorer"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Craft badge */}
                  <div style={{
                    padding:       "3px 8px",
                    borderRadius:  "6px",
                    background:    `${accent}18`,
                    border:        `1px solid ${accent}33`,
                    fontSize:      "10px",
                    color:         accent,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}>
                    {CRAFT_LABEL[guest.craftType] ?? guest.craftType}
                  </div>
                </div>

                {/* Metrics row */}
                <div style={{
                  display:      "flex",
                  gap:          "16px",
                  marginBottom: "10px",
                  padding:      "8px 10px",
                  background:   "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                }}>
                  {[
                    { label: "Swipes",  value: guest.swipeCount  },
                    { label: "Score",   value: `${guest.sessionScore}%` },
                    { label: "XP",      value: guest.xpTotal.toLocaleString() },
                    { label: "Started", value: elapsed(guest.startedAt) },
                  ].map(m => (
                    <div key={m.label} style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5F2ED" }}>{m.value}</div>
                      <div style={{ fontSize: "9px", color: "#6B5E4E", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Score bar */}
                <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", marginBottom: "10px" }}>
                  <div style={{
                    height: "100%", borderRadius: "1px",
                    width: `${guest.sessionScore}%`,
                    background: `linear-gradient(90deg, ${accent}66, ${accent})`,
                  }} />
                </div>

                {/* Tags */}
                {guest.recentTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                    {guest.recentTags.slice(0, 5).map(tag => (
                      <span key={tag} style={{
                        padding:       "2px 7px",
                        borderRadius:  "4px",
                        background:    "rgba(255,255,255,0.05)",
                        border:        "1px solid rgba(255,255,255,0.08)",
                        fontSize:      "10px",
                        color:         "#BFB49A",
                        textTransform: "capitalize",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI Insight */}
                <div style={{
                  background:    "rgba(212,139,0,0.07)",
                  border:        "1px solid rgba(212,139,0,0.16)",
                  borderRadius:  "8px",
                  padding:       "8px 10px",
                  marginBottom:  "12px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "9px", color: "#D48B00", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                        AI Insight
                      </div>
                      <p style={{ fontSize: "12px", color: "#F5F2ED", fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>
                        {aiLoading === guest.sessionId ? "Generating…" : liveInsight}
                      </p>
                    </div>
                    <button
                      onClick={() => requestAiInsight(guest)}
                      style={{
                        flexShrink:    0,
                        background:    "rgba(212,139,0,0.12)",
                        border:        "1px solid rgba(212,139,0,0.25)",
                        borderRadius:  "6px",
                        padding:       "4px 8px",
                        fontSize:      "9px",
                        color:         "#D48B00",
                        cursor:        "pointer",
                        letterSpacing: "0.05em",
                        fontFamily:    "'Cormorant Garamond', serif",
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Handoff status */}
                {guest.inHandoff && (
                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      padding:      "6px 10px",
                      borderRadius: "6px",
                      background:   `${accent}18`,
                      border:       `1px solid ${accent}44`,
                      fontSize:     "11px",
                      color:        accent,
                      marginBottom: "10px",
                      fontStyle:    "italic",
                    }}
                  >
                    ● Assisted Discovery Active
                  </motion.div>
                )}

                {/* Quick actions */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {!guest.inHandoff ? (
                    <ActionBtn label="Assist"       onClick={() => handleAction("handoff",       guest)} color={accent} />
                  ) : (
                    <ActionBtn label="End Assist"   onClick={() => handleAction("end-handoff",   guest)} color="#6B8A9A" />
                  )}
                  <ActionBtn label="Send Pairing"   onClick={() => handleAction("push-pairing",  guest)} color="#D48B00" />
                  <ActionBtn label="Escalate VIP"   onClick={() => handleAction("vip",           guest)} color="#FFD700" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Toast notification */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: 10 }}
            style={{
              position:       "fixed",
              bottom:         "24px",
              left:           "50%",
              transform:      "translateX(-50%)",
              background:     "rgba(212,139,0,0.92)",
              color:          "#0A0A0B",
              padding:        "10px 20px",
              borderRadius:   "8px",
              fontSize:       "13px",
              fontWeight:     600,
              letterSpacing:  "0.03em",
              zIndex:         300,
              pointerEvents:  "none",
              boxShadow:      "0 4px 20px rgba(212,139,0,0.4)",
            }}
          >
            {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:       "5px 12px",
        borderRadius:  "6px",
        background:    `${color}14`,
        border:        `1px solid ${color}33`,
        fontSize:      "11px",
        color:         color,
        cursor:        "pointer",
        fontFamily:    "'Cormorant Garamond', serif",
        letterSpacing: "0.04em",
        transition:    "background 0.2s",
        whiteSpace:    "nowrap",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}28`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}14`)}
    >
      {label}
    </button>
  );
}
