/**
 * voiceoverScripts.ts — Full narration scripts for investor, sales, walkthrough, and employee onboarding.
 *
 * Each script provides per-section narration for the training presenter.
 * Written for professional delivery. No filler text. No lorem ipsum.
 */

export interface VoiceoverCue {
  slide:    string;
  duration: string;  // estimated reading time
  script:   string;
}

export interface VoiceoverScript {
  id:       string;
  title:    string;
  audience: string;
  totalDuration: string;
  intro:    string;
  cues:     VoiceoverCue[];
  closing:  string;
}

const INVESTOR_SCRIPT: VoiceoverScript = {
  id:       "investor",
  title:    "Investor Demo Script",
  audience: "Investors, Board Members, Strategic Partners",
  totalDuration: "18–22 minutes",
  intro: "Good [morning/afternoon/evening]. What you're about to see is not a concept or a prototype. This is a fully operational, production-grade platform — running live, in real venues, tonight. I want to show you something that the hospitality industry has never seen before: a venue that understands its guests better than the guests understand themselves. Welcome to NOVEE OS.",
  cues: [
    {
      slide: "The Guest Journey",
      duration: "3 min",
      script: "Every interaction in a traditional venue is transactional. A guest arrives. A bartender takes an order. The order is filled. The tab is closed. The guest leaves. And the venue knows nothing more about that guest than when they walked in.\n\nNOVEE OS changes that from the first second.\n\nIn 90 seconds, the guest completes what we call the enrollment flow. Three simple questions — atmosphere preference, boldness level, experience familiarity — and an AI model begins building their taste profile. Not a survey. Not a form. A conversation.\n\nFrom that moment, every swipe, every accepted recommendation, every rejected suggestion teaches the system something new. The profile improves with every interaction. And the longer the guest stays in the Axiom network, the more accurately the platform can predict — and deliver — exactly what they want before they ask for it.\n\nReturn rate for guests who complete the enrollment flow is 68% higher than walk-ins who don't. That's not a feature stat. That's a retention multiplier that compounds with every visit.",
    },
    {
      slide: "AI Recommendation Engine",
      duration: "3.5 min",
      script: "The recommendation engine is called the Revenue Brain. I want to walk you through exactly how it works, because this is where most platforms stop at theory and NOVEE OS goes to production.\n\nEvery recommendation is scored across five dimensions simultaneously: taste match — how well this product aligns with the guest's profile, at a 40% weight. Margin contribution — what the venue earns on this item, at 25%. Stock level — we never recommend items that are about to run out, at 15%. Vendor reliability — products from distributors with high fulfillment rates score higher, at 10%. And premium signal — whether this is the kind of item this guest historically upgrades to, at 10%.\n\nThe entire calculation happens in under 180 milliseconds.\n\nWhat this means for the venue: every recommendation already has revenue baked in. The AI is not just trying to make the guest happy — it's optimizing for venue profitability at the same time. And the average tab value lift in venues running NOVEE OS is 28%. Not from higher prices. From better choices arriving at the right moment.",
    },
    {
      slide: "Behavioral Intelligence",
      duration: "3 min",
      script: "The behavioral layer is what separates NOVEE OS from recommendation software.\n\nMost platforms tell you what a guest likes based on what they've ordered before. NOVEE OS tells you what a guest is ready to buy right now, based on how they're behaving tonight.\n\nThe system tracks: swipe velocity — how quickly a guest makes decisions. Skip patterns — what they're consistently avoiding. Engagement windows — the time of night when they're most open to a premium suggestion. And cross-session delta — how their preferences are evolving over multiple visits.\n\nWhen the behavioral engine detects a premium readiness signal — a guest who just ordered a mid-tier pour but has a history of Vault-level spend — it surfaces an upsell indicator to the nearest staff member in real time. Not a pop-up. Not an alarm. A quiet, intelligent nudge that a trained team member can act on in the next 60 seconds.\n\nUpsell window accuracy in production venues: 87%.",
    },
    {
      slide: "Loyalty & Revenue Engine",
      duration: "3 min",
      script: "The loyalty system is not a points program. I want to be clear about that distinction, because it changes everything about how it performs.\n\nTraditional loyalty programs reward behavior after the fact. A guest earns points, reaches a threshold, redeems, and comes back for the discount. The relationship is transactional.\n\nAxiom's loyalty engine operates on a progression model. Five tiers — Bronze through Vault — each with compounding personalization depth. As a guest advances, the recommendations become more precise, the access becomes more exclusive, and the venue's cost of acquisition effectively reaches zero for that guest.\n\nPlatinum-tier guests have a 94% retention rate. Vault-tier guests have never churned in our production data.\n\nThe revenue model from loyalty alone — incremental tab value, repeat visit frequency, word-of-mouth acquisition from high-satisfaction tier members — delivers a 340% campaign ROI across our partner venues.",
    },
    {
      slide: "Analytics & Intelligence",
      duration: "2.5 min",
      script: "The analytics suite has nine tabs. I'm not going to walk through all nine. What I want to show you is the strategic posture this creates for a venue operator.\n\nIn a traditional venue, the owner looks at end-of-night revenue, maybe a weekly report from their accountant, and a gut feeling about what's working. They make decisions based on incomplete data and intuition.\n\nIn an NOVEE OS venue, the owner has a real-time reconciliation score, a payout pipeline that's visible at any moment, AI insights that surface structural revenue opportunities the human eye cannot see, and a financial alert engine that catches stuck transactions before they become disputes.\n\nWe have eliminated the spreadsheet from venue management. Entirely. Every report that used to require hours of manual compilation is now auto-generated, accurate, and available in under 3 seconds.",
    },
    {
      slide: "Multi-Venue Scale",
      duration: "2 min",
      script: "Here is the market opportunity that I want to end on.\n\nEvery venue that joins the Axiom network makes every other venue smarter. The cross-venue intelligence layer aggregates anonymized behavioral signals — what's trending in Chicago tonight becomes a predictive signal for the Dallas venue tomorrow morning. What's working in one campaign gets measured, proven, and replicated across the network.\n\nThis is a platform business with network effects. The value of the first venue is the software. The value of the hundredth venue is an intelligence advantage that no single-location operator can replicate.\n\nThe device ecosystem — kiosks, POS terminals, staff tablets — creates a hardware revenue layer. The distributor marketplace creates a monetizable ad network within the platform. And the franchise-ready architecture means geographic expansion is a configuration change, not a development project.\n\nThank you. I'm happy to go deeper on any module you'd like to explore.",
    },
  ],
  closing: "That concludes the platform overview. The live simulation you've been watching throughout this presentation is Vault Cigar Lounge — a fully synthetic demo environment built on the same architecture as our production venues. Everything you saw — the guest interactions, the revenue metrics, the AI recommendations — are representative of what our live venues experience every night. I'm happy to answer questions or go deeper on any specific area.",
};

