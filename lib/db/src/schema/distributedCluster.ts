/**
 * distributedCluster — tables for multi-node cluster coordination.
 *
 * Tables:
 *   cluster_nodes          — node registry + heartbeat tracking
 *   distributed_locks      — Postgres-backed advisory locks
 *   distributed_work_items — claim-based distributed work queue
 *   replay_jobs            — distributed replay job tracking
 *   replay_audit_log       — immutable forensic replay trail
 *   rollout_configs        — staged feature rollout targeting
 *   payment_audit_log      — SHA-256 chain payment audit
 *   cognition_decisions    — AI decision trail for forensics
 *   replay_archive         — long-term archival of completed replays
 *   operational_snapshots  — periodic state snapshots for fast replay
 */

import {
  pgTable, uuid, text, integer, boolean, real,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Cluster membership ───────────────────────────────────────────────────────

export const clusterNodesTable = pgTable("cluster_nodes", {
  nodeId:       text("node_id").primaryKey(),
  hostname:     text("hostname").notNull(),
  pid:          integer("pid").notNull(),
  role:         text("role").notNull().default("worker"),   // worker | leader | standby
  status:       text("status").notNull().default("active"), // active | draining | dead
  startedAt:    timestamp("started_at", { withTimezone: true }).defaultNow(),
  lastSeen:     timestamp("last_seen",  { withTimezone: true }).defaultNow(),
  capabilities: jsonb("capabilities").$type<string[]>().default([]),
  metadata:     jsonb("metadata").$type<Record<string, unknown>>().default({}),
}, t => [
  index("cn_role_idx").on(t.role),
  index("cn_last_seen_idx").on(t.lastSeen),
  index("cn_status_idx").on(t.status),
]);

// ─── Distributed locks ────────────────────────────────────────────────────────

export const distributedLocksTable = pgTable("distributed_locks", {
  lockKey:    text("lock_key").primaryKey(),
  holderId:   text("holder_id").notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).defaultNow(),
  expiresAt:  timestamp("expires_at",  { withTimezone: true }).notNull(),
}, t => [
  index("dl_holder_idx").on(t.holderId),
  index("dl_expires_idx").on(t.expiresAt),
]);

// ─── Distributed work queue ────────────────────────────────────────────────────

export const distributedWorkItemsTable = pgTable("distributed_work_items", {
  itemId:         uuid("item_id").primaryKey().defaultRandom(),
  queueName:      text("queue_name").notNull(),
  priority:       text("priority").notNull().default("normal"),
  priorityOrder:  integer("priority_order").notNull().default(2),
  payload:        jsonb("payload").$type<unknown>().notNull(),
  status:         text("status").notNull().default("pending"),
  claimedBy:      text("claimed_by"),
  claimedAt:      timestamp("claimed_at",      { withTimezone: true }),
  claimExpiresAt: timestamp("claim_expires_at",{ withTimezone: true }),
  attempts:       integer("attempts").notNull().default(0),
  maxAttempts:    integer("max_attempts").notNull().default(3),
  lastError:      text("last_error"),
  enqueuedAt:     timestamp("enqueued_at",  { withTimezone: true }).defaultNow(),
  completedAt:    timestamp("completed_at", { withTimezone: true }),
  expiresAt:      timestamp("expires_at",   { withTimezone: true }),
  dedupeKey:      text("dedupe_key"),
}, t => [
  index("dwi_queue_status_idx").on(t.queueName, t.status),
  index("dwi_priority_idx").on(t.priorityOrder, t.enqueuedAt),
  index("dwi_claim_expires_idx").on(t.claimExpiresAt),
  index("dwi_dedupe_idx").on(t.queueName, t.dedupeKey),
]);

// ─── Replay jobs ──────────────────────────────────────────────────────────────

