/**
 * trainingData.ts — Shared fake venue simulation data for Training Mode.
 * "Vault Cigar Lounge" — the canonical demo/training venue.
 *
 * All data is synthetic and isolated from production.
 */

// ── Fake Venue ────────────────────────────────────────────────────────────────

export const DEMO_VENUE = {
  name:      "Vault Cigar Lounge",
  location:  "Chicago, Illinois",
  tier:      "Premiere",
  seats:     48,
  deviceId:  "demo-kiosk-01",
  since:     2019,
  rating:    4.9,
};

// ── Fake Customers ────────────────────────────────────────────────────────────

export const FAKE_CUSTOMERS = [
  { id: "c01", name: "James Whitmore",    tier: "Platinum", spend: 2840, visits: 22, boldness: "bold",    atmosphere: "intimate",  lastVisit: "Tonight" },
  { id: "c02", name: "Elena Vasquez",     tier: "Gold",     spend: 1620, visits: 14, boldness: "mellow",  atmosphere: "social",    lastVisit: "2 days ago" },
  { id: "c03", name: "Marcus Chen",       tier: "Platinum", spend: 4120, visits: 38, boldness: "bold",    atmosphere: "intimate",  lastVisit: "Tonight" },
  { id: "c04", name: "Sophie Harrington", tier: "Silver",   spend: 740,  visits: 6,  boldness: "mild",    atmosphere: "social",    lastVisit: "1 week ago" },
  { id: "c05", name: "David Okafor",      tier: "Gold",     spend: 2100, visits: 19, boldness: "medium",  atmosphere: "intimate",  lastVisit: "Tonight" },
  { id: "c06", name: "Rachel Kim",        tier: "Platinum", spend: 5600, visits: 47, boldness: "bold",    atmosphere: "social",    lastVisit: "Tonight" },
  { id: "c07", name: "Thomas Brennan",    tier: "Silver",   spend: 890,  visits: 8,  boldness: "mellow",  atmosphere: "intimate",  lastVisit: "3 days ago" },
  { id: "c08", name: "Aria Nakamura",     tier: "Gold",     spend: 1890, visits: 16, boldness: "medium",  atmosphere: "social",    lastVisit: "Tonight" },
];

// ── Fake Inventory ────────────────────────────────────────────────────────────

export const FAKE_INVENTORY = [
  { id: "i01", name: "Arturo Fuente Opus X",    category: "smoke", stock: 12,  reorder: 8,   price: 38, trending: true },
  { id: "i02", name: "Padron 1964 Anniversary", category: "smoke", stock: 6,   reorder: 10,  price: 28, trending: false },
  { id: "i03", name: "Macanudo Vintage",         category: "smoke", stock: 3,   reorder: 15,  price: 18, trending: false },
  { id: "i04", name: "Davidoff Grand Cru",       category: "smoke", stock: 18,  reorder: 8,   price: 42, trending: true },
  { id: "i05", name: "Buffalo Trace Bourbon",    category: "pour",  stock: 22,  reorder: 10,  price: 14, trending: true },
  { id: "i06", name: "Pappy Van Winkle 15yr",    category: "pour",  stock: 4,   reorder: 6,   price: 85, trending: false },
  { id: "i07", name: "Macallan 18 Sherry Oak",   category: "pour",  stock: 9,   reorder: 6,   price: 58, trending: true },
  { id: "i08", name: "Hendrick's Gin",           category: "pour",  stock: 14,  reorder: 8,   price: 16, trending: false },
  { id: "i09", name: "Lost Mary 5000 — Mango",   category: "vape",  stock: 28,  reorder: 20,  price: 22, trending: false },
  { id: "i10", name: "Elf Bar BC5000",            category: "vape",  stock: 35,  reorder: 25,  price: 18, trending: true },
];

export const LOW_STOCK = FAKE_INVENTORY.filter((i) => i.stock <= i.reorder);
export const TRENDING  = FAKE_INVENTORY.filter((i) => i.trending);

// ── Fake Orders ───────────────────────────────────────────────────────────────