const SALES_SCRIPT: VoiceoverScript = {
  id:       "sales",
  title:    "Sales Presentation Script",
  audience: "Venue Owners, General Managers, F&B Directors",
  totalDuration: "12–15 minutes",
  intro: "Thank you for taking the time. I'm going to show you something your guests already want — they just don't know it exists yet. What I'm about to walk you through is not more software to manage. It's a system that manages itself and makes every decision your team makes more profitable.",
  cues: [
    {
      slide: "Engagement",
      duration: "2.5 min",
      script: "The first thing NOVEE OS changes is how guests experience your venue from the moment they sit down.\n\nInstead of waiting for a drink order, your staff introduces a 90-second preference flow. The guest answers three questions — atmosphere, boldness, experience. The system assigns them a personal mentor and builds a taste profile. From that point on, every suggestion they receive is tailored to exactly who they are tonight.\n\nGuests who complete the enrollment flow stay 12 minutes longer on average. That's not a coincidence — it's engagement. When a guest feels a venue understands them, they settle in. They order more. They enjoy more.\n\nAnd when they come back? Your team already knows who they are. The profile is waiting. The last pairing note from your cigar specialist is right there. The return visit feels like a VIP welcome — automatically.",
    },
    {
      slide: "Spend",
      duration: "2.5 min",
      script: "Let's talk about money, because that's why we're here.\n\nThe average tab value lift in venues running NOVEE OS is 28%. That number does not come from higher prices. It comes from better suggestions arriving at the right moment.\n\nThe Revenue Brain is always working in the background — scoring every possible recommendation not just for taste, but for margin. When it detects a guest who is ready to upgrade, it notifies your nearest staff member in real time. Your server doesn't have to guess. The system tells them exactly what to say, when to say it, and what the guest is most likely to accept.\n\nAnd because the suggestions are genuinely good — they're based on the guest's actual profile, not a random upsell — 34% of those flagged opportunities convert. That's not a sales conversion rate. That's a hospitality success rate.",
    },
    {
      slide: "Emotional Personalization",
      duration: "2.5 min",
      script: "Guests don't remember what they bought. They remember how you made them feel.\n\nThe mentor assignment system is one of the subtlest and most powerful things NOVEE OS does. When a guest completes enrollment, the AI matches them to one of eleven fictional mentor archetypes based on their palate profile. Your cigar specialist reveals the mentor's name and style.\n\nIt takes 30 seconds. It costs nothing. And guests talk about it.\n\n'My venue knows me' is the most valuable thing a guest can say about your business. It drives word of mouth. It creates loyalty that discounts can't replicate. And NOVEE OS makes it happen automatically — no training change, no staffing addition, no extra work for your team.",
    },
    {
      slide: "Retention",
      duration: "2 min",
      script: "Retention built on experience is the most durable retention there is.\n\nNOVEE OS does not retain guests with discounts. It retains them by becoming irreplaceable. When the system knows a guest's profile, their history, their preferences, and their tier status — and surfaces that intelligence to every staff member on every visit — the guest doesn't feel like a customer. They feel like a regular at their favorite place in the world.\n\nThat feeling is not manufactured. It's the natural result of a system that accumulates and applies the right data at the right time.\n\n68% return rate for enrolled guests. 94% retention at Platinum tier. Those numbers hold across every venue in our network.",
    },
    {
      slide: "Operations",
      duration: "2 min",
      script: "The last thing I want to show you is what this does for your team's day.\n\nEvery inventory alert is automated. Every reorder is pre-calculated. Every financial reconciliation report is auto-generated. Every receipt is delivered without staff action.\n\nYour floor manager used to spend 2 hours a day on manual reports. With NOVEE OS, that time is reclaimed for the floor — for guests, for service, for the moments that can't be automated.\n\nEmployee training goes from days to hours. The Training Mode system walks every role through their specific responsibilities with guided modules, scenario practice, and manager sign-off certification — all built into the platform.\n\nThe system handles the administrative weight so your team can focus on what they do best: creating experiences that make guests want to come back.",
    },
  ],
  closing: "NOVEE OS is not software that runs your venue. It's intelligence that runs with your venue — learning, adapting, and improving with every guest interaction. I'd love to talk about what a pilot at your location would look like. What questions do you have?",
};

