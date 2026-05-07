/**
 * /api/auth/guest-return — "Master Key" Guest Identity Login
 *
 *   POST /api/auth/guest-return
 *       Retrieve a guest's full profile by Last Name + Phone Last 4.
 *       Returns: profile, mentor, badges, golden_box_progress, recent sessions.
 *       No password required — the Universal Identity Key (lastName + phoneLast4)
 *       is the guest's permanent cross-venue credential.
 *
 * This is the "You Belong Here" moment: a returning guest walks into any
 * Axiom OS venue, enters their last name and phone digits, and their entire
 * Mastery history, Mentor, and Golden Box progress loads instantly.
 */

import { Router, type Request, type Response } from "express";
import { eq, and, desc }                       from "drizzle-orm";
import { db, guestProfilesTable,
         guestBadgesTable, guestSessionsTable } from "@workspace/db";
import { z }                                   from "zod";
import { getMentorById }                       from "../data/mentors";
import { masteryTierFromScore, MASTERY_TIER_LABELS } from "./mastery";

const router = Router();

const returnSchema = z.object({
  lastName:   z.string().min(1).max(80).trim(),
  phoneLast4: z.string().length(4).regex(/^\d{4}$/),
});

router.post("/guest-return", async (req: Request, res: Response) => {
  const { lastName, phoneLast4 } = returnSchema.parse(req.body);

  // Primary lookup: Universal Identity Key (last_name + phone_last4)
  const [profile] = await db
    .select()
    .from(guestProfilesTable)
    .where(
      and(
        eq(guestProfilesTable.lastName,   lastName),
        eq(guestProfilesTable.phoneLast4, phoneLast4),
      ),
    )
    .limit(1);

  if (!profile) {
    res.status(404).json({
      error:   "guest_not_found",
      message: "No profile found. Check your last name and last 4 digits, or enroll as a new guest.",
    });
    return;
  }

  // Badges
  const badges = await db
    .select({ badgeId: guestBadgesTable.badgeId, earnedAt: guestBadgesTable.earnedAt, meta: guestBadgesTable.meta })
    .from(guestBadgesTable)
    .where(eq(guestBadgesTable.guestProfileId, profile.id));

  // Recent sessions (last 5)
  const recentSessions = await db
    .select()
    .from(guestSessionsTable)
    .where(eq(guestSessionsTable.guestProfileId, profile.id))
    .orderBy(desc(guestSessionsTable.createdAt))
    .limit(5)
    .catch(() => []);

  // Golden Box progress (0–100 mirroring total_mastery)
  const goldenBoxProgress = Math.round(profile.totalMastery);
  const goldenBoxUnlocked = goldenBoxProgress >= 100 || badges.some(b => b.badgeId === "golden_box");

  // Mentor
  const mentor = getMentorById(profile.assignedMentorId ?? "");

  // Update last_seen_at + session count
  await db
    .update(guestProfilesTable)
    .set({ lastSeenAt: new Date(), sessionCount: profile.sessionCount + 1 })
    .where(eq(guestProfilesTable.id, profile.id));

  res.json({
    profile: {
      id:                   profile.id,
      publicId:             profile.publicId,
      firstName:            profile.firstName,
      lastName:             profile.lastName,
      lastInitial:          profile.lastInitial,
      phoneLast4:           profile.phoneLast4,
      totalMastery:         profile.totalMastery,
      masteryTier:          profile.masteryTier,
      masteryTierLabel:     MASTERY_TIER_LABELS[profile.masteryTier] ?? profile.masteryTier,
      lastSessionScore:     profile.lastSessionScore,
      sessionCount:         profile.sessionCount,
      assignedMentorId:     profile.assignedMentorId,
      atmospherePreference: profile.atmospherePreference,
      experienceLevel:      profile.experienceLevel,
      boldnessPreference:   profile.boldnessPreference,
      flavorHistory:        profile.flavorHistory,
      createdAt:            profile.createdAt,
    },
    mentor,
    badges,
    goldenBoxProgress,
    goldenBoxUnlocked,
    recentSessions,
    returning: true,
  });
});

export default router;
