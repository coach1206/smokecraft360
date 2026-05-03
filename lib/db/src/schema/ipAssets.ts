/**
 * ipAssetsTable — owner-only IP evidence vault.
 *
 * Brief IP=1 (surgical slice in SmokeCraft): a single super_admin-only
 * registry for intellectual-property assets (specs, designs, code drops,
 * trademarks, etc) used as legal evidence of authorship + chain of custody.
 *
 * `fileUrl` points to externally-hosted evidence (Cloudinary / object
 * storage / git commit URL). `fileHash` is a caller-supplied SHA-256 used
 * to prove the artifact has not been altered since registration.
 *
 * Soft-delete via `retiredAt` so prior registrations remain auditable.
 */

import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const IP_ASSET_KINDS = [
  "spec", "design", "code", "trademark", "doc", "other",
] as const;
export type IpAssetKind = typeof IP_ASSET_KINDS[number];

export const IP_ASSET_STATUSES = [
  "draft", "registered", "disputed", "retired",
] as const;
export type IpAssetStatus = typeof IP_ASSET_STATUSES[number];

export const ipAssetsTable = pgTable("ip_assets", {
  id:            uuid("id").primaryKey().defaultRandom(),
  title:         text("title").notNull(),
  kind:          text("kind").notNull().$type<IpAssetKind>(),
  description:   text("description"),
  /** External URL where the asset bytes live (Cloudinary / git / etc). Optional. */
  fileUrl:       text("file_url"),
  /** SHA-256 (or similar) hex digest of the asset bytes — caller-supplied. */
  fileHash:      text("file_hash"),
  /** Free-form authorship attribution (e.g. "SmokeCraft Inc, 2026"). */
  authorship:    text("authorship"),
  status:        text("status").notNull().default("draft").$type<IpAssetStatus>(),
  registeredAt:  timestamp("registered_at", { withTimezone: true }),
  registeredBy:  uuid("registered_by"),
  notes:         text("notes"),
  retiredAt:     timestamp("retired_at", { withTimezone: true }),
  createdBy:     uuid("created_by").notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  statusIdx: index("ip_assets_status_idx").on(t.status),
  kindIdx:   index("ip_assets_kind_idx").on(t.kind),
}));

export type DbIpAsset = typeof ipAssetsTable.$inferSelect;
