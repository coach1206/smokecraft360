/**
 * CommandHub — NOVEE OS Strategic Command & Audit Engine
 * Authority: Profound Innovations LLC
 * Framework: E.A.T. (Environment · Asset · Transaction)
 *
 * Pure utility module. No React dependencies. Provides:
 *   toggleMode()  — switch between RITUAL and STRATEGIC oversight
 *   runAudit()    — validate E.A.T. ledger integrity
 *   ledgerSummary() — structured data for the oversight panel
 */

import type { EATState } from "@/components/CinematicLanding/EATController";

/* ── Types ───────────────────────────────────────────────────────── */

export type HubMode = "RITUAL" | "STRATEGIC";

export interface HubToggleResult {
  mode:        HubMode;
  accessLevel: "RITUALIST" | "STRATEGIST";
  timestamp:   string;
}

export type AuditLevel = "INFO" | "WARN" | "FAIL";

export interface AuditFinding {
  level:   AuditLevel;
  message: string;
}

export type SystemStatus = "SECURE" | "DEGRADED" | "BREACH";

export interface AuditResult {
  auditPass:      boolean;
  integrityScore: number;        // 0–100
  systemCheck:    SystemStatus;
  branding:       "NOVEE_CERTIFIED" | "UNVERIFIED";
  gateVerified:   boolean;
  findings:       AuditFinding[];
  timestamp:      string;
  authority:      string;
}

export interface LedgerSummary {
  totalEntries:   number;
  stepsCompleted: number[];
  sessionsNamed:  string[];
  elapsedMs:      number | null;
  firstEntry:     string | null;   // ISO timestamp
  lastEntry:      string | null;   // ISO timestamp
}

/* ── CommandHub ──────────────────────────────────────────────────── */

export const CommandHub = {

  /**
   * Toggle between RITUAL and STRATEGIC modes.
   * STRATEGIC mode activates the Command Hub oversight panel.
   */
  toggleMode(currentMode: HubMode): HubToggleResult {
    const nextMode = currentMode === "RITUAL" ? "STRATEGIC" : "RITUAL";
    return {
      mode:        nextMode,
      accessLevel: nextMode === "STRATEGIC" ? "STRATEGIST" : "RITUALIST",
      timestamp:   new Date().toISOString(),
    };
  },

  /**
   * Run a full E.A.T. integrity audit on the current ledger.
   * Checks session ID format, ledger entry completeness,
   * gate-session verification, and environment progression.
   */
  runAudit(eatState: EATState): AuditResult {
    const findings: AuditFinding[] = [];
    let score = 100;

    // Session ID
    if (eatState.sessionId.startsWith("eat-")) {
      findings.push({ level: "INFO", message: `Session ${eatState.sessionId.slice(0, 20)}… — format valid` });
    } else {
      findings.push({ level: "FAIL", message: "Session ID format invalid — expected eat-* prefix" });
      score -= 30;
    }

    // Ledger completeness
    const incompleteEntries = eatState.ledger.filter(
      (e) => !e.session || !e.timestamp || !e.field || !e.value,
    );
    if (incompleteEntries.length > 0) {
      findings.push({ level: "WARN", message: `${incompleteEntries.length} incomplete ledger entr${incompleteEntries.length === 1 ? "y" : "ies"} detected` });
      score -= incompleteEntries.length * 10;
    } else if (eatState.ledger.length > 0) {
      findings.push({ level: "INFO", message: `${eatState.ledger.length} ledger entr${eatState.ledger.length === 1 ? "y" : "ies"} — all complete` });
    } else {
      findings.push({ level: "INFO", message: "Ledger empty — ritual not yet begun" });
    }

    // Gate verification
    const gateVerified =
      typeof localStorage !== "undefined" &&
      !!(localStorage.getItem("axiom_token") || localStorage.getItem("axiom_jwt"));
    if (gateVerified) {
      findings.push({ level: "INFO", message: "Gate session — VERIFIED · authority confirmed" });
    } else {
      findings.push({ level: "WARN", message: "Gate session unverified — PIN validation required" });
      score -= 15;
    }

    // Asset completeness
    const assetKeys = Object.keys(eatState.asset).filter(
      (k) => eatState.asset[k as keyof typeof eatState.asset],
    );
    if (assetKeys.length >= 6) {
      findings.push({ level: "INFO", message: `Asset blueprint — ${assetKeys.length} fields committed` });
    } else if (assetKeys.length > 0) {
      findings.push({ level: "INFO", message: `Asset blueprint — ${assetKeys.length} / 9 fields (ritual in progress)` });
    }

    // Environment progression check
    if (
      eatState.environment.lighting === "neutral" &&
      eatState.environment.ambiance === "neutral" &&
      eatState.ledger.length > 3
    ) {
      findings.push({ level: "WARN", message: "Environment state still neutral after multiple steps" });
      score -= 8;
    }

    const clampedScore = Math.max(0, Math.min(100, score));
    return {
      auditPass:      clampedScore >= 75,
      integrityScore: clampedScore,
      systemCheck:    clampedScore >= 80 ? "SECURE" : clampedScore >= 50 ? "DEGRADED" : "BREACH",
      branding:       "NOVEE_CERTIFIED",
      gateVerified,
      findings,
      timestamp:      new Date().toISOString(),
      authority:      "Profound Innovations",
    };
  },

  /**
   * Derive a structured summary of the E.A.T. ledger
   * for display in the oversight panel.
   */
  ledgerSummary(eatState: EATState): LedgerSummary {
    const entries = eatState.ledger;
    if (entries.length === 0) {
      return { totalEntries: 0, stepsCompleted: [], sessionsNamed: [], elapsedMs: null, firstEntry: null, lastEntry: null };
    }

    const firstTs = entries[0].timestamp;
    const lastTs  = entries[entries.length - 1].timestamp;

    return {
      totalEntries:   entries.length,
      stepsCompleted: [...new Set(entries.map((e) => e.step))].sort((a, b) => a - b),
      sessionsNamed:  [...new Set(entries.map((e) => e.session))],
      elapsedMs:      new Date(lastTs).getTime() - new Date(firstTs).getTime(),
      firstEntry:     firstTs,
      lastEntry:      lastTs,
    };
  },
};
