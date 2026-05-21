/**
 * Offline Resilience Bundle — Integration Kernel
 *
 * Packages Coach Help SOPs, training content from coachKnowledgeBase,
 * pairing guides, and emergency procedures into a single signed JSON
 * payload for client-side caching (localStorage / IndexedDB, 24-hour TTL).
 *
 * Clients fetch GET /api/integration-kernel/offline-bundle once, cache it,
 * and fall back to cached data when the API is unreachable.
 */

import { KNOWLEDGE_BASE } from "../../services/coachKnowledgeBase";
import type { KnowledgeChunk } from "../../services/coachKnowledgeBase";

/* ─── Bundle types ───────────────────────────────────────────────────────────── */

export interface OfflineBundle {
  version:       string;
  generatedAt:   string;
  ttlSeconds:    number;
  training:      KnowledgeChunk[];
  sops:          SopEntry[];
  pairingGuides: PairingGuide[];
  emergencyDocs: EmergencyDoc[];
}

export interface SopEntry {
  id:       string;
  title:    string;
  category: string;
  steps:    string[];
  roles:    string[];
}

export interface PairingGuide {
  id:         string;
  craft:      string;
  name:       string;
  profile:    string;
  pairings:   string[];
  avoidances: string[];
}

export interface EmergencyDoc {
  id:       string;
  title:    string;
  severity: "critical" | "high" | "medium";
  content:  string;
}

/* ─── SOPs ───────────────────────────────────────────────────────────────────── */

const SOPS: SopEntry[] = [
  {
    id: "sop-kiosk-001",
    title: "Kiosk Offline Recovery",
    category: "operations",
    steps: [
      "Verify network cable / Wi-Fi signal strength",
      "Check if API server heartbeat is responding on LAN",
      "Activate offline mode: hold 3-finger press on kiosk for 5 seconds",
      "Process cash-only transactions using paper receipt log",
      "Queue all digital orders — they auto-replay when connectivity restores",
      "Contact venue manager if outage exceeds 15 minutes",
    ],
    roles: ["staff", "manager"],
  },
  {
    id: "sop-pos-001",
    title: "POS Integration Failure Protocol",
    category: "pos",
    steps: [
      "Switch POS mode to offline in Command Hub → POS Settings",
      "Accept manual card entry if terminal supports offline auth codes",
      "Log all transactions in manual override register",
      "Run reconciliation sync immediately upon reconnection",
      "Notify venue_owner of all manually logged transactions",
    ],
    roles: ["staff", "venue_owner", "manager"],
  },
  {
    id: "sop-payment-001",
    title: "Payment Gateway Fallback",
    category: "payment",
    steps: [
      "If Stripe times out, system auto-routes to configured fallback gateway",
      "Verify fallback is active in Integration Infrastructure panel",
      "For persistent failures contact Stripe status page (status.stripe.com)",
      "Enable manual payment mode via Command Hub → Emergency Controls",
      "Document all affected transactions with timestamp and order ID",
    ],
    roles: ["manager", "venue_owner", "admin"],
  },
  {
    id: "sop-inventory-001",
    title: "Low Stock Emergency Procedure",
    category: "inventory",
    steps: [
      "System auto-flags items below 20% stock threshold",
      "Remove item from active swipe deck immediately",
      "Notify tobacconist/bar manager via in-app alert",
      "Check reorder triggers in Inventory module",
      "Update digital menu to reflect current availability",
      "Mark item as Reserve Only for VIP members if partial stock remains",
    ],
    roles: ["staff", "manager", "tobacconist"],
  },
  {
    id: "sop-demo-001",
    title: "Demo Mode Activation",
    category: "access_control",
    steps: [
      "Navigate to Command Hub → Integration Infrastructure → Global Control Center",
      "Select the target venue in Venue Access Controls",
      "Toggle Demo Mode ON and set an expiration date/time",
      "Save — venue will immediately switch to synthetic data mode",
      "Payment processing auto-routes to Stripe test keys in demo mode",
      "Demo mode auto-expires at the configured window with no manual action required",
    ],
    roles: ["admin", "super_admin"],
  },
  {
    id: "sop-revoke-001",
    title: "Remote Credential Revocation",
    category: "access_control",
    steps: [
      "Access Global Control Center as super_admin",
      "Locate venue in Venue Access Control grid",
      "Click REVOKE ACCESS — venue is locked immediately",
      "All API calls from that venue return 403",
      "Revocation is logged in tamper-proof audit trail",
      "Restore by unlocking venue and re-enabling in Venue Access panel",
    ],
    roles: ["super_admin"],
  },
];

/* ─── Pairing guides ─────────────────────────────────────────────────────────── */