export const FAKE_ORDERS = [
  { id: "o01", customer: "James Whitmore",    items: ["Arturo Fuente Opus X", "Buffalo Trace Bourbon"], total: 52,  status: "active",    table: 7 },
  { id: "o02", customer: "Marcus Chen",       items: ["Davidoff Grand Cru", "Macallan 18"],             total: 100, status: "active",    table: 12 },
  { id: "o03", customer: "Rachel Kim",        items: ["Padron 1964 Anniversary", "Pappy Van Winkle"],   total: 113, status: "active",    table: 3 },
  { id: "o04", customer: "David Okafor",      items: ["Arturo Fuente Opus X"],                          total: 38,  status: "paid",      table: 9 },
  { id: "o05", customer: "Aria Nakamura",     items: ["Hendrick's Gin", "Elf Bar BC5000"],              total: 34,  status: "active",    table: 5 },
  { id: "o06", customer: "Elena Vasquez",     items: ["Macanudo Vintage", "Buffalo Trace Bourbon"],     total: 32,  status: "preparing", table: 11 },
];

// ── Fake Reservations ─────────────────────────────────────────────────────────

export const FAKE_RESERVATIONS = [
  { id: "r01", guest: "James Whitmore",    time: "8:00 PM",  party: 2, type: "VIP Private Room",     status: "confirmed" },
  { id: "r02", guest: "Thornton Group",    time: "8:30 PM",  party: 6, type: "Corporate Table",      status: "confirmed" },
  { id: "r03", guest: "Sophie Harrington", time: "9:00 PM",  party: 2, type: "Standard Lounge",      status: "confirmed" },
  { id: "r04", guest: "David Okafor",      time: "9:30 PM",  party: 4, type: "Pairing Experience",   status: "pending"   },
  { id: "r05", guest: "Rachel Kim",        time: "10:00 PM", party: 1, type: "Platinum Concierge",   status: "confirmed" },
];

// ── Fake Employees ────────────────────────────────────────────────────────────

export const FAKE_EMPLOYEES = [
  { id: "e01", name: "Carlos Reyes",      role: "Cigar Specialist",  status: "on-shift", rating: 4.9, sessions: 248 },
  { id: "e02", name: "Maya Thompson",     role: "Bartender",          status: "on-shift", rating: 4.8, sessions: 186 },
  { id: "e03", name: "Kai Sorensen",      role: "Floor Manager",      status: "on-shift", rating: 5.0, sessions: 92  },
  { id: "e04", name: "Priya Nair",        role: "Server",             status: "break",    rating: 4.7, sessions: 134 },
  { id: "e05", name: "Josh Delacroix",    role: "Vape Specialist",    status: "on-shift", rating: 4.6, sessions: 67  },
];

// ── Live Event Feed ───────────────────────────────────────────────────────────

export const LIVE_EVENTS = [
  { type: "reservation",   message: "VIP reservation confirmed — Table 7 for James Whitmore",         priority: "high"   },
  { type: "ai",            message: "Pairing confidence increased to 94% — Buffalo Trace + Opus X",   priority: "normal" },
  { type: "inventory",     message: "Macanudo Vintage running low — 3 units remaining",               priority: "warn"   },
  { type: "ai",            message: "Recommendation engine adapted to Marcus Chen's flavor profile",  priority: "normal" },
  { type: "loyalty",       message: "Rachel Kim reached Platinum tier — 5,600 lifetime points",       priority: "high"   },
  { type: "trend",         message: "Buffalo Trace trending tonight — 8 pours in the last hour",      priority: "normal" },
  { type: "order",         message: "Table 12 order confirmed — Davidoff Grand Cru + Macallan 18",    priority: "normal" },
  { type: "ai",            message: "Behavioral intelligence updated — upsell window detected at T9", priority: "normal" },
  { type: "campaign",      message: "Padron brand campaign active — 12% lift in recommendations",     priority: "normal" },
  { type: "inventory",     message: "Pappy Van Winkle 15yr — only 4 bottles remaining in vault",     priority: "warn"   },
  { type: "ai",            message: "Personalization score for tonight: 97/100 — peak engagement",    priority: "high"   },
  { type: "reservation",   message: "Thornton Group corporate table confirmed — 6 guests at 8:30 PM", priority: "high"  },
  { type: "loyalty",       message: "James Whitmore redeemed 250 points — complimentary vintage",     priority: "normal" },
  { type: "ai",            message: "Taste profile updated for Aria Nakamura — floral preference detected", priority: "normal" },
  { type: "order",         message: "Table 3 spend $113 — highest tab of the evening",               priority: "high"   },
  { type: "trend",         message: "Arturo Fuente Opus X sold 4 units in 30 minutes — restocking recommended", priority: "warn" },
  { type: "ai",            message: "Cross-venue intelligence: Davidoff trending in 3 Chicago locations tonight", priority: "normal" },
  { type: "staff",         message: "Carlos Reyes completed 3 expert pairings — guest satisfaction 100%", priority: "normal" },
  { type: "campaign",      message: "Distributor campaign generated $420 in incremental revenue tonight", priority: "high" },
  { type: "ai",            message: "Revenue forecast for tonight: $4,200 — 18% above Tuesday average", priority: "high" },
];

