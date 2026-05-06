/**
 * Axiom360 — AXIOM 360 Experience OS
 * Route: /
 *
 * Renders the HandoffContainer which manages Patron ↔ Staff mode switching:
 *   - PatronView: 4 luxury craft cards with Hardware-First styling
 *   - Hidden trigger: 3-second invisible long-press on top-center
 *   - The Handoff: OverrideFlash → StaffPanel slides in (sliding-metal animation)
 *   - StaffPanel: chrome grid with 9 navigation items
 *
 * All state is managed by useAxiom360 (Zustand, localStorage-persisted).
 * Design tokens, grain texture, and card-recessed shadows live in index.css.
 */

import { HandoffContainer } from "@/components/ax/HandoffContainer";

export default function Axiom360() {
  return <HandoffContainer />;
}
