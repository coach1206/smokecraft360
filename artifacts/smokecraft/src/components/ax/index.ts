/**
 * NOVEE OS shared component library.
 * Import all shared primitives from here — never from individual files.
 *
 * Phase 1 / Step 1 of 10 — Universal Design System + Component Library
 */

// ── Primitive surfaces ────────────────────────────────────────────────────────
export { AxCard }          from "./AxCard";
export { AxKpi }           from "./AxKpi";
export { AxBadge, statusVariant } from "./AxBadge";
export { AxStatusDot }     from "./AxStatusDot";

// ── State / feedback ──────────────────────────────────────────────────────────
export { AxEmptyState }    from "./AxEmptyState";
export { AxLoadingState }  from "./AxLoadingState";

// ── Typography / structure ────────────────────────────────────────────────────
export { AxSectionHeader } from "./AxSectionHeader";

// ── Data display ──────────────────────────────────────────────────────────────
export { AxTable }         from "./AxTable";
export type { AxTableColumn } from "./AxTable";

// ── Forms ─────────────────────────────────────────────────────────────────────
export { AxInput, AxTextarea } from "./AxInput";

// ── Media ─────────────────────────────────────────────────────────────────────
export { AxImageCard }     from "./AxImageCard";

// ── Layout ────────────────────────────────────────────────────────────────────
export { AxLayout }        from "./AxLayout";
export type { AxLayoutTab } from "./AxLayout";

// ── NOVEE OS Core components ──────────────────────────────────────────────
export { Pulse }            from "./Pulse";
export { HandoffContainer } from "./HandoffContainer";