// ── KPI Metrics ───────────────────────────────────────────────────────────────

export const DEMO_KPIS = {
  revenueTonight:      4200,
  revenueMTD:          68400,
  avgTabValue:         82,
  tabsOpen:            6,
  tabsPaid:            14,
  guestSatisfaction:   97,
  aiConfidence:        94,
  loyaltyActiveTonight:8,
  upsellRate:          34,
  pairingAccuracy:     91,
  staffOnShift:        5,
  inventoryAlerts:     2,
};

// ── Training Roles ─────────────────────────────────────────────────────────────

export const TRAINING_ROLES_CONFIG = [
  {
    id: "bartender",
    title: "Bartender",
    subtitle: "Spirits & Pour Craft",
    focus: ["POS workflow", "Pour recommendations", "Pairing suggestions", "Tab management"],
    duration: "45 min",
    modules: 6,
    color: "#60a5fa",
  },
  {
    id: "cigar_specialist",
    title: "Cigar Specialist",
    subtitle: "Smoke Craft Expert",
    focus: ["Flavor profiling", "Strength education", "Customer pairing", "Inventory knowledge"],
    duration: "60 min",
    modules: 8,
    color: "#D48B00",
  },
  {
    id: "vape_specialist",
    title: "Vape Specialist",
    subtitle: "Vape Craft Expert",
    focus: ["Device knowledge", "Flavor profiles", "Customer education", "Compliance"],
    duration: "30 min",
    modules: 4,
    color: "#a78bfa",
  },
  {
    id: "server",
    title: "Server",
    subtitle: "Guest Experience",
    focus: ["Guest interaction", "Order handling", "Upsell technique", "Loyalty system"],
    duration: "40 min",
    modules: 5,
    color: "#34d399",
  },
  {
    id: "floor_manager",
    title: "Floor Manager",
    subtitle: "Operations Lead",
    focus: ["Staff oversight", "Table management", "Revenue monitoring", "Issue resolution"],
    duration: "55 min",
    modules: 7,
    color: "#f59e0b",
  },
  {
    id: "venue_owner",
    title: "Venue Owner",
    subtitle: "Full System Access",
    focus: ["Analytics dashboard", "Campaign management", "Staff management", "Financial overview"],
    duration: "75 min",
    modules: 10,
    color: "#D48B00",
  },
  {
    id: "inventory_manager",
    title: "Inventory Manager",
    subtitle: "Stock & Fulfillment",
    focus: ["Stock levels", "Reorder alerts", "Distributor workflows", "Receiving inventory"],
    duration: "35 min",
    modules: 5,
    color: "#ef4444",
  },
  {
    id: "cashier",
    title: "Cashier",
    subtitle: "Payments & Checkout",
    focus: ["POS checkout", "Payment methods", "Receipt delivery", "Tab management"],
    duration: "25 min",
    modules: 4,
    color: "#06b6d4",
  },
];

// ── Training Scenarios ────────────────────────────────────────────────────────

