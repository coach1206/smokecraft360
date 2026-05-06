/**
 * trainingManuals.ts — Role-based onboarding manuals for Axiom OS Training Mode.
 *
 * All content is specific to the Axiom OS platform and the Vault Cigar Lounge demo venue.
 * No placeholder text. No lorem ipsum. Real operational content only.
 */

export interface ManualStep {
  step:   string;
  title:  string;
  detail: string;
  tip?:   string;
}

export interface ManualMistake {
  mistake:  string;
  recovery: string;
}

export interface RoleManual {
  role:                 string;
  roleTitle:            string;
  overview:             string;
  responsibilities:     string[];
  systemInstructions:   ManualStep[];
  commonMistakes:       ManualMistake[];
  scenariosToComplete:  string[];
  managerChecklist:     string[];
  completionRequirements: string;
}

const MANUALS: RoleManual[] = [
  {
    role: "bartender",
    roleTitle: "Bartender",
    overview:
      "The Bartender is the primary operator of the POS pour grid and the guest's first point of contact for spirits, cocktails, and pour-based pairings. Within Axiom OS, the Bartender manages active tabs, processes pour recommendations from the AI engine, handles checkout, and monitors real-time inventory for their station.",
    responsibilities: [
      "Open and manage guest tabs from the Craft Command Center — POS mode",
      "Process pour recommendations surfaced by the Revenue Brain for each active guest",
      "Monitor the upsell indicator panel for revenue opportunities flagged by the behavioral engine",
      "Execute checkout via the POS flow and trigger receipt delivery (email, SMS, or QR code)",
      "Report inventory shortages immediately so the system can suppress low-stock items from recommendations",
      "Apply loyalty credits at checkout and communicate point balances to guests after payment",
      "Escalate tab disputes to the floor manager — never void or adjust amounts independently",
    ],
    systemInstructions: [
      {
        step: "1",
        title: "Open a New Tab",
        detail: "Navigate to Craft Command Center → POS Mode. Tap 'New Tab' on the active tab panel. Enter the table number and confirm. The tab is now open and timestamped. All subsequent items added to this tab are traceable.",
        tip: "Always confirm the table number before opening. Tab reassignment requires manager override.",
      },
      {
        step: "2",
        title: "Add Items from the Pour Grid",
        detail: "The pour grid displays all spirits and cocktails with real-time stock indicators. Green means well-stocked, amber means approaching reorder threshold, and suppressed items are greyed out (below threshold). Tap a tile to add it to the active tab. The inventory is reserved immediately.",
        tip: "If a guest requests a greyed-out item, it is suppressed due to low stock. Offer the AI-suggested alternative shown in the pairing panel.",
      },
      {
        step: "3",
        title: "Present Pour Recommendations",
        detail: "Open the guest's session view (accessible from their tab row) to see AI-generated pour recommendations ranked by pairing confidence. The top recommendation shows the match score (e.g., 94%), the flavor alignment reason, and the current margin contribution. Share the top suggestion verbally — never show the margin data to the guest.",
        tip: "The pairing reason is your talking point. Example: 'Your cigar's cocoa notes make Buffalo Trace an almost perfect match tonight.'",
      },
      {
        step: "4",
        title: "Handle the Upsell Indicator",
        detail: "An orange badge on an active tab row indicates the Revenue Brain has identified an upsell window. Tap the tab to see the suggested upgrade. This is typically a premium item the guest's spending history indicates they would enjoy. Present it as a curated suggestion, not a sales pitch.",
        tip: "Use exclusivity language. 'We only have 4 bottles of this left tonight' is more effective than any price justification.",
      },
      {
        step: "5",
        title: "Process Checkout",
        detail: "When a guest is ready to close their tab, tap the tab row → Review → Checkout. Verify all items are correct. Select payment method: card (Stripe), cash, loyalty credits, or split. Confirm the total on screen, process payment, and select a receipt delivery method. The receipt is auto-generated with loyalty points earned.",
        tip: "Always tell the guest how many points they earned: 'You've added 52 points tonight — 48 more until your next reward.' This drives return visits.",
      },
      {
        step: "6",
        title: "Manage Inventory Alerts",
        detail: "If the system flags a low-stock alert for a product you frequently pour, navigate to Operations → Inventory and toggle the 'Suppress when low' flag. Then notify the inventory manager or floor manager immediately so a reorder can be submitted.",
        tip: "Never let a guest ask for an item that's greyed out. Proactively brief yourself on suppressed items at the start of each shift.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Adding items to the wrong tab",
        recovery: "Contact the floor manager immediately. Tab item reassignment is possible within 5 minutes of the incorrect addition through the manager override panel. After 5 minutes, a refund line must be added.",
      },
      {
        mistake: "Processing payment on a partially fulfilled tab",
        recovery: "Cancel the payment flow immediately (do not confirm). Return to the tab review screen and verify all ordered items are marked delivered. Only close a tab when all items are accounted for.",
      },
      {
        mistake: "Showing AI score data or margin percentages to a guest",
        recovery: "This is a protocol violation, not a system error. Apologize to the guest, redirect the conversation, and report the incident to the floor manager for coaching documentation.",
      },
      {
        mistake: "Recommending a suppressed low-stock item",
        recovery: "Acknowledge the error professionally: 'I apologize — we just sold the last one tonight.' Immediately present the AI's alternative recommendation from the pairing panel.",
      },
      {
        mistake: "Skipping receipt delivery confirmation",
        recovery: "The receipt is auto-generated regardless. However, the guest will not have received it digitally. Navigate to the closed tab, tap 'Resend Receipt,' and select their delivery preference.",
      },
    ],
    scenariosToComplete: ["upsell_opportunity", "inventory_shortage", "rush_hour"],
    managerChecklist: [
      "Staff member can open, populate, and close a tab independently without guidance",
      "Staff member correctly identifies the upsell indicator and uses appropriate language",
      "Staff member demonstrated the recommendation flow for at least 3 guests",
      "Staff member processed at least 1 checkout via each payment method (card, cash, loyalty)",
      "Staff member correctly reported a low-stock item and navigated to suppress it",
      "Staff member understands escalation protocol for tab disputes",
    ],
    completionRequirements:
      "Complete all 6 system instruction modules. Complete the Upsell Opportunity, Inventory Shortage Recovery, and High-Volume Rush Hour training scenarios. Achieve manager sign-off with a verified manager PIN.",
  },

  {
    role: "cigar_specialist",
    roleTitle: "Cigar Specialist",
    overview:
      "The Cigar Specialist is Axiom OS's most AI-integrated front-line role. You operate as both a human host and the physical extension of the recommendation engine — reading guest signals, consulting the AI profile, and translating algorithmic suggestions into genuine hospitality. Your conversations directly inform the taste model, which improves every future recommendation you will ever give.",
    responsibilities: [
      "Conduct palate consultations using Axiom OS guest profiles and swipe history",
      "Guide first-time guests through the enrollment and mentor assignment flow",
      "Execute expert pairings that combine AI recommendations with personal knowledge of current inventory",
      "Update guest preference weights in the profile system after any mismatch or correction",
      "Maintain active awareness of current stock levels for the top 15 cigar SKUs",
      "Add staff pairing notes to guest profiles after successful consultations",
      "Participate in distributor campaign nights by knowing featured brands and talking points",
      "Submit reorder recommendations when reserve inventory falls below safe service levels",
    ],
    systemInstructions: [
      {
        step: "1",
        title: "Access a Guest's Taste Profile",
        detail: "From the floor manager view or your staff tablet, search the guest by name or loyalty ID. The profile shows their atmosphere preference (intimate/social), boldness level (mild/medium/bold), experience level, assigned mentor, and all previous swipe and order data. This is your consultation brief before you approach the table.",
        tip: "Review the profile before approaching. Greeting a guest with context ('Welcome back, Marcus — I remember you preferred the Davidoff last time') creates the VIP effect without any extra effort.",
      },
      {
        step: "2",
        title: "Conduct the Palate Consultation",
        detail: "For new guests or first visits, ask three questions in conversation: What do you normally smoke or prefer? (builds boldness baseline) — What are you drinking tonight? (enables cross-craft pairing) — How much time do you have for the experience? (determines ring gauge and strength recommendation). Feed the answers into the Re-Profile tool if the existing profile doesn't match.",
        tip: "Never use technical cigar terms without explaining them. 'Full-bodied' means nothing to a first-time guest. Say 'bolder, more intense, with a longer finish' instead.",
      },
      {
        step: "3",
        title: "Present the AI Recommendation",
        detail: "Open the pairing recommendation view for the guest's current session. The top recommendation shows: product name, match confidence %, flavor note alignment (e.g., 'cocoa and earth notes complement tonight's bourbon selection'), stock level, and the AI's pairing reason. Share the flavor alignment reason as your talking point — it's already been written for you.",
        tip: "The match confidence percentage is for your calibration only. Never say '94% match' to a guest. Say 'This pairing was made for tonight.'",
      },
      {
        step: "4",
        title: "Handle Recommendation Mismatches",
        detail: "If a guest rejects 3+ consecutive recommendations, tap 'Re-Profile' in their session view. The system will suggest a specific clarifying question based on the skip pattern. After asking and receiving a response, manually update their boldness and atmosphere weights. The system will immediately generate a new recommendation set with significantly higher confidence.",
        tip: "A mismatch is an opportunity, not a failure. Most guests discover something new about their palate through the correction process.",
      },
      {
        step: "5",
        title: "Add a Staff Pairing Note",
        detail: "After a successful pairing (guest accepted and seemed satisfied), navigate to their profile → Notes → Add Staff Note. Write a brief contextual note: 'Enjoyed Arturo Fuente Opus X with Buffalo Trace on 2025-05-06. Preferred bold, earthy profiles. Would welcome reserve inventory offers.' This note appears on every future visit, creating continuity across all staff.",
        tip: "Write notes like you're briefing a colleague who will serve this guest next time. Specificity is what makes the note valuable.",
      },
      {
        step: "6",
        title: "Manage Reserve Inventory Access",
        detail: "Vault-tier and Platinum guests have access to reserve inventory not visible on the standard floor grid. Navigate to Inventory → Reserve → Cigar Vault. This shows aged, limited, and partner-exclusive items. Only present reserve options to guests whose profile tier qualifies. The system enforces this — unauthorized access triggers an audit alert.",
      },
      {
        step: "7",
        title: "Distributor Campaign Protocol",
        detail: "When a distributor campaign is active (visible in the campaign banner in your staff view), you will see a 'Featured' badge on the campaign cigar in the recommendation grid. The AI has already boosted this product's recommendation weight. Your role is to know the product story: origin, flavor profile, brand heritage. The distributor portal has a one-page brief for every active campaign.",
      },
      {
        step: "8",
        title: "Certification and Advancement",
        detail: "Cigar Specialist certification requires completing all 8 training modules, achieving a minimum 85% guest satisfaction score across 10 guided pairing sessions, completing the First-Time Guest Pairing and VIP Guest Handling scenarios, and receiving manager sign-off. The digital certification is valid for 12 months.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Overriding the AI recommendation based solely on personal preference",
        recovery: "Trust the data first. If your instinct differs from the AI suggestion, check the guest profile for the weight that's driving the recommendation. If you believe the profile is wrong, update it — don't just ignore the system.",
      },
      {
        mistake: "Accessing reserve inventory for non-qualifying guests",
        recovery: "The system blocks this automatically. If a guest asks about reserve items and doesn't qualify, say 'Those are part of our Vault member program — I'd love to show you how to get there.' This converts the restriction into a loyalty upsell.",
      },
      {
        mistake: "Failing to add a staff pairing note after a successful session",
        recovery: "If you forget on shift, notes can be added retroactively within 24 hours via the guest's profile history. Always add them before the guest's next visit is flagged in the system.",
      },
      {
        mistake: "Using jargon that confuses new guests",
        recovery: "If you notice a guest's expression change, pause and say 'What I mean by that is...' and use simpler language. The system records satisfaction signals — confusing a guest will show up in the session rating.",
      },
    ],
    scenariosToComplete: ["first_time_pairing", "vip_handling", "recommendation_mismatch", "distributor_campaign"],
    managerChecklist: [
      "Staff member can independently navigate to a guest profile and interpret the taste data",
      "Staff member demonstrated the palate consultation flow for at least 5 guests",
      "Staff member correctly handled 1 recommendation mismatch and updated the profile",
      "Staff member added at least 3 staff pairing notes with appropriate specificity",
      "Staff member completed a distributor campaign briefing and used product talking points",
      "Staff member achieved 85%+ guest satisfaction across 10 guided sessions",
      "Staff member understands reserve inventory eligibility rules",
      "Staff member knows the escalation path for customer complaints",
    ],
    completionRequirements:
      "Complete all 8 training modules. Complete 4 required scenarios. Achieve 85%+ satisfaction rating across 10 sessions. Receive manager sign-off. Certificate valid for 12 months.",
  },

  {
    role: "vape_specialist",
    roleTitle: "Vape Specialist",
    overview:
      "The Vape Specialist manages the VapeCraft segment of the Axiom OS platform — from device knowledge and flavor consultation to compliance-mandatory age verification. The role sits at the intersection of regulatory compliance and guest personalization, requiring both technical product knowledge and the ability to translate Axiom's flavor profiling system into accessible language for guests who may be new to the category.",
    responsibilities: [
      "Conduct age verification before every vape transaction — mandatory, no exceptions",
      "Guide guests through device selection based on usage preference and flavor profile",
      "Use the VapeCraft recommendation engine to suggest flavors aligned with the guest's Axiom palate profile",
      "Maintain awareness of stock levels across disposable and rechargeable categories",
      "Educate guests on nicotine levels, device operation, and session duration",
      "Report compliance incidents (failed age verification, underage access attempts) immediately",
    ],
    systemInstructions: [
      {
        step: "1",
        title: "Age Verification Protocol",
        detail: "Before any VapeCraft transaction, the POS will automatically prompt for age verification. This cannot be bypassed. Verify the guest's ID, confirm the birth date exceeds the minimum age requirement for your jurisdiction, and tap 'Verified' in the POS. This is logged in the audit trail with timestamp and your staff ID.",
        tip: "Never skip or override age verification. Every verification attempt — successful or failed — is logged automatically.",
      },
      {
        step: "2",
        title: "Device Category Selection",
        detail: "The VapeCraft inventory grid separates devices into Disposable and Rechargeable categories. For first-time guests, start with Disposable — lower commitment, better for flavor exploration. For experienced guests, assess their preferred puff count and nicotine level before recommending rechargeable devices. The product detail view shows specs: puffs, nicotine %, flavor intensity.",
      },
      {
        step: "3",
        title: "Flavor Profile Consultation",
        detail: "Pull the guest's Axiom profile. VapeCraft flavor preferences map to the same boldness/atmosphere matrix as cigars and spirits. A guest with a 'mellow, intimate' profile will typically prefer light fruit or floral profiles. A 'bold, social' guest typically prefers menthol, tobacco, or intense dessert profiles. The recommendation engine uses this mapping automatically.",
      },
      {
        step: "4",
        title: "Compliance Incident Reporting",
        detail: "If an age verification fails or you suspect an underage access attempt, tap 'Flag Incident' in the POS. This creates an immutable audit record with your staff ID, timestamp, and a notes field. Notify the floor manager immediately. The incident is logged regardless of whether a transaction was completed.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Skipping age verification for guests who appear clearly of age",
        recovery: "There is no recovery after the fact — the audit log will show a transaction without verification. This is a protocol violation. Age verification is always required regardless of apparent age.",
      },
      {
        mistake: "Recommending nicotine levels without asking the guest's experience",
        recovery: "If a guest reports discomfort after a high-nicotine device, stop the session, provide water, and notify the floor manager. Log the incident with product details for compliance records.",
      },
      {
        mistake: "Confusing disposable and rechargeable inventory locations in the POS grid",
        recovery: "Both categories are clearly labelled in the grid header. If you've added the wrong item, remove it before checkout. Do not process a return for a product that was incorrectly selected at POS.",
      },
    ],
    scenariosToComplete: ["inventory_shortage", "rush_hour"],
    managerChecklist: [
      "Staff member correctly completed age verification on every demo transaction",
      "Staff member can navigate device categories and explain specs to a guest",
      "Staff member demonstrated flavor profile consultation using Axiom guest data",
      "Staff member knows the compliance incident reporting flow end-to-end",
    ],
    completionRequirements:
      "Complete all 4 training modules. Complete Inventory Shortage Recovery and Rush Hour scenarios. Pass compliance quiz (100% required). Receive manager sign-off.",
  },

  {
    role: "server",
    roleTitle: "Server",
    overview:
      "The Server is the guest's primary human touchpoint throughout a full Axiom OS venue experience. Unlike bartenders who manage the POS, Servers focus on guest interaction quality, order routing, upsell timing, and loyalty communication. The Server role is the highest-leverage position for driving guest satisfaction scores — every positive interaction compounds into return visit probability.",
    responsibilities: [
      "Introduce the Axiom OS swipe experience to new guests as a natural part of the welcome",
      "Route orders correctly to the appropriate tab and confirm with the guest before submission",
      "Monitor behavioral intelligence flags on active tables and act on upsell suggestions at the right moment",
      "Communicate loyalty point balances and rewards at checkout to reinforce return visit motivation",
      "Manage complaints professionally and escalate to floor manager after one failed resolution attempt",
      "Ensure guests receive their receipt via their preferred delivery channel before leaving",
    ],
    systemInstructions: [
      {
        step: "1",
        title: "Introducing the Axiom Experience",
        detail: "For first-time or returning guests without a profile, introduce the swipe experience within the first 2 minutes of seating. Script: 'We have a system that learns your personal taste and makes suggestions just for you — it takes about 90 seconds and guests love it. Want to give it a try?' Navigate them to the kiosk or use the table QR code to start the enrollment flow.",
      },
      {
        step: "2",
        title: "Order Routing and Tab Confirmation",
        detail: "All orders are added to the active tab for the table. Before adding any item, confirm the table number on screen matches the physical table you're serving. After adding, read back the order to the guest before submitting. A submitted order triggers inventory reservation — reversals require manager involvement.",
        tip: "Read back the order every time. 'So that's the Arturo Fuente Opus X, one Buffalo Trace, and the Hendrick's Gin — correct?' prevents 90% of order errors.",
      },
      {
        step: "3",
        title: "Acting on Upsell Flags",
        detail: "The orange upsell badge on a table row in your server view means the behavioral engine has detected a premium opportunity. Tap the badge to see the suggested item and the AI's rationale. Present it naturally: 'I noticed you're enjoying the [current item] — we have something that pairs particularly well with that tonight.' Never mention the AI or the system to the guest.",
      },
      {
        step: "4",
        title: "Loyalty Communication at Checkout",
        detail: "Before presenting the check, look up the guest's loyalty balance in their profile tab. After checkout is processed, tell them: 'You've earned [X] points tonight — you're [Y] away from your next reward.' For guests close to a tier milestone, mention it: 'You're 120 points from Gold status — your next visit should get you there.'",
      },
      {
        step: "5",
        title: "Complaint Resolution Protocol",
        detail: "For any guest complaint: listen without interrupting, acknowledge specifically ('I understand — the recommendation didn't match what you were expecting'), offer one immediate solution (alternative recommendation, complimentary item from the reserve, a discount applied manually), and follow through immediately. If the first solution doesn't resolve the issue, escalate to the floor manager within 3 minutes.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Adding items to the wrong table's tab",
        recovery: "Remove the incorrectly added item immediately if pre-submission. If already submitted, notify the floor manager — item reassignment within 5 minutes is possible via manager override.",
      },
      {
        mistake: "Mentioning the AI or algorithms to a guest",
        recovery: "Redirect the conversation: 'It's a preference system we've developed — the team curates suggestions based on what guests in similar situations enjoy.' Never use the words 'AI', 'algorithm', or 'data' with guests.",
      },
      {
        mistake: "Skipping loyalty communication at checkout",
        recovery: "If you've already processed the payment, check the closed tab and read the points earned. You can still mention it: 'By the way, you earned 34 points tonight — they're already in your account.'",
      },
    ],
    scenariosToComplete: ["first_time_pairing", "upsell_opportunity", "rewards_issue"],
    managerChecklist: [
      "Staff member introduced the swipe experience to at least 5 first-time guests",
      "Staff member correctly routed all orders with verbal confirmation",
      "Staff member acted on 2+ upsell flags using appropriate language",
      "Staff member communicated loyalty balances at every checkout observed",
      "Staff member handled 1 complaint scenario to resolution without escalation",
    ],
    completionRequirements:
      "Complete all 5 training modules. Complete 3 required scenarios. Receive manager sign-off. Minimum 80% satisfaction score across first 10 observed interactions.",
  },

  {
    role: "floor_manager",
    roleTitle: "Floor Manager",
    overview:
      "The Floor Manager operates as the real-time command layer between the Axiom OS platform and the guest experience on the floor. The role requires simultaneous awareness of revenue performance, staff deployment, inventory health, guest satisfaction signals, and escalation queues. A skilled Floor Manager uses the Operations dashboard as their second sense — monitoring everything without being consumed by any single issue.",
    responsibilities: [
      "Monitor the Floor Manager dashboard for active tabs, staff status, reservations, and inventory alerts",
      "Deploy staff optimally based on the smart deployment system's real-time recommendations",
      "Act on reconciliation alerts within 2 minutes of escalation flag",
      "Manage guest complaints that escalate from server level",
      "Authorize manager overrides for discounts, void operations, and loyalty adjustments",
      "Maintain revenue tracking against nightly forecast and activate upsell broadcasts if pace falls below 15%",
      "Complete shift-close procedures including tab reconciliation and alert queue clearance",
    ],
    systemInstructions: [
      {
        step: "1",
        title: "Floor Manager Dashboard",
        detail: "Your primary view is the Floor Manager dashboard in MasterOperations → Operations → Floor View. This shows: all active tabs with elapsed time and current value, staff on shift and their active table assignments, open and upcoming reservations, low-stock inventory alerts, and any unresolved guest flags. Monitor this view continuously throughout service.",
      },
      {
        step: "2",
        title: "Smart Staff Deployment",
        detail: "The deployment panel shows current staff assignments alongside a 'Suggested' column generated by the system based on table tier, estimated spend, and staff performance ratings. When the system flags a deployment suggestion (amber indicator), act on it within 2 minutes. Manually confirm changes in the staff panel — the system does not auto-reassign.",
        tip: "Prioritize Platinum and VIP tables in the suggestion queue. Revenue loss from under-attended high-value tables is disproportionate to the time cost of redeployment.",
      },
      {
        step: "3",
        title: "Revenue Pacing and Upsell Broadcast",
        detail: "The revenue pacing indicator in the dashboard header shows current revenue vs. nightly forecast. If you fall more than 15% below forecast at the 8 PM mark, activate a Staff Broadcast: 'Revenue pacing alert — prioritize upsell opportunities on active tabs.' This sends a silent notification to all staff devices without disrupting guests.",
      },
      {
        step: "4",
        title: "Manager Override Panel",
        detail: "The Manager Override panel (accessible via long-press on any tab row) allows: item removal without guest charge, tab-to-tab reassignment, loyalty credit manual application, and complimentary item addition. All overrides are logged in the audit trail with your manager ID, timestamp, and reason field. Always complete the reason field.",
      },
      {
        step: "5",
        title: "Inventory Alert Response",
        detail: "When a low-stock alert appears (inventory below reorder threshold), toggle the suppression flag in Operations → Inventory within 60 seconds. Then submit a reorder via the distributor portal — the reorder quantity is pre-calculated from the 30-day average. The suppression prevents overselling until the reorder arrives.",
      },
      {
        step: "6",
        title: "Shift Close Procedures",
        detail: "At shift close: (1) Confirm all active tabs are closed or transferred. (2) Review the alert queue and acknowledge or resolve all pending flags. (3) Confirm all payout requests are submitted. (4) Run the manual reconciliation check via Finance Reconciliation → Run Reconciliation. (5) Review the staff performance panel — note any upsell rate or satisfaction anomalies for the morning debrief.",
      },
      {
        step: "7",
        title: "Escalation Handling",
        detail: "When a server escalates a guest complaint: respond within 3 minutes, review the guest's profile for context before approaching, open with acknowledgment (not apology), and offer a concrete resolution from the override panel. If the resolution costs money (comp, discount), log it in the override reason field as 'Guest Satisfaction Recovery.' Track the resolution outcome in your shift notes.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Ignoring the revenue pacing indicator until end of service",
        recovery: "Revenue recovery at end of night is exponentially harder than mid-service intervention. Set a personal reminder to check pacing every 45 minutes during peak hours.",
      },
      {
        mistake: "Approving manager overrides without completing the reason field",
        recovery: "The audit trail requires reason documentation for compliance. Overrides without reasons are flagged by the reconciliation worker. Retroactively add reasons via the override history within 24 hours.",
      },
      {
        mistake: "Delaying inventory suppression after a low-stock alert",
        recovery: "Every second of delay is a potential oversell. Create a floor habit: every alert notification is a 60-second response commitment. No exceptions during service.",
      },
    ],
    scenariosToComplete: ["rush_hour", "rewards_issue", "inventory_shortage", "vip_handling"],
    managerChecklist: [
      "Manager candidate monitored the dashboard continuously for one full observed service period",
      "Manager candidate correctly acted on 2+ deployment suggestions within 2 minutes each",
      "Manager candidate processed at least 3 manager overrides with complete reason documentation",
      "Manager candidate completed a full shift-close procedure without guidance",
      "Manager candidate handled 1 escalated complaint to successful resolution",
      "Manager candidate demonstrated inventory suppression protocol within 60 seconds",
      "Manager candidate signed off on at least 1 employee training completion",
    ],
    completionRequirements:
      "Complete all 7 training modules. Complete all 4 required scenarios. Complete 1 observed full service period. Receive venue owner sign-off. Certificate valid for 12 months.",
  },

  {
    role: "venue_owner",
    roleTitle: "Venue Owner",
    overview:
      "The Venue Owner holds full system access across all Axiom OS modules. This training program covers the strategic operation layer — analytics interpretation, campaign strategy, multi-venue management, revenue optimization, and platform configuration. The goal is to transition from daily operational awareness to systemic platform intelligence: using the data the system generates to make decisions that compound venue performance over time.",
    responsibilities: [
      "Review and act on the MasterOperations dashboard daily — revenue, AI performance, staff metrics, and inventory health",
      "Configure and monitor distributor campaigns for ROI performance and budget adherence",
      "Set and adjust admin intensity controls for reward engine, XP system, and discount parameters",
      "Manage feature flag configuration — activate or deactivate platform capabilities by venue",
      "Review financial reconciliation reports and act on outstanding alerts before payout cycles",
      "Monitor the Lounge League standing and evaluate competitive positioning against the network",
      "Approve manager sign-offs for staff training completions",
    ],
    systemInstructions: [
      {
        step: "1", title: "MasterOperations Overview",
        detail: "MasterOperations is your command dashboard. The KPI strip shows real-time revenue, AI confidence, active tabs, and satisfaction score. The Operations group gives you direct access to: Intelligence (AI triggers), Revenue Engine, Financial Reconciliation, Analytics, Campaign Management, and Training Mode. Review the KPI strip at the start of every service day.",
      },
      {
        step: "2", title: "Campaign Management",
        detail: "Campaigns → Create Campaign. Set: featured product, boost weight (1–3x), start/end date, and budget cap. The system enforces the budget cap automatically. Campaign ROI reports are generated 24 hours after campaign close — review them in Campaigns → History. Distributor-funded campaigns appear in your revenue breakdown as net-positive contributions.",
      },
      {
        step: "3", title: "Admin Intensity Controls",
        detail: "Settings → Admin Controls. Adjust: loyalty point multiplier (0.5x–3x), XP gain rate per session, upsell aggressiveness (low/medium/high), and campaign boost ceiling. Changes take effect immediately across all active sessions. Use conservative adjustments — a 2x point multiplier during a promotion can significantly accelerate tier advancements.",
      },
      {
        step: "4", title: "Feature Flag Management",
        detail: "Settings → Feature Flags. Toggle capabilities: swipe experience, upsell engine, loyalty system, POS mode, recommendation suppression, and offline mode. Flags affect only your venue — other venues in the network are not impacted. Before deactivating any flag, review its downstream effect on active sessions in the dependency map.",
      },
      {
        step: "5", title: "Financial Reconciliation",
        detail: "Finance Reconciliation → Overview. Your reconciliation score should remain above 90. Scores below 80 indicate: stuck authorized tabs (>2h), orphan open tabs (>72h), failed payout requests, or exhausted webhook retries. Alert Queue shows actionable items — acknowledge or resolve each before payout day.",
      },
      {
        step: "6", title: "Lounge League Strategy",
        detail: "The Lounge League ranks venues across the Axiom network on revenue performance, guest engagement, and AI accuracy metrics. View your ranking in Analytics → Lounge League. Competitive positioning improves through: campaign activation, loyalty tier growth, and swipe session volume. The network average is your baseline — target the 75th percentile within 90 days.",
      },
      {
        step: "7", title: "Multi-Venue Management",
        detail: "If you operate multiple venues, the consolidated view in MasterOperations → Venues shows all locations with individual KPI strips. Each venue is fully isolated — data never bleeds across properties. OTA updates from Central Command apply to all registered devices across all venues simultaneously.",
      },
      {
        step: "8", title: "Training Mode Management",
        detail: "Training Mode → Admin Controls. From here: reset the Vault Demo environment, issue fake training accounts for new staff onboarding, launch specific training modes for staff presentations, and export training packets (PDFs, manuals, certificates) for physical documentation.",
      },
      {
        step: "9", title: "AI Performance Review",
        detail: "Analytics → AI Performance. Review: recommendation accuracy trend (target >88%), upsell window detection rate, pairing confidence distribution, and mismatch correction speed. AI performance degrades when guest profiles are incomplete or when staff skip the Re-Profile step after mismatches. Coach staff on profile maintenance.",
      },
      {
        step: "10", title: "Strategic Revenue Review",
        detail: "Monthly: open Analytics → AI Insights. The system surfaces structural revenue opportunities: underutilized upsell categories, campaign gaps in your calendar, staff performance outliers, and inventory items generating high margin but low recommendation frequency. Act on at least 1 insight per monthly review.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Setting admin intensity controls too high during initial setup",
        recovery: "If loyalty points or XP are accelerating faster than expected, reduce multipliers gradually. Abrupt reductions during active sessions create guest-facing inconsistencies. Make changes before service begins.",
      },
      {
        mistake: "Ignoring the reconciliation alert queue before payout cycles",
        recovery: "Unresolved alerts can delay payout processing. Set a recurring calendar reminder 3 days before each payout cycle to clear the queue.",
      },
      {
        mistake: "Deactivating feature flags without reviewing the dependency map",
        recovery: "Some flags have cascade effects. Deactivating the loyalty system during a campaign with loyalty-gated rewards breaks the guest experience mid-session. Always review the dependency map before making flag changes during service.",
      },
    ],
    scenariosToComplete: ["vip_handling", "distributor_campaign", "rush_hour", "recommendation_mismatch"],
    managerChecklist: [
      "Venue owner reviewed MasterOperations KPI strip and could explain all 6 active metrics",
      "Venue owner created and activated a distributor campaign independently",
      "Venue owner adjusted admin intensity controls with documented rationale",
      "Venue owner cleared the reconciliation alert queue before end of session",
      "Venue owner reviewed AI performance metrics and identified 1 coaching opportunity",
      "Venue owner demonstrated the multi-venue consolidated view (if applicable)",
      "Venue owner approved at least 1 manager training sign-off",
    ],
    completionRequirements:
      "Complete all 10 training modules. Complete 4 required scenarios. Review and action a full reconciliation alert queue. Receive board-level or operator sign-off. Certificate valid for 12 months.",
  },

  {
    role: "inventory_manager",
    roleTitle: "Inventory Manager",
    overview:
      "The Inventory Manager ensures that Axiom OS's recommendation engine always has accurate stock data to work with. An incorrect inventory count doesn't just cause a stockout — it damages guest trust when the AI recommends an unavailable item. The inventory role is the data quality foundation the entire platform depends on.",
    responsibilities: [
      "Maintain accurate stock levels across all product categories in the Axiom OS inventory grid",
      "Respond to low-stock alerts within 60 seconds by toggling suppression flags",
      "Submit reorder requests via the distributor portal when stock reaches threshold",
      "Receive and log incoming inventory accurately — any discrepancy is logged in the audit trail",
      "Review 30-day consumption averages monthly and adjust reorder thresholds accordingly",
      "Report any inventory discrepancies, losses, or suspected theft via the incident log",
    ],
    systemInstructions: [
      {
        step: "1", title: "Inventory Grid Navigation",
        detail: "Operations → Inventory. The grid shows all products with: current stock, reorder threshold, 30-day average consumption, and status indicator (green/amber/red). Red means below threshold and auto-suppressed. Amber means approaching threshold — prepare a reorder. Green means normal operating level.",
      },
      {
        step: "2", title: "Low-Stock Alert Response",
        detail: "When the alert notification fires, navigate to the flagged product. Verify the stock count visually if possible. Toggle the 'Suppress when low' flag. This removes the product from active recommendations immediately. Then submit a reorder via the distributor portal.",
        tip: "60-second rule: from alert to suppression in under 60 seconds. Every second of delay risks the AI recommending an unavailable item to a guest.",
      },
      {
        step: "3", title: "Reorder Workflow",
        detail: "Distributor Portal → Reorder. The system pre-populates the quantity based on your 30-day average consumption and estimated delivery time. Review, adjust if a promotion or event requires above-average volume, and submit. The distributor receives the request instantly and sends a confirmation. You'll receive a delivery ETA in the portal.",
      },
      {
        step: "4", title: "Receiving Inventory",
        detail: "Operations → Inventory → Receive Shipment. Enter the product SKU (or scan if your device has a camera), enter the quantity received, and confirm. The stock level updates immediately across all POS devices. Cross-check physical count against the delivery invoice before confirming — any discrepancy must be noted in the shipment log.",
      },
      {
        step: "5", title: "Threshold Calibration",
        detail: "Monthly: review the 30-day consumption average for each high-velocity SKU. If consumption has increased, raise the reorder threshold. If a product is moving slowly, lower the threshold to avoid overstock. Threshold calibration keeps the alert system accurate and prevents both stockouts and excess carrying costs.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Receiving inventory without cross-checking against the delivery invoice",
        recovery: "If a discrepancy is discovered after confirmation, flag the shipment in the distributor portal immediately. Do not adjust the confirmed quantity manually — submit a formal discrepancy report through the Inventory → Discrepancy Report flow.",
      },
      {
        mistake: "Delaying suppression while waiting to physically verify stock",
        recovery: "Suppress first, verify second. The suppression flag can be removed immediately if the physical count confirms stock is available. The cost of an incorrect suppression (lost recommendation opportunity) is lower than the cost of recommending an unavailable item.",
      },
      {
        mistake: "Setting reorder thresholds without reviewing seasonal demand patterns",
        recovery: "Review the consumption trend chart (30-day, 90-day comparison) before adjusting thresholds. A product that seems to be slowing may be seasonal — reducing the threshold before peak season creates an avoidable stockout.",
      },
    ],
    scenariosToComplete: ["inventory_shortage", "rush_hour"],
    managerChecklist: [
      "Staff member navigated the inventory grid and correctly interpreted all status indicators",
      "Staff member responded to a simulated low-stock alert and suppressed within 60 seconds",
      "Staff member submitted a reorder via the distributor portal with correct quantity",
      "Staff member received a simulated shipment and logged it without discrepancy",
      "Staff member reviewed and adjusted 1 threshold based on consumption data",
    ],
    completionRequirements:
      "Complete all 5 training modules. Complete Inventory Shortage Recovery and High-Volume Rush Hour scenarios. Pass the inventory accuracy simulation (95% required). Receive manager sign-off.",
  },

  {
    role: "cashier",
    roleTitle: "Cashier",
    overview:
      "The Cashier role is the financial endpoint of every Axiom OS guest interaction. Accuracy, speed, and a clear handoff to the loyalty communication system are the three pillars of the role. A well-executed checkout turns a transaction into a return visit — the loyalty points communication and receipt delivery are the moments that make the difference.",
    responsibilities: [
      "Process payments accurately and efficiently — verify tab totals before confirming every transaction",
      "Handle all payment methods: card (Stripe), cash, loyalty credits, and split payment",
      "Deliver receipts via guest's preferred channel — email, SMS, print, or QR code — after every checkout",
      "Communicate loyalty points earned after every transaction",
      "Escalate tab disputes immediately — never make manual adjustments to tab totals independently",
      "Keep the payment terminal area clean, organized, and operationally ready at all times",
    ],
    systemInstructions: [
      {
        step: "1", title: "Tab Review Before Checkout",
        detail: "Open the guest's tab and tap Review. Verify: all items are present, quantities are correct, and no unauthorized additions exist. Read the total aloud to the guest before initiating payment. This one step eliminates the majority of post-payment disputes.",
      },
      {
        step: "2", title: "Payment Method Processing",
        detail: "Checkout → Select Payment Method. Card: tap Stripe Card → complete terminal flow → confirm. Cash: enter cash amount received → system calculates change → confirm. Loyalty Credits: verify guest balance is sufficient → confirm redemption → loyalty system deducts automatically. Split: enter split amounts manually → process each portion → confirm full total.",
        tip: "For split payments, always confirm the split breakdown with the guest before processing the first payment. Partial payment reversals require manager involvement.",
      },
      {
        step: "3", title: "Receipt Delivery",
        detail: "After payment confirmation: Receipt Delivery modal appears automatically. Options: Email (enter/confirm address), SMS (enter/confirm phone), Print (sends to nearest receipt printer), QR Code (generates a token the guest can scan anytime). Ask the guest their preference. If they decline all options, tap 'No Receipt' to close the modal — this is logged.",
      },
      {
        step: "4", title: "Loyalty Points Communication",
        detail: "The checkout summary screen shows points earned for this transaction. Tell the guest: 'You've earned [X] points tonight — your balance is now [Y].' If they're close to a reward milestone: 'You're [Z] away from [reward name].' This communication is the single highest-return action in the cashier role for repeat visits.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Confirming payment without reading the total aloud first",
        recovery: "If the guest disputes the total after payment, do not make adjustments — escalate to floor manager immediately with the transaction ID visible on screen.",
      },
      {
        mistake: "Processing split payment without confirming the breakdown first",
        recovery: "If an incorrect split is processed, escalate to floor manager for adjustment. Do not attempt to reverse individual split charges independently.",
      },
      {
        mistake: "Skipping loyalty communication at checkout",
        recovery: "If you forget, mention it before the guest leaves: 'By the way, you earned [X] points tonight — they're already in your account.' The window is open while the guest is physically at the station.",
      },
    ],
    scenariosToComplete: ["rewards_issue", "rush_hour"],
    managerChecklist: [
      "Staff member reviewed tab correctly before every observed checkout",
      "Staff member processed all 4 payment methods at least once",
      "Staff member completed receipt delivery on every observed transaction",
      "Staff member communicated loyalty points correctly after every checkout",
      "Staff member escalated 1 simulated dispute correctly without making independent adjustments",
    ],
    completionRequirements:
      "Complete all 4 training modules. Complete Rewards Redemption Issue and Rush Hour scenarios. Achieve 100% tab review compliance in observed sessions. Receive manager sign-off.",
  },
];

export default MANUALS;

export function getManual(role: string): RoleManual | undefined {
  return MANUALS.find((m) => m.role === role);
}
