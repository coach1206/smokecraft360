/**
 * session_members — membership rows for multi-user sessions.
 *
 * One row per (sessionId, userId). The (sessionId, userId) pair is
 * uniquely indexed so re-joining the same session is idempotent — the
 * route uses ON CONFLICT to clear leftAt instead of inserting a duplicate.
 *
 * role:
 *   "host"  — created the session; can close it; cannot leave (must close)
 *   "guest" — joined via code; can leave anytime
 *
 * leftAt is nullable; null = currently in the session.
 */

import { pgTable, uuid, text, timestamp, unique, index } from "drizzle-orm/pg-core";

export const SESSION_MEMBER_ROLES = ["host", "guest"] as const;
export type SessionMemberRole = typeof SESSION_MEMBER_ROLES[number];

export const sessionMembersTable = pgTable(
  "session_members",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull(),
    userId:    uuid("user_id").notNull(),
    role:      text("role").notNull().default("guest").$type<SessionMemberRole>(),
    joinedAt:  timestamp("joined_at").notNull().defaultNow(),
    leftAt:    timestamp("left_at"),
  },
  (t) => ({
    uniqSessionUser: unique("session_members_session_user_unique").on(t.sessionId, t.userId),
    bySession:       index("session_members_session_idx").on(t.sessionId),
    byUser:          index("session_members_user_idx").on(t.userId),
  }),
);

export type SessionMember = typeof sessionMembersTable.$inferSelect;