export const replayJobsTable = pgTable("replay_jobs", {
  replayId:    uuid("replay_id").primaryKey().defaultRandom(),
  replayType:  text("replay_type").notNull(),
  entityId:    text("entity_id").notNull(),
  ownerId:     text("owner_id"),
  status:      text("status").notNull().default("pending"),
  progress:    integer("progress").notNull().default(0),
  fromTs:      timestamp("from_ts",      { withTimezone: true }),
  toTs:        timestamp("to_ts",        { withTimezone: true }),
  error:       text("error"),
  startedAt:   timestamp("started_at",   { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt:   timestamp("updated_at",   { withTimezone: true }).defaultNow(),
  createdAt:   timestamp("created_at",   { withTimezone: true }).defaultNow(),
}, t => [
  index("rj_status_idx").on(t.status),
  index("rj_entity_idx").on(t.entityId),
  index("rj_owner_idx").on(t.ownerId),
  index("rj_created_idx").on(t.createdAt),
]);

// ─── Replay audit log ──────────────────────────────────────────────────────────

export const replayAuditLogTable = pgTable("replay_audit_log", {
  id:          uuid("id").primaryKey().defaultRandom(),
  replayId:    uuid("replay_id").notNull(),
  replayType:  text("replay_type").notNull(),
  entityId:    text("entity_id").notNull(),
  triggeredBy: text("triggered_by").notNull(),
  nodeId:      text("node_id").notNull(),
  action:      text("action").notNull(),
  metadata:    jsonb("metadata").$type<Record<string, unknown>>().default({}),
  loggedAt:    timestamp("logged_at", { withTimezone: true }).defaultNow(),
}, t => [
  index("ral_replay_idx").on(t.replayId),
  index("ral_entity_idx").on(t.entityId),
  index("ral_action_idx").on(t.action),
]);

// ─── Rollout configs ──────────────────────────────────────────────────────────

export const rolloutConfigsTable = pgTable("rollout_configs", {
  featureKey:  text("feature_key").primaryKey(),
  strategy:    text("strategy").notNull(),
  percentage:  real("percentage"),
  allowlist:   jsonb("allowlist").$type<string[]>(),
  denylist:    jsonb("denylist").$type<string[]>(),
  ring:        integer("ring"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  description: text("description").notNull().default(""),
  enabled:     boolean("enabled").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
}, t => [
  index("rc_enabled_idx").on(t.enabled),
]);

// ─── Payment audit log ────────────────────────────────────────────────────────

export const paymentAuditLogTable = pgTable("payment_audit_log", {
  id:          uuid("id").primaryKey().defaultRandom(),
  paymentId:   text("payment_id").notNull(),
  venueId:     uuid("venue_id"),
  action:      text("action").notNull(),
  actorId:     text("actor_id").notNull(),
  actorRole:   text("actor_role").notNull(),
  amountCents: integer("amount_cents"),
  metadata:    jsonb("metadata").$type<Record<string, unknown>>().default({}),
  chainHash:   text("chain_hash").notNull(),
  prevHash:    text("prev_hash").notNull(),
  loggedAt:    timestamp("logged_at", { withTimezone: true }).defaultNow(),
}, t => [
  index("pal_payment_idx").on(t.paymentId),
  index("pal_venue_idx").on(t.venueId),
  index("pal_action_idx").on(t.action),
  index("pal_logged_idx").on(t.loggedAt),
]);

// ─── Cognition decisions ──────────────────────────────────────────────────────

export const cognitionDecisionsTable = pgTable("cognition_decisions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  venueId:      uuid("venue_id"),
  decisionType: text("decision_type").notNull(),
  entityId:     text("entity_id"),
  confidence:   real("confidence"),
  inputs:       jsonb("inputs").$type<Record<string, unknown>>().default({}),
  output:       jsonb("output").$type<Record<string, unknown>>().default({}),
  reasoning:    text("reasoning").notNull().default(""),
  durationMs:   integer("duration_ms").notNull().default(0),
  decidedAt:    timestamp("decided_at", { withTimezone: true }).defaultNow(),
}, t => [
  index("cd_venue_idx").on(t.venueId),
  index("cd_type_idx").on(t.decisionType),
  index("cd_decided_idx").on(t.decidedAt),
]);

// ─── Replay archive ───────────────────────────────────────────────────────────

export const replayArchiveTable = pgTable("replay_archive", {
  archiveId:     uuid("archive_id").primaryKey().defaultRandom(),
  replayId:      uuid("replay_id").notNull().unique(),
  replayType:    text("replay_type").notNull(),
  entityId:      text("entity_id").notNull(),
  completedAt:   timestamp("completed_at", { withTimezone: true }),
  durationMs:    integer("duration_ms"),
  eventCount:    integer("event_count").notNull().default(0),
  auditSnapshot: jsonb("audit_snapshot").$type<unknown[]>().default([]),
  archivedAt:    timestamp("archived_at", { withTimezone: true }).defaultNow(),
}, t => [
  index("ra_replay_idx").on(t.replayId),
  index("ra_entity_idx").on(t.entityId),
  index("ra_archived_idx").on(t.archivedAt),
]);

// ─── Operational snapshots ────────────────────────────────────────────────────

export const operationalSnapshotsTable = pgTable("operational_snapshots", {
  snapshotId:  uuid("snapshot_id").primaryKey().defaultRandom(),
  type:        text("type").notNull(),
  venueId:     uuid("venue_id"),
  data:        jsonb("data").$type<Record<string, unknown>>().notNull(),
  eventCursor: text("event_cursor"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
}, t => [
  index("os_venue_type_idx").on(t.venueId, t.type),
  index("os_created_idx").on(t.createdAt),
]);

// ─── Type exports ─────────────────────────────────────────────────────────────

export type ClusterNode              = typeof clusterNodesTable.$inferSelect;
export type InsertClusterNode        = typeof clusterNodesTable.$inferInsert;
export type DistributedLock          = typeof distributedLocksTable.$inferSelect;
export type InsertDistributedLock    = typeof distributedLocksTable.$inferInsert;
export type DistributedWorkItem      = typeof distributedWorkItemsTable.$inferSelect;
export type InsertDistributedWorkItem= typeof distributedWorkItemsTable.$inferInsert;
export type ReplayJob                = typeof replayJobsTable.$inferSelect;
export type InsertReplayJob          = typeof replayJobsTable.$inferInsert;
export type ReplayAuditLog           = typeof replayAuditLogTable.$inferSelect;
export type InsertReplayAuditLog     = typeof replayAuditLogTable.$inferInsert;
export type RolloutConfig            = typeof rolloutConfigsTable.$inferSelect;
export type InsertRolloutConfig      = typeof rolloutConfigsTable.$inferInsert;
export type PaymentAuditLog          = typeof paymentAuditLogTable.$inferSelect;
export type InsertPaymentAuditLog    = typeof paymentAuditLogTable.$inferInsert;
export type CognitionDecision        = typeof cognitionDecisionsTable.$inferSelect;
export type InsertCognitionDecision  = typeof cognitionDecisionsTable.$inferInsert;
export type ReplayArchive            = typeof replayArchiveTable.$inferSelect;
export type InsertReplayArchive      = typeof replayArchiveTable.$inferInsert;
export type OperationalSnapshot      = typeof operationalSnapshotsTable.$inferSelect;
export type InsertOperationalSnapshot= typeof operationalSnapshotsTable.$inferInsert;
