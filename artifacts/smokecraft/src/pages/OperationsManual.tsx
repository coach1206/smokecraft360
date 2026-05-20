/**
 * NOVEE OS / SMOKECRAFT 360 — MASTER OPERATIONS MANUAL
 * 10-Volume Enterprise Reference | Print-Optimized
 */

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Printer, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#0A0806",
  surface:  "#111009",
  card:     "#161310",
  border:   "rgba(212,175,55,0.18)",
  gold:     "#D4AF37",
  goldSoft: "#B8922A",
  ink:      "#F5F2ED",
  muted:    "rgba(245,242,237,0.52)",
  dim:      "rgba(245,242,237,0.28)",
  serif:    "'Cormorant Garamond', Georgia, serif",
  sans:     "'Inter', system-ui, sans-serif",
  mono:     "'JetBrains Mono', 'Courier New', monospace",
};

// ── Volume metadata ───────────────────────────────────────────────────────────
const VOLUMES = [
  { id: 1, label: "NOVEE OS Operations Bible",               abbr: "VOL I"    },
  { id: 2, label: "CraftHub Experience & Navigation",        abbr: "VOL II"   },
  { id: 3, label: "SmokeCraft 360 Staff Training",           abbr: "VOL III"  },
  { id: 4, label: "E.A.T. System Technical Operations",      abbr: "VOL IV"   },
  { id: 5, label: "POS & Commerce Intelligence",             abbr: "VOL V"    },
  { id: 6, label: "Venue Deployment & Installation",         abbr: "VOL VI"   },
  { id: 7, label: "Admin Command Center & Security",         abbr: "VOL VII"  },
  { id: 8, label: "AI Intelligence & Revenue Brain",         abbr: "VOL VIII" },
  { id: 9, label: "Franchise & Multi-Venue Operations",      abbr: "VOL IX"   },
  { id: 10, label: "Luxury Service Certification",           abbr: "VOL X"    },
];

// ── Shared print/screen components ───────────────────────────────────────────