const PAIRING_GUIDES: PairingGuide[] = [
  {
    id: "pair-cigar-001",
    craft: "smoke",
    name: "Connecticut Shade + Single Malt",
    profile: "Mild, creamy, cedar-forward",
    pairings: [
      "Speyside Scotch (Glenfarclas 15yr) — complementary vanilla & honey",
      "Cognac VS — enhances cream and dried fruit",
      "Aged Rum (Diplomatico Reserva) — tropical sweetness offsets cedar",
    ],
    avoidances: [
      "Peated Islay Scotch — smoke overpowers the mild wrapper",
      "Dry Champagne — acidity clashes with cream notes",
    ],
  },
  {
    id: "pair-cigar-002",
    craft: "smoke",
    name: "Maduro + Bourbon",
    profile: "Full body, dark chocolate, espresso",
    pairings: [
      "High-rye Bourbon (Bulleit, Four Roses) — spice cuts through richness",
      "Vintage Port (LBV) — amplifies dark fruit and sweetness",
      "Dark Rum (Ron Zacapa 23) — caramel echoes chocolate notes",
    ],
    avoidances: [
      "Light lager — overwhelmed by Maduro body",
      "Pinot Noir — tannins create a harsh metallic finish",
    ],
  },
  {
    id: "pair-cigar-003",
    craft: "smoke",
    name: "Habano Corojo + Añejo Tequila",
    profile: "Spicy, earthy, complex, medium-full",
    pairings: [
      "Añejo Tequila (Fortaleza, Don Julio 1942) — agave earthiness mirrors leaf complexity",
      "Mezcal (single village) — layered smoke amplifies depth",
      "Old Fashioned — sweet bitters balance pepper notes",
    ],
    avoidances: [
      "Blanco Tequila — too sharp and herbaceous",
      "Gin — botanical clash with the spice profile",
    ],
  },
  {
    id: "pair-cigar-004",
    craft: "smoke",
    name: "Cameroon + Cognac",
    profile: "Medium body, earthy sweetness, toothy texture",
    pairings: [
      "VSOP Cognac — honey and dried-fruit tones mirror Cameroon sweetness",
      "Calvados — apple notes complement the earthy character",
      "Aged Armagnac — rustic depth pairs with toothy wrapper texture",
    ],
    avoidances: [
      "Heavy peated whisky — smoke compounds overwhelm sweet earthiness",
      "Tannic red wine — dries out and bitters the palate",
    ],
  },
];

/* ─── Emergency docs ─────────────────────────────────────────────────────────── */

const EMERGENCY_DOCS: EmergencyDoc[] = [
  {
    id: "emrg-001",
    title: "Integration Kernel Emergency Shutdown",
    severity: "critical",
    content: `EMERGENCY SHUTDOWN PROCEDURE:
1. Navigate to Command Hub → Integration Infrastructure → Global Control Center
2. Click EMERGENCY SHUTDOWN (requires double-confirm)
3. All API provider calls are blocked immediately across ALL venues
4. Individual venue locks available via Venue Access Control panel
5. Restore by clicking RESTORE OPERATIONS — requires super_admin authentication
6. All actions written to tamper-proof audit trail
7. Contact infrastructure team if self-service restore fails`,
  },
  {
    id: "emrg-002",
    title: "Demo Mode Isolation Protocol",
    severity: "high",
    content: `DEMO MODE CONTROLS:
- Demo mode isolates venue from production data
- AI recommendations use synthetic seed data only
- Payment processing auto-routes to Stripe test mode
- Demo sessions auto-expire at the configured window
- Extend demos via Global Control Center → Venue Access → Edit
- Production credentials are never accessible in demo mode`,
  },
  {
    id: "emrg-003",
    title: "Venue Credential Revocation",
    severity: "high",
    content: `REMOTE CREDENTIAL REVOCATION:
1. Access Global Control Center as super_admin
2. Locate venue in Venue Access Control grid
3. Click REVOKE ACCESS — this immediately:
   - Disables all API calls for that venue
   - Locks the venue record
   - Logs the revocation with timestamp and actor ID
4. Venue cannot bypass this — all requests return 403
5. To restore: unlock venue and re-enable in Venue Access panel`,
  },
  {
    id: "emrg-004",
    title: "Category-Level API Disable",
    severity: "medium",
    content: `PROVIDER CATEGORY CONTROLS:
- Each of 12 provider categories (AI, POS, Payment, Music, Lighting, Sensor,
  CRM, Booking, Voice, Analytics, Device, Custom) has an independent toggle
- Disabling a category blocks all requests to that category for ALL venues
- Use for: emergency AI cost control, POS maintenance windows, payment provider
  outages, or isolating a specific integration type
- Re-enabling takes effect immediately with no deployment required`,
  },
];

/* ─── Bundle version ─────────────────────────────────────────────────────────── */

const BUNDLE_VERSION = "1.1.0";
const BUNDLE_TTL     = 86_400; // 24 hours

/* ─── Builder ────────────────────────────────────────────────────────────────── */

export function buildOfflineBundle(): OfflineBundle {
  return {
    version:       BUNDLE_VERSION,
    generatedAt:   new Date().toISOString(),
    ttlSeconds:    BUNDLE_TTL,
    training:      KNOWLEDGE_BASE,
    sops:          SOPS,
    pairingGuides: PAIRING_GUIDES,
    emergencyDocs: EMERGENCY_DOCS,
  };
}