export const TRAINING_SCENARIOS = [
  {
    id: "first_time_pairing",
    title: "First-Time Guest Pairing",
    subtitle: "Guide a new guest through their first Axiom pairing experience",
    difficulty: "beginner",
    category: "customer",
    estimatedMin: 8,
    steps: [
      { id: "s1", title: "Welcome the guest", description: "Greet the guest and initiate the Axiom enrollment flow from CraftHub.", maxwell: "A warm welcome sets the experience. Tap CraftHub → Enroll to begin the guest flow. The system will guide you through collecting their preferences." },
      { id: "s2", title: "Collect palate preferences", description: "Guide the guest through atmosphere, boldness, and experience preference questions.", maxwell: "Notice how Axiom asks three simple questions — these build the guest's taste profile. Every answer improves future recommendations." },
      { id: "s3", title: "Assign mentor", description: "Review the AI-assigned mentor and confirm with the guest.", maxwell: "The mentor assignment is deterministic — based on palate vectors. Share the mentor's name and style with the guest to personalize the moment." },
      { id: "s4", title: "Launch swipe experience", description: "Start the Universal Swipe Engine for the guest's craft type.", maxwell: "Watch the swipe data feed back into the recommendation engine in real-time. Each swipe refines the guest's profile." },
      { id: "s5", title: "Confirm add-to-order", description: "Help the guest add their top choice to their tab.", maxwell: "The Add-to-Order pipeline auto-reserves inventory for 15 minutes. The stock counter updates in real-time across all devices." },
    ],
  },
  {
    id: "inventory_shortage",
    title: "Inventory Shortage Recovery",
    subtitle: "Handle an unexpected stock shortage without disrupting guest experience",
    difficulty: "intermediate",
    category: "operations",
    estimatedMin: 6,
    steps: [
      { id: "s1", title: "Identify the shortage", description: "Review the inventory alert for Macanudo Vintage — 3 units remaining.", maxwell: "NOVEE flagged this automatically when stock dropped below the reorder threshold. Navigate to Operations → Inventory to see the alert." },
      { id: "s2", title: "Adjust recommendation engine", description: "Temporarily suppress the low-stock item from active recommendations.", maxwell: "In the inventory panel, toggle the 'suppress when low' flag. The AI will immediately route guests toward alternatives with similar profiles." },
      { id: "s3", title: "Notify distributor", description: "Submit a reorder request through the distributor portal.", maxwell: "The reorder workflow auto-fills quantity based on your 30-day average consumption. Confirm and submit — the distributor receives it instantly." },
      { id: "s4", title: "Alert floor staff", description: "Use the staff broadcast to notify cigar specialists of the shortage.", maxwell: "Real-time staff alerts prevent awkward moments when guests ask for unavailable items. A proactive team always wins." },
    ],
  },
  {
    id: "upsell_opportunity",
    title: "Upsell Opportunity",
    subtitle: "Identify and execute a premium upsell at the right moment",
    difficulty: "intermediate",
    category: "revenue",
    estimatedMin: 7,
    steps: [
      { id: "s1", title: "Spot the signal", description: "NOVEE flags Marcus Chen as an upsell candidate based on his spend history and current mood signal.", maxwell: "The behavioral intelligence system identified an upsell window — Marcus ordered a mid-tier pour but his history suggests he prefers premium. Notice the orange indicator on his tab." },
      { id: "s2", title: "Review the recommendation", description: "Open his active tab and see the AI's suggested upsell: Pappy Van Winkle 15yr pairing.", maxwell: "The Revenue Brain scored this pairing 94/100 — high margin, aligned with taste profile, and within his average spend range. Present it naturally." },
      { id: "s3", title: "Present the upgrade", description: "Communicate the upsell as a curated suggestion, not a sale.", maxwell: "Language matters. Try: 'Your cigar's cocoa notes pair beautifully with the Pappy 15 — we have just 4 bottles left tonight.' Exclusivity drives decisions." },
      { id: "s4", title: "Add to tab", description: "Update the tab with the upsell item and confirm the order.", maxwell: "Great. The system logged this upsell as staff-assisted revenue. This data improves the engine's future predictions for similar guests." },
    ],
  },
  {
    id: "vip_handling",
    title: "VIP Guest Handling",
    subtitle: "Deliver a white-glove experience for a Platinum tier guest",
    difficulty: "advanced",
    category: "customer",
    estimatedMin: 10,
    steps: [
      { id: "s1", title: "Review guest history", description: "Access Rachel Kim's full guest profile before she arrives.", maxwell: "Rachel is Platinum tier — 47 visits, 5,600 points, preference for social atmosphere and bold profiles. She'll notice if you remember details from her last visit." },
      { id: "s2", title: "Prepare the table", description: "Pre-configure Table 3 with her known preferences and trigger the VIP environment mode.", maxwell: "The environment engine can adjust lighting mode, ambient music style, and greeting language for known VIP guests. Activate it now from the device control panel." },
      { id: "s3", title: "Greet with context", description: "Welcome Rachel by name and reference her last visit's favorite selection.", maxwell: "Her last pairing was Davidoff Grand Cru + Macallan 18. Mentioning it shows the venue remembers — this is the emotional core of retention." },
      { id: "s4", title: "Offer curated selection", description: "Present tonight's exclusive pairing suggestion based on her evolving profile.", maxwell: "Tonight's AI suggestion: Arturo Fuente Opus X with a Buffalo Trace flight — a bold social pairing that aligns with her pattern. Present it as a personal curation." },
      { id: "s5", title: "Apply loyalty reward", description: "Offer a complimentary item from her loyalty balance as a thank-you for reaching Platinum.", maxwell: "Rachel just crossed 5,000 points — the Platinum milestone. A complimentary vintage cigar as a congratulations gift costs you nothing and creates a story she'll repeat." },
    ],
  },
  {
    id: "distributor_campaign",
    title: "Distributor Campaign Night",
    subtitle: "Activate and manage a live distributor brand campaign",
    difficulty: "intermediate",
    category: "revenue",
    estimatedMin: 8,
    steps: [
      { id: "s1", title: "Activate the campaign", description: "Open the active Padron brand campaign and confirm it's live for tonight.", maxwell: "Distributor campaigns boost recommendation weight for featured products. Padron is running a 12% lift campaign tonight — verify the budget isn't exhausted." },
      { id: "s2", title: "Brief staff", description: "Send a staff notification about tonight's featured brand and talking points.", maxwell: "Staff who know the campaign can reinforce the recommendation naturally. The AI is boosting Padron — your team should know why it's appearing more tonight." },
      { id: "s3", title: "Monitor campaign performance", description: "Track real-time campaign metrics in the Analytics → Campaign tab.", maxwell: "You can see each recommendation that led to a Padron sale. The system logs it as campaign-attributed revenue and reports it to the distributor automatically." },
      { id: "s4", title: "Close campaign and review ROI", description: "At end of night, review the campaign ROI report.", maxwell: "Tonight's Padron campaign generated $420 in incremental revenue. The distributor ROI report is auto-generated — no manual work required. This is the network intelligence layer." },
    ],
  },
  {
    id: "rewards_issue",
    title: "Rewards Redemption Issue",
    subtitle: "Resolve a guest loyalty redemption problem gracefully",
    difficulty: "beginner",
    category: "customer",
    estimatedMin: 5,
    steps: [
      { id: "s1", title: "Identify the issue", description: "A guest's loyalty credit isn't applying at checkout — review the error in the tab.", maxwell: "The most common cause is a cooldown window from a previous redemption within the same session. Check the tab's loyalty section for the cooldown indicator." },
      { id: "s2", title: "Verify eligibility", description: "Confirm the guest's point balance and redemption eligibility status.", maxwell: "The system enforces one redemption per order and a 30-minute cooldown. If the guest redeemed points earlier tonight, the system is protecting against fraud — explain this to them warmly." },
      { id: "s3", title: "Apply manual override", description: "Use manager override to manually apply a complimentary discount as compensation.", maxwell: "As a floor manager, you can apply a one-time complimentary discount outside the loyalty system. This keeps the guest happy while maintaining loyalty integrity." },
    ],
  },
  {
    id: "rush_hour",
    title: "High-Volume Rush Hour",
    subtitle: "Maintain service quality during peak capacity",
    difficulty: "advanced",
    category: "operations",
    estimatedMin: 12,
    steps: [
      { id: "s1", title: "Monitor the floor", description: "Review the Floor Manager dashboard — 6 active tabs, 2 reservations arriving, 1 inventory alert.", maxwell: "The operations dashboard shows everything simultaneously. Priority tonight: Table 9 has been waiting 12 minutes — address this first." },
      { id: "s2", title: "Optimize staff deployment", description: "Reassign Carlos from ambient duty to Table 7 VIP pairing.", maxwell: "The smart deployment system calculates optimal staff placement based on table tier and estimated spend. Follow its suggestion and manually confirm in the staff panel." },
      { id: "s3", title: "Manage the queue", description: "Two walk-ins arrive with no reservation — use the waitlist system.", maxwell: "Add them to the digital waitlist. The system estimates a 22-minute wait based on current tab statuses. Send them a QR code to follow their position in real time." },
      { id: "s4", title: "Handle the inventory alert", description: "The Arturo Fuente Opus X is down to 4 units — suppress from active recommendations.", maxwell: "Quick action prevents overselling. Toggle the suppress flag and the recommendation engine immediately routes new guests toward Davidoff Grand Cru as a comparable alternative." },
      { id: "s5", title: "Close tabs efficiently", description: "Three tables are ready to pay — process through POS without delays.", maxwell: "Use the batch checkout view to see all ready-to-pay tabs simultaneously. The receipt system auto-generates loyalty points and receipt previews. Speed matters during rush." },
    ],
  },
  {
    id: "recommendation_mismatch",
    title: "Recommendation Mismatch Correction",
    subtitle: "Identify and correct a pairing recommendation the guest rejected",
    difficulty: "intermediate",
    category: "ai",
    estimatedMin: 6,
    steps: [
      { id: "s1", title: "Identify the mismatch", description: "A guest swiped SKIP on 5 consecutive recommendations — the AI flags a profile mismatch.", maxwell: "5+ skips in sequence is a strong signal. The behavioral engine detects pattern breaks and surfaces a 'correction needed' indicator in the guest's session view." },
      { id: "s2", title: "Re-engage the guest", description: "Approach the guest and ask a single clarifying question about their preference.", maxwell: "The AI knows what to ask. Navigate to the guest session and tap 'Re-profile' — Maxwell will suggest a conversation starter based on what the swipe data revealed." },
      { id: "s3", title: "Update preference weights", description: "Manually adjust the guest's boldness and atmosphere weights in their profile.", maxwell: "Sometimes a guest discovers something new about themselves during the experience. A manual weight adjustment is legitimate — it teaches the engine faster than swipe data alone." },
      { id: "s4", title: "Validate recovery", description: "Trigger 3 new recommendations and confirm the guest responds positively.", maxwell: "The next 3 recommendations already incorporate the corrected profile. Watch the match confidence — it should jump from below 60% to above 85% after a good correction." },
    ],
  },
];

