import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const trainingCertificationsTable = pgTable("training_certifications", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id"),
  guestId:   uuid("guest_id"),
  certId:    text("cert_id").notNull().unique(),  // "bartender-axiom-2025"
  role:      text("role"),
  mode:      text("mode").notNull(),
  title:     text("title").notNull(),
  score:     integer("score").notNull().default(0),
  issuedAt:  timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (t) => ({
  byUser: index("tc_user_idx").on(t.userId),
  byCert: index("tc_cert_idx").on(t.certId),
}));

export type TrainingCertification       = typeof trainingCertificationsTable.$inferSelect;
export type InsertTrainingCertification = typeof trainingCertificationsTable.$inferInsert;
