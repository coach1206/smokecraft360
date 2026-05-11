/**
 * EEIE AI Panel — Floating AI Assistant + Commentary Feed
 * Always-available intelligence layer for staff and managers.
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, ChevronRight, Send, Zap, CheckCircle, MessageSquare, Star } from "lucide-react";
import { type Theme, Badge, LiveDot, triggerHaptic } from "./shared";

interface CommentaryItem {
  id: string;
  ts: string;
  source: string;
  confidence: number;
  message: string;
  action: string;
  priority: "high" | "medium" | "low";
  acknowledged: boolean;
}

const MOCK_COMMENTARY: CommentaryItem[] = [
  {
    id: "c1", ts: new Date(Date.now() - 2 * 60000).toISOString(),
    source: "PAIRING ENGINE", confidence: 94, priority: "high",
    message: "Table 4 has a strong pairing opportunity. Guest leans creamy/sweet — recommend Woodford Reserve Double Oaked now before the table moves to dessert.",
    action: "Show Pairing", acknowledged: false,
  },
  {
    id: "c2", ts: new Date(Date.now() - 5 * 60000).toISOString(),
    source: "INVENTORY WATCH", confidence: 87, priority: "high",
    message: "Inventory pressure rising on medium-full cigars. 3 units of Padron 1964 Exclusivo remaining. Consider upselling now.",
    action: "View Inventory", acknowledged: false,
  },
  {
    id: "c3", ts: new Date(Date.now() - 9 * 60000).toISOString(),
    source: "GUEST INTELLIGENCE", confidence: 91, priority: "medium",
    message: "VIP guest Elena V. (Table 2) matches premium bourbon pairing profile. Balvenie DoubleWood 17 is optimal — 96% match score.",
    action: "Apply to Table", acknowledged: false,
  },
  {
    id: "c4", ts: new Date(Date.now() - 14 * 60000).toISOString(),
    source: "VENUE MOOD", confidence: 78, priority: "medium",
    message: "Venue mood shifted to Premium. Recommend activating upsell script for Tables 1 and 2. High-energy engagement window open.",
    action: "Set Mood", acknowledged: false,
  },
  {
    id: "c5", ts: new Date(Date.now() - 22 * 60000).toISOString(),
    source: "BAR SYNC", confidence: 82, priority: "low",
    message: "Bar delay detected (+4 min). Recommend food-first pacing for Table 4. Truffle board can bridge the wait elegantly.",
    action: "Notify Bar", acknowledged: true,
  },
  {
    id: "c6", ts: new Date(Date.now() - 31 * 60000).toISOString(),
    source: "DISTRIBUTOR SYNC", confidence: 70, priority: "low",
    message: "Distributor stock available for low local cigar: Arturo Fuente Opus X. Consider restock before weekend rush.",
    action: "Restock", acknowledged: true,
  },
];

const QUICK_CHIPS = [
  "Best pairing now",
  "Check inventory",
  "Guest mood summary",
  "Staff nudge needed",
  "Revenue opportunity",
  "System health",
];

interface Props {
  T: Theme;
  open: boolean;
  onClose: () => void;
}

export function AIPanel({ T, open, onClose }: Props) {
  const [items, setItems] = useState<CommentaryItem[]>(MOCK_COMMENTARY);
  const [input, setInput] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const unread = items.filter(i => !i.acknowledged).length;

  function acknowledge(id: string) {
    triggerHaptic("softTap");
    setItems(p => p.map(i => i.id === id ? { ...i, acknowledged: true } : i));
  }

  async function askEEIE(prompt: string) {
    if (!prompt.trim()) return;
    setAsking(true);
    setInput("");
    setAiReply(null);
    await new Promise(r => setTimeout(r, 900));
    const replies: Record<string, string> = {
      "best pairing now": "Based on current guest sessions: Table 2 (Elena V.) has the highest conversion window. Recommend Balvenie DoubleWood 17 + My Father Le Bijou 1922 bundle at $118. Expected tip uplift: 22%.",
      "check inventory": "Critical: Padron 1964 Exclusivo at 3 units (threshold: 5). Arturo Fuente Opus X at 7 units. Woodford Reserve Double Oaked — full stock (14 bottles). No bar delays currently detected.",
      "guest mood summary": "4 active sessions. Table 1: Premium mood, high engagement. Table 2: VIP Active, attention needed. Table 4: Social, bar pairing window open. Table 7: Paused — await staff return.",
      "staff nudge needed": "Table 4 (Sophia L.) has been active 34 minutes with only 1 item in cart. Recommend staff visit with the suggested script: 'This pairing brings out the leather and dark fruit notes in your blend. Would you like a 2 oz pour?'",
    };
    const lower = prompt.toLowerCase();
    let reply = "I've analyzed the current venue intelligence. All systems are performing nominally. Active guest sessions: 4. Top pairing opportunity is at Table 2 with a 96% AI match score. Would you like me to prepare a staff action for any specific table?";
    for (const [k, v] of Object.entries(replies)) {
      if (lower.includes(k)) { reply = v; break; }
    }
    setAiReply(reply);
    setAsking(false);
    triggerHaptic("success");
  }

  const priorityColor = (p: CommentaryItem["priority"]) =>
    p === "high" ? T.red : p === "medium" ? T.yellow : T.textSub;

  const timeAgo = (ts: string) => {
    const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    return m < 1 ? "just now" : `${m}m ago`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{
            width: 310, flexShrink: 0,
            background: T.dark ? "rgba(5,10,24,0.98)" : "rgba(248,250,255,0.98)",
            borderLeft: `1px solid ${T.border}`,
            display: "flex", flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: `1px solid ${T.border}`,
            background: T.dark ? `${T.purple}08` : `${T.purple}05`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <motion.div
              animate={{ boxShadow: [`0 0 0px ${T.purple}00`, `0 0 12px ${T.purple}60`, `0 0 0px ${T.purple}00`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ width: 34, height: 34, borderRadius: 10, background: `${T.purple}14`, border: `1px solid ${T.purple}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <Brain size={16} color={T.purple} />
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.text, letterSpacing: "0.12em", fontFamily: T.mono }}>EEIE ASSISTANT</div>
              <div style={{ fontSize: 8.5, color: T.purple, fontFamily: T.mono }}>Experience AI · Always On</div>
            </div>
            {unread > 0 && (
              <div style={{ background: T.red, color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 800, padding: "2px 7px", minWidth: 20, textAlign: "center" }}>{unread}</div>
            )}
            <motion.button whileTap={{ scale: 0.92 }} onClick={onClose}
              style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", padding: 4, display: "flex" }}>
              <X size={15} />
            </motion.button>
          </div>

          {/* Ask EEIE */}
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, background: T.dark ? `${T.purple}05` : `${T.purple}03` }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: T.textFaint, letterSpacing: "0.18em", fontFamily: T.mono, marginBottom: 8 }}>ASK EEIE</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && void askEEIE(input)}
                placeholder="What's the best pairing right now?"
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${T.border}`, fontSize: 11,
                  background: T.dark ? "rgba(255,255,255,0.04)" : "rgba(0,60,180,0.04)",
                  color: T.text, outline: "none",
                  fontFamily: T.sans,
                }}
              />
              <motion.button whileTap={{ scale: 0.93 }} onClick={() => void askEEIE(input)}
                disabled={!input.trim() || asking}
                style={{ padding: "10px 13px", borderRadius: 10, background: T.purple, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", opacity: !input.trim() || asking ? 0.5 : 1 }}>
                {asking ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
                    <Zap size={14} />
                  </motion.div>
                ) : <Send size={14} />}
              </motion.button>
            </div>

            {/* Quick chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {QUICK_CHIPS.map(chip => (
                <motion.button key={chip} whileTap={{ scale: 0.94 }}
                  onClick={() => void askEEIE(chip)}
                  style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${T.purple}30`, background: `${T.purple}08`, color: T.purple, cursor: "pointer", fontSize: 9, fontWeight: 600, fontFamily: T.mono }}>
                  {chip}
                </motion.button>
              ))}
            </div>

            {/* AI Reply */}
            <AnimatePresence>
              {aiReply && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12, background: `${T.purple}0E`, border: `1px solid ${T.purple}25` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                    <Star size={11} color={T.purple} />
                    <span style={{ fontSize: 8.5, color: T.purple, fontWeight: 700, letterSpacing: "0.12em", fontFamily: T.mono }}>EEIE RESPONSE</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.text, lineHeight: 1.65 }}>{aiReply}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Commentary Feed */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <MessageSquare size={11} color={T.textFaint} />
              <span style={{ fontSize: 8.5, fontWeight: 700, color: T.textFaint, letterSpacing: "0.18em", fontFamily: T.mono }}>AI COMMENTARY FEED</span>
              <LiveDot color={T.green} size={5} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(item => {
                const pc = priorityColor(item.priority);
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    style={{
                      padding: "11px 12px", borderRadius: 12,
                      background: item.acknowledged
                        ? (T.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)")
                        : `${pc}08`,
                      border: `1px solid ${item.acknowledged ? T.border : `${pc}28`}`,
                      opacity: item.acknowledged ? 0.55 : 1,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 7 }}>
                      <div style={{ width: 3, minHeight: 32, borderRadius: 2, background: item.acknowledged ? T.textFaint : pc, flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <Badge label={item.source} color={pc} bg={`${pc}12`} />
                          <span style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{timeAgo(item.ts)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.text, lineHeight: 1.6, marginBottom: 6 }}>{item.message}</div>
                        <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono }}>{item.confidence}% confidence</div>
                      </div>
                    </div>
                    {!item.acknowledged && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <motion.button whileTap={{ scale: 0.93 }} onClick={() => acknowledge(item.id)}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 9, fontFamily: T.mono, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <CheckCircle size={11} /> ACK
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.93 }}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${pc}35`, background: `${pc}0E`, color: pc, cursor: "pointer", fontSize: 9, fontFamily: T.mono, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <ChevronRight size={11} /> {item.action}
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer note */}
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, background: T.dark ? `${T.purple}05` : `${T.purple}03` }}>
            <div style={{ fontSize: 9, color: T.purple, fontFamily: T.mono, textAlign: "center", letterSpacing: "0.10em", opacity: 0.7 }}>
              EEIE TITAN V · REAL INTELLIGENCE LAYER
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