// ── Maxwell AI Messages ───────────────────────────────────────────────────────

export const MAXWELL_INTROS: Record<string, string> = {
  hub:           "Welcome to NOVEE OS Training Mode. I'm Maxwell — your intelligent guide through this platform. Select a mode to begin.",
  employee:      "Select your role to begin a personalized onboarding experience. Each path is tailored to your specific responsibilities.",
  investor:      "Welcome. I'll guide you through the NOVEE OS platform — from guest intelligence to revenue automation. This is a fully simulated live venue.",
  sales:         "This is Vault Cigar Lounge — a premier venue powered by NOVEE OS. Let me show you what the platform does for venue revenue.",
  walkthrough:   "We'll walk through a complete venue setup from scratch. Follow each step and I'll explain what happens behind the scenes.",
  scenarios:     "Training scenarios simulate real situations you'll encounter on the floor. Choose one to begin — I'll guide you through every step.",
  certifications:"Your training certifications are stored here. Complete a role module or scenario set to earn a certification.",
};

export const MAXWELL_TIPS = [
  "The swipe experience updates the guest's taste profile in real time — every interaction teaches the AI.",
  "Inventory suppression is automatic when stock drops below the reorder threshold.",
  "The Revenue Brain scores every recommendation across taste fit, margin, and stock level simultaneously.",
  "Loyalty points are earned at 1 point per dollar — the engine handles all calculations automatically.",
  "The reconciliation worker runs every 15 minutes to catch stuck tabs and orphan payments.",
  "Maxwell's suggestions are powered by behavioral data from thousands of pairing sessions across the network.",
  "Campaign ROI reports are auto-generated at campaign close — no manual calculations needed.",
  "The cross-venue identity layer recognizes returning guests even at different locations.",
  "The guest progression system has 5 tiers — each tier unlocks different personalization depth.",
  "The offline queue ensures POS transactions sync when connectivity is restored.",
];
