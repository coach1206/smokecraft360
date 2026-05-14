/**
 * StaffTraining — /training/staff
 *
 * Guided training cards for venue staff. No auth required — any staff member can access.
 * Print-friendly for handout use.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Printer, ChevronLeft, ChevronRight,
  Flame, Brain, ShoppingBag, Clock, MessageCircle,
  Sliders, CheckCircle2, Play, BookOpen, Star,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:     "#F5F4F0",
  card:   "#1A1A1B",
  border: "rgba(26,20,16,0.09)",
  text:   "#1A1410",
  muted:  "rgba(26,20,16,0.45)",
  dim:    "rgba(26,20,16,0.28)",
  gold:   "#b8952a",
  dark:   "#1A1410",
};

// ── Training card data ────────────────────────────────────────────────────────

const CARDS = [
  {
    id:    "start-experience",
    title: "Starting an Experience",
    icon:  Flame,
    color: "#D48B00",
    tag:   "Core Flow",
    steps: [
      { step: 1, text: "Navigate to the Craft Hub (the home screen). Four craft tiles appear: SmokeCraft, PourCraft, BrewCraft, VapeCraft." },
      { step: 2, text: "Tap the craft that matches the guest's interest. The system opens the swipe experience for that craft type." },
      { step: 3, text: "Alternatively, navigate directly via URL: /experience/smoke, /experience/pour, /experience/brew, or /experience/vape." },
      { step: 4, text: "The guest swipes through flavor profile cards. Coach them: swipe right (or tap ADD) if they like it, swipe left (SKIP) to pass." },
      { step: 5, text: "After all cards are reviewed, the Reveal page shows ranked recommendations based on their preferences." },
    ],
    keyPoint: "Never rush a guest through the swipe flow — the system needs at least 4–5 swipes to make accurate recommendations.",
    mistake:  "Skipping the craft selection and jumping straight to a URL bypasses the full Craft Hub experience.",
  },
  {
    id:    "swipe-recommendations",
    title: "How Swipe Recommendations Work",
    icon:  Brain,
    color: "#8b5cf6",
    tag:   "System Intelligence",
    steps: [
      { step: 1, text: "Every ADD swipe strengthens the weight of that item's flavor tags in the guest's taste profile (Memory Brain)." },
      { step: 2, text: "Every SKIP swipe weakens those tags. The system is always learning — more swipes = better accuracy." },
      { step: 3, text: "The Revenue Brain then scores every in-stock item: 40% taste match, 25% venue margin, 15% stock level, 20% reliability." },
      { step: 4, text: "Items with zero stock are hard-blocked — they never appear in recommendations regardless of taste score." },
      { step: 5, text: "The Reveal page shows the top 3–5 ranked items with taste match percentage, pairing notes, and price." },
    ],
    keyPoint: "The system is completely real — it reads live inventory and real guest preferences. There is no fake data in production.",
    mistake:  "Telling guests it's 'just an AI' undersells it. The Memory Brain builds a genuine, persistent taste profile per user.",
  },
  {
    id:    "add-to-order",
    title: "How Add-to-Order Works",
    icon:  ShoppingBag,
    color: "#16a34a",
    tag:   "Order Pipeline",
    steps: [
      { step: 1, text: "On the Reveal page, the guest taps the ADD button next to a recommended item." },
      { step: 2, text: "The system immediately creates a 15-minute inventory reservation. That stock is held exclusively for this guest." },
      { step: 3, text: "The guest can add multiple items. Each gets its own reservation." },
      { step: 4, text: "To confirm, the guest (or staff) taps Confirm Order. This converts reservations into a confirmed sale and decrements inventory." },
      { step: 5, text: "If the guest cancels or the session times out, reservations release automatically and stock returns to available." },
    ],
    keyPoint: "The 15-minute reservation prevents double-sells. Two guests cannot be sold the same last unit.",
    mistake:  "Do not manually adjust inventory during an active reservation — wait for the order to confirm or expire first.",
  },
  {
    id:    "reservations",
    title: "How Reservations Expire",
    icon:  Clock,
    color: "#ea580c",
    tag:   "Inventory Control",
    steps: [
      { step: 1, text: "When a guest taps ADD on the Reveal page, a reservation is created with a 15-minute expiry timestamp." },
      { step: 2, text: "If no action is taken within 15 minutes, the reservation releases automatically. No action required from staff." },
      { step: 3, text: "If a guest says 'I'll think about it' — their reservation holds for 15 minutes. After that, the item is fair game again." },
      { step: 4, text: "Confirmed orders release the reservation and record a permanent inventory decrement." },
      { step: 5, text: "You can view active reservations in the Inventory module. Expired ones are marked 'released' in the audit log." },
    ],
    keyPoint: "Never tell a guest their item is 'saved' for longer than 15 minutes. Always set that expectation upfront.",
    mistake:  "Assuming a reservation means a sale — the guest still needs to confirm. Follow up within 10 minutes.",
  },
  {
    id:    "guest-explainer",
    title: "Explaining the System to Guests",
    icon:  MessageCircle,
    color: "#0891b2",
    tag:   "Guest Communication",
    steps: [
      { step: 1, text: "Opening line: \"This is our experience engine — it learns your taste in real-time and matches it against what we have in stock tonight.\"" },
      { step: 2, text: "For the swipe flow: \"Think of it like a taste interview. Swipe right if this sounds good, left if it doesn't. There are no wrong answers.\"" },
      { step: 3, text: "For the reveal: \"These are ranked specifically for you — not just popular items, but what our system thinks you'll actually enjoy.\"" },
      { step: 4, text: "For the reservation: \"I can hold that for you for 15 minutes while you decide. After that it goes back to the floor.\"" },
      { step: 5, text: "For repeat guests: \"The system remembers your preferences from last time — it gets more accurate with each visit.\"" },
    ],
    keyPoint: "Guests respond better to 'experience engine' than 'AI' — it sounds less clinical and more premium.",
    mistake:  "Over-explaining the technology. Keep it experiential: what it does for the guest, not how it works internally.",
  },
  {
    id:    "experience-control",
    title: "Using Experience Control",
    icon:  Sliders,
    color: "#D48B00",
    tag:   "Venue Management",
    steps: [
      { step: 1, text: "Navigate to Settings → Experience Control (or /admin/experience-control). This requires manager or venue_owner access." },
      { step: 2, text: "Select the Venue Mode: Standard, Lounge, Premium, Rush, Private, or Showcase. Each adjusts pacing, atmosphere, and recommendation pressure." },
      { step: 3, text: "Premium mode: slower pacing, higher atmosphere intensity, pushes premium-tier items. Best for high-value guests." },
      { step: 4, text: "Rush mode: faster cards, reduced narration, higher conversion pressure. Best for busy service periods." },
      { step: 5, text: "Changes take effect immediately for all active sessions on that venue. No restart required." },
    ],
    keyPoint: "Change the Venue Mode to match the energy of the room — the system adapts the entire guest experience accordingly.",
    mistake:  "Leaving the venue in Rush mode during slow periods makes the experience feel pushy. Reset to Standard or Lounge.",
  },
  {
    id:    "smoke-test",
    title: "Running the Smoke Test",
    icon:  CheckCircle2,
    color: "#16a34a",
    tag:   "System Validation",
    steps: [
      { step: 1, text: "Navigate to /admin/system-validation. Requires manager or venue_owner access." },
      { step: 2, text: "Review the Live System Health grid — 8 system cards showing healthy/warning/failed status." },
      { step: 3, text: "Click the Run Smoke Test button. The system runs 13 automated checks across every platform component." },
      { step: 4, text: "Wait 5–10 seconds for results. Each check shows pass/fail with millisecond response time." },
      { step: 5, text: "If any check shows FAILED, note the system name and error detail. Contact your NOVEE OS support contact with this info." },
    ],
    keyPoint: "Run the smoke test at the start of every shift and after any system changes or software updates.",
    mistake:  "Ignoring WARNING status. Warnings indicate degraded but working systems — address them before they become failures.",
  },
  {
    id:    "demo-mode",
    title: "Using Demo Mode for Investors",
    icon:  Play,
    color: "#8b5cf6",
    tag:   "Investor Presentations",
    steps: [
      { step: 1, text: "Navigate to /demo/axiom-experience before the meeting starts. Bookmark this URL for quick access." },
      { step: 2, text: "Click Start Demo. The system runs a 6-step guided story: Craft Hub → Swipe → Atmosphere → Revenue Brain → Reveal → Analytics." },
      { step: 3, text: "Use the Next Step button to control pacing. Pause when you need to explain something." },
      { step: 4, text: "Key talking point for Step 4 (Revenue Brain): 'This is live scoring — 40% taste match, 25% margin optimization, 15% stock availability.'" },
      { step: 5, text: "Key talking point for Step 6 (Analytics): 'Every interaction is captured. These are real behavioral intelligence metrics from this venue.'" },
    ],
    keyPoint: "Demo Mode is completely safe — it never creates real orders or sessions. You can run it as many times as needed.",
    mistake:  "Clicking through too fast. Let each step breathe for at least 30 seconds — the animations are part of the story.",
  },
];

// ── Print styles ──────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  .no-print { display: none !important; }
  .print-card { break-inside: avoid; page-break-inside: avoid; }
  body { background: white !important; }
  * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
}
`;

// ── Card component ─────────────────────────────────────────────────────────────

function TrainingCard({ card, index, isActive, onClick }: {
  card: typeof CARDS[0];
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      className="print-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      style={{
        background: C.card,
        border: `1px solid ${isActive ? card.color + "50" : C.border}`,
        borderLeft: `4px solid ${card.color}`,
        borderRadius: 14,
        padding: "20px 22px",
        cursor: "pointer",
        marginBottom: 14,
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: card.color + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <card.icon size={18} color={card.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
              color: card.color, textTransform: "uppercase",
            }}>{card.tag}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: isActive ? 16 : 0 }}>
            {card.title}
          </div>

          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {card.steps.map(s => (
                    <div key={s.step} style={{ display: "flex", gap: 12 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: card.color + "20", border: `1px solid ${card.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, color: card.color,
                      }}>{s.step}</div>
                      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.65, margin: 0, paddingTop: 2 }}>
                        {s.text}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: 16,
                  background: card.color + "0C",
                  border: `1px solid ${card.color}25`,
                  borderRadius: 10, padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: card.color, marginBottom: 4, letterSpacing: "0.06em" }}>
                    ★ KEY POINT
                  </div>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{card.keyPoint}</p>
                </div>

                <div style={{
                  marginTop: 10,
                  background: "rgba(220,38,38,0.04)",
                  border: "1px solid rgba(220,38,38,0.12)",
                  borderRadius: 10, padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 4, letterSpacing: "0.06em" }}>
                    ✗ COMMON MISTAKE
                  </div>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{card.mistake}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div style={{ fontSize: 12, color: C.dim, flexShrink: 0 }}>
          {isActive ? "▲" : "▼"}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StaffTraining() {
  const [, navigate] = useLocation();
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [cardIdx, setCardIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "carousel">("list");

  const currentCard = CARDS[cardIdx]!;

  function toggleCard(id: string) {
    setActiveCard(p => p === id ? null : id);
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text }}>
      <style>{PRINT_STYLE}</style>

      {/* Header */}
      <div className="no-print" style={{
        background: "#1A1A1B", borderBottom: `1px solid ${C.border}`,
        padding: "0 24px", position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, height: 60 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "6px 12px",
              color: C.muted, fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Home
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#1A1410",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BookOpen size={16} color="#D48B00" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Staff Training</div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em" }}>NOVEE OS · 8 MODULES</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 0, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {(["list", "carousel"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                    background: viewMode === mode ? "#1A1410" : "transparent",
                    color: viewMode === mode ? "#D48B00" : C.muted,
                  }}
                >
                  {mode === "list" ? "All Cards" : "Step-by-Step"}
                </button>
              ))}
            </div>

            <button
              onClick={() => window.print()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "6px 14px",
                color: C.muted, fontSize: 12, cursor: "pointer",
              }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Print header */}
        <div style={{ display: "none" }} className="print-only">
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>NOVEE OS — Staff Training Guide</h1>
          <p style={{ color: C.muted, marginBottom: 24 }}>8 core modules for venue staff. Keep a copy at the host stand.</p>
        </div>

        {/* Intro */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="no-print" style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>
            Staff Training Guide
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            8 modules covering everything staff need to run NOVEE OS with confidence.
            {viewMode === "list" ? " Click any card to expand." : " Navigate through each module step-by-step."}
          </p>
        </div>

        {/* Progress pills */}
        <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {CARDS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => { setCardIdx(i); if (viewMode === "carousel") setActiveCard(c.id); else toggleCard(c.id); }}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: activeCard === c.id ? c.color + "20" : "rgba(26,20,16,0.05)",
                border: `1px solid ${activeCard === c.id ? c.color + "40" : C.border}`,
                color: activeCard === c.id ? c.color : C.muted,
              }}
            >
              {i + 1}. {c.tag}
            </button>
          ))}
        </div>

        {viewMode === "list" ? (
          /* ── List view ── */
          <div>
            {CARDS.map((card, i) => (
              <TrainingCard
                key={card.id}
                card={card}
                index={i}
                isActive={activeCard === card.id}
                onClick={() => toggleCard(card.id)}
              />
            ))}
          </div>
        ) : (
          /* ── Carousel view ── */
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={cardIdx}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${currentCard.color}`,
                  borderRadius: 16, padding: "28px 28px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: currentCard.color + "15",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <currentCard.icon size={22} color={currentCard.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: currentCard.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                      Module {cardIdx + 1} of {CARDS.length} · {currentCard.tag}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{currentCard.title}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  {currentCard.steps.map(s => (
                    <div key={s.step} style={{ display: "flex", gap: 14 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: currentCard.color + "20",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, color: currentCard.color,
                      }}>{s.step}</div>
                      <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0, paddingTop: 3 }}>{s.text}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: currentCard.color + "0C", border: `1px solid ${currentCard.color}25`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: currentCard.color, marginBottom: 6, letterSpacing: "0.1em" }}>
                      <Star size={10} style={{ display: "inline", marginRight: 4 }} />KEY POINT
                    </div>
                    <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{currentCard.keyPoint}</p>
                  </div>
                  <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.12)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", marginBottom: 6, letterSpacing: "0.1em" }}>
                      ✗ COMMON MISTAKE
                    </div>
                    <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{currentCard.mistake}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Carousel nav */}
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
              <button
                onClick={() => setCardIdx(p => Math.max(0, p - 1))}
                disabled={cardIdx === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "9px 18px",
                  color: cardIdx === 0 ? C.dim : C.text, fontSize: 13, fontWeight: 600, cursor: cardIdx === 0 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                {CARDS.map((_, i) => (
                  <div key={i} onClick={() => setCardIdx(i)} style={{
                    width: i === cardIdx ? 20 : 7, height: 7, borderRadius: 4,
                    background: i === cardIdx ? C.gold : C.border,
                    cursor: "pointer", transition: "all 0.2s",
                  }} />
                ))}
              </div>
              <button
                onClick={() => setCardIdx(p => Math.min(CARDS.length - 1, p + 1))}
                disabled={cardIdx === CARDS.length - 1}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: cardIdx === CARDS.length - 1 ? "rgba(26,20,16,0.08)" : "#1A1410",
                  border: "none", borderRadius: 10, padding: "9px 18px",
                  color: cardIdx === CARDS.length - 1 ? C.dim : "#D48B00",
                  fontSize: 13, fontWeight: 700, cursor: cardIdx === CARDS.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
