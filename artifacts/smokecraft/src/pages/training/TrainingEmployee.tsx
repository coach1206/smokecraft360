/**
 * TrainingEmployee — /training/employee
 * Role-based onboarding paths for all 8 venue roles.
 * Session and step progression persisted to real backend DB.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }      from "framer-motion";
import { useLocation }                  from "wouter";
import {
  ArrowLeft, ArrowRight, CheckCircle, ChevronRight,
  UserCheck, Eye, Lightbulb, WifiOff,
} from "lucide-react";
import Maxwell        from "@/components/Maxwell";
import TrainingBanner from "@/components/training/TrainingBanner";
import SignOffModal   from "@/components/training/SignOffModal";
import { TRAINING_ROLES_CONFIG, MAXWELL_INTROS } from "@/data/trainingData";
import {
  logTrainingEvent, ensureTrainingSession, getAuthHeaders,
} from "@/hooks/useTrainingApi";

const T = {
  bg: "#F5F2ED", card: "rgba(26,26,27,0.06)", border: "rgba(212,139,0,0.15)",
  gold: "#D48B00", text: "rgba(26,26,27,0.90)", muted: "rgba(240,232,212,0.48)",
  light: "rgba(26,26,27,0.72)", green: "#34d399", amber: "#f59e0b",
};

const ROLE_CONTENT: Record<string, Array<{ step: string; title: string; body: string }>> = {
  bartender: [
    { step: "1", title: "POS Workflow Overview", body: "Open the Craft Command Center. Navigate to the Pour grid. Each tile shows product name, price, and real-time stock. Tap to add to the active tab." },
    { step: "2", title: "Opening a Tab", body: "Tap 'New Tab' → select table number → confirm guest name if available. The tab stays open until payment is collected. All items auto-track inventory." },
    { step: "3", title: "Pour Recommendations", body: "When a guest asks for a suggestion, use the Experience Engine. Their swipe history will surface high-confidence pours. Match confidence is shown as a percentage." },
    { step: "4", title: "Handling Payment", body: "When the guest is ready, tap the tab → Review → Checkout. Choose cash, card, or loyalty credits. The receipt is auto-generated after payment." },
    { step: "5", title: "Upsell Moments", body: "Watch for the orange upsell indicator on active tabs. The Revenue Brain has detected a premium opportunity. Present it naturally — never as a sale pitch." },
    { step: "6", title: "Shift Close", body: "At shift end, review your tab summary in the analytics panel. Revenue, tips, and upsell rate are tracked per staff member." },
  ],
  cigar_specialist: [
    { step: "1", title: "Flavor Profile Basics", body: "Cigars are categorized by strength (mild/medium/full) and flavor notes (earth, wood, spice, cream, cocoa). Learn to read a guest's preference from casual language." },
    { step: "2", title: "The Pairing Engine", body: "Access the AI pairing view for a guest's profile. The engine cross-references their spirits preferences with cigar strength to recommend optimal pairings." },
    { step: "3", title: "Conducting a Consultation", body: "Ask three questions: 'What do you normally smoke?', 'What spirit are you enjoying tonight?', 'How much time do you have?' These inputs refine the AI's recommendation." },
    { step: "4", title: "Inventory Knowledge", body: "Know the current stock levels for your top 10 cigars. The AI suppresses low-stock items automatically, but your knowledge adds authenticity to the conversation." },
    { step: "5", title: "Handling Preferences", body: "If a guest rejects a recommendation, use the Re-Profile function. Update their boldness and atmosphere weights. The next 3 suggestions will improve immediately." },
    { step: "6", title: "Pairing Notes", body: "After a successful pairing, add a staff note to the guest's profile. This appears next time they visit — creating a memorable return experience." },
    { step: "7", title: "Exclusive & Reserve", body: "Vault-tier guests have access to reserve inventory not shown in the standard grid. Access through the Platinum Concierge view." },
    { step: "8", title: "Certification Requirements", body: "Complete 10 guided pairing sessions and achieve 85%+ guest satisfaction to earn your Cigar Specialist certification." },
  ],
  vape_specialist: [
    { step: "1", title: "Device Knowledge", body: "Know your disposable vs. rechargeable categories. Each has different session lengths, flavor intensities, and price points. The inventory grid shows category and stock." },
    { step: "2", title: "Flavor Profile Mapping", body: "Vape flavors map to the same boldness/atmosphere matrix as cigars and spirits. A guest who prefers mellow cigars will likely prefer lighter fruit profiles." },
    { step: "3", title: "Compliance Awareness", body: "Age verification is mandatory before any vape transaction. The POS will prompt for verification. Never skip this step — it's logged in the audit trail." },
    { step: "4", title: "Customer Education", body: "Many guests new to vaping need guidance on nicotine levels and device operation. Use the product detail view to show specs during the consultation." },
  ],
  server: [
    { step: "1", title: "Guest Interaction Basics", body: "Your role is the bridge between the guest and the NOVEE OS platform. Learn to introduce the swipe experience naturally: 'Let me show you something that will make tonight even better.'" },
    { step: "2", title: "Order Handling", body: "Use the POS to add items to the correct tab. Double-check table numbers before confirming. Mistakes in tab assignment require manager override to correct." },
    { step: "3", title: "Upsell Technique", body: "The Revenue Brain flags upsell opportunities on your device. Frame them as exclusive suggestions: 'We only have 4 bottles of this left tonight — Carlos recommends it with your cigar.'" },
    { step: "4", title: "Loyalty System", body: "When a guest checks out, remind them of their points balance. 'You've earned 42 points tonight — 58 away from your next reward.' This drives return visits." },
    { step: "5", title: "Handling Complaints", body: "If a guest is dissatisfied with a recommendation, do not argue. Use the Re-Profile button, adjust manually, and offer a complimentary sample from the reserve list." },
  ],
  floor_manager: [
    { step: "1", title: "Floor Manager Dashboard", body: "Your dashboard shows all active tabs, staff on shift, open reservations, and inventory alerts simultaneously. Monitor this view throughout service." },
    { step: "2", title: "Staff Deployment", body: "The smart deployment system calculates optimal staff placement. When it flags a priority, act on it within 2 minutes to prevent guest experience degradation." },
    { step: "3", title: "Revenue Monitoring", body: "Track live revenue against forecasted revenue. If you fall more than 15% below forecast at the 8 PM mark, activate the upsell broadcast to staff." },
    { step: "4", title: "Issue Resolution", body: "For tab disputes, use the Payment Timeline to see the complete financial history of any tab. This resolves 90% of disputes before escalation." },
    { step: "5", title: "Inventory Alerts", body: "When the system flags a low-stock alert, suppress the item in recommendations within 60 seconds. Then submit a reorder via the distributor portal." },
    { step: "6", title: "Closing Procedures", body: "Before end of shift: reconcile all open tabs, review the failed webhook queue, confirm all payout requests are submitted, run the reconciliation worker." },
    { step: "7", title: "Escalation Protocols", body: "Escalation triggers: guest complaint unresolved after 5 minutes, tab dispute over $100, inventory theft indicator, system downtime over 2 minutes." },
  ],
  venue_owner: [
    { step: "1",  title: "Analytics Overview", body: "Your Master Operations dashboard is the command center. Revenue, staff performance, inventory health, AI confidence, and loyalty metrics — all in one view." },
    { step: "2",  title: "Campaign Management", body: "Distributor campaigns drive incremental revenue with zero manual work. Set budget caps, track ROI in real time, and receive auto-generated performance reports." },
    { step: "3",  title: "Staff Management", body: "View per-staff performance metrics: upsell rate, guest satisfaction, sessions completed. Use this data for coaching conversations, not just evaluations." },
    { step: "4",  title: "Financial Overview", body: "The Financial Reconciliation dashboard shows your payout pipeline, reconciliation score, and any alerts. A score above 90 means your financial systems are healthy." },
    { step: "5",  title: "Feature Flags", body: "You control which NOVEE OS features are active at your venue — upsell engine, loyalty system, swipe experience, POS mode. Toggle any flag without a code deployment." },
    { step: "6",  title: "Inventory Strategy", body: "Use the 30-day consumption averages to set intelligent reorder thresholds. The system will flag items before they run out, not after." },
    { step: "7",  title: "Lounge League", body: "Compete with other venues in the NOVEE OS network. League standings update in real time based on revenue, engagement, and AI performance metrics." },
    { step: "8",  title: "Scaling to Multiple Venues", body: "The multi-venue dashboard provides consolidated reporting across all locations. Each venue is fully isolated — data never bleeds across properties." },
    { step: "9",  title: "Franchise Operations", body: "Central Command enables remote OTA updates, forced refreshes, and device heartbeat monitoring across all your venues simultaneously." },
    { step: "10", title: "Revenue Strategy Review", body: "Monthly: review the AI insights panel for structural revenue opportunities. The system identifies patterns you cannot see manually — act on them." },
  ],
  inventory_manager: [
    { step: "1", title: "Inventory Grid Overview", body: "The inventory grid shows all products with current stock, reorder threshold, and 30-day average consumption. Red means below threshold. Yellow means approaching." },
    { step: "2", title: "Reorder Workflow", body: "When stock hits the threshold, the system auto-flags and sends a notification. Open the distributor portal, confirm the pre-filled order quantity, and submit." },
    { step: "3", title: "Receiving Inventory", body: "When a delivery arrives, use the Receive Inventory flow. Scan or manually enter quantities. Stock updates immediately across all POS devices." },
    { step: "4", title: "Suppression Controls", body: "For items running low mid-service, toggle the recommendation suppression flag. The AI immediately routes guests to alternatives with similar profiles." },
    { step: "5", title: "Audit Trail", body: "Every stock change is logged with timestamp, reason, and staff member. This audit trail is available for compliance review and loss investigation." },
  ],
  cashier: [
    { step: "1", title: "POS Checkout Flow", body: "When a guest is ready to pay: open their tab → Review → Checkout. Confirm the total, select payment method, and process. The receipt generates automatically." },
    { step: "2", title: "Payment Methods", body: "Accepted: card (Stripe), cash, loyalty credits, and split payment. For split payment, enter each portion manually before confirming the total." },
    { step: "3", title: "Receipt Delivery", body: "After payment: offer email, SMS, print, or QR code. The QR token allows the guest to retrieve their receipt anytime on any device." },
    { step: "4", title: "Tab Management", body: "Only managers can void or refund a closed tab. If a guest disputes a charge after payment, escalate to the floor manager immediately." },
  ],
};

export default function TrainingEmployee() {
  const [, navigate] = useLocation();
  const [selected, setSelected]       = useState<string | null>(null);
  const [stepIdx, setStepIdx]         = useState(0);
  const [completed, setCompleted]     = useState<Set<number>>(new Set());
  const [showSignOff, setShowSignOff] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const stepStartRef = useRef<number>(Date.now());

  const role  = selected ? TRAINING_ROLES_CONFIG.find((r) => r.id === selected) : null;
  const steps = selected ? (ROLE_CONTENT[selected] ?? []) : [];

  useEffect(() => {
    logTrainingEvent({ eventType: "page_view", page: "employee" });
  }, []);

  // Start session when role is selected
  useEffect(() => {
    if (!selected) return;
    stepStartRef.current = Date.now();
    logTrainingEvent({ eventType: "page_view", page: "employee", role: selected });
    ensureTrainingSession("employee", selected)
      .then((id) => { setSessionId(id); setOfflineMode(false); })
      .catch(() => setOfflineMode(true));
  }, [selected]);

  async function persistStep(idx: number, isComplete: boolean) {
    if (!sessionId || !selected) return;
    const durationMs = Date.now() - stepStartRef.current;
    const score = (idx + 1) * 15;
    stepStartRef.current = Date.now();

    try {
      await fetch("/api/training/progress", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId,
          scenarioId: `employee_${selected}`,
          stepIndex: idx,
          totalSteps: steps.length,
          score,
          completed: isComplete,
        }),
      });
      logTrainingEvent({
        eventType: "step_complete",
        page: "employee",
        role: selected,
        stepIndex: idx,
        score,
        durationMs,
        sessionId: sessionId ?? undefined,
      });
      setOfflineMode(false);
    } catch {
      setOfflineMode(true);
    }
  }

  if (selected && role) {
    const step = steps[stepIdx];
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif" }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 40, background: `${T.bg}ee`, backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 14,
        }}>
          <button onClick={() => { setSelected(null); setStepIdx(0); setCompleted(new Set()); setSessionId(null); }} style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 11,
            padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <ArrowLeft size={12} /> Roles
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: role.color, fontFamily: "'Cormorant Garamond',serif" }}>{role.title} Training</div>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Step {stepIdx + 1} of {steps.length} · {role.duration} {offlineMode ? "· offline" : "· synced"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {offlineMode && <WifiOff size={12} color={T.amber} />}
            <div style={{ display: "flex", gap: 4 }}>
              {steps.map((_, i) => (
                <div key={i} onClick={() => setStepIdx(i)} style={{
                  width: 20, height: 4, borderRadius: 2, cursor: "pointer", transition: "background 0.2s",
                  background: completed.has(i) ? T.green : i === stepIdx ? role.color : "rgba(255,255,255,0.1)",
                }} />
              ))}
            </div>
          </div>
        </div>
        <TrainingBanner />

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px" }}>
          <AnimatePresence mode="wait">
            <motion.div key={stepIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
              <div style={{ background: `${role.color}0a`, border: `1px solid ${role.color}30`, borderRadius: 16, padding: "32px 36px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: role.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Module {step?.step}</div>
                <div style={{ fontSize: 24, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: T.text, marginBottom: 18 }}>{step?.title}</div>
                <div style={{ fontSize: 13.5, color: T.light, lineHeight: 1.8 }}>{step?.body}</div>
              </div>

              <div style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 9, padding: "11px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Eye size={11} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 10.5, color: "#60a5fa", lineHeight: 1.6 }}>
                  <strong>On screen: </strong>
                  {stepIdx === 0 ? `Look for the ${role.title} section in your NOVEE OS staff view — it will be your primary work surface.`
                    : stepIdx === 1 ? "The system highlights the relevant action area with a subtle gold indicator when guidance is active."
                    : stepIdx === 2 ? "Guest profiles appear as cards with taste indicators shown as small colored bars below the guest name."
                    : stepIdx === 3 ? "Confirmation dialogs always show a summary of what will happen before you commit to any action."
                    : stepIdx === 4 ? "Notifications appear in the top-right badge area of your staff view — tap to expand details."
                    : "The completion indicator turns green when this step is fully recorded in your training progress."}
                </span>
              </div>

              {stepIdx % 3 === 0 && (
                <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 9, padding: "11px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Lightbulb size={11} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 10.5, color: "#f59e0b", lineHeight: 1.6 }}>
                    <strong>Manager tip: </strong>
                    {role.id === "bartender" ? "The fastest bartenders check the upsell indicator before approaching any table mid-service."
                      : role.id === "cigar_specialist" ? "The best consultations start with listening, not recommending. Ask two questions before suggesting anything."
                      : role.id === "floor_manager" ? "Revenue pacing is easier to correct at 30% deviation than at 50%. Check early, act early."
                      : "Consistency is the most important quality in any venue role. Do it right every time, not just when observed."}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                {stepIdx > 0 && (
                  <button onClick={() => setStepIdx((s) => s - 1)} style={{
                    background: "transparent", border: `1px solid ${T.border}`, borderRadius: 9, color: T.muted,
                    padding: "10px 20px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <ArrowLeft size={12} /> Previous
                  </button>
                )}
                {stepIdx < steps.length - 1 ? (
                  <button onClick={async () => {
                    setCompleted((c) => new Set([...c, stepIdx]));
                    await persistStep(stepIdx, false);
                    setStepIdx((s) => s + 1);
                  }} style={{
                    background: role.color, border: "none", borderRadius: 9, color: "#F5F2ED",
                    padding: "10px 22px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    Continue <ArrowRight size={12} />
                  </button>
                ) : (
                  <button onClick={async () => {
                    setCompleted((c) => new Set([...c, stepIdx]));
                    await persistStep(stepIdx, true);
                    setShowSignOff(true);
                  }} style={{
                    background: T.gold, border: "none", borderRadius: 9, color: "#F5F2ED",
                    padding: "10px 22px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <UserCheck size={13} /> Request Sign-Off
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <Maxwell message={`Module ${step?.step}: ${step?.title}. ${step?.body?.slice(0, 80)}…`} context={`${role.title} · Step ${stepIdx + 1}`} />
        {showSignOff && (
          <SignOffModal
            role={selected ?? ""}
            roleTitle={role.title}
            modulesCount={steps.length}
            onClose={() => setShowSignOff(false)}
            onApprove={() => { setShowSignOff(false); navigate("/training/certifications"); }}
          />
        )}
      </div>
    );
  }

  // Role selection
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 40, background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/training")} style={{
          background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 11,
          padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={12} /> Training
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond',serif" }}>Employee Training</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Select your role to begin</div>
        </div>
      </div>
      <TrainingBanner />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {TRAINING_ROLES_CONFIG.map((r, i) => (
            <motion.button key={r.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setSelected(r.id); setStepIdx(0); setCompleted(new Set()); }}
              style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "20px", cursor: "pointer", textAlign: "left", transition: "border-color 0.2s" }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, marginBottom: 12, boxShadow: `0 0 8px ${r.color}60` }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 3 }}>{r.title}</div>
              <div style={{ fontSize: 10, color: r.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{r.subtitle}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                {r.focus.map((f) => (
                  <div key={f} style={{ fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 3, height: 3, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 9, color: T.muted }}>{r.duration} · {r.modules} modules</div>
                <ChevronRight size={12} color={r.color} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <Maxwell message={MAXWELL_INTROS.employee} context="Role Selection" />
    </div>
  );
}
