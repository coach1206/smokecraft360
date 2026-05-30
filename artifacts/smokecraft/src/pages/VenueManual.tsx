/**
 * VenueManual — /admin/manual
 *
 * Comprehensive operator manual with step-by-step instructions for every
 * platform function. Print-friendly. Auth-gated to manager+.
 */

import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Printer, BookOpen, ChevronRight,
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

// ── Manual sections ───────────────────────────────────────────────────────────

interface ManualSection {
  id:           string;
  number:       number;
  title:        string;
  purpose:      string;
  whenToUse:    string;
  steps:        { heading?: string; text: string }[];
  successLooks: string;
  mistakes:     string[];
  troubleshoot: { problem: string; solution: string }[];
}

const SECTIONS: ManualSection[] = [
  {
    id:        "first-time-setup",
    number:    1,
    title:     "First-Time Setup",
    purpose:   "Configure the platform before your venue's first day of operation. This section covers the minimum required setup to go live.",
    whenToUse: "Once only — during initial deployment. Revisit if you change hardware, reset the venue, or onboard a second location.",
    steps: [
      { heading: "Log in as Venue Owner", text: "Navigate to your venue URL. Use the credentials provided during onboarding. You must be logged in as venue_owner or super_admin to access admin pages." },
      { heading: "Run the Smoke Test", text: "Go to /admin/system-validation. Click 'Run Smoke Test'. All 13 checks should show PASSED (green). If any check fails, contact NOVEE OS support before continuing setup." },
      { heading: "Configure Experience Control", text: "Go to /admin/experience-control. Set your preferred Venue Mode (start with 'Standard' or 'Lounge'). Set atmosphere intensity to 70%, motion calmness to 55%. Save settings." },
      { heading: "Load Experience Items", text: "Go to /inventory. Add or import your product catalog as experience items. Assign each item a craft type (smoke/pour/brew/vape), flavor tags, base score, and price. Upload product images for best conversion." },
      { heading: "Verify the Experience Flow", text: "Navigate to /experience/smoke. Run through 6–8 swipes. Check that the Reveal page shows 3+ ranked recommendations. Tap ADD on one — confirm a reservation appears. Then cancel the order." },
      { heading: "Test Demo Mode", text: "Navigate to /demo/axiom-experience. Click Start Demo. Walk through all 6 steps. Confirm the flow looks correct and no orders are created." },
      { heading: "Brief Your Staff", text: "Share the staff training URL (/training/staff) with all venue staff. Ask them to complete all 8 training modules before handling guests." },
    ],
    successLooks: "Smoke test shows 13/13 PASSED. Experience items are loaded for all 4 craft types. A test swipe session runs end-to-end without errors. Staff have completed training.",
    mistakes: [
      "Going live before running the smoke test — always validate first.",
      "Loading items without assigning flavor tags — tags power the Memory Brain's recommendations.",
      "Skipping the test order flow — always verify add-to-order and reservation release before opening.",
    ],
    troubleshoot: [
      { problem: "Smoke test shows 'DB unreachable'", solution: "Contact NOVEE OS support immediately — this indicates a database connection failure that cannot be self-resolved." },
      { problem: "No items appear on the swipe experience", solution: "Verify items are set to active=true and assigned the correct craft type. Check /inventory to confirm." },
      { problem: "Reveal page shows 0 recommendations", solution: "Confirm experience items exist and are active. Also verify the session completed enough swipes (minimum 3–4 items)." },
    ],
  },
  {
    id:        "managing-inventory",
    number:    2,
    title:     "Managing Experience Items",
    purpose:   "Keep your inventory accurate so the Revenue Brain always recommends items that are actually in stock. This section covers adding, editing, and deactivating items.",
    whenToUse: "When stock changes (new deliveries, items sell out, seasonal changes), when adding new products, or when updating prices.",
    steps: [
      { heading: "Access Inventory", text: "Navigate to /inventory. This view shows all your products with current stock levels, active/inactive status, and experience item linkage." },
      { heading: "Add a New Item", text: "Click 'Add Item'. Fill in: Title (product name), Description, Craft Type (smoke/pour/brew/vape), Flavor Tags (comma-separated, e.g. 'bold, cedar, rich'), Intensity (1–10), Base Score (1–100 — higher = prioritized by Revenue Brain), Cost and Retail Price." },
      { heading: "Assign Flavor Tags Carefully", text: "Tags are the core of the Memory Brain. Use consistent terminology: 'bold', 'mild', 'rich', 'smooth', 'spicy', 'floral', 'cedar', 'reserve', 'aged', 'complex'. Do not invent new tag names unless necessary — consistency across items improves recommendation quality." },
      { heading: "Set Base Score", text: "Base score (1–100) represents the item's default desirability independent of taste matching. High-margin or premium items should have higher base scores. The Revenue Brain uses this as 25% of its final scoring formula." },
      { heading: "Upload Product Images", text: "Click the image icon next to each item. Upload a clean product photo (minimum 400×400px, ideally square). Images significantly improve guest engagement on swipe cards." },
      { heading: "Deactivate Out-of-Stock Items", text: "When an item runs out, set it to inactive=false (toggle the Active switch). The Revenue Brain hard-blocks zero-stock items automatically for reservations — but deactivating also removes them from the swipe deck entirely." },
      { heading: "Reactivate When Restocked", text: "When stock arrives, set the item back to active=true. It immediately becomes available for new experience sessions." },
    ],
    successLooks: "All in-stock items show active=true with flavor tags, base score, and price filled in. Out-of-stock items show inactive. The swipe experience shows the correct card count for each craft type.",
    mistakes: [
      "Leaving items active when stock is depleted — this allows guests to see and add items that can't be fulfilled.",
      "Using inconsistent tag names ('Bold', 'bold', 'BOLD') — always use lowercase, no punctuation.",
      "Setting all base scores to 50 — differentiate your premium items with higher scores so they surface more often.",
    ],
    troubleshoot: [
      { problem: "Item not appearing in swipe experience", solution: "Check that active=true, craft type matches the experience being run, and the item has at least one tag." },
      { problem: "Inventory count wrong after orders", solution: "Check /orders for recent reservations and confirms. If a reservation expired without confirmation, stock is auto-released — check inventory_reservations in /admin/system-validation." },
    ],
  },
  {
    id:        "running-experience",
    number:    3,
    title:     "Running the Swipe Experience",
    purpose:   "Guide guests through the NOVEE OS swipe experience from craft selection to recommendation. This is the primary guest-facing flow and the core value of the platform.",
    whenToUse: "Whenever a guest wants a personalized recommendation. This replaces or supplements a staff member's verbal suggestion process.",
    steps: [
      { heading: "Navigate to the Craft Hub", text: "Go to the home screen (/) or /craft-hub. The guest sees four craft tiles: SmokeCraft, PourCraft, BrewCraft, VapeCraft. Hand the device to the guest or tap the appropriate craft." },
      { heading: "Guide the Swipe Flow", text: "Explain to the guest: 'Swipe right if this sounds appealing, left if it doesn't — there are no wrong answers.' The system shows 6–10 flavor profile cards per session. Each swipe trains the Memory Brain." },
      { heading: "Wait for the Reveal", text: "After the last card, the system automatically calculates recommendations. The Reveal page appears within 1–2 seconds showing the top 3 ranked items with taste match percentage and pairing notes." },
      { heading: "Help the Guest with Add-to-Order", text: "Point out the ADD button on each recommendation card. When the guest taps ADD, explain: 'I'm holding that for you for 15 minutes while you decide.' The inventory reservation is instant." },
      { heading: "Confirm or Release the Order", text: "If the guest wants to purchase, tap Confirm Order. The reservation converts to a sale and inventory is decremented. If the guest declines, tap Cancel — the reservation releases immediately." },
      { heading: "For Repeat Guests", text: "The Memory Brain persists taste profiles for authenticated users. Log returning guests in before starting the experience — their previous preferences pre-weight the recommendations." },
    ],
    successLooks: "Guest completes 6+ swipes. Reveal shows 3 recommendations. Guest selects at least one. Order confirms and appears in /orders. Staff can fulfill the order.",
    mistakes: [
      "Interrupting a guest mid-swipe to tell them what to select — the system is gathering data, don't bias it.",
      "Rushing the reveal — let the animation complete before discussing recommendations.",
      "Not following up within 10 minutes if a guest added an item — reservations expire at 15 minutes.",
    ],
    troubleshoot: [
      { problem: "Reveal shows 0 recommendations", solution: "The guest may have skipped all items. Ask them to run the session again with at least 2–3 adds. Also verify active items exist for this craft type." },
      { problem: "'Add' button disabled on reveal", solution: "Item is likely out of stock or an active reservation already exists. Check /inventory for that item's stock level." },
      { problem: "Session won't load", solution: "Check internet connection. Run the smoke test at /admin/system-validation. If swipe engine shows FAILED, contact NOVEE OS support." },
    ],
  },
  {
    id:        "revenue-brain",
    number:    4,
    title:     "Understanding the Revenue Brain",
    purpose:   "Understand how NOVEE OS ranks recommendations so you can configure your inventory for maximum revenue impact.",
    whenToUse: "When reviewing recommendation quality, when configuring item scores, or when explaining the system to your manager or investor.",
    steps: [
      { heading: "The Scoring Formula", text: "Revenue Brain ranks every in-stock item using: 40% Taste Match (how well the item's tags align with the guest's swipe pattern), 25% Venue Margin (set via base_score — higher base score = better margin signal), 15% Stock Level (low stock = -25 score penalty, zero stock = hard block), 20% Reliability (items rarely confirmed get a soft penalty over time)." },
      { heading: "How to Maximize Margin", text: "Set higher base_score values on your high-margin products. A premium item with base_score=85 will rank above a similar item with base_score=50, even with identical taste match. This is intentional — the system is designed to optimize venue revenue, not just guest preference." },
      { heading: "The Stock Penalty", text: "Items with fewer than 2 units in stock receive a -25 score penalty. Items at exactly 0 are hard-blocked. This prevents guests from being recommended items you can't fulfill — a critical protection against guest disappointment." },
      { heading: "Pairing Notes", text: "The Revenue Brain generates pairing suggestions on the Reveal page based on tag combinations. Tags like 'bold + cedar' trigger specific food/drink pairing notes. These are determined by the buildPairingNote() function — customize tag combinations in /admin/experience-control for venue-specific pairings." },
      { heading: "Reviewing Recommendation Quality", text: "Navigate to /analytics/swipe-intelligence → Revenue Funnel tab. This shows conversion rates by item, which recommendations are accepted vs skipped, and average taste match scores. Use this to identify underperforming items." },
    ],
    successLooks: "High-margin items appear consistently in top recommendations. Guest accepts rates above 40% on Reveal. Swipe Intelligence shows improving taste match scores over time.",
    mistakes: [
      "Setting all base scores to 50 — this makes the Revenue Brain unable to differentiate margin value.",
      "Leaving low-stock items active — the -25 penalty will suppress recommendations before stock runs out.",
      "Ignoring the Revenue Funnel analytics — it tells you exactly which items are underperforming and why.",
    ],
    troubleshoot: [
      { problem: "Premium items not appearing in recommendations", solution: "Check their base_score (should be 75+), verify they have relevant tags matching common guest swipe patterns, and confirm stock level is above 2 units." },
      { problem: "Guest says recommendations seem random", solution: "The guest may have been inconsistent in their swipes (added conflicting tag patterns). Encourage them to be deliberate and run another session." },
    ],
  },
  {
    id:        "orders-reservations",
    number:    5,
    title:     "Managing Orders & Reservations",
    purpose:   "Understand the full Add-to-Order lifecycle so you can fulfill guest requests, handle cancellations, and maintain inventory accuracy.",
    whenToUse: "During service whenever a guest uses the swipe experience and adds items to an order.",
    steps: [
      { heading: "Monitor Active Reservations", text: "Active reservations appear in /inventory → Reservations tab. Each shows item name, quantity, expiry time remaining, and session ID. Sort by expiry time to prioritize follow-up." },
      { heading: "Fulfilling a Confirmed Order", text: "When a guest confirms, the order appears in /orders with status 'confirmed'. Pull the item from inventory and deliver to the guest. Mark the order as fulfilled in /orders." },
      { heading: "Releasing Expired Reservations", text: "Reservations that expire without confirmation automatically release — no action required. The inventory count returns to available. If a guest returns after expiry, they need to add the item again via the Reveal page." },
      { heading: "Handling Cancellations", text: "If a guest changes their mind mid-reservation, tap Cancel Order on the Reveal page or in /orders. Inventory is immediately released. This is logged in the audit trail." },
      { heading: "Processing Refunds", text: "For a paid order that needs refunding, go to /orders, find the order, and use the Refund action. Inventory is restored automatically for any undelivered items. Stripe processes the payment reversal." },
      { heading: "Checking Order History", text: "Full order history is available at /orders. Filter by status (pending, confirmed, cancelled, refunded), date, or item. Export as CSV for accounting via the Export button (admin only)." },
    ],
    successLooks: "Every confirmed order is matched to a fulfilled delivery. Reservation expiry is being monitored and guests are followed up within 10 minutes of adding an item. Order history is clean with no stuck 'pending' items older than 30 minutes.",
    mistakes: [
      "Letting reservations expire without following up with the guest — this is a lost sale.",
      "Manually adjusting inventory during an active reservation — always wait for the reservation to confirm or expire first.",
      "Not checking /orders at the start of a shift for any unconsumed confirmed orders from the previous shift.",
    ],
    troubleshoot: [
      { problem: "Reservation won't release manually", solution: "Reservations auto-expire after 15 minutes. If you need immediate release, use the Cancel Order action on the Reveal page or in /orders." },
      { problem: "Order stuck in 'pending' for over 30 minutes", solution: "Go to /orders, find the order, and manually cancel it. Then run the smoke test to verify the order pipeline is healthy." },
    ],
  },
  {
    id:        "analytics",
    number:    6,
    title:     "Analytics & Reporting",
    purpose:   "Use behavioral data to understand what's working, identify underperforming items, and improve the guest experience over time.",
    whenToUse: "Weekly for trend review, daily during high-volume periods, before any inventory or scoring changes.",
    steps: [
      { heading: "Access Swipe Intelligence", text: "Navigate to /analytics/swipe-intelligence. This is the primary analytics dashboard. Four tabs: Overview, Taste Clusters, Revenue Funnel, Craft Compare, and Orchestration IQ." },
      { heading: "Read the Overview", text: "Overview shows total sessions, swipes, recommendations generated, and orders created for the selected period. The conversion rate (orders / sessions) is your most important top-level metric. Target: above 35% for an optimized venue." },
      { heading: "Taste Clusters", text: "This tab shows which flavor tag combinations appear most frequently together. Use this to understand your guest base: are they more 'bold + cedar' or 'smooth + aged'? Adjust your inventory accordingly." },
      { heading: "Revenue Funnel", text: "Shows the drop-off rate at each step: Session → Swipe → Recommendation → Order. High drop-off at Recommendation suggests items aren't matching guest tastes. High drop-off at Order suggests pricing or fulfilment friction." },
      { heading: "Craft Compare", text: "Compares performance across smoke, pour, brew, and vape. Use this to identify which craft is most popular at your venue and which needs more item variety or better scoring." },
      { heading: "Orchestration IQ", text: "Advanced tab showing behavioral patterns detected by the Predictive Orchestrator: guest mood distribution, pacing preferences, and premium intent trends. Use this for staffing decisions (e.g., more premium upsell during high-intent periods)." },
      { heading: "Exporting Data", text: "Use the Export button (admin only) to download CSV files of session data, order history, and analytics events. These can be imported into Excel or Google Sheets for custom reporting." },
    ],
    successLooks: "You can identify your top 3 converting experience items by name. You know which craft type has the lowest conversion and have a plan to improve it. Orchestration IQ shows a consistent mood profile for your guest base.",
    mistakes: [
      "Checking analytics daily for patterns that only emerge over weeks — aggregate over at least 7 days before drawing conclusions.",
      "Ignoring the Revenue Funnel — this is the most actionable report for improving revenue.",
      "Not exporting data before a major inventory change — export first so you can compare before/after.",
    ],
    troubleshoot: [
      { problem: "Analytics dashboard shows 0 data", solution: "Verify analytics events are recording by running a test session. If still empty, run the smoke test — the analytics_event check should show PASSED." },
      { problem: "Orchestration IQ tab is empty", solution: "Orchestrator events require sessions with 5+ swipe signals. Run full sessions (not just 1–2 swipes) to populate this tab." },
    ],
  },
  {
    id:        "troubleshooting",
    number:    7,
    title:     "Troubleshooting Common Issues",
    purpose:   "Quickly diagnose and resolve the most common operational problems without calling support.",
    whenToUse: "Any time something isn't working as expected. Start here before escalating to NOVEE OS support.",
    steps: [
      { heading: "Step 1: Check the Smoke Test", text: "Always start here. Go to /admin/system-validation, click Run Smoke Test, and wait for results. This identifies which system is failing in under 10 seconds." },
      { heading: "Step 2: Check the Error Detail", text: "Click the expand arrow on any FAILED check. The error detail shows the exact database error or system message. Capture a screenshot of this detail before calling support." },
      { heading: "Step 3: Check the Operator Readiness Checklist", text: "Go to /admin/operator-readiness. Any 'Action Needed' (red) item has a direct 'How to fix' link. Work through all red items before checking warning items." },
      { heading: "Step 4: Refresh and Retry", text: "For transient issues (slow API responses, stale UI), force-refresh the browser (Ctrl+Shift+R or Cmd+Shift+R). If on a kiosk, use the kiosk restart procedure." },
      { heading: "Step 5: Check Recent Changes", text: "Did anything change in the last 24 hours? New inventory items added? Experience control settings changed? A software update deployed? These are the most common causes of unexpected behavior." },
      { heading: "Step 6: Escalate with Evidence", text: "If the issue persists, contact NOVEE OS support with: (1) Screenshot of smoke test results, (2) The URL where the issue occurs, (3) What you expected vs. what happened, (4) Time the issue started." },
    ],
    successLooks: "You resolve the issue in under 5 minutes without calling support. If escalation is needed, the support team can reproduce and resolve within 30 minutes because you've provided the right diagnostic information.",
    mistakes: [
      "Calling support before running the smoke test — the first question support will ask is 'what did the smoke test show?'",
      "Describing the symptom vaguely ('it's broken') rather than specifically ('the Reveal page shows 0 recommendations after 8 swipes on /experience/smoke').",
      "Making configuration changes while troubleshooting — change one thing at a time and test after each change.",
    ],
    troubleshoot: [
      { problem: "White screen or app crash", solution: "Hard-refresh the browser. If on kiosk, trigger a device restart from /devices. Check the smoke test for any infrastructure failures." },
      { problem: "Login isn't working", solution: "Verify you're using the correct email and password. Auth tokens expire — log out and log back in. If a venue_owner account is locked, contact NOVEE OS support for a reset." },
      { problem: "Everything is slow", solution: "Check the performance mode setting in /admin/experience-control — switch to 'low-power' mode for slower hardware. Also check internet connection speed." },
    ],
  },
  {
    id:        "emergency-procedures",
    number:    8,
    title:     "Emergency Procedures",
    purpose:   "Handle critical system failures or service incidents quickly and safely to protect guest experience and revenue.",
    whenToUse: "Only when a critical failure occurs: complete system outage, data corruption suspicion, security incident, or persistent smoke test failures.",
    steps: [
      { heading: "Declare an Incident", text: "If the system is completely unresponsive or any smoke test check shows FAILED for more than 15 minutes after a retry, declare a service incident. Notify your venue manager and contact NOVEE OS support immediately." },
      { heading: "Preserve Guest Experience", text: "Switch to manual recommendations temporarily. Have staff use verbal knowledge to recommend items. Do not tell guests 'the system is broken' — say 'we're running a brief system update, let me help you personally.'" },
      { heading: "Do Not Modify the Database Manually", text: "Never attempt to directly edit database records during an incident. This can cause data corruption and make debugging much harder. Only NOVEE OS-provided admin tools should be used." },
      { heading: "Release Active Reservations", text: "If the order pipeline is down, navigate to /orders and manually cancel any pending reservations older than 10 minutes. This prevents guests from being misled about stock holds." },
      { heading: "Contact NOVEE OS Support", text: "Emergency contact details are provided in your onboarding documentation. Have ready: venue name, what the smoke test shows, when the issue started, and recent system changes." },
      { heading: "Post-Incident Review", text: "After resolution, run a full smoke test and check the Operator Readiness checklist. Document what happened, what the impact was, and what was changed to fix it. Share with NOVEE OS support for their incident log." },
    ],
    successLooks: "Guest impact is minimal (manual service continues). Incident is resolved within 30–60 minutes. Post-incident smoke test shows all 13 checks PASSED. Incident is documented.",
    mistakes: [
      "Waiting too long to contact support — contact NOVEE OS at the 15-minute mark, not after 2 hours of attempting self-resolution.",
      "Continuing to attempt fixes that don't work — after 3 failed attempts, stop and escalate.",
      "Not documenting the incident — this is essential for preventing recurrence.",
    ],
    troubleshoot: [
      { problem: "Complete API outage (all requests fail)", solution: "This is a server-side issue. Contact NOVEE OS support immediately. Do not attempt to restart backend services yourself unless explicitly instructed." },
      { problem: "Data appears corrupted (wrong orders, wrong stock counts)", solution: "Immediately suspend Add-to-Order operations and contact NOVEE OS support. Do not process any more reservations or orders until the issue is investigated." },
    ],
  },
];

