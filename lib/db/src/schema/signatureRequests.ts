/**
 * signatureRequests — user-submitted signature cigar concepts for manufacturer fulfillment.
 *
 * Status flow:  draft → submitted → review → approved → production
 *
 * bandDesign and cigarSpec are stored as serialized JSON strings.
 */

import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const SIGNATURE_STATUSES = [
  "draft",
  "submitted",
  "review",
  "approved",
  "production",
  "rejected",
] as const;
export type SignatureStatus = typeof SIGNATURE_STATUSES[number];

export const PRODUCTION_STAGES = [
  "sample-batch",
  "limited-edition",
  "full-production",
] as const;
export type ProductionStage = typeof PRODUCTION_STAGES[number];

export const signatureRequestsTable = pgTable("signature_requests", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull(),
  brandName:       text("brand_name").notNull(),
  bandDesign:      text("band_design").notNull(),
  cigarSpec:       text("cigar_spec").notNull(),
  boxDesign:       text("box_design"),          // JSON – BoxDesign | null
  description:     text("description"),
  status:          text("status").notNull().default("draft").$type<SignatureStatus>(),
  productionStage: text("production_stage").$type<ProductionStage>(),
  manufacturerId:  uuid("manufacturer_id"),
  adminNotes:      text("admin_notes"),
  rejectedReason:  text("rejected_reason"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export type SignatureRequest = typeof signatureRequestsTable.$inferSelect;

// ── Shared type-only definitions (used by API routes directly via zod) ─────────

export type BandDesign = {
  template:     "classic-gold" | "modern-minimal" | "vintage-cuban" | "luxury-black";
  primaryColor: string;
  accentColor:  string;
  fontStyle:    "serif" | "sans" | "italic";
  emblem:       string;
  brandName:    string;
};

export type CigarSpec = {
  strength:         number;
  flavorDirection:  Array<"sweet" | "bold" | "spicy" | "creamy" | "earthy" | "floral">;
  wrapperType:      "claro" | "natural" | "colorado" | "colorado-maduro" | "maduro";
  preferredPairing?: string;
};

export type BoxDesign = {
  boxColor:          string;   // hex / named color
  logoPlacement:     "top-center" | "top-left" | "side-panel";
  labelText:         string;   // short text on box lid
  limitedEditionName: string;  // e.g. "Reserve No. 1"
  finishStyle:       "matte" | "gloss" | "embossed";
};