function VolumeHeader({ vol, title, subtitle }: { vol: number; title: string; subtitle: string }) {
  return (
    <div className="vol-header" style={{ marginBottom: 40, paddingBottom: 24, borderBottom: `2px solid ${C.gold}` }}>
      <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.38em", color: C.gold, marginBottom: 10, textTransform: "uppercase" }}>
        Volume {vol} of 10
      </div>
      <h1 style={{ fontFamily: C.serif, fontSize: "clamp(26px,4vw,42px)", fontWeight: 600, color: C.ink, margin: "0 0 10px", lineHeight: 1.15 }}>
        {title}
      </h1>
      <p style={{ fontFamily: C.sans, fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}

function Chapter({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="chapter" style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.22em", flexShrink: 0 }}>{num}</span>
        <h2 style={{ fontFamily: C.serif, fontSize: "clamp(18px,2.8vw,28px)", fontWeight: 500, color: C.gold, margin: 0 }}>{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, margin: "0 0 14px" }}>{title}</h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: C.sans, fontSize: 13, color: C.muted, lineHeight: 1.85, margin: "0 0 14px" }}>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 16px", paddingLeft: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 10, fontFamily: C.sans, fontSize: 13, color: C.muted, lineHeight: 1.75, marginBottom: 6 }}>
          <span style={{ color: C.gold, flexShrink: 0, marginTop: 2 }}>▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 24 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.sans, fontSize: 12 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: "left", background: "rgba(212,175,55,0.10)", color: C.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 10, border: `1px solid ${C.border}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "10px 14px", color: C.muted, border: `1px solid ${C.border}`, verticalAlign: "top", lineHeight: 1.6 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ label, text, color = C.gold }: { label: string; text: string; color?: string }) {
  return (
    <div style={{ background: `${color}0D`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
      <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.22em", color, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: C.sans, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

function SOP({ steps }: { steps: { step: string; action: string; owner: string }[] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 14, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${C.gold}18`, border: `1px solid ${C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 9, color: C.gold, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{s.step}</div>
            <div style={{ fontFamily: C.sans, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{s.action}</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, marginTop: 4, letterSpacing: "0.12em" }}>OWNER: {s.owner}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 1 — NOVEE OS MASTER OPERATIONS BIBLE
// ══════════════════════════════════════════════════════════════════════════════

function Volume1() {
  return (
    <div>
      <VolumeHeader vol={1} title="NOVEE OS Master Operations Bible" subtitle="The complete reference for the Living Infrastructure, Behavioral Intelligence Engine, and Autonomous Venue Orchestration System powering every SmokeCraft 360 installation." />

      <Chapter num="1.1" title="What Is NOVEE OS">
        <P>NOVEE OS is the autonomous operating intelligence layer beneath every SmokeCraft 360 venue deployment. It is not a software application in the conventional sense — it is a living infrastructure that perceives, interprets, and responds to the venue environment in real time, making thousands of micro-decisions per hour without requiring manual staff intervention.</P>
        <P>At its core, NOVEE OS functions as an ambient intelligence engine. It receives continuous data streams from guest interactions, POS transactions, environmental sensors, inventory levels, and behavioral signals, synthesizing them into a dynamic venue-state model that informs everything from lighting adjustments and music tempo to product recommendations and staff intervention prompts.</P>
        <Callout label="Founding Principle" text="NOVEE OS exists because luxury hospitality fails when it relies entirely on human memory. No staff member can simultaneously recall every guest's palate, track 300 inventory SKUs, read room energy, optimize revenue margins, and deliver a warm personal greeting. NOVEE OS handles the memory layer, freeing staff to focus entirely on human connection." />
        <Section title="Core System Pillars">
          <Table
            headers={["Pillar", "Function", "Data Source", "Output"]}
            rows={[
              ["Living Infrastructure", "Persistent venue-state model that never resets", "All system events", "Continuous venue awareness"],
              ["Behavioral Intelligence", "Guest pattern recognition & palate learning", "Swipe data, orders, returns", "Personalized recommendations"],
              ["Environment Adaptation", "Real-time atmosphere adjustment", "Sensor feeds, crowd density", "Lighting, audio, climate signals"],
              ["Revenue Optimization", "Margin-aware recommendation weighting", "POS, inventory, margins", "Upsell prompts, staff alerts"],
              ["Predictive Intelligence", "Anticipate needs before expressed", "Historical patterns, time/day", "Proactive staffing, restocking"],
              ["Phantom Service", "Invisible staff coordination", "Staff location, guest position", "Silent routing, timing suggestions"],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="1.2" title="Living Infrastructure — Deep Architecture">
        <P>The Living Infrastructure is NOVEE OS's persistent state layer. Unlike traditional software that responds only to explicit inputs, the Living Infrastructure maintains a continuously updated model of the venue at every moment — who is present, what they have ordered, how the room energy feels, what inventory is trending, and what revenue trajectory the current session is on.</P>
        <Section title="State Model Components">
          <Ul items={[
            "Guest Population Map — real-time count, location zones, group compositions, time-in-venue per guest",
            "Behavioral Energy Index — aggregate mood signal derived from order velocity, interaction depth, and dwell time patterns",
            "Inventory Velocity Matrix — per-SKU consumption rate, projected depletion windows, reorder threshold proximity",
            "Revenue Trajectory Curve — per-session and per-hour revenue against historical baseline, with deviation alerts",
            "Staff Deployment State — active staff roles, coverage gaps, fatigue indicators based on shift duration",
            "Ambient Condition Registry — current lighting level, music BPM, temperature zone readings, occupancy heat map",
          ]} />
        </Section>
        <Section title="State Update Cycle">
          <P>The Living Infrastructure state model updates on three cadences:</P>
          <Table
            headers={["Cadence", "Frequency", "Triggers", "Examples"]}
            rows={[
              ["Real-Time", "Sub-second", "POS transaction, swipe event, sensor threshold breach", "Guest orders a product, swipes ADD on a cigar"],
              ["Periodic", "Every 60–300s", "Scheduled system tick", "Crowd density recalculation, inventory velocity refresh"],
              ["Session-Bound", "On session open/close", "Guest enrollment, checkout, departure", "New guest profile activation, session revenue finalization"],
            ]}
          />
        </Section>
        <Section title="Data Flow Diagram — Conceptual">
          <Callout label="[DIAGRAM PLACEHOLDER]" text="Living Infrastructure Data Flow: Sensor Layer → Raw Event Stream → NOVEE Processing Engine → State Model Update → Intelligence Modules → Output Layer (Lighting / Audio / Staff Prompts / POS Recommendations / Guest Interface)" color="#8b5cf6" />
        </Section>
      </Chapter>

      <Chapter num="1.3" title="Behavioral Intelligence Engine">
        <P>The Behavioral Intelligence Engine (BIE) is the pattern-recognition core of NOVEE OS. Every guest interaction — a swipe, a reorder, a table lingering past the expected duration, an ADD on a high-margin SKU — is an input to the BIE. Over time, the BIE constructs a multi-dimensional taste and behavior profile for each guest identity (enrolled or anonymous).</P>
        <Section title="Profile Dimensions">
          <Table
            headers={["Dimension", "What It Tracks", "How It's Used"]}
            rows={[
              ["Flavor Affinity Vector", "Strength preference, aroma families, finish length tolerance", "Primary recommendation filter"],
              ["Spend Velocity", "Average spend per visit, peak spend triggers, upsell conversion rate", "Revenue prompt timing and magnitude"],
              ["Session Rhythm", "Average time between orders, dwell time, departure pattern", "Staff intervention timing, ambient pacing"],
              ["Social Mode", "Solo / couple / group behavior, conversation initiation, table energy", "Atmosphere adjustment, group experience triggers"],
              ["Exploration Index", "Ratio of new SKUs tried vs. familiar reorders", "Discovery vs. comfort recommendation balance"],
              ["Premium Sensitivity", "Response to premium suggestions, luxury tier acceptance rate", "Reserve product recommendation gating"],
            ]}
          />
        </Section>
        <Section title="AI Learning Loop">
          <P>The BIE operates on a closed-loop learning cycle. Each recommendation made is tracked against the guest's response (accepted, ignored, declined, or returned). This acceptance feedback updates the guest's affinity vectors in real time. Over multiple visits, the system's recommendation accuracy compounds:</P>
          <Ul items={[
            "Visit 1 — Broad profiling from swipe ritual. Initial mentor assignment. ~65% recommendation accuracy.",
            "Visit 2 — Swipe history + first visit order data. Flavor vector refinement. ~78% accuracy.",
            "Visit 3 — Cross-session pattern recognition. Time-of-day context. Social mode detection. ~88% accuracy.",
            "Visit 5+ — Deep palate profile. Predictive reorder suggestions before guest requests. ~94% accuracy.",
          ]} />
        </Section>
        <Section title="Behavioral Analysis Examples">
          <Callout label="Example A — The Late-Night Loyalist" text="Guest enrolls Friday nights, 10PM–1AM. Always orders a medium-strength cigar first, transitions to bold after 45 minutes. Third-visit data pattern: NOVEE proactively surfaces the bold transition option at the 40-minute mark with staff prompt: 'Your guest tends to explore fuller profiles around this time — the Padron 1926 is in stock.'" />
          <Callout label="Example B — The Occasion Guest" text="Guest has only visited twice. Both visits coincided with group dinners. High social energy score. NOVEE flags: group pairing experience, champagne + mild cigar pairing suggestion, group loyalty reward prompt at checkout." />
        </Section>
      </Chapter>

      <Chapter num="1.4" title="Environment Adaptation & Atmosphere Control">
        <P>NOVEE OS connects to the venue's physical environment through an integration layer that receives signals from and issues commands to lighting controllers, audio systems, climate controls, and scent diffusion units (where installed). Atmosphere adaptation is not cosmetic — it is a proven revenue mechanism: guests who feel comfortable and immersed spend an average of 22% longer per session and 18% more per hour of dwell time.</P>
        <Section title="Adaptation Trigger Categories">
          <Table
            headers={["Trigger Type", "Signal", "Example Response"]}
            rows={[
              ["Occupancy Shift", "Room reaches 75% capacity", "Reduce lighting 8%, increase music volume 3dB"],
              ["Revenue Surge", "Per-hour revenue exceeds 130% of baseline", "Elevate ambient warmth, extend scent cycle"],
              ["VIP Detection", "Known high-value guest enrolled", "Reserved seating notification, premium lighting zone activation"],
              ["Energy Drop", "Order velocity falls 40% below average for 15min", "Introduce low-frequency music shift, staff check-in prompt"],
              ["Peak Hour Approach", "Time approaching historical peak window", "Pre-warm environment, prepare staff station alerts"],
              ["Late-Night Transition", "Time past 11PM", "Transition to deep amber, slower BPM, dimmer perimeter zones"],
            ]}
          />
        </Section>
        <Section title="Emotional Energy Mapping">
          <P>NOVEE OS maintains a real-time Emotional Energy Map (EEM) — a venue-wide composite score derived from observed behavioral signals. The EEM ranges from 0 (inert/empty) to 100 (peak celebratory energy). At each energy band, NOVEE issues a distinct atmosphere profile:</P>
          <Table
            headers={["EEM Range", "Profile Name", "Lighting", "Music", "Staff Mode"]}
            rows={[
              ["0–20", "Sanctuary", "Dim warm amber", "40–55 BPM ambient", "Watchful, minimal interruption"],
              ["21–40", "Lounge Deep", "Warm mid-level", "60–75 BPM jazz/acoustic", "Attentive, periodic check"],
              ["41–60", "Social Rhythm", "Full warm scene", "75–90 BPM", "Engaged, proactive"],
              ["61–80", "Celebration", "Full scene + accents", "90–105 BPM", "Energetic, upsell ready"],
              ["81–100", "Peak Event", "Maximum scene", "Live/curated", "All stations active"],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="1.5" title="Predictive Intelligence & Phantom Service">
        <P>Phantom Service is NOVEE OS's most distinctive capability: the ability to anticipate guest needs and position staff or resources before the need becomes explicit. A guest should never need to flag down a server — NOVEE OS predicts the request window and routes a staff member to arrive naturally.</P>
        <Section title="Prediction Engine Inputs">
          <Ul items={[
            "Time elapsed since last order (session rhythm model)",
            "Current cigar burn rate (if tracked via table sensor integration)",
            "Beverage glass level estimation (camera-based integration, optional)",
            "Historical ordering sequence for enrolled guests",
            "Table energy signal — conversation volume, movement patterns",
            "Time-of-day service pattern baseline",
          ]} />
        </Section>
        <Section title="Phantom Service Decision Tree">
          <Callout label="[DIAGRAM PLACEHOLDER]" text="Phantom Service Decision Flow: Session Time > 20min? → Check Last Order → Compare vs. Session Rhythm → If Deviation > 15min: Generate Staff Prompt → Route Nearest Available Staff → Deliver Proactive Check-In → Record Outcome → Update Rhythm Model" color="#D4AF37" />
        </Section>
        <Section title="Recovery & Failure Handling">
          <P>If NOVEE OS loses a sensor feed or data connection, Phantom Service degrades gracefully:</P>
          <Ul items={[
            "Tier 1 (partial data loss) — Fall back to time-based prompts using historical session rhythms only",
            "Tier 2 (full data loss) — Issue 15-minute blanket check-in prompts for all occupied tables",
            "Tier 3 (system offline) — Display static staff guidance on kiosk and tablet: 'Manual service mode active — check each table every 12 minutes'",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="1.6" title="Cross-System Communication & AI Orchestration">
        <P>NOVEE OS operates as the central orchestrator across all sub-systems. It communicates with CraftHub, the POS layer, the Revenue Brain, the E.A.T. system, and the Guest Identity layer via a shared event bus. No sub-system communicates directly with another — all intelligence passes through NOVEE OS, ensuring a single source of truth and preventing conflicting recommendations.</P>
        <Section title="Event Bus Architecture">
          <Table
            headers={["Publisher", "Event Type", "NOVEE Action", "Downstream Effect"]}
            rows={[
              ["CraftHub / Swipe Engine", "guest_swipe_add", "Update flavor affinity, trigger BIE", "Recommendation refresh"],
              ["POS / Commerce Layer", "order_completed", "Revenue tracker update, loyalty award", "Loyalty prompt, inventory decrement"],
              ["Sensor Layer", "occupancy_threshold_crossed", "EEM recalculation", "Atmosphere profile shift"],
              ["Staff Terminal", "vip_arrival_flagged", "Priority guest protocol", "Reserved zone alert, premium lighting"],
              ["Inventory System", "sku_low_stock", "Recommendation weight reduction", "Staff alert, menu surface adjustment"],
              ["Revenue Brain", "margin_alert", "Staff upsell prompt", "Push higher-margin alternative to staff screen"],
            ]}
          />
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 2 — CRAFTHUB EXPERIENCE & NAVIGATION GUIDE
// ══════════════════════════════════════════════════════════════════════════════

function Volume2() {
  return (
    <div>
      <VolumeHeader vol={2} title="CraftHub Experience & Navigation Guide" subtitle="Complete reference for the guest-facing CraftHub kiosk interface: boot sequence, screen-by-screen walkthrough, guest flow logic, staff interaction protocols, and troubleshooting." />

      <Chapter num="2.1" title="CraftHub Overview & Purpose">
        <P>CraftHub is the guest-facing portal of the SmokeCraft 360 experience. It is the first touchpoint between the venue's intelligence infrastructure and the guest — and accordingly, every design and interaction decision prioritizes emotional warmth over functional efficiency. A guest touching CraftHub should feel they are entering a private lounge, not operating software.</P>
        <P>CraftHub serves four functional roles simultaneously: guest enrollment, palate calibration, ritual orchestration, and experience memory. When a guest completes a CraftHub session, NOVEE OS has enough behavioral data to serve personalized recommendations on every subsequent visit for the lifetime of that guest profile.</P>
        <Section title="CraftHub Entry Points">
          <Table
            headers={["Entry Point", "Guest Type", "First Screen", "Flow"]}
            rows={[
              ["Physical Kiosk", "New or walk-in guest", "Splash Screen → Craft Selection", "Full ritual flow"],
              ["Staff-Assisted Tablet", "VIP or group reservation", "Pre-loaded guest profile", "Abbreviated flow → recommendation immediate"],
              ["Return Guest", "Previously enrolled guest", "Recognition Screen → Mentor Greeting", "Shortened flow, memory-loaded"],
              ["QR Code Entry", "Promotion-linked guest", "Craft-specific landing", "Craft-direct flow"],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="2.2" title="Boot Sequence & Splash Screen">
        <P>On kiosk startup or session reset, CraftHub executes a 4-stage boot sequence designed to transition the device from idle to fully immersive. This sequence should never be interrupted or accelerated.</P>
        <SOP steps={[
          { step: "System Wake", action: "Screen activates from deep-black sleep mode. NOVEE OS connection handshake initiates. Ambient audio layer starts at 0% volume, fading up over 3 seconds.", owner: "Automatic / NOVEE OS" },
          { step: "Venue Identity Load", action: "Venue branding, color accent, and background imagery loads from venue configuration. Logo text appears with a 1.5s fade-in.", owner: "Venue Config System" },
          { step: "Craft Selection Display", action: "The four craft modules (SmokeCraft / PourCraft / BrewCraft / WineCraft) animate into view from below, staggered 200ms each. Each craft module displays its ambient video loop.", owner: "CraftHub Engine" },
          { step: "Idle Attraction Loop", action: "If no interaction within 45 seconds, system enters gentle attract animation — subtle gold particle drift, soft glow pulse on craft tiles. This continues until touch input is detected.", owner: "Inactivity Engine" },
        ]} />
        <Section title="Troubleshooting — Boot Failures">
          <Table
            headers={["Symptom", "Likely Cause", "Resolution"]}
            rows={[
              ["Blank screen after boot", "NOVEE OS connection timeout", "Check network. Force restart kiosk app from admin tablet."],
              ["Craft tiles not appearing", "Asset cache corrupted", "Clear browser cache, reload page, or trigger OTA update."],
              ["Ambient audio absent", "Audio driver or permission", "Check device volume settings. Verify browser audio autoplay permission."],
              ["Venue branding shows default", "Venue config not loaded", "Navigate to /settings and confirm venue ID and branding are saved."],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="2.3" title="Guest Flow — Screen-by-Screen Walkthrough">
        <P>Every new guest passes through a defined 12-stage ritual flow. Each stage has a minimum display duration to prevent rushed, clinical-feeling interactions.</P>
        <Table
          headers={["Stage", "Screen Name", "Duration Min.", "Guest Action", "System Action"]}
          rows={[
            ["1", "Craft Selection", "No minimum", "Tap craft module", "Activate craft theme, load product catalog"],
            ["2", "RitualGate — Intro", "3s", "Watch cinematic", "Display craft narrative, prepare chamber"],
            ["3", "RitualGate — Blackout", "2s (forced)", "Immersive transition", "Deep system initialization"],
            ["4", "Initiation Chamber — Scene 1–2", "8s min", "Read, advance", "Display craft origin, mastery levels"],
            ["5", "Initiation Chamber — Scene 3–4", "8s min", "Read, advance", "Golden Box reveal, ritual dimensions"],
            ["6", "Initiation Chamber — Scene 5–6", "8s min", "Read, advance", "Mentor philosophy, private lounge intention"],
            ["7", "Identity Calibration (Scene 7)", "Variable", "Answer 4 questions", "Palate vector initialization"],
            ["8", "Synchronization (Scene 8)", "5s min", "Confirm entry", "Mentor assignment, profile creation"],
            ["9", "Swipe Ritual", "Variable", "Swipe cards (min 6)", "Flavor affinity refinement, score accumulation"],
            ["10", "Reveal / Reserve", "No minimum", "View recommendations", "Present matched products with staff notes"],
            ["11", "MasterBlender / Legacy Reserve", "Optional", "Blender interaction", "Signature profile creation"],
            ["12", "Session Handoff", "No minimum", "Staff guided to table", "Order transmitted, inventory reserved"],
          ]}
        />
        <Section title="Atmosphere Synchronization Per Stage">
          <P>NOVEE OS issues atmosphere commands aligned to each stage transition. Staff should never intervene with lighting or audio controls during an active guest ritual flow — the environment is being choreographed by the system:</P>
          <Ul items={[
            "Stages 1–3 (RitualGate): Ambient dimming 15%, music fades to 40% volume",
            "Stages 4–8 (Chamber): Deep obsidian lighting, music paused or ambient drone layer",
            "Stage 9 (Swipe Ritual): Gradual warm return, low BPM music resumes",
            "Stage 10–12 (Reveal/Handoff): Full warm scene, music at social level, staff alert triggered",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="2.4" title="Mentor System & Guest Identity">
        <P>The Mentor System is CraftHub's personalization anchor. Every guest is assigned one of 11 fictional mentor archetypes based on their Identity Calibration responses. The mentor is not merely a visual character — they represent a philosophy about how pleasure, patience, and discovery intersect with the guest's own stated preferences.</P>
        <Section title="Mentor Assignment Logic">
          <Table
            headers={["Calibration Pattern", "Mentor Archetype", "Recommendation Style"]}
            rows={[
              ["Observer + Complexity + Cautious + Patience", "The Quiet Archivist", "Rare, aged, complex profiles. Slow pacing suggested."],
              ["Commander + Intensity + Bold + Instinct", "The Iron Blender", "High-strength, assertive profiles. Premium tier first."],
              ["Observer + Complexity + Bold + Patience", "The Scholar", "Nuanced mid-tier products. Pairing intelligence heavy."],
              ["Commander + Intensity + Cautious + Patience", "The Craftsman", "Balanced mid-strength. Craftsmanship narrative."],
              ["Observer + Intensity + Cautious + Instinct", "The Sentinel", "Earthy, natural profiles. Low-intervention style."],
            ]}
          />
        </Section>
        <Section title="Return Guest Recognition">
          <P>When a returning guest enters their first name and last-4-digit code on the recognition screen, NOVEE OS retrieves their full behavioral profile and pre-loads the swipe experience with weighted recommendations from their established affinity vector. The calibration flow is abbreviated — returning guests skip Scenes 1–6 of the Initiation Chamber and proceed directly to a personalized welcome before entering the swipe ritual.</P>
        </Section>
      </Chapter>

      <Chapter num="2.5" title="Golden Box, Progression & Loyalty Systems">
        <Section title="Golden Box">
          <P>The Golden Box is a rare, achievement-gated reward that appears during the swipe ritual when a guest demonstrates exceptional blend instinct — specifically, when their accepted card sequence produces a harmony score above 92/100 with no conflicting flavor combinations. The appearance is cinematic: gold particle emission, ambient glow surge, and a distinct audio cue. The Golden Box contains a curated high-margin product recommendation paired with a staff instruction to present it personally.</P>
        </Section>
        <Section title="Five-Tier Progression">
          <Table
            headers={["Tier", "Title", "Requirement", "Benefit"]}
            rows={[
              ["1", "Curious Guest", "First enrollment", "Full ritual access, base recommendations"],
              ["2", "Explorer", "3 sessions, 50 Mastery XP", "Extended swipe ritual, mentor unlocks"],
              ["3", "Blender", "8 sessions, 200 XP, 3 craft types", "Signature Studio access, legacy pairing notes"],
              ["4", "Artisan", "20 sessions, 600 XP, Golden Box", "Reserve access, lounge league eligibility"],
              ["5", "Master of Smoke", "50 sessions, 2000 XP, all crafts mastered", "Invitation to private vault events, master profile badge"],
            ]}
          />
        </Section>
        <Section title="Loyalty Points System">
          <Ul items={[
            "Points awarded: 10 per swipe ADD, 25 per completed order, 50 per return visit, 100 per Golden Box unlock",
            "Redemption: Applied at checkout as percentage discount or free product credit",
            "Staff visibility: Points balance always visible on staff tablet for guest inquiries",
            "Fraud protection: One reward per order, 24-hour cooldown on duplicate earn triggers",
          ]} />
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 3 — SMOKECRAFT 360 STAFF TRAINING SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

function Volume3() {
  return (
    <div>
      <VolumeHeader vol={3} title="SmokeCraft 360 Staff Training System" subtitle="Complete luxury cigar education system, staff certification program, and concierge interaction training for all SmokeCraft 360 venue personnel." />

      <Chapter num="3.1" title="Tobacco Education — Foundations">
        <P>Every SmokeCraft 360 staff member, regardless of role, must complete foundational tobacco education before handling any guest interaction. This ensures that every team member can speak authentically and confidently about the products they represent.</P>
        <Section title="The Anatomy of a Premium Cigar">
          <Table
            headers={["Component", "Description", "Guest-Facing Language"]}
            rows={[
              ["Wrapper", "The outermost leaf. Contributes 40–60% of the cigar's flavor. Must be blemish-free, oily, and consistent in color.", "The first thing you taste. This leaf sets the tone."],
              ["Binder", "Holds the filler leaves together. Influences combustion and contributes secondary flavor notes.", "The architecture — holds everything together, adds depth."],
              ["Filler", "The blend of multiple tobacco leaves creating the body and strength of the smoke.", "The heart of the cigar. This is where the blend lives."],
              ["Cap", "The closed end that the smoker cuts. Must be cut cleanly — guillotine or punch preferred.", "Your entry point. A clean cut means a clean draw."],
              ["Foot", "The open end that is lit. Should be toasted before direct ignition.", "Light from the outside in, rotating slowly. Never rush the light."],
            ]}
          />
        </Section>
        <Section title="Wrapper Varieties — Staff Reference">
          <Table
            headers={["Wrapper", "Origin", "Color", "Flavor Notes", "Strength"]}
            rows={[
              ["Connecticut Shade", "USA (Connecticut)", "Light tan/golden", "Creamy, mild, slightly sweet", "Mild"],
              ["Habano", "Ecuador/Nicaragua", "Medium brown, slightly oily", "Earthy, spicy, complex", "Medium-Full"],
              ["Maduro", "Multiple origins", "Dark chocolate to near-black", "Sweet, rich, dark fruit, coffee", "Medium-Full"],
              ["Corojo", "Honduras/Nicaragua", "Reddish-brown", "Spicy, leathery, bold", "Medium-Full to Full"],
              ["Natural/EMS", "Cameroon/Mexico", "Light to medium brown", "Woody, nutty, smooth", "Mild-Medium"],
              ["Oscuro", "Multiple origins", "Darkest possible", "Deep sweetness, minimal pepper", "Full"],
            ]}
          />
        </Section>
        <Section title="Regional Cigar Knowledge">
          <Ul items={[
            "Cuba — The historical standard. Rich earthy complexity, perfect construction. Still the aspirational benchmark.",
            "Nicaragua — Bold, volcanic soil terroir. Pepper-forward, complex mid-body, increasingly rivaling Cuba.",
            "Dominican Republic — Refined and elegant. Consistently mild-to-medium, excellent wrapper sourcing.",
            "Honduras — Earthy, robust, often maduro-forward. Heavy body, dark notes.",
            "Ecuador — Neutral climate produces exceptional wrappers. Used globally by top manufacturers.",
            "Mexico (San Andres) — Dark, rich, slightly sweet maduro leaf. Highly sought.",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="3.2" title="Flavor Wheel Analysis & Strength Scale">
        <Section title="Flavor Wheel — Primary Categories">
          <Table
            headers={["Category", "Descriptors", "Associated Products"]}
            rows={[
              ["Earth & Wood", "Cedar, oak, leather, soil, mushroom", "Nicaraguan puros, Honduran bolds"],
              ["Spice & Pepper", "White pepper, black pepper, cinnamon, nutmeg", "Corojo wrappers, full-strength blends"],
              ["Sweetness & Cream", "Vanilla, caramel, cream, honey, cocoa", "Connecticut shade, maduro, Dominican"],
              ["Fruit & Floral", "Dark cherry, fig, raisin, coffee flower", "Aged cubans, select maduros"],
              ["Nuts & Toast", "Almond, walnut, roasted grain, bread", "Dominican, some Honduran"],
              ["Coffee & Dark Chocolate", "Espresso, dark cacao, bitter finish", "Maduro, oscuro, aged Nicaraguan"],
            ]}
          />
        </Section>
        <Section title="Strength Scale — Guest Communication">
          <Table
            headers={["Scale", "Label", "Nicotine Delivery", "Guest Description", "Recommended For"]}
            rows={[
              ["1–2", "Mild", "Minimal", "Smooth, approachable, no harshness", "New smokers, sensitive palates"],
              ["3–4", "Mild-Medium", "Light", "Slight body, clean finish, some complexity", "Occasional smokers"],
              ["5–6", "Medium", "Moderate", "Balanced, complex, satisfying body", "Regular smokers, most guests"],
              ["7–8", "Medium-Full", "Noticeable", "Bold, complex, strong finish", "Experienced, daily smokers"],
              ["9–10", "Full", "High", "Intense, powerful, long finish", "Connoisseurs only — always verify tolerance"],
            ]}
          />
          <Callout label="Staff Protocol — Strength Verification" text="ALWAYS ask about a guest's smoking frequency and last cigar before recommending anything above a 6 on the strength scale. A guest who smokes occasionally receiving a full-strength cigar without warning is a service failure and a health risk." color="#ef4444" />
        </Section>
      </Chapter>

      <Chapter num="3.3" title="Pairing Intelligence — Whiskey, Bourbon & Spirits">
        <P>The art of pairing cigars with spirits is the highest expression of SmokeCraft 360 service. The goal is synergy — neither the spirit nor the cigar should overpower the other. The following framework gives staff a reliable system for any pairing request.</P>
        <Section title="The Pairing Framework — Three Rules">
          <Ul items={[
            "Rule 1: Match Body Weight — A mild cigar with a light spirit, a full cigar with a bold spirit. Never cross-match (e.g., a delicate Connecticut shade with a cask-strength Islay Scotch).",
            "Rule 2: Bridge or Contrast — Either find a shared flavor note (bridge) or create deliberate contrast. Both work. Accidental clash does not.",
            "Rule 3: Let the Guest Lead — Always confirm palate preferences before suggesting. Never assume.",
          ]} />
        </Section>
        <Section title="Whiskey & Bourbon Pairing Matrix">
          <Table
            headers={["Spirit Profile", "Cigar Profile", "Shared Notes", "Experience"]}
            rows={[
              ["Bourbon (wheated, sweet)", "Maduro or Connecticut shade", "Caramel, vanilla, sweetness", "Indulgent, dessert-like richness"],
              ["Bourbon (high-rye, spicy)", "Corojo or Habano", "Pepper, leather, spice", "Bold, assertive, intense complexity"],
              ["Scotch (Speyside, fruity)", "Dominican, mild to medium", "Honey, orchard fruit, light wood", "Elegant, refined, afternoon pairing"],
              ["Scotch (Islay, peated)", "Full Nicaraguan or Honduran", "Earth, smoke, leather, dark fruit", "Bold, smoky, for experienced palates"],
              ["Irish Whiskey (smooth)", "Connecticut, mild cigar", "Cream, light grain, gentle sweetness", "Approachable, social pairing"],
              ["Japanese Whisky", "Dominican or light Honduran", "Floral, delicate wood, subtle spice", "Precise, refined — high-end pairing"],
              ["Rye Whiskey", "Medium Habano or Corojo", "Pepper, oak, dark spice", "Complex, dry, classic pairing"],
            ]}
          />
        </Section>
        <Section title="Staff Pairing Script — Standard Guest Interaction">
          <Callout label="Script Template" text={`"Based on what you've described — [flavor preference] and [spirit preference] — I'd suggest pairing the [Product Name] with [Spirit]. They share [shared note], and the [cigar element] will bring out the [spirit note] beautifully. Would you like to start with that, or explore a few options on our selection screen first?"`} />
        </Section>
      </Chapter>

      <Chapter num="3.4" title="Certification Programs">
        <Section title="Level 1 — SmokeCraft Foundations (Beginner)">
          <P>Required for all floor staff before first guest interaction. Completion time: 4 hours (self-paced) + 1-hour practical assessment.</P>
          <Ul items={[
            "Module 1: Cigar anatomy — pass rate ≥ 80% on written quiz",
            "Module 2: Wrapper and filler identification — practical leaf identification exercise",
            "Module 3: Strength scale communication — roleplay 3 guest scenarios",
            "Module 4: Basic pairing knowledge — match 10 spirit/cigar pairings correctly",
            "Module 5: NOVEE OS kiosk basics — complete full guest ritual flow as simulated guest",
            "Assessment: Supervised guest interaction with manager observation",
          ]} />
        </Section>
        <Section title="Level 2 — Intermediate Specialist">
          <P>Required before independent VIP service. Prerequisites: 30 days on floor, 50+ guest interactions logged. Completion: 8 hours + practical.</P>
          <Ul items={[
            "Advanced flavor wheel mastery — blind tasting of 5 cigars, identify primary and secondary notes",
            "Regional knowledge — identify country of origin from flavor profile, geography quiz",
            "Advanced pairing — construct a full pairing menu for a 4-course tasting event",
            "NOVEE OS operations — configure venue settings, interpret behavioral intelligence dashboard",
            "Revenue intelligence — demonstrate upsell techniques using AI prompts",
          ]} />
        </Section>
        <Section title="Level 3 — Master Tobacconist (Advanced)">
          <P>The highest staff designation. Prerequisites: Level 2 complete, 90+ days, management recommendation. Completion: 16 hours + written submission.</P>
          <Ul items={[
            "Humidor management — temperature/humidity calibration, rotation protocol, aging guidance",
            "Inventory optimization — interpret NOVEE OS velocity matrix, execute reorder intelligence",
            "Guest memory system — build and maintain guest palate profiles, cross-visit continuity",
            "Event orchestration — plan and execute a luxury cigar tasting event from scratch",
            "Written submission: 2,000-word guest experience case study from real interaction",
            "Oral examination with senior brand representative or venue director",
          ]} />
        </Section>
        <Section title="Level 4 — Luxury Concierge Certification">
          <Ul items={[
            "White-glove service protocols — cutting, lighting, and presentation at tableside",
            "VIP arrival protocols — pre-arrival preparation, personalized welcome, reserved product staging",
            "Private event management — full event lifecycle from reservation to post-event follow-up",
            "Crisis service recovery — handling damaged product, guest dissatisfaction, system outages",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="3.5" title="Humidor Intelligence & Inventory Management">
        <Section title="Humidor Conditions — Operating Standards">
          <Table
            headers={["Parameter", "Target Range", "Danger Zone", "Effect of Deviation"]}
            rows={[
              ["Relative Humidity", "65–70% RH", "Below 60% or above 75%", "Below: cigars crack/burn harsh. Above: mold risk, wrapper burst."],
              ["Temperature", "65–70°F (18–21°C)", "Above 77°F", "Heat accelerates aging, can activate tobacco beetle larvae."],
              ["Air Circulation", "Gentle rotation", "Stagnant zones", "Uneven aging, humidity pockets, flavor inconsistency."],
              ["Light Exposure", "Zero direct light", "Any direct sunlight", "UV degrades wrapper oils, fades color, alters flavor."],
            ]}
          />
        </Section>
        <Section title="Rotation Protocol">
          <SOP steps={[
            { step: "Weekly Rotation", action: "Move cigars from top to bottom shelves and front to back. Ensures even humidity exposure across all product.", owner: "Tobacconist / Level 2+" },
            { step: "Humidity Check", action: "Verify hygrometer reading. If deviation ±3% from target, adjust humidification source. Log in NOVEE OS inventory system.", owner: "Opening Staff" },
            { step: "Inventory Count", action: "Physical count of all SKUs weekly. Compare to NOVEE OS inventory record. Report any variance to manager.", owner: "Inventory Staff" },
            { step: "Seasonal Recalibration", action: "Adjust humidification source seasonally as HVAC loads change. Document changes in humidor log.", owner: "Manager" },
          ]} />
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 4 — E.A.T. SYSTEM TECHNICAL OPERATIONS GUIDE
// ══════════════════════════════════════════════════════════════════════════════

function Volume4() {
  return (
    <div>
      <VolumeHeader vol={4} title="E.A.T. System Technical Operations Guide" subtitle="Complete technical reference for the Environment, Asset, and Transaction intelligence system — the data backbone of the SmokeCraft 360 platform." />

      <Chapter num="4.1" title="E.A.T. System Overview">
        <P>E.A.T. (Environment · Asset · Transaction) is the structured data layer that sits beneath NOVEE OS's intelligence engine. While NOVEE OS synthesizes intelligence, E.A.T. ensures that the raw data powering those decisions is captured, structured, and stored with enterprise-grade reliability.</P>
        <Table
          headers={["Pillar", "What It Manages", "Primary Interface", "Data Volume"]}
          rows={[
            ["Environment (E)", "Sensor data, atmosphere state, room conditions, occupancy", "EAT Console → Environment Tab", "High frequency — sub-minute events"],
            ["Asset (A)", "Inventory, product catalog, humidor state, equipment status", "EAT Console → Asset Tab", "Event-driven — on change events"],
            ["Transaction (T)", "Orders, payments, loyalty events, refunds, reconciliation", "EAT Console → Transaction Tab", "Transactional — per-event capture"],
          ]}
        />
      </Chapter>

      <Chapter num="4.2" title="Environment Intelligence">
        <P>The Environment pillar captures the physical state of the venue through a combination of direct sensor integrations and manual staff inputs. Data captured here feeds directly into NOVEE OS's Emotional Energy Map and atmosphere adaptation algorithms.</P>
        <Section title="Sensor Integration Types">
          <Table
            headers={["Sensor Type", "Placement", "Data Captured", "NOVEE Use"]}
            rows={[
              ["Occupancy Sensor (PIR/Camera)", "Entry points, dining zones", "Person count, zone occupancy", "EEM calculation, staff routing"],
              ["Temperature Sensor", "Humidor, HVAC zones", "°F/°C continuous reading", "Humidor alerts, climate comfort alerts"],
              ["Humidity Sensor", "Humidor (primary + backup)", "RH% continuous reading", "Humidor integrity monitoring"],
              ["Ambient Light Sensor", "Ceiling, control zones", "Lux level", "Auto-dim confirmation, lighting calibration"],
              ["Audio Level Sensor", "Dining zones, bar", "dB ambient level", "Music/crowd noise balance"],
              ["Motion/Dwell Sensor", "Table zones (optional)", "Movement, dwell time per zone", "Phantom service timing refinement"],
            ]}
          />
        </Section>
        <Section title="Smart Ambiance Logic — Automation Chains">
          <Ul items={[
            "Occupancy ≥ 80%: Reduce music volume 3dB, reduce thermostat setpoint 1°F, notify staff to open secondary service station",
            "Humidor RH drops below 62%: Immediate staff alert via tablet push notification, log event in E.A.T. Environment log",
            "Humidor temperature exceeds 75°F: Critical alert — staff must physically inspect within 5 minutes",
            "Ambient noise level exceeds 85dB for >10 minutes: Music volume increase blocked, EEM peak mode activated",
            "No occupancy detected for 30 minutes after open hour: Attract loop activated on all kiosk displays",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="4.3" title="Asset Intelligence — Inventory System">
        <P>The Asset pillar manages the full lifecycle of every product SKU in the venue — from the moment it arrives in receiving to the moment it is consumed and removed from inventory. NOVEE OS's recommendation engine consults Asset state on every recommendation cycle to ensure it never surfaces an out-of-stock product to a guest.</P>
        <Section title="Inventory Lifecycle States">
          <Table
            headers={["State", "Definition", "System Behavior"]}
            rows={[
              ["In Stock", "Available qty > reorder threshold", "Normal recommendation weight"],
              ["Low Stock", "Qty ≤ reorder threshold (configurable per SKU)", "−25 recommendation weight penalty. Staff alert issued."],
              ["Reserved", "Qty held for confirmed swipe order (15-min TTL)", "Not available for new recommendations until TTL expires"],
              ["Depleted", "Qty = 0", "Hard-blocked from all guest recommendations. Removed from menu surface."],
              ["On Order", "Purchase order placed, not yet received", "Staff-only visibility. Guest-facing: shows as out of stock."],
            ]}
          />
        </Section>
        <Section title="Atomic Inventory Decrement Protocol">
          <P>To prevent overselling, SmokeCraft 360 uses a two-phase inventory commitment system:</P>
          <SOP steps={[
            { step: "Phase 1 — Reservation", action: "When guest taps ADD in swipe ritual: qty decremented from Available pool into Reserved pool. 15-minute TTL applied. If not confirmed within TTL, automatically returned to Available.", owner: "Swipe Engine / E.A.T. Asset" },
            { step: "Phase 2 — Confirmation", action: "When order is confirmed by staff or POS: Reserved qty moves to Sold. Inventory record permanently decremented. Loyalty award triggered.", owner: "POS / Commerce Layer" },
            { step: "Failure Handling", action: "If payment fails or order is cancelled: Reserved qty returned to Available immediately. No permanent decrement. Audit log entry created.", owner: "E.A.T. Transaction" },
          ]} />
        </Section>
        <Section title="Reorder Intelligence">
          <P>NOVEE OS monitors asset velocity to generate predictive reorder alerts before a product reaches depletion. Venue managers receive reorder prompts in their operations dashboard with the following data:</P>
          <Ul items={[
            "Current quantity on hand",
            "Current daily consumption rate (7-day rolling average)",
            "Days to depletion at current velocity",
            "Suggested reorder quantity (based on lead time and historical demand)",
            "Vendor contact information (if configured in product catalog)",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="4.4" title="Transaction Intelligence">
        <P>The Transaction pillar captures every financial and loyalty event in the venue with append-only, tamper-evident recording. This data feeds the Revenue Brain, the Financial Reconciliation system, and NOVEE OS's behavioral analysis engine.</P>
        <Section title="Transaction Event Types">
          <Table
            headers={["Event", "Trigger", "Data Captured", "Downstream Effect"]}
            rows={[
              ["order_created", "Guest adds item to cart", "Guest ID, SKU, qty, price, timestamp", "Inventory reservation, revenue tracking"],
              ["order_confirmed", "Staff/POS confirms order", "Order ID, payment method, final total", "Inventory decrement, loyalty award, receipt generation"],
              ["order_cancelled", "Guest or staff cancels before payment", "Order ID, reason code, actor", "Inventory release, no revenue record"],
              ["payment_authorized", "Card pre-authorization", "Auth code, amount, processor", "Tab opened"],
              ["payment_captured", "Final payment processed", "Capture amount, processor response", "Revenue finalized, tab closed"],
              ["refund_issued", "Manager authorizes refund", "Original order ID, refund amount, reason, manager ID", "Revenue reversal, loyalty adjustment, audit log"],
              ["loyalty_earned", "Order completed", "Points amount, new balance", "Guest profile update"],
              ["loyalty_redeemed", "Checkout discount applied", "Redemption value, remaining balance", "Discount applied to final total"],
            ]}
          />
        </Section>
        <Section title="Financial Reconciliation Integration">
          <P>Transaction data populates the Financial Reconciliation Dashboard, accessible at /finance-reconciliation. The 15-minute reconciliation worker automatically detects:</P>
          <Ul items={[
            "Stuck authorized tabs (authorization >2 hours without capture)",
            "Orphan open tabs (open >72 hours without closure)",
            "Exhausted webhooks (payment processor notification failures)",
            "Failed payout confirmations",
            "Stale pending payouts",
          ]} />
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 5 — POS & COMMERCE INTELLIGENCE MANUAL
// ══════════════════════════════════════════════════════════════════════════════

function Volume5() {
  return (
    <div>
      <VolumeHeader vol={5} title="POS & Commerce Intelligence Manual" subtitle="Integration guides for Toast, Clover, Square, Lightspeed, and Shopify. Commerce intelligence behavior, checkout flow, staff training, and recovery protocols." />

      <Chapter num="5.1" title="POS Integration Architecture">
        <P>SmokeCraft 360 operates an adapter-based POS integration model. The platform's internal commerce layer (the Craft Command Center) operates independently and synchronizes with external POS systems via adapter interfaces. This means SmokeCraft 360 always maintains its own authoritative order record — the external POS receives a synchronized copy, not the reverse.</P>
        <Section title="Supported POS Integrations">
          <Table
            headers={["POS Platform", "Integration Type", "Sync Direction", "Key Capabilities"]}
            rows={[
              ["Toast", "REST API + Webhook", "Bidirectional", "Menu sync, order push, payment capture, inventory pull"],
              ["Clover", "REST API", "Bidirectional", "Order sync, payment, device management"],
              ["Square", "REST API + Webhook", "Bidirectional", "Order sync, inventory, loyalty bridge"],
              ["Lightspeed", "REST API", "Outbound only", "Order push, inventory update"],
              ["Shopify", "REST API", "Outbound only", "Product catalog sync, online order integration"],
            ]}
          />
        </Section>
        <Section title="Three Operating Modes">
          <Table
            headers={["Mode", "Description", "When to Use"]}
            rows={[
              ["Overlay", "SmokeCraft handles guest experience; POS handles payment only. Orders passed to POS at checkout.", "Venues with established POS workflows."],
              ["Hybrid", "SmokeCraft handles experience and order management; POS handles payment capture only.", "Transitioning venues. Maximum flexibility."],
              ["Full POS", "SmokeCraft 360 is the primary POS. External system acts as reporting/accounting sync only.", "New venues or full system replacements."],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="5.2" title="Order Synchronization & Smart Upselling">
        <Section title="Order Sync Protocol">
          <SOP steps={[
            { step: "Order Created in SmokeCraft", action: "E.A.T. Transaction layer creates order record. Inventory reserved. Order pushed to active POS adapter queue.", owner: "SmokeCraft Commerce Engine" },
            { step: "POS Adapter Transmission", action: "Adapter formats order to POS-specific schema. Sends via REST or webhook. Awaits acknowledgment (max 30s timeout).", owner: "POS Adapter Layer" },
            { step: "POS Confirmation", action: "POS returns order ID. SmokeCraft stores POS order reference. Both systems now hold linked records.", owner: "POS System" },
            { step: "Payment Capture", action: "Payment processed in POS (or SmokeCraft). Capture event transmitted back to SmokeCraft. E.A.T. Transaction finalized.", owner: "POS / SmokeCraft" },
            { step: "Sync Failure Handling", action: "If POS acknowledgment not received within 30s: order queued in offline buffer. Retry every 60s for up to 10 attempts. Staff alerted after 3 failures.", owner: "Offline Queue / Staff" },
          ]} />
        </Section>
        <Section title="Commerce Intelligence & Smart Upselling">
          <P>The Commerce Intelligence layer intercepts every active order and evaluates it against the Revenue Brain's scoring model. If a higher-margin or better-matched product exists within one strength tier of the guest's current selection, a staff prompt is generated:</P>
          <Callout label="Upsell Prompt Example" text="'Guest: Sarah K. Current selection: Arturo Fuente Hemingway ($18). Revenue Brain suggestion: Arturo Fuente Opus X ($42) — 3× margin, one strength tier above. Guest's Explorer Index: 72% — high discovery tolerance. Prompt: Mention Opus X as a special reserve option.'" />
          <Table
            headers={["Revenue Brain Scoring Factor", "Weight", "Effect on Recommendation"]}
            rows={[
              ["Taste match (flavor affinity vector)", "40%", "Must be within guest's established preference range"],
              ["Margin optimization", "25%", "Higher margin products weighted upward"],
              ["Stock level", "15%", "Low stock items receive −25 penalty"],
              ["Vendor reliability score", "10%", "Products from vendors with <60% reliability receive −10 penalty"],
              ["Premium sensitivity", "10%", "Guest's historical acceptance rate of premium suggestions"],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="5.3" title="Staff Training — POS Operations">
        <Section title="Cashier Training — Day 1 Protocol">
          <SOP steps={[
            { step: "Login", action: "Enter staff PIN at POS terminal or SmokeCraft staff login. Verify role assignment shows correct permissions.", owner: "Cashier" },
            { step: "Session Open", action: "Confirm cash drawer balance (if applicable). Acknowledge daily specials from manager briefing.", owner: "Cashier" },
            { step: "Order Processing", action: "Receive order from floor staff or kiosk handoff. Verify all items in cart. Apply loyalty discount if applicable. Confirm with guest.", owner: "Cashier" },
            { step: "Payment", action: "Process payment via POS. Confirm capture confirmation in SmokeCraft. Print or email receipt as guest prefers.", owner: "Cashier / POS" },
            { step: "Post-Transaction", action: "Confirm loyalty points awarded. Thank guest by name (from profile). Invite return.", owner: "Cashier" },
          ]} />
        </Section>
        <Section title="Recovery Protocols">
          <Table
            headers={["Issue", "Immediate Action", "Escalation", "System Log"]}
            rows={[
              ["POS offline", "Switch to SmokeCraft Full POS mode. Process all orders internally.", "Notify manager. Contact POS support.", "Offline queue captures all events for later sync."],
              ["Payment declined", "Verify card. Try alternate payment. Never disclose decline reason in detail.", "Manager assistance for alternative payment.", "Payment event logged as declined."],
              ["Duplicate charge", "Do not attempt void without manager. Show guest both charges.", "Manager initiates refund in SmokeCraft. Finance alert raised.", "Refund event logged with manager ID."],
              ["Order sync failure", "Complete order in SmokeCraft. Note POS order reference manually.", "IT review of sync queue after shift.", "Offline queue entry with retry attempts logged."],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="5.4" title="Loyalty, Rewards & Escrow Systems">
        <Section title="Loyalty System Architecture">
          <P>SmokeCraft 360's loyalty system operates on a server-side point ledger that is immune to client-side manipulation. Points are awarded server-side only, upon confirmed payment capture. The following rules are immutable:</P>
          <Ul items={[
            "One loyalty reward event per confirmed order — no stacking",
            "24-hour cooldown on duplicate earn triggers from the same guest profile",
            "Redemption requires minimum 250 points balance",
            "Points balance displayed in real-time on staff tablet and guest profile screen",
            "Points expire after 365 days of account inactivity",
          ]} />
        </Section>
        <Section title="Escrow — Tab Management">
          <P>When a guest opens a running tab, their payment method is pre-authorized (not captured). The tab remains in escrow state until the guest closes it or it is force-closed by the system after 72 hours of inactivity. The Financial Reconciliation Worker monitors all escrow tabs and alerts staff when any tab approaches the 72-hour threshold.</P>
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 6 — VENUE DEPLOYMENT & INSTALLATION HANDBOOK
// ══════════════════════════════════════════════════════════════════════════════

function Volume6() {
  return (
    <div>
      <VolumeHeader vol={6} title="Venue Deployment & Installation Handbook" subtitle="Step-by-step installation guides for kiosks, tablets, audio systems, sensors, network configuration, POS setup, user permissions, multi-venue deployment, and failover systems." />

      <Chapter num="6.1" title="Pre-Deployment Checklist">
        <Section title="Site Requirements — Minimum Specifications">
          <Table
            headers={["Requirement", "Minimum Spec", "Recommended", "Notes"]}
            rows={[
              ["Internet Connection", "25 Mbps symmetrical", "100 Mbps fiber", "Dedicated circuit preferred. No shared hotel/venue WiFi."],
              ["Network", "802.11ac (WiFi 5)", "802.11ax (WiFi 6) + wired ethernet", "Kiosks wired where possible."],
              ["Power", "Standard 120V outlets", "UPS battery backup for kiosks", "Prevent data corruption on power loss."],
              ["Display (Kiosk)", "32\" 1080p touch-capable", "43\" 4K touch display", "IPS panel required for color accuracy."],
              ["Display (Staff Tablet)", "iPad 10.9\" or Android equivalent", "iPad Pro 12.9\"", "Must support PWA install."],
              ["Server Access", "Cloud-hosted (no on-prem)", "N/A", "All NOVEE OS processing is cloud-side."],
            ]}
          />
        </Section>
        <Section title="Day-Before Deployment Checklist">
          <Ul items={[
            "Confirm internet connection speed test ≥ 25 Mbps down/up",
            "Verify all display hardware powered and connected to network",
            "Confirm venue configuration completed in NOVEE OS admin panel (name, ID, branding, accent color)",
            "Confirm product catalog uploaded and priced",
            "Confirm staff accounts created with correct role assignments",
            "Test POS adapter connection (if applicable)",
            "Verify humidor sensors connected and reporting to E.A.T. Environment tab",
            "Complete one full ritual flow as a test guest — confirm all 8 Initiation Chamber scenes play",
            "Confirm audio system connected and ambient audio plays on boot",
            "Print emergency fallback procedures and post at staff station",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="6.2" title="Kiosk Setup — Step-by-Step">
        <SOP steps={[
          { step: "Hardware Mounting", action: "Mount display at 54\" center height (ADA standard touchscreen height). Angle 10–15° for comfortable standing interaction. Secure all cables.", owner: "Installation Technician" },
          { step: "Network Connection", action: "Connect kiosk via ethernet (preferred) or configure WiFi with venue SSID and credentials. Verify signal strength ≥ -60 dBm if WiFi.", owner: "IT / Installation" },
          { step: "Browser Setup", action: "Open Chrome or Edge (latest version). Navigate to venue URL. Install as PWA (Add to Home Screen / Install). Set to launch in full-screen kiosk mode.", owner: "IT" },
          { step: "Kiosk Mode", action: "Enable browser kiosk lockdown: disable right-click, disable URL bar, disable tab navigation, disable back gesture. Use browser kiosk flags or MDM policy.", owner: "IT" },
          { step: "Venue Configuration", action: "Navigate to /settings. Enter venue ID, branding colors, logo text. Save and verify branding appears on CraftHub splash screen.", owner: "Manager" },
          { step: "Burn-in Protection", action: "Enable pixel-shift setting in /settings → Display. Set shift interval to 30 minutes. This prevents OLED/QLED burn-in on permanent kiosk installations.", owner: "Manager / IT" },
          { step: "Test Full Flow", action: "Complete one full guest ritual as a test. Verify all scenes, transitions, audio, and final handoff function correctly.", owner: "Manager" },
        ]} />
      </Chapter>

      <Chapter num="6.3" title="Multi-Venue & Franchise Deployment">
        <Section title="Venue Isolation Guarantee">
          <P>Each venue in a SmokeCraft 360 deployment operates in a fully isolated tenant environment. Guest data, inventory records, loyalty balances, and financial transactions from Venue A are completely invisible to Venue B, even within the same franchise group. Cross-venue visibility requires explicit Franchise Admin role assignment.</P>
        </Section>
        <Section title="Multi-Venue Setup Sequence">
          <SOP steps={[
            { step: "Franchise Account Creation", action: "Super Admin creates franchise account with unique franchise ID. All child venues linked to this franchise ID.", owner: "SmokeCraft Platform Admin" },
            { step: "Venue Creation", action: "Create each venue independently under the franchise ID. Assign unique venue ID, name, location, and branding.", owner: "Franchise Admin" },
            { step: "Role Hierarchy Setup", action: "Assign Franchise Admin role to regional managers. Assign Venue Owner role to each venue's head of operations. Assign Manager role to department heads.", owner: "Franchise Admin" },
            { step: "Shared Catalog (Optional)", action: "If franchise uses shared product catalog: publish master catalog from franchise admin. Venue admins can add local products but cannot remove franchise-mandated items.", owner: "Franchise Admin" },
            { step: "Cross-Venue Intelligence", action: "Enable Cross-Venue Low-Stock Digest in franchise settings. Regional managers receive daily digest of any venue approaching critical stock levels.", owner: "Franchise Admin" },
          ]} />
        </Section>
      </Chapter>

      <Chapter num="6.4" title="Failover Systems & Offline Mode">
        <Section title="Offline Queue System">
          <P>SmokeCraft 360 is designed to continue operating without an internet connection for up to 4 hours. The Offline Queue system buffers all guest interactions, orders, and loyalty events locally and replays them to the server when connectivity is restored.</P>
          <Table
            headers={["Event Type", "Offline Behavior", "Sync Priority", "Risk"]}
            rows={[
              ["Guest Swipe / Interaction", "Stored locally in IndexedDB", "High", "Low — data recovered on reconnect"],
              ["Order Placement", "Stored locally, POS adapter queued", "Critical", "Medium — must reconcile before end of shift"],
              ["Payment Capture", "Cannot be processed offline", "N/A", "Must fall back to manual payment method"],
              ["Loyalty Award", "Queued locally", "Normal", "Low — awards applied on sync"],
              ["Inventory Decrement", "Reserved locally", "Critical", "Medium — risk of overselling if extended offline"],
            ]}
          />
        </Section>
        <Section title="Emergency Fallback Procedures">
          <Ul items={[
            "If kiosk is down: Staff tablet runs the same SmokeCraft 360 interface. Direct guests to assisted experience mode.",
            "If internet is down: Offline mode activates automatically. Accept cash payments only. Log all orders on paper for later sync.",
            "If NOVEE OS is unresponsive: Platform displays 'Service Temporarily Unavailable.' Staff revert to manual recommendation script (printed copy at each station).",
            "If humidor sensor fails: Physical inspection every 2 hours mandatory until sensor is replaced or recalibrated.",
          ]} />
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 7 — ADMIN COMMAND CENTER & SECURITY GUIDE
// ══════════════════════════════════════════════════════════════════════════════

function Volume7() {
  return (
    <div>
      <VolumeHeader vol={7} title="Admin Command Center & Security Guide" subtitle="Role-based access control, audit logging, security architecture, PIN lockout systems, kill switches, and compliance framework for SmokeCraft 360 administrators." />

      <Chapter num="7.1" title="Role Hierarchy & Access Control">
        <Table
          headers={["Role", "Access Level", "Key Capabilities", "How Assigned"]}
          rows={[
            ["Super Admin", "Global — all venues", "Everything. Full platform control. Founder PIN required.", "SmokeCraft Platform Admin only"],
            ["Franchise Admin", "All venues in franchise", "Cross-venue analytics, shared catalog, franchise-level settings", "Super Admin"],
            ["Venue Owner", "Single venue — full", "All venue settings, staff management, financial reconciliation", "Franchise Admin / Super Admin"],
            ["Manager", "Single venue — operational", "Staff management, inventory, POS mode, order management", "Venue Owner"],
            ["Staff / Tobacconist", "Floor operations", "Order processing, loyalty lookup, guest assistance", "Manager"],
            ["Kiosk", "Guest-facing only", "CraftHub experience, anonymous swipe, order submission", "Auto-assigned to kiosk devices"],
          ]}
        />
        <Section title="PIN Lockout System">
          <P>All staff PIN logins enforce an automatic lockout policy. After 3 consecutive failed PIN attempts, the account is locked for 5 minutes. After 5 failed attempts within 24 hours, a manager must manually unlock the account. All lockout events are logged in the audit trail with timestamp and device ID.</P>
        </Section>
        <Section title="Inactivity Guards">
          <P>Staff-facing terminals auto-lock after 3 minutes of inactivity and require PIN re-entry. Manager-level terminals auto-lock after 5 minutes. Super Admin sessions expire after 15 minutes of inactivity and require full re-authentication.</P>
        </Section>
      </Chapter>

      <Chapter num="7.2" title="Audit Logging & Compliance">
        <P>SmokeCraft 360 maintains an append-only audit log for all system actions that affect financial records, guest data, inventory, or system configuration. This log cannot be modified by any user role — including Super Admin. It is designed to meet enterprise compliance requirements for hospitality and financial operations.</P>
        <Section title="Audited Event Categories">
          <Ul items={[
            "Authentication events: login, logout, failed attempt, lockout, PIN reset",
            "Financial events: order create/confirm/cancel, payment capture/refund, tab open/close",
            "Inventory events: stock adjustment, reorder trigger, product create/modify/delete",
            "Configuration events: venue settings changes, role assignment changes, POS mode changes",
            "Security events: permission escalation attempt, kill switch activation, system mode change",
            "Guest data events: profile creation, data access, profile deletion request",
          ]} />
        </Section>
        <Section title="Audit Log Format">
          <Table
            headers={["Field", "Description"]}
            rows={[
              ["event_id", "UUID — unique per event"],
              ["timestamp", "UTC ISO-8601 — millisecond precision"],
              ["actor_id", "Staff user ID or 'system' for automated events"],
              ["actor_role", "Role at time of event"],
              ["venue_id", "Venue isolation identifier"],
              ["action", "Standardized action code (e.g., ORDER_CONFIRMED, ROLE_ASSIGNED)"],
              ["target_id", "ID of affected record"],
              ["details", "Human-readable action description"],
              ["ip_address", "Source IP of request"],
              ["device_id", "Registered device identifier (if applicable)"],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="7.3" title="Kill Switches & System Kill Logic">
        <P>SmokeCraft 360 includes a set of remote kill switches accessible only to Venue Owner and above. These switches allow immediate disabling of specific system capabilities without taking the entire platform offline.</P>
        <Table
          headers={["Kill Switch", "What It Disables", "Requires Role", "Recovery"]}
          rows={[
            ["AI Recommendation Engine", "All AI-driven product suggestions. Falls back to manual menu.", "Manager+", "Toggle in /settings → AI Infrastructure"],
            ["Loyalty System", "Point earning and redemption disabled. Orders still process.", "Manager+", "Toggle in /settings → Loyalty"],
            ["Swipe Experience", "Guest kiosk experience disabled. Staff-assisted ordering only.", "Venue Owner+", "Toggle in /settings → Experience Control"],
            ["POS Sync", "Sync to external POS paused. SmokeCraft buffers all orders.", "Venue Owner+", "Toggle in /settings → POS"],
            ["Full Platform Lockdown", "All guest-facing features disabled. Staff-admin access preserved.", "Super Admin only", "Founder PIN required to re-enable"],
          ]}
        />
      </Chapter>

      <Chapter num="7.4" title="Data Security Architecture">
        <Section title="Encryption Standards">
          <Ul items={[
            "All data in transit: TLS 1.3 minimum. No plain HTTP permitted on any endpoint.",
            "Sensitive field encryption at rest: AES-256-GCM for payment tokens, guest PII, and staff credentials.",
            "Password / PIN storage: bcrypt with work factor ≥12. Salted per user.",
            "JWT authentication: HS256 signed tokens with 24-hour expiry. Refresh token rotation on every use.",
            "Webhook secrets: Rotating HMAC-SHA256 signatures on all payment processor webhook endpoints.",
          ]} />
        </Section>
        <Section title="Guest Data Privacy">
          <P>SmokeCraft 360 collects only the minimum guest data required to deliver personalized experiences. Guest profiles store: first name and last initial, atmosphere preference, flavor affinity vector, session history, and loyalty balance. No payment card data is ever stored in SmokeCraft 360 — all payment processing is handled by PCI-DSS compliant payment processors.</P>
          <P>Guest data deletion requests are processed within 30 days. Upon deletion: profile record is removed, loyalty balance forfeited, session history anonymized (order records retained for financial compliance, guest linkage removed).</P>
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 8 — AI INTELLIGENCE & REVENUE BRAIN GUIDE
// ══════════════════════════════════════════════════════════════════════════════

function Volume8() {
  return (
    <div>
      <VolumeHeader vol={8} title="AI Intelligence & Revenue Brain Guide" subtitle="Complete reference for the AI recommendation engine, Revenue Brain v2 scoring formula, predictive intelligence systems, guest memory, and autonomous orchestration." />

      <Chapter num="8.1" title="AI Architecture Overview">
        <P>The SmokeCraft 360 AI layer is not a single model — it is a coordinated system of specialized intelligence modules, each focused on a specific decision domain. This specialization ensures that each AI recommendation is grounded in the most relevant data, rather than relying on a single generalist model for all decisions.</P>
        <Table
          headers={["Module", "Decision Domain", "Data Inputs", "Output"]}
          rows={[
            ["Flavor Intelligence Engine", "Product recommendation based on palate", "Swipe data, flavor affinity vector, tags", "Ranked product list with taste-match score"],
            ["Revenue Brain v2", "Margin-aware recommendation weighting", "Product margins, stock, guest tier, reliability", "Adjusted recommendation rank with revenue score"],
            ["Pairing Intelligence", "Spirit/food pairing suggestions", "Current product, guest preferences, menu", "Pairing note and suggested complement product"],
            ["Session Revenue Forecaster", "Per-session and per-hour revenue projection", "Current orders, time-of-day, guest tier, history", "Revenue trajectory with deviation alerts"],
            ["Behavioral Prediction Engine", "Guest action prediction", "Session rhythm, historical patterns", "Staff intervention timing, next-action probability"],
            ["Atmosphere Decision Engine", "Physical environment adjustments", "EEM, occupancy, time, event triggers", "Lighting/audio/climate commands"],
          ]}
        />
      </Chapter>

      <Chapter num="8.2" title="Revenue Brain v2 — Scoring Formula">
        <P>The Revenue Brain v2 governs how product recommendations are ranked in the guest-facing swipe experience and staff suggestion panel. It balances guest satisfaction with venue profitability through a weighted scoring model.</P>
        <Section title="Scoring Formula">
          <Table
            headers={["Factor", "Weight", "Data Source", "Scoring Logic"]}
            rows={[
              ["Taste Match", "40%", "Flavor affinity vector vs. product tags", "Cosine similarity of guest vector to product tag vector, scaled 0–100"],
              ["Margin Optimization", "25%", "Product cost and sell price from catalog", "Gross margin % normalized to 0–100 scale"],
              ["Stock Level", "15%", "E.A.T. Asset inventory state", "Full stock = 100. Low stock = −25 penalty. Depleted = hard block."],
              ["Vendor Reliability", "10%", "Vendor reliability score in product catalog", "Reliability <60%: −10 penalty applied to final score"],
              ["Premium Sensitivity", "10%", "Guest's historical premium acceptance rate", "Higher acceptance rate = higher weight on premium-tier products"],
            ]}
          />
          <Callout label="Hard Rules — Non-Negotiable Blocks" text="Any product with qty=0 is hard-blocked from all recommendations regardless of score. Any product with qty ≤ reorder threshold receives −25 penalty. These rules override the scoring formula." color="#ef4444" />
        </Section>
        <Section title="How the AI Improves Over Time">
          <Ul items={[
            "Acceptance data: Every swipe ADD or SKIP updates the product's affinity fit for that guest's vector. Vectors drift toward accepted, away from skipped.",
            "Return correlation: If a guest reorders a product across multiple sessions, its weight in that guest's profile increases substantially.",
            "Rejection signal: If a guest declines a staff recommendation explicitly (rather than ignoring), it generates a stronger negative signal than a swipe SKIP.",
            "Cross-venue pattern learning: (Franchise mode only) Aggregate anonymous patterns from multiple venues refine the baseline recommendation model monthly.",
            "Seasonal drift: Time-of-year and time-of-day signals are weighted against 90-day rolling historical data to account for seasonal preference shifts.",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="8.3" title="Guest Memory System">
        <P>The Guest Memory System (GMS) is the persistence layer for guest intelligence. It stores not just what a guest has ordered, but the full behavioral context of each visit — who they were with, what the atmosphere was like, how long they stayed, how they responded to recommendations, and what emotional energy they brought to the room.</P>
        <Section title="Memory Profile Structure">
          <Ul items={[
            "Palate DNA: flavor affinity vector values for all 6 primary flavor dimensions",
            "Mentor assignment and calibration question responses",
            "Session history: date, time, duration, products ordered, total spend per visit",
            "Social mode pattern: solo / social / group across all visits",
            "Upsell response history: accepted, declined, ignored rates per tier",
            "Loyalty balance and point history",
            "Achievement history: badges unlocked, progression tier",
            "Notes field: optional staff-entered notes for VIP guests",
          ]} />
        </Section>
        <Section title="Memory Access — Staff Interface">
          <P>Staff can access a guest's memory profile via the assisted discovery overlay on any staff tablet. The profile view shows: current tier and loyalty balance, top 3 flavor affinities, last visit summary, and any staff notes. Staff are prohibited from modifying flavor affinity vectors directly — these are system-computed only.</P>
        </Section>
      </Chapter>

      <Chapter num="8.4" title="AI Mentorship System">
        <P>The AI Mentorship System extends the fictional mentor persona beyond the Initiation Chamber. Throughout the swipe ritual and beyond, the assigned mentor's philosophical profile shapes the tone of system-generated recommendations, pairing notes, and achievement commentary. This creates a continuous narrative thread rather than disconnected AI outputs.</P>
        <Callout label="Example — The Quiet Archivist Mentor Voice" text="Recommendation note (staff card): 'For this guest, suggest the Davidoff Millennium Blend Series T. It reflects their established preference for complexity over power — a cigar that rewards patience. Do not lead with strength. Lead with the finish.'" />
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 9 — FRANCHISE & MULTI-VENUE OPERATIONS MANUAL
// ══════════════════════════════════════════════════════════════════════════════

function Volume9() {
  return (
    <div>
      <VolumeHeader vol={9} title="Franchise & Multi-Venue Operations Manual" subtitle="Governance structure, franchise scalability, cross-venue intelligence, standardization protocols, regional management, and enterprise reporting." />

      <Chapter num="9.1" title="Franchise Governance Structure">
        <P>SmokeCraft 360 supports franchise deployments from 2 to 500+ locations under a single franchise account. The governance model is hierarchical: the Franchise Admin holds platform-wide authority, regional managers hold authority over assigned venue clusters, and each venue operator holds authority within their single location.</P>
        <Section title="Role Hierarchy — Franchise Model">
          <Table
            headers={["Level", "Role", "Scope", "Reporting To"]}
            rows={[
              ["1", "Super Admin", "Entire platform", "SmokeCraft Platform"],
              ["2", "Franchise Admin", "All franchise venues", "Super Admin"],
              ["3", "Regional Director", "Assigned venue cluster", "Franchise Admin"],
              ["4", "Venue Owner", "Single venue", "Regional Director"],
              ["5", "Venue Manager", "Single venue operations", "Venue Owner"],
              ["6", "Staff", "Floor operations", "Venue Manager"],
            ]}
          />
        </Section>
      </Chapter>

      <Chapter num="9.2" title="Cross-Venue Intelligence">
        <Section title="Low-Stock Digest">
          <P>Regional Directors receive a daily cross-venue low-stock digest at 8AM local time. This digest shows all venues in their cluster where any product is within 48 hours of depletion based on current consumption velocity. This allows regional purchasing to be coordinated rather than handled individually by each venue.</P>
        </Section>
        <Section title="Lounge League — Competitive Intelligence">
          <P>The Lounge League is a franchise-wide competitive ranking system that benchmarks venue performance across standardized metrics. Rankings are updated weekly and visible to all venue managers, creating healthy competitive motivation to improve service quality and operational efficiency.</P>
          <Table
            headers={["Metric", "Weight", "Measurement"]}
            rows={[
              ["Guest Satisfaction Score", "30%", "Derived from return visit rate and loyalty engagement"],
              ["Revenue Per Guest Hour", "25%", "Total session revenue / total guest-hours"],
              ["AI Recommendation Acceptance Rate", "20%", "% of AI suggestions resulting in order"],
              ["Inventory Accuracy", "15%", "Physical count vs. E.A.T. record agreement"],
              ["Staff Certification Level", "10%", "Average certification tier across active staff"],
            ]}
          />
        </Section>
        <Section title="Standardization Protocols">
          <Ul items={[
            "Mandatory: All franchise venues must use NOVEE OS in at minimum Essential mode.",
            "Mandatory: All staff must complete Level 1 certification before guest-facing duties.",
            "Mandatory: Humidor conditions must meet minimum specification — verified by monthly automated sensor report.",
            "Mandatory: Financial reconciliation worker must be enabled. Franchise Admin receives copy of all Critical alerts.",
            "Optional: Shared product catalog participation (Franchise Admin may mandate for specific SKUs).",
            "Optional: Cross-venue guest profile sharing (guest consent required, opt-in only).",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="9.3" title="Enterprise Reporting">
        <Section title="Available Reports — Franchise Level">
          <Table
            headers={["Report", "Frequency", "Audience", "Key Data"]}
            rows={[
              ["Franchise Performance Summary", "Weekly", "Franchise Admin, Regional Directors", "Revenue by venue, guest volume, AI acceptance, Lounge League rankings"],
              ["Cross-Venue Inventory Digest", "Daily", "Regional Directors", "Low-stock alerts, depletion projections, reorder suggestions"],
              ["Staff Certification Status", "Monthly", "Franchise Admin", "Certification tier distribution, gaps, overdue recertifications"],
              ["Financial Reconciliation Summary", "Daily", "Franchise Admin, Venue Owners", "Open tabs, stuck auths, reconciliation alerts by venue"],
              ["Guest Intelligence Aggregate", "Monthly", "Franchise Admin", "Anonymous aggregate palate trends, seasonal patterns, tier distribution"],
            ]}
          />
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOLUME 10 — LUXURY SERVICE CERTIFICATION & STAFF TRAINING HANDBOOK
// ══════════════════════════════════════════════════════════════════════════════

function Volume10() {
  return (
    <div>
      <VolumeHeader vol={10} title="Luxury Service Certification & Staff Training Handbook" subtitle="Complete onboarding programs, certification structures, roleplay scenarios, guest interaction scripts, emergency procedures, and the full 30-day staff development roadmap." />

      <Chapter num="10.1" title="Day 1 Onboarding Program">
        <SOP steps={[
          { step: "Welcome & Orientation (2 hours)", action: "Venue tour. Brand story. SmokeCraft 360 mission and philosophy. Introduction to NOVEE OS. Team introductions.", owner: "Manager" },
          { step: "Platform Walkthrough (3 hours)", action: "Staff login setup. Role assignment confirmed. Full guest ritual walkthrough as simulated guest — complete all 8 Chamber scenes, full swipe ritual, reveal page.", owner: "Manager / Senior Staff" },
          { step: "Safety & Compliance (1 hour)", action: "Data privacy basics. Payment handling. Audit log awareness. Emergency procedures. PIN security.", owner: "Manager" },
          { step: "Tobacco Foundations Reading (self-paced, 2 hours)", action: "Complete Volume 3 Chapter 3.1–3.2 reading. Quiz: 20 questions on cigar anatomy, wrapper identification, strength scale.", owner: "New Staff" },
          { step: "Floor Observation (2 hours)", action: "Shadow senior staff member for full shift. Note 3 guest interactions and how NOVEE OS prompts were used.", owner: "Senior Staff / New Staff" },
        ]} />
      </Chapter>

      <Chapter num="10.2" title="Week 1 Curriculum">
        <Table
          headers={["Day", "Topic", "Method", "Assessment"]}
          rows={[
            ["Day 1", "Orientation & Platform Basics", "Facilitated + self-paced", "Tobacco quiz (pass ≥80%)"],
            ["Day 2", "Flavor Education & Sensory Training", "Blind tasting exercise — 3 cigars", "Verbal flavor description evaluation"],
            ["Day 3", "Pairing Fundamentals", "Classroom + tasting", "Match 10 pairing combinations"],
            ["Day 4", "Guest Interaction & Scripts", "Roleplay scenarios with manager", "2 simulated guest interactions"],
            ["Day 5", "NOVEE OS Operations", "Hands-on kiosk configuration", "Configure test venue, complete guest flow"],
          ]}
        />
      </Chapter>

      <Chapter num="10.3" title="30-Day Development Roadmap">
        <Section title="Days 1–7: Foundation">
          <Ul items={[
            "Complete Level 1 certification written component",
            "25+ supervised guest interactions logged",
            "Pass pairing knowledge quiz ≥80%",
            "Demonstrate full ritual walkthrough unassisted",
          ]} />
        </Section>
        <Section title="Days 8–21: Proficiency">
          <Ul items={[
            "Independent floor service begins",
            "Begin Level 2 curriculum (self-paced study)",
            "Blind tasting exercise: identify 3 wrappers correctly",
            "First upsell conversation — documented and reviewed with manager",
            "NOVEE OS behavioral dashboard review with manager weekly",
          ]} />
        </Section>
        <Section title="Days 22–30: Certification">
          <Ul items={[
            "Level 1 practical assessment (supervised guest interaction)",
            "30-day performance review with manager",
            "Submission of observation notes from 5 guest interactions",
            "Begin Level 2 if performance standards met",
          ]} />
        </Section>
      </Chapter>

      <Chapter num="10.4" title="Guest Interaction Scripts — Roleplay Library">
        <Section title="Scenario 1 — New Guest, No Preferences Stated">
          <Callout label="Script" text={`Staff: "Welcome — have you experienced SmokeCraft before?" [Guest: No] "Perfect. Let's start at the beginning. I'd love to understand what you're drawn to — do you tend to prefer bold and intense, or something more smooth and approachable?" [Proceed based on response to guide toward kiosk ritual or direct staff recommendation.]`} />
        </Section>
        <Section title="Scenario 2 — Return Guest Recognition">
          <Callout label="Script" text={`Staff: "[Name], welcome back. Your profile shows you've been enjoying [Product] — we just received a new allocation of [Similar Product] that I think you'd appreciate. Would you like me to set that aside while you explore?" [Pull up guest profile on staff tablet to confirm preferences before speaking.]`} />
        </Section>
        <Section title="Scenario 3 — Strength Mismatch Prevention">
          <Callout label="Script" text={`Staff: "Before I bring that out — are you smoking regularly, or is this more of an occasional occasion? [Guest: Occasional] Then I'd like to steer you slightly — that selection is quite full-bodied and can be overwhelming without tolerance built up. There's a stunning medium that delivers everything you're looking for. May I show you?"`} />
        </Section>
        <Section title="Scenario 4 — Service Recovery">
          <Callout label="Script" text={`Staff: "[Name], I want to make sure tonight is exactly what you hoped for. I understand [issue] wasn't what you expected — I'd like to replace that and offer [compensation]. Your experience here matters to us and I want to earn your return."`} />
        </Section>
      </Chapter>

      <Chapter num="10.5" title="Emergency Procedures">
        <Section title="Guest Medical Event">
          <SOP steps={[
            { step: "Assess", action: "Approach calmly. Ask if guest needs assistance. Never announce over venue audio.", owner: "Nearest Staff" },
            { step: "Call", action: "If serious: call emergency services immediately. Notify manager via radio or discreet signal.", owner: "Staff / Manager" },
            { step: "Clear", action: "Calmly create space. Keep other guests calm. Do not share details with other guests.", owner: "Manager" },
            { step: "Document", action: "Log incident in NOVEE OS audit log after situation resolved. Include time, nature, and response.", owner: "Manager" },
          ]} />
        </Section>
        <Section title="System Outage">
          <SOP steps={[
            { step: "Verify", action: "Confirm outage scope: kiosk only, network, or full platform. Check status on staff tablet.", owner: "Staff" },
            { step: "Notify", action: "Inform manager immediately. Manager contacts IT / SmokeCraft support.", owner: "Staff / Manager" },
            { step: "Activate Fallback", action: "Direct guests to staff-assisted manual ordering. Use printed recommendation menus at each station.", owner: "Manager" },
            { step: "Document Orders", action: "Record all orders on paper order pad. Process payments via manual POS or mobile payment device.", owner: "Staff" },
            { step: "Sync After Recovery", action: "When system restores, enter all paper orders into system for complete financial record.", owner: "Manager" },
          ]} />
        </Section>
      </Chapter>

      <Chapter num="10.6" title="Certification Examination — Final Assessment">
        <Section title="Written Examination (All Levels)">
          <Ul items={[
            "Level 1: 40 questions — cigar anatomy, wrapper identification, strength scale, basic pairings, NOVEE OS basics. Pass: 80%.",
            "Level 2: 60 questions — regional knowledge, advanced pairings, behavioral intelligence, revenue brain basics, humidor management. Pass: 85%.",
            "Level 3: 80 questions + written case study (2,000 words). Pass: 88% + case study approval.",
            "Level 4 (Concierge): 40-question advanced service scenario test + live evaluation by venue director. No partial pass.",
          ]} />
        </Section>
        <Section title="Practical Evaluation Rubric">
          <Table
            headers={["Criterion", "Weight", "Evaluation Method"]}
            rows={[
              ["Guest greeting and rapport establishment", "20%", "Evaluator posing as new guest observes natural opening"],
              ["Product knowledge depth", "25%", "Evaluator asks 5 random product questions from catalog"],
              ["Pairing recommendation quality", "20%", "Evaluator requests pairing for stated spirit — evaluates logic and confidence"],
              ["NOVEE OS proficiency", "20%", "Navigate to guest profile, interpret behavioral data, explain recommendation"],
              ["Service recovery", "15%", "Evaluator presents a service problem — evaluates response and resolution"],
            ]}
          />
        </Section>
      </Chapter>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const VOLUME_COMPONENTS = [Volume1, Volume2, Volume3, Volume4, Volume5, Volume6, Volume7, Volume8, Volume9, Volume10];

export default function OperationsManual() {
  const [, navigate] = useLocation();
  const [activeVol, setActiveVol] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => window.print();

  const ActiveVolume = VOLUME_COMPONENTS[activeVol - 1];

  return (
    <>
      {/* ── Screen-only styles injected into head ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-container { margin: 0; padding: 20px 28px; background: white; color: #111; }
          .chapter { page-break-inside: avoid; }
          .vol-header { page-break-before: always; }
          table { page-break-inside: avoid; }
          h1, h2, h3 { page-break-after: avoid; }
          body { background: white !important; }
        }
        @media screen {
          .print-container { padding: 0; }
        }
      `}</style>

      {/* ── No-print top nav ── */}
      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "#080604", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 0 }}>
        {/* Back */}
        <button onClick={() => navigate("/settings")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", background: "transparent", border: "none", color: C.muted, cursor: "pointer", borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          <ArrowLeft size={15} /> <span style={{ fontSize: 12, fontFamily: C.sans }}>Settings</span>
        </button>

        {/* Volume tabs — scrollable */}
        <div style={{ flex: 1, display: "flex", overflowX: "auto", gap: 0 }}>
          {VOLUMES.map(v => (
            <button key={v.id} onClick={() => setActiveVol(v.id)}
              style={{
                padding: "0 18px", height: 48, background: activeVol === v.id ? `${C.gold}12` : "transparent",
                border: "none", borderBottom: activeVol === v.id ? `2px solid ${C.gold}` : "2px solid transparent",
                color: activeVol === v.id ? C.gold : C.dim, fontFamily: C.mono,
                fontSize: 9, letterSpacing: "0.16em", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              }}>
              {v.abbr}
            </button>
          ))}
        </div>

        {/* Print button */}
        <button onClick={handlePrint}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", margin: 6, background: `${C.gold}18`, border: `1px solid ${C.gold}44`, borderRadius: 8, color: C.gold, cursor: "pointer", flexShrink: 0 }}>
          <Printer size={14} /> <span style={{ fontSize: 11, fontFamily: C.sans, fontWeight: 600 }}>Print All</span>
        </button>
      </div>

      {/* ── Screen layout ── */}
      <div style={{ minHeight: "100vh", background: C.bg }}>

        {/* Ambient glow */}
        <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 30% 20%, rgba(212,175,55,0.04) 0%, transparent 65%)", zIndex: 0 }} />

        {/* Content */}
        <div ref={printRef} className="print-container" style={{ maxWidth: 960, margin: "0 auto", paddingTop: 72, paddingBottom: 80, paddingLeft: 32, paddingRight: 32, position: "relative", zIndex: 1 }}>

          {/* Screen: active volume only */}
          <div className="no-print">
            <motion.div key={activeVol} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Volume sidebar info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                <BookOpen size={16} color={C.gold} />
                <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.22em", color: C.muted }}>
                  {VOLUMES[activeVol - 1].abbr} OF X — {VOLUMES[activeVol - 1].label.toUpperCase()}
                </span>
              </div>
              <ActiveVolume />
            </motion.div>
          </div>

          {/* Print: all volumes */}
          <div style={{ display: "none" }} className="print-all-volumes">
            {VOLUME_COMPONENTS.map((Vol, i) => (
              <div key={i} style={{ pageBreakBefore: i > 0 ? "always" : "auto" }}>
                <Vol />
              </div>
            ))}
          </div>
        </div>

        {/* Volume navigation footer */}
        <div className="no-print" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,6,4,0.95)", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 28px", backdropFilter: "blur(12px)" }}>
          <button
            onClick={() => setActiveVol(v => Math.max(1, v - 1))}
            disabled={activeVol === 1}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: activeVol === 1 ? "transparent" : `${C.gold}12`, border: `1px solid ${activeVol === 1 ? "transparent" : C.gold + "33"}`, borderRadius: 8, color: activeVol === 1 ? C.dim : C.gold, cursor: activeVol === 1 ? "default" : "pointer", fontFamily: C.sans, fontSize: 12, fontWeight: 600 }}>
            <ArrowLeft size={13} /> Previous
          </button>

          <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.22em", color: C.dim }}>
            VOLUME {activeVol} OF 10
          </div>

          <button
            onClick={() => setActiveVol(v => Math.min(10, v + 1))}
            disabled={activeVol === 10}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: activeVol === 10 ? "transparent" : `${C.gold}12`, border: `1px solid ${activeVol === 10 ? "transparent" : C.gold + "33"}`, borderRadius: 8, color: activeVol === 10 ? C.dim : C.gold, cursor: activeVol === 10 ? "default" : "pointer", fontFamily: C.sans, fontSize: 12, fontWeight: 600 }}>
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ── Print-only: all volumes rendered as single document ── */}
      <style>{`
        @media print {
          .print-all-volumes { display: block !important; }
          .no-print { display: none !important; }
          body > * { display: none; }
          .print-container { display: block !important; }
        }
      `}</style>
    </>
  );
}