// ── Print styles ──────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  .no-print { display: none !important; }
  .manual-section { break-inside: avoid; page-break-inside: avoid; page-break-before: always; }
  .manual-section:first-child { page-break-before: auto; }
  body { background: white !important; font-size: 12pt; }
  * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
}
`;

// ── Section component ─────────────────────────────────────────────────────────

function ManualSection({ section }: { section: ManualSection }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="manual-section" style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="no-print"
        style={{
          width: "100%", background: C.card, border: `1px solid ${C.border}`,
          borderLeft: "4px solid #1A1410",
          borderRadius: open ? "14px 14px 0 0" : 14,
          padding: "18px 22px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14, textAlign: "left",
          transition: "border-radius 0.2s",
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "#1A1410",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "#D48B00",
        }}>{section.number}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{section.title}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{section.purpose.slice(0, 100)}…</div>
        </div>
        <ChevronRight
          size={16} color={C.dim}
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderTop: "none",
            borderLeft: "4px solid #1A1410",
            borderRadius: "0 0 14px 14px",
            padding: "24px 28px",
          }}
        >
          {/* Purpose */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Purpose</div>
            <p style={{ fontSize: 14, color: C.text, margin: 0, lineHeight: 1.7 }}>{section.purpose}</p>
          </div>

          {/* When to use */}
          <div style={{
            background: "rgba(184,149,42,0.06)", border: "1px solid rgba(184,149,42,0.18)",
            borderRadius: 10, padding: "12px 16px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>When to Use</div>
            <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{section.whenToUse}</p>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Step-by-Step Instructions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {section.steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "#1A1410",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "#D48B00",
                  }}>{i + 1}</div>
                  <div style={{ paddingTop: 3 }}>
                    {step.heading && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{step.heading}</div>
                    )}
                    <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.7 }}>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What success looks like */}
          <div style={{
            background: "#dcfce7", border: "1px solid rgba(22,163,74,0.2)",
            borderRadius: 10, padding: "14px 16px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>✓ What Success Looks Like</div>
            <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.65 }}>{section.successLooks}</p>
          </div>

          {/* Common mistakes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Common Mistakes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {section.mistakes.map((m, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "8px 12px",
                  background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.1)",
                  borderRadius: 8,
                }}>
                  <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Troubleshooting */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Troubleshooting</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.troubleshoot.map((t, i) => (
                <div key={i} style={{ padding: "12px 14px", background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.1)", borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Problem: {t.problem}</div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}><strong>Solution:</strong> {t.solution}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function VenueManual() {
  const [, navigate] = useLocation();
  const tocRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text }}>
      <style>{PRINT_STYLE}</style>

      {/* Header */}
      <div className="no-print" style={{
        background: "#1A1A1B", borderBottom: `1px solid ${C.border}`,
        padding: "0 24px", position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, height: 60 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "6px 12px",
              color: C.muted, fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Dashboard
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "#1A1410",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BookOpen size={16} color="#D48B00" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Venue Operator Manual</div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em" }}>NOVEE OS · 8 SECTIONS</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={() => window.print()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#1A1410", border: "none",
                borderRadius: 8, padding: "7px 16px",
                color: "#D48B00", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <Printer size={13} /> Print Manual
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Print title */}
        <div style={{ display: "none" }} className="print-header">
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>NOVEE OS — Venue Operator Manual</h1>
          <p style={{ color: C.muted, margin: "0 0 32px" }}>8 sections covering every aspect of venue operations. Keep a printed copy at the manager station.</p>
        </div>

        {/* Cover */}
        <div style={{
          background: "#1A1410", borderRadius: 16,
          padding: "32px 36px", marginBottom: 28, color: "#D48B00",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <BookOpen size={32} color="#D48B00" />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>NOVEE OS</div>
              <div style={{ fontSize: 13, color: "rgba(212,139,0,0.6)", letterSpacing: "0.06em" }}>VENUE OPERATOR MANUAL</div>
            </div>
          </div>
          <p style={{ color: "rgba(212,139,0,0.7)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.7 }}>
            This manual covers every operation your team needs to run the platform confidently.
            Each section includes purpose, step-by-step instructions, success criteria, common mistakes, and troubleshooting.
            Print and keep a copy at the manager station.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {SECTIONS.map(s => (
              <div key={s.id} style={{
                background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.15)",
                borderRadius: 8, padding: "8px 10px",
                fontSize: 11, color: "rgba(212,139,0,0.7)", textAlign: "center",
              }}>
                <div style={{ fontWeight: 700, color: "#D48B00", marginBottom: 2 }}>{s.number}</div>
                {s.title}
              </div>
            ))}
          </div>
        </div>

        {/* Quick reference */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: "18px 22px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            Quick Reference — Key Routes
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {[
              { label: "Craft Hub",           path: "/" },
              { label: "SmokeCraft Ritual",   path: "/smokecraft" },
              { label: "Orders",              path: "/orders" },
              { label: "Inventory",           path: "/inventory" },
              { label: "Analytics",           path: "/analytics/swipe-intelligence" },
              { label: "Experience Control",  path: "/admin/experience-control" },
              { label: "System Validation",   path: "/admin/system-validation" },
              { label: "Operator Readiness",  path: "/admin/operator-readiness" },
              { label: "Staff Training",      path: "/training/staff" },
              { label: "Demo Mode",           path: "/demo/axiom-experience" },
            ].map(r => (
              <div key={r.path} style={{
                display: "flex", justifyContent: "space-between",
                padding: "6px 10px", background: C.bg, borderRadius: 6,
                fontSize: 12,
              }}>
                <span style={{ color: C.text, fontWeight: 500 }}>{r.label}</span>
                <code style={{ color: C.gold, fontSize: 11 }}>{r.path}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div ref={tocRef}>
          {SECTIONS.map(section => (
            <ManualSection key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