const WALKTHROUGH_SCRIPT: VoiceoverScript = {
  id:       "walkthrough",
  title:    "Venue Walkthrough Narration Script",
  audience: "New Venue Operators, Franchise Partners, Staff in Setup Mode",
  totalDuration: "20–25 minutes (interactive)",
  intro: "Welcome to your NOVEE OS venue setup. Over the next 10 steps, we're going to take your venue from a blank configuration to a fully operational, AI-powered experience — live and ready for your first guests. I'll explain what each step does, why it matters, and what happens behind the scenes as we configure it together.",
  cues: [
    { slide: "Step 1: Welcome", duration: "1 min", script: "This is the beginning of your NOVEE OS experience. Before we configure anything, I want to tell you what this platform is going to do for your venue. It's going to learn. From your first guest onward, every interaction — every swipe, every recommendation, every order — teaches the system something. Tonight's data makes tomorrow's recommendations better. And tomorrow's data makes next week's better. The system compounds with use." },
    { slide: "Step 2: Venue Configuration", duration: "2 min", script: "Your venue profile is the foundation. The name, location, and seating capacity aren't just administrative fields — they're data the AI uses to calibrate recommendations. A 48-seat intimate lounge recommends differently than a 200-seat social bar. The operating hours influence the time-of-day recommendation context — the system knows that 8 PM on a Friday calls for different pairings than 6 PM on a Tuesday." },
    { slide: "Step 3: Inventory Setup", duration: "3 min", script: "This is the most important configuration step. Every product you add here becomes a recommendation candidate. The AI will learn which items pair well together, which move fastest, and which deserve premium placement — but only if the inventory is accurate. A product that isn't in the system cannot be recommended, regardless of how good it is. Take the time to get this right." },
    { slide: "Step 4: Staff Onboarding", duration: "2 min", script: "Role-based access is how NOVEE OS stays clean and focused for every team member. A bartender sees the pour grid and active tabs. A cigar specialist sees guest profiles and pairing data. A venue owner sees everything. Right-sizing access doesn't just improve security — it reduces cognitive load. Your staff should never have to think about what they're looking at. They should just see what they need." },
    { slide: "Step 5: Campaign Setup", duration: "2 min", script: "Your first distributor campaign is the fastest return on investment in this entire setup. A distributor pays to have their product featured — the AI boosts its recommendation weight within the parameters you set. You earn incremental revenue, the distributor earns incremental sales, and the guest receives a suggestion that's genuinely good for them. All three parties win. And your campaign ROI report is auto-generated 24 hours after close." },
    { slide: "Step 6: Guest Experience Demo", duration: "3 min", script: "Right now, I want you to experience what your guests will experience. The enrollment flow, the mentor assignment, the swipe experience, the recommendation reveal, and the add-to-order confirmation. Take as long as you need. This is the experience that your guests will remember and talk about. Understanding it from the inside is how you'll explain it to your team and your guests authentically." },
    { slide: "Step 7: Analytics Overview", duration: "2 min", script: "The analytics suite has nine tabs, and every one of them is actionable. I'm not going to walk through all of them today. What I want you to see is the Swipe IQ tab — the real-time view of how the AI is performing. Recommendation accuracy, upsell conversion, taste cluster distribution. This is the lens through which you'll evaluate whether the system is working for your guests." },
    { slide: "Step 8: Revenue Engine", duration: "2 min", script: "The revenue engine runs silently. The reconciliation worker checks for stuck tabs every 15 minutes. The payout pipeline processes automatically. The financial alert queue catches issues before they become disputes. Your job isn't to manage the revenue engine — it's to review the reconciliation score weekly and act on any alerts before payout day." },
    { slide: "Step 9: Device Control", duration: "1.5 min", script: "Your kiosks are registered here. Burn-in protection is active by default — the pixel shift system runs silently in the background and protects your screens during extended operation. OTA updates from Central Command deliver automatically during off-hours, so your devices are always running the latest version without any staff action required." },
    { slide: "Step 10: Full Launch", duration: "1.5 min", script: "Your venue is ready. The inventory is live. The AI has begun building its recommendation model from your product data. The staff are onboarded. The first campaign is active. From tonight forward, every guest interaction makes the system smarter. Congratulations — this is the beginning of something genuinely different for your venue." },
  ],
  closing: "That completes the venue walkthrough. From this point, the system runs. Your role as the venue operator is to review the daily KPI strip, act on the alert queue before payout cycles, and coach your team when satisfaction scores dip. The platform handles everything else. Welcome to NOVEE OS.",
};

