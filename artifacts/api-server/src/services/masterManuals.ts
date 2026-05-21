export interface ManualSection {
  id: string;
  title: string;
  content: string;
}

export interface Manual {
  id: string;
  title: string;
  version: string;
  category: string;
  description: string;
  lastUpdated: string;
  sections: ManualSection[];
}

export const MASTER_MANUALS: Manual[] = [
  {
    id: "novee-master-ops",
    title: "NOVEE OS Master Operations Manual",
    version: "2.4.0",
    category: "platform",
    description: "Complete operational guide for the NOVEE OS hospitality intelligence platform.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "platform-overview",
        title: "Platform Overview",
        content: `NOVEE OS is a luxury hospitality intelligence operating system designed for premium cigar lounges, spirits bars, and experiential venues. The platform unifies guest experience management, AI-powered recommendations, inventory intelligence, staff training, and revenue analytics into a single touchscreen-native interface.

Core modules: CraftHub (guest session management), E.A.T. Intel (revenue and sales intelligence), Command Center (operations control), Coach Help (AI staff assistance), Pairing Engine (cross-category recommendations), and the Progression System (guest loyalty and gamification).

The platform supports multiple craft modules: SmokeCraft 360 (cigar), PourCraft (spirits), WineCraft (wine), and BeerCraft (brewing). Each module is genre-isolated with no cross-contamination of terminology or assets.`,
      },
      {
        id: "daily-startup",
        title: "Daily Startup Procedure",
        content: `Complete startup sequence for NOVEE OS:
1. Power on the kiosk hardware. Allow 60 seconds for full boot.
2. Verify the NOVEE OS splash screen appears. If the screen is blank, check network connection and restart the workflow via device management.
3. Navigate to Settings > Device to confirm: Heartbeat Active, Cloudinary Connected, ElevenLabs Streaming Active, Stripe Live Mode.
4. Load the E.A.T. Intel dashboard and confirm today's inventory sync completed (green status indicator).
5. Verify the humidor readings are within target range (65–70% RH, 65–68°F).
6. Check the Notifications panel for any unread alerts from overnight reconciliation.
7. Confirm the staff PIN is active and the session timeout is set appropriately for today's shift.`,
      },
      {
        id: "user-roles",
        title: "User Role Hierarchy",
        content: `NOVEE OS supports four access tiers:
- Guest: Access to CraftHub, SmokeCraft/PourCraft/WineCraft/BeerCraft sessions, Pairing Engine, My Profile. No PIN required.
- Staff: All guest access plus E.A.T. Intel, Lounge Controls, Coach Help advanced features. Requires 4-digit staff PIN.
- Management: All staff access plus Command Center, Financial Reconciliation, Inventory Management, User Administration. Requires management PIN.
- Founder/Developer: Full system access including system diagnostics, feature flags, and kill switches. Requires Founder PIN.

PIN management: Change staff PINs monthly. Store PINs only in the encrypted PIN vault — never in plain text. Maximum 5 failed attempts triggers automatic lockout for 15 minutes.`,
      },
      {
        id: "session-management",
        title: "Session Management",
        content: `Guest sessions follow this lifecycle:
1. Enrollment: Guest completes the 3-question onboarding flow (atmosphere, boldness, experience level).
2. Mentor Assignment: AI assigns one of the four mentors based on palate profile.
3. Active Session: Guest progresses through the 7-phase experience.
4. Pairing: Pairing Engine activates at the flavor profile phase.
5. Order Confirmation: Add-to-Order creates a 15-minute inventory reservation.
6. Session Completion: Legacy Reserve badge minted, XP awarded, receipt generated.
7. Return Visit: "RETURNING?" flow restores session via firstName + last-4 digits.

Session timeout: 30 minutes of inactivity triggers a confirmation prompt. After 15 additional minutes without response, session is auto-reset to CraftHub with guest data preserved in sessionStorage.`,
      },
      {
        id: "troubleshooting",
        title: "Common Troubleshooting",
        content: `Frequent issues and resolutions:
Blank screen on startup: Check browser console for service worker errors. Navigate to Settings > Device > Clear Cache. If unresolved, force-reload and reselect the NOVEE OS artifact from the preview dropdown.

Session not restoring: Verify sessionStorage is not cleared (private/incognito mode disables it). Guest must be on same device and browser.

ElevenLabs TTS silent: Check ElevenLabs TTS status in Settings > Audio. If "Disconnected," verify API connectivity. Voice will fall back silently — no error shown to guest.

Inventory count mismatch: Check active reservations in E.A.T. Intel > Inventory. Reservations expire after 15 minutes. Run a manual inventory sync from Command Center.

PIN gate not opening: Ensure the staff PIN was set during venue setup. Default: no PIN set. Access Settings > Security to configure.`,
      },
    ],
  },
  {
    id: "smokecraft-experience",
    title: "SmokeCraft 360 Experience Manual",
    version: "3.1.0",
    category: "craft",
    description: "Complete guide to the SmokeCraft 360 premium cigar experience module.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "experience-architecture",
        title: "7-Phase Experience Architecture",
        content: `SmokeCraft 360 delivers a structured 7-phase luxury cigar experience:
Phase 1 — Orientation Chamber (CraftHub): Golden Box disclosure, mentor portfolio, session initiation.
Phase 2 — Sensory Awakening: Leaf origins, terroir introduction, first environmental calibration.
Phase 3 — Leaf Composition Lab: Seco/Viso/Ligero ratio sliders, blend architecture, real-time scoring.
Phase 4 — Flavor Architecture: Primary flavor profile selection (earthy/sweet/spicy/woody/creamy).
Phase 5 — Strength & Body Matrix: Boldness tier (Mild/Medium/Full) and ring gauge preference.
Phase 6 — Atmosphere Calibration: Mood selection and time-of-day context adjustment.
Phase 7 — Blend Composition Review: Full session summary, pairing endorsement, add-to-order confirmation.
Legacy Reserve: Achievement badge mint, XP award, receipt generation.`,
      },
      {
        id: "mentor-system",
        title: "Mentor Assignment System",
        content: `Four digital mentors guide the SmokeCraft experience:
- DOÑA ROSA (Wrapper Artistry, Jalapa Valley Nicaragua): Assigned to wrapper-forward profiles — Maduro, Connecticut, guests selecting flavor-forward or creamy preferences.
- MAESTRO CRUZ (Filler Architecture, Santiago Dominican Republic): Assigned to ligero-heavy or high-strength profile selections.
- SENSEI HIROSHI (Binder Selection, Danlí Honduras): Assigned to medium-body, binder-dominant, or balanced profiles.
- MAESTRÍA VALDEZ (Vintage Curating, Vuelta Abajo Cuba): Assigned to aged, vintage, or premium tier selections.

Mentor assignment triggers at enrollment completion. The mentor remains constant for the session. Staff can manually reassign mentors via E.A.T. Intel > Sessions > [Session ID] > Edit Mentor.`,
      },
      {
        id: "golden-box",
        title: "Golden Box Challenge System",
        content: `The Golden Box is the competitive achievement engine of SmokeCraft 360. Six tiers of progression:
1. Apprentice (0 XP): Entry level. Access to basic challenges.
2. Artisan (500 XP): Unlocks rare blend previews.
3. Master (1,500 XP): Access to VIP pairing events and limited allocations.
4. Grand Master (3,500 XP): Recognition on the Lounge League leaderboard.
5. Sovereign (7,000 XP): Priority allocation access and personal sommelier consultation.
6. Legendary (15,000 XP): Lifetime membership status, private events, and the Legendary badge.

XP is earned through: session completion (50 XP), pairing completion (25 XP), quiz completion (15 XP per quiz), challenge completion (100–500 XP based on difficulty), and staff recognition awards (variable).`,
      },
      {
        id: "pairing-engine",
        title: "Pairing Engine Reference",
        content: `The SmokeCraft Pairing Engine presents 6 curated categories:
1. Trending: Real-time venue bestsellers from live inventory.
2. VIP Pairings: Premium and reserved items for high-tier guests.
3. Rare Reserve: Low-stock premium items. Limited visibility creates urgency.
4. Seasonal: Time-of-day and seasonal context adjusted pairings.
5. Lounge Favorites: Venue-curated top recommendations.
6. Staff Picks: Staff-flagged premium suggestions.

The "PAIR WITH MY PROFILE" AI feature generates personalized pairings using the guest's flavor affinity vector. Each pairing card shows: product name, price, flavor bridge note, and stock status. Out-of-stock items are automatically hidden.`,
      },
    ],
  },
  {
    id: "pourcraft-manual",
    title: "PourCraft 360 Manual",
    version: "1.8.0",
    category: "craft",
    description: "High-end spirits curation, master mixology, and spirit aging intelligence.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "spirits-catalog",
        title: "Premium Spirits Catalog Management",
        content: `PourCraft 360 manages your premium spirits inventory with crystal-clear visibility. Categories: Bourbon & American Whiskey, Scotch & Irish Whiskey, Tequila & Mezcal, Cognac & Armagnac, Rum & Aged Spirits, Gin & Vodka, Liqueurs & Digestifs.

Catalog management: Use Command Center > Inventory > PourCraft to add, edit, or retire spirits. Each entry requires: name, distillery, ABV, tasting notes, suggested pairing, cost price, and retail price. Set minimum stock levels to trigger reorder alerts automatically.

Featured selections: Mark up to 6 items as "Featured" per shift. Featured items appear first in the PourCraft recommendation carousel and receive AI recommendation priority. Rotate featured items based on margin optimization guidance from E.A.T. Intel.`,
      },
      {
        id: "cocktail-intelligence",
        title: "Cocktail Intelligence & Custom Builds",
        content: `PourCraft supports bespoke cocktail creation with revenue intelligence:
Menu building: Upload your cocktail menu to PourCraft with recipe components, cost per serve, and retail price. The system automatically calculates margin percentage and highlights high-margin opportunities.

Dynamic suggestions: Based on the guest's flavor profile, PourCraft suggests cocktails that match their taste preferences. Example: A guest preferring "sweet and creamy" profiles receives suggestions for White Russians, Espresso Martinis, and Irish Coffee.

Staff script: "Based on your preference for [flavor profile], I think you'll love our [cocktail name]. It was crafted by our head bartender specifically for guests who appreciate [matching descriptor]."`,
      },
    ],
  },
  {
    id: "winecraft-manual",
    title: "WineCraft 360 Manual",
    version: "1.5.0",
    category: "craft",
    description: "Sommelier curation, cellar inventory, and vintage comparison intelligence.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "cellar-management",
        title: "Cellar Management SOPs",
        content: `WineCraft 360 cellar management requirements:
Temperature: Red wines 55–65°F (13–18°C). White wines 45–55°F (7–13°C). Sparkling wines 40–45°F (4–7°C). Never store wine above 70°F — accelerates aging and causes irreversible damage.
Humidity: 50–80% RH. Below 50% dries corks, allowing oxidation. Above 80% promotes mold.
Light: UV light degrades wine. Cellar must be dark or use UV-filtered lighting only.
Vibration: Store bottles horizontally, undisturbed. No cellar near HVAC equipment or high-traffic areas.
Rotation: FIFO for non-vintage wines. Vintage bottles catalogued by year. Log every bottle movement in WineCraft system.`,
      },
      {
        id: "vintage-assessment",
        title: "Vintage Assessment & Valuation",
        content: `Vintage assessment for premium bottles:
Sommelier evaluation checklist:
1. Verify the vintage year against the label (no alteration, no fading beyond expected aging).
2. Check ullage (fill level). Ideal: into neck. Low shoulder indicates potential oxidation.
3. Inspect cork condition (if available). Mold on the cork exterior is normal. Mold on the wine side is a fault indicator.
4. Check capsule and label integrity. Premium bottles command premium condition.
5. Taste assessment: Color (brick/orange indicates age), aroma (complex dried fruit, earth, leather in aged reds), palate (tannins should be resolved in old bottles).

Pricing guidance: Reference Wine-Searcher Pro for current market valuations. Add 15–25% to market average for in-venue service premium.`,
      },
    ],
  },
  {
    id: "brewcraft-manual",
    title: "BeerCraft 360 Manual",
    version: "1.3.0",
    category: "craft",
    description: "Artisanal craft brewing, taproom management, and draft system intelligence.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "draft-system",
        title: "Draft System Management",
        content: `BeerCraft 360 draft system operations:
Daily cleaning: Flush tap lines with clean water between kegs. Full line cleaning with brewery-approved sanitizer every 2 weeks.
Pressure settings: Lagers: 10–12 PSI at 38°F. Ales: 8–10 PSI at 42°F. Stouts (nitrogen): 25–30 PSI with 75% N2/25% CO2 blend.
Pour quality: Perfect pour takes 90–120 seconds for a 16oz pour. 45° tilt to start, straighten at 2/3 fill, finish with head. Head should be 1–1.5 inches.
Temperature alert: If keg temperature rises above 42°F, close the tap and contact maintenance. Warm beer is unsellable.
Line fault: If a tap pulls foam only, check CO2 pressure, check keg connection, check for ice in the line. Do not serve until resolved.`,
      },
      {
        id: "rotation-strategy",
        title: "Tap Rotation & Curation Strategy",
        content: `BeerCraft 360 tap curation for maximum revenue:
Rotation cadence: Rotate at minimum one tap per week to maintain guest interest. Flag rotation events in the BeerCraft dashboard for staff briefing.
Anchor taps: 2–3 permanent anchors (highest-volume, consistent sellers) should never rotate. These form the backbone of the tap program.
Seasonal allocation: Reserve 2 taps for seasonal releases. These drive conversation, social media, and incremental visits.
Margin optimization: Use E.A.T. Intel to identify which taps are generating the highest margin per pour. Promote these proactively.
Guest education: Use BeerCraft's style guide cards (printed from the system) to educate guests on new taps. Educated guests order more deliberately and at higher price points.`,
      },
    ],
  },
  {
    id: "eat-system-ops",
    title: "E.A.T. System Operations Manual",
    version: "2.2.0",
    category: "operations",
    description: "Complete operations manual for the E.A.T. point-of-sale and revenue intelligence system.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "pos-operations",
        title: "POS Daily Operations",
        content: `E.A.T. System daily operations checklist:
Opening:
□ Log in with staff PIN.
□ Verify inventory sync completed (green indicator on E.A.T. Intel dashboard).
□ Confirm Stripe is in Live Mode — never process payments in Test Mode during service.
□ Review the Reorder Alert queue. Place urgent orders before service begins.
□ Confirm tab management settings: table assignments, server assignments.

During Service:
□ Process all orders through the POS — no cash transactions outside the system.
□ Cart lock activates automatically during payment processing. Do not attempt to modify cart.
□ Inventory decrements on payment success, restores on failure or refund.
□ Reward points credit automatically — do not manually add.

Closing:
□ Ensure all open tabs are closed or transferred before end of shift.
□ Review the daily reconciliation report in Financial Reconciliation.
□ Export the daily transaction log from Command Center for recordkeeping.`,
      },
      {
        id: "payment-handling",
        title: "Payment Processing & Error Recovery",
        content: `E.A.T. payment state machine:
States: idle → processing → success | failure | timeout

Recovery procedures:
Payment failure: System automatically restores inventory reservations and unlocks the cart. Retry the payment. If three consecutive failures, escalate to manager — potential Stripe configuration issue.

Duplicate charge risk: The system prevents double-clicks during processing. If a guest reports a duplicate charge, check payment_events log in Financial Reconciliation. Do NOT re-process until confirmed no duplicate.

Refunds: Only Manager and above roles can initiate refunds. Navigate to E.A.T. Intel > Transactions > [Transaction ID] > Issue Refund. Inventory is restored automatically on refund completion.

Webhook failures: If Stripe webhooks fail, the reconciliation worker flags them within 15 minutes. Check Alert Queue in Financial Reconciliation dashboard.`,
      },
      {
        id: "inventory-management",
        title: "Inventory Management & Reorder Intelligence",
        content: `E.A.T. inventory management:
Stock tracking: All products are tracked at SKU level. Inventory decrements on cart-add (reservation) and finalizes on payment success. Reservations expire after 15 minutes if payment is not completed.

Reorder thresholds: Set par levels per product in Command Center > Inventory > [Product] > Edit. System generates reorder alerts when quantity falls below par level.

Manual adjustments: Role-gated. Staff may adjust count with reason code. Manager approval required for adjustments >10 units. All adjustments are logged with timestamp, user, reason, and quantity delta.

Stock variance report: Run weekly from Command Center > Reports > Inventory Variance. Variance >5% requires investigation and manager sign-off.

Vendor contacts: Stored in Command Center > Vendor Directory. Primary and backup contacts per vendor. Emergency same-day reorder contact flagged in red.`,
      },
    ],
  },
  {
    id: "command-hub-admin",
    title: "Command Hub Administrator Manual",
    version: "2.0.0",
    category: "admin",
    description: "Complete guide for venue administrators and Command Center operations.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "admin-access",
        title: "Administrator Access & Permissions",
        content: `Command Hub access requires management-tier PIN. The Command Hub provides:
- Venue Configuration: Branding, operating hours, lounge layout, ambient settings.
- Staff Management: Add/remove staff, assign roles, set PINs, view performance metrics.
- Inventory Control: Full inventory oversight, reorder management, vendor directory.
- Financial Reconciliation: Transaction review, alert management, payout status.
- Feature Flags: Enable/disable platform features per venue requirements.
- Device Management: Kiosk status, heartbeat monitoring, OTA update control.
- Document Control: Publish SOPs, training materials, and compliance acknowledgments.

Security note: Management PINs must be changed every 90 days. PIN sharing is a violation of operational policy and must be addressed through HR protocols.`,
      },
      {
        id: "venue-config",
        title: "Venue Configuration Guide",
        content: `Venue configuration options in Command Hub:
Branding: Upload venue logo (SVG or PNG, minimum 512x512). Set venue name as it appears on receipts and guest-facing screens. Choose accent color (default: Gold #D4AF37).

Operating environment: Set timezone, operating hours, and closed dates. The AI recommendation engine uses time-of-day context — accurate timezone is critical for correct suggestions.

Lounge layout: Use the drag-and-drop venue editor to map tables, assign numbers, and set section assignments. Table numbers must match physical signage.

Featured selections: Configure up to 6 featured products per craft module per shift. Featured products appear first in recommendation carousels.

Ambient settings: Connect to compatible lighting and audio systems. Set mood presets (Jazz Mode, VIP Mode, After Hours, etc.) that sync across devices.`,
      },
      {
        id: "financial-reconciliation",
        title: "Financial Reconciliation Procedures",
        content: `The Financial Reconciliation dashboard runs automated checks every 15 minutes:
Reconciliation score 0–100: Green (80+), Amber (60–79), Red (<60).
Alert types:
- Stuck authorized tabs (>2 hours pending): Requires manual review and payment completion or void.
- Orphan open tabs (>72 hours): Auto-escalated to manager. Must be closed or documented.
- Webhook failures: Stripe event not acknowledged. Check Stripe dashboard and retry.
- Failed payouts: Investigate banking connection. Contact Stripe support if unresolved >24h.

Manual reconciliation run: Command Center > Financial > Run Reconciliation. Allow 30 seconds for completion.

End-of-day procedure: All tabs must be closed before daily report export. Download daily transaction CSV from Command Center > Reports > Daily Summary.`,
      },
    ],
  },
  {
    id: "staff-training",
    title: "Staff Training & Certification Manual",
    version: "1.9.0",
    category: "training",
    description: "Comprehensive staff onboarding, training modules, and certification progression.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "onboarding-sequence",
        title: "New Staff Onboarding Sequence",
        content: `All new staff must complete the following sequence before unsupervised service:
Day 1 (Orientation):
□ Platform orientation — guided walkthrough of NOVEE OS by manager.
□ Guest interaction standards review.
□ PIN setup and security policy acknowledgment.
□ Health & safety briefing.
□ Complete Module 1: Platform Basics (see certifications below).

Week 1:
□ Shadow minimum 2 full service shifts.
□ Complete Module 2: Cigar Education Fundamentals.
□ Complete Module 3: Spirits & Pairing Basics.
□ Pass Module 1 & 2 certification quizzes (minimum 80% score).

Week 2:
□ Complete Module 4: Guest Psychology & Sales.
□ Complete supervised solo service session.
□ Complete Module 3 & 4 certification quizzes.
□ Manager sign-off on service readiness.`,
      },
      {
        id: "certification-tracks",
        title: "Certification Tracks & Requirements",
        content: `Staff certification tracks:
Tier 1 — Platform Certified: 
Required: Module 1 (Platform Basics), Module 2 (Cigar Fundamentals). 
Assessment: 2 quizzes, minimum 80% each. 
Validity: 12 months.

Tier 2 — Hospitality Specialist:
Required: Tier 1 + Module 3 (Spirits & Pairing) + Module 4 (Guest Psychology).
Assessment: 4 quizzes + role-play assessment with manager.
Validity: 12 months.

Tier 3 — Senior Specialist:
Required: Tier 2 + Module 5 (Revenue Intelligence) + Module 6 (Conflict Recovery) + 3 months documented service.
Assessment: Full knowledge exam + manager review.
Validity: 12 months. Recognition: Senior badge on platform profile.

Tier 4 — Venue Trainer:
Required: Tier 3 + Module 7 (Trainer Certification) + demonstrated ability to coach junior staff.
Assessment: Training session delivery + written assessment.
Authority: May certify Tier 1 and Tier 2 candidates.`,
      },
      {
        id: "training-modules",
        title: "Training Module Reference",
        content: `Complete training module library:
Module 1: Platform Basics — NOVEE OS navigation, session management, PIN security, troubleshooting basics. (45 min)
Module 2: Cigar Education Fundamentals — Wrapper varieties, filler architecture, regions, cutting, relighting, humidor basics. (90 min)
Module 3: Spirits & Pairing Basics — Whiskey science, bourbon pairing, proof education, responsible service. (60 min)
Module 4: Guest Psychology & Sales — VIP handling, first-timer coaching, non-pushy upselling, table pacing. (75 min)
Module 5: Revenue Intelligence — E.A.T. system, attachment selling, premium conversion, shift metrics. (60 min)
Module 6: Conflict Recovery — Intoxication management, complaint recovery, de-escalation, authority tiers. (45 min)
Module 7: Trainer Certification — Adult learning principles, knowledge transfer, assessment design. (120 min)
Module 8: AI Coach Help Usage — Using AI Coach for real-time guidance, document search, live suggestions. (30 min)
Access all modules in Settings > Knowledge Center > Staff Training.`,
      },
    ],
  },
  {
    id: "ai-coach-knowledge",
    title: "AI Coach Help Knowledge Manual",
    version: "1.0.0",
    category: "ai",
    description: "How the AI Coach system works, its capabilities, and usage guidelines for staff.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "how-ai-coach-works",
        title: "How AI Coach Works",
        content: `The AI Coach Help system is a real-time hospitality intelligence assistant powered by OpenAI GPT-5.4 with enterprise safety guardrails. It combines:
1. Knowledge Base: A curated library of 25+ knowledge chunks covering 8 hospitality domains.
2. Master Manuals: 10 operational manuals totaling hundreds of indexed sections.
3. Role-Aware Context: Responses are personalized to your staff role (bartender, tobacconist, server, manager, etc.).
4. Document Search: Semantic search across all indexed materials with source citation.
5. Confidence Scoring: Every AI response includes a confidence score. Responses below 0.6 confidence include a disclaimer.

The AI Coach answers questions like:
- "How do I relight a cigar properly?"
- "What bourbon pairs with a Maduro?"
- "How do I handle an upset VIP guest?"
- "What's the pre-shift humidor checklist?"`,
      },
      {
        id: "ai-safety",
        title: "AI Safety & Validation Rules",
        content: `The AI Coach applies the following safety rules:
Prevented outputs:
- Specific inventory counts or availability (always check E.A.T. system for real-time data)
- Medical advice about nicotine, alcohol, or health effects beyond standard responsible service
- Pricing information (always check current menu in E.A.T. system)
- Fabricated products or brands not in the knowledge base

Confidence scoring: Responses include a 0–1 confidence score. Below 0.6 = low confidence disclaimer shown. Below 0.4 = response suppressed, local fallback knowledge provided.

Hallucination protection: The AI is grounded on internal manuals and knowledge chunks. All citations reference specific sections. If the AI cannot find relevant internal knowledge, it explicitly acknowledges the knowledge gap.

Audit logging: All AI Coach queries are logged (question, role, response confidence, provider used) for quality review. Accessible in Command Center > AI Coach Audit Log.`,
      },
      {
        id: "best-practices",
        title: "AI Coach Best Practices for Staff",
        content: `Getting the best results from AI Coach:
Good questions:
- Specific: "A guest is smoking a Connecticut and wants a single malt pairing" (better than "what goes with cigars?")
- Role-appropriate: The AI knows your role — use it. Ask from your operational perspective.
- Situational: Include context. "A first-time smoker on an empty stomach wants a recommendation."

What AI Coach does NOT replace:
- Real-time inventory data (always check E.A.T.)
- Manager authority decisions (comps, refunds, large adjustments)
- Your own professional judgment in the room
- Personalized guest history (check the guest profile in the system)

Feedback: If the AI provides an incorrect or unhelpful response, tap the thumbs-down icon to log feedback. This improves future responses. Do not act on clearly incorrect AI guidance — verify with your manager.`,
      },
    ],
  },
  {
    id: "enterprise-installation",
    title: "Enterprise Installation & Hardware Manual",
    version: "1.2.0",
    category: "technical",
    description: "Hardware requirements, installation procedures, and device configuration for enterprise deployments.",
    lastUpdated: "2026-05",
    sections: [
      {
        id: "hardware-requirements",
        title: "Hardware Requirements",
        content: `Minimum hardware specification for SmokeCraft 360 / NOVEE OS kiosk deployment:
Primary Kiosk:
- Display: 1920x1080 capacitive touchscreen, minimum 27" diagonal. Commercial-grade preferred.
- Processor: Intel Core i7 (10th gen+) or equivalent AMD. 8 cores recommended for smooth animations.
- RAM: 16GB minimum. 32GB recommended for venues running all four craft modules.
- Storage: 256GB SSD minimum. NVMe preferred for fast boot.
- Network: Gigabit Ethernet (primary) + WiFi 6 (backup). Never deploy on WiFi-only.
- OS: Windows 11 Pro (kiosk mode) or commercial Chrome OS device.
- Browser: Chrome 120+ or Chromium-based. Safari is NOT supported for kiosk deployment.

Recommended peripherals:
- Receipt printer: Star TSP143IV (USB or LAN)
- NFC reader: ACR1252U for contactless payment
- Ambient lighting controller: Casambi CBU-ASD (Bluetooth mesh)`,
      },
      {
        id: "network-config",
        title: "Network Configuration",
        content: `Network requirements for NOVEE OS deployment:
Bandwidth: Minimum 25 Mbps dedicated up/down per kiosk. 100 Mbps recommended.
Latency: <50ms to regional API server. >100ms will cause visible UI lag on animations.
Firewall rules (outbound): Allow HTTPS (443) to:
- api.elevenlabs.io (TTS audio streaming)
- api.openai.com (AI Coach intelligence)
- api.cloudinary.com (image assets)
- api.stripe.com (payment processing)
- *.replit.app (platform hosting)
Port 5432 must be open to database server IP on internal network.

DNS: Use Google 8.8.8.8 or Cloudflare 1.1.1.1. Avoid ISP-provided DNS for stability.
VLAN: Place kiosks on isolated VLAN from general venue WiFi. Prevents bandwidth contention and improves security.
VPN: Not required for standard deployment. Contact enterprise support for air-gapped installation requirements.`,
      },
      {
        id: "kiosk-hardening",
        title: "Kiosk Security Hardening",
        content: `Kiosk security hardening checklist:
OS Level:
□ Enable automatic Windows/Chrome OS updates.
□ Disable all USB ports except receipt printer (use USB port blocker).
□ Enable BitLocker/disk encryption.
□ Remove all non-essential software.
□ Set BIOS password and disable boot from USB.
□ Configure automatic screen lock after 5 minutes of inactivity.

Browser Level:
□ Run Chrome in kiosk mode: chrome.exe --kiosk --disable-extensions [URL]
□ Disable developer tools (F12) via Group Policy or Chrome Enterprise.
□ Block all external URLs except the NOVEE OS domain.
□ Enable Chrome's built-in site isolation.

Application Level:
□ Pixel-shift burn-in protection is enabled by default in NOVEE OS.
□ Set session timeout to 30 minutes in Settings > Session.
□ Enable inactivity guard.
□ Disable guest mode in Chrome settings.

Network:
□ Configure firewall to whitelist only required outbound connections.
□ Block all inbound connections to kiosk IP.
□ Enable logging on firewall for kiosk VLAN.`,
      },
    ],
  },
];

export function getManual(id: string): Manual | undefined {
  return MASTER_MANUALS.find(m => m.id === id);
}

export function getManualsByCategory(category: string): Manual[] {
  return MASTER_MANUALS.filter(m => m.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(MASTER_MANUALS.map(m => m.category))];
}