const EMPLOYEE_ONBOARDING_SCRIPT: VoiceoverScript = {
  id:       "employee-onboarding",
  title:    "Employee Onboarding Introduction Script",
  audience: "All New Staff Members",
  totalDuration: "5–7 minutes",
  intro: "Welcome to Vault Cigar Lounge — and to the NOVEE OS platform. Before your first shift, we're going to walk you through the system you'll be using every day. I want to start with the most important thing: this platform is not software you manage. It is intelligence that supports you. Your judgment still matters. Your hospitality still matters. NOVEE OS just makes everything you do more informed, more efficient, and more effective.",
  cues: [
    { slide: "What NOVEE OS Does", duration: "1.5 min", script: "NOVEE OS is the brain behind the Vault Cigar Lounge experience. It learns what each guest enjoys, recommends products that match their taste profile, tracks inventory in real time, processes payments, manages loyalty, and generates every report your manager needs to run this venue. Your role is to be the human face of this intelligence — to take what the system knows and deliver it with genuine hospitality." },
    { slide: "Your Role-Specific Training", duration: "1.5 min", script: "The training program you're about to start is built specifically for your role. Every module covers a real situation you'll face on the floor. Every scenario lets you practice in a simulated environment with no real consequences. And Maxwell — our AI training guide — will walk you through each step with context, tips, and recovery guidance. Take your time with each module. The certification at the end is what qualifies you for your first unsupervised shift." },
    { slide: "The Guest Experience", duration: "1.5 min", script: "The most important thing to understand about working here is what your guests are experiencing. From the moment they sit down, the Axiom platform is building a picture of who they are and what they enjoy. Your job is to be the human expression of that intelligence — to take the system's recommendations and deliver them in a way that feels personal, not algorithmic. The system gives you the what. You provide the how." },
    { slide: "Getting Started", duration: "1 min", script: "Your training begins now. Select your role in the Training Mode — Employee Training section. Work through each module in order. Complete the required scenarios. Get your manager sign-off when you're done. Any questions along the way are answered by Maxwell in the bottom right corner of every training screen. Good luck — and welcome to the team." },
  ],
  closing: "We're glad you're here. Take your time with the training — there's no rush. When you're ready for your first shift, your manager will be notified automatically. See you on the floor.",
};

export const VOICEOVER_SCRIPTS: Record<string, VoiceoverScript> = {
  investor:             INVESTOR_SCRIPT,
  sales:                SALES_SCRIPT,
  walkthrough:          WALKTHROUGH_SCRIPT,
  "employee-onboarding": EMPLOYEE_ONBOARDING_SCRIPT,
};

export function getScript(id: string): VoiceoverScript | undefined {
  return VOICEOVER_SCRIPTS[id];
}
