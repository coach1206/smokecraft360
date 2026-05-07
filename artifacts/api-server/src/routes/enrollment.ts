/**
 * Enrollment routes — Human Foundation guest identity system.
 *
 *   POST   /api/enrollment/enroll   — create guest profile, assign mentor
 *   POST   /api/enrollment/return   — fast return by firstName + phoneLast4
 *   PATCH  /api/enrollment/:id/memory — update flavor history after session
 *   POST   /api/enrollment/:id/session — record a new craft session
 *   GET    /api/enrollment/mentors  — list mentors (optionally ?craftType=smoke)
 *
 * No authentication required — these are public kiosk endpoints.
 * Rate limiting is enforced by the global osLimiter applied at mount.
 */

import { Router }                                   from "express";
import { eq, and }                                  from "drizzle-orm";
import { db, guestProfilesTable, guestSessionsTable } from "@workspace/db";
import { z }                                        from "zod";
import { assignMentor, getMentorById, MENTORS }     from "../data/mentors";
import { dispatchNeuralBridge }                      from "../lib/neuralBridge";

const router = Router();

// ── POST /api/enrollment/enroll ───────────────────────────────────────────────

const enrollSchema = z.object({
  firstName:            z.string().min(1).max(50).trim(),
  lastInitial:          z.string().length(1).toUpperCase(),
  phoneLast4:           z.string().length(4).regex(/^\d{4}$/).optional(),
  email:                z.string().email().optional(),
  ageRange:             z.string().optional(),
  region:               z.string().optional(),
  atmospherePreference: z.string().optional(),
  experienceLevel:      z.string().optional(),
  boldnessPreference:   z.string().optional(),
  craftType:            z.enum(["smoke", "pour", "brew", "vape"]).optional(),
  venueId:              z.string().uuid().optional(),
});

router.post("/enroll", async (req, res) => {
  const body = enrollSchema.parse(req.body);

  const phoneSuffix = body.phoneLast4 ?? String(Math.floor(1000 + Math.random() * 9000));
  const publicId    = `${body.firstName} ${body.lastInitial} · ${phoneSuffix}`;

  const mentorId = assignMentor({
    craftType:           body.craftType ?? "smoke",
    boldnessPreference:  body.boldnessPreference,
    atmospherePreference: body.atmospherePreference,
    experienceLevel:     body.experienceLevel,
  });

  const [profile] = await db
    .insert(guestProfilesTable)
    .values({
      publicId,
      firstName:            body.firstName,
      lastInitial:          body.lastInitial,
      phoneLast4:           body.phoneLast4,
      email:                body.email,
      ageRange:             body.ageRange,
      region:               body.region,
      atmospherePreference: body.atmospherePreference,
      experienceLevel:      body.experienceLevel,
      boldnessPreference:   body.boldnessPreference,
      assignedMentorId:     mentorId,
      venueId:              body.venueId,
    })
    .returning();

  const mentor = getMentorById(mentorId);

  // Neural Bridge — fire-and-forget
  dispatchNeuralBridge({
    type:     "enrollment",
    guestId:  profile!.id,
    venueId:  body.venueId,
    craftType: body.craftType,
    meta:     { mentorId, atmospherePreference: body.atmospherePreference, experienceLevel: body.experienceLevel },
  }).catch(() => {});

  res.status(201).json({ profile, mentor });
});

// ── POST /api/enrollment/return ───────────────────────────────────────────────

const returnSchema = z.object({
  firstName:  z.string().min(1).trim(),
  phoneLast4: z.string().length(4).regex(/^\d{4}$/),
});

router.post("/return", async (req, res) => {
  const { firstName, phoneLast4 } = returnSchema.parse(req.body);

  const [existing] = await db
    .select()
    .from(guestProfilesTable)
    .where(
      and(
        eq(guestProfilesTable.firstName, firstName),
        eq(guestProfilesTable.phoneLast4, phoneLast4),
      ),
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }

  const [profile] = await db
    .update(guestProfilesTable)
    .set({
      lastSeenAt:   new Date(),
      sessionCount: existing.sessionCount + 1,
    })
    .where(eq(guestProfilesTable.id, existing.id))
    .returning();

  const mentor = getMentorById(profile.assignedMentorId ?? "");

  res.json({ profile, mentor, returning: true });
});

// ── PATCH /api/enrollment/:id/memory ─────────────────────────────────────────

const memorySchema = z.object({
  flavorHistory: z.array(
    z.object({
      tag:      z.string(),
      count:    z.number().int().min(0),
      lastSeen: z.string(),
    }),
  ).optional(),
});

router.patch("/:id/memory", async (req, res) => {
  const body = memorySchema.parse(req.body);

  const [profile] = await db
    .update(guestProfilesTable)
    .set({
      flavorHistory: body.flavorHistory,
      lastSeenAt:    new Date(),
    })
    .where(eq(guestProfilesTable.id, req.params.id))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Guest profile not found" });
    return;
  }

  res.json({ profile });
});

// ── POST /api/enrollment/:id/session ─────────────────────────────────────────

const sessionSchema = z.object({
  craftType:     z.enum(["smoke", "pour", "brew", "vape"]),
  mentorId:      z.string(),
  sessionNumber: z.number().int().min(1).optional(),
});

router.post("/:id/session", async (req, res) => {
  const body = sessionSchema.parse(req.body);

  const [session] = await db
    .insert(guestSessionsTable)
    .values({
      guestProfileId: req.params.id,
      craftType:      body.craftType,
      mentorId:       body.mentorId,
      sessionNumber:  body.sessionNumber ?? 1,
    })
    .returning();

  res.status(201).json({ session });
});

// ── GET /api/enrollment/mentors ───────────────────────────────────────────────

router.get("/mentors", (req, res) => {
  const craftType = req.query.craftType as string | undefined;
  const mentors   = craftType
    ? MENTORS.filter(m => m.craftType === craftType)
    : MENTORS;
  res.json({ mentors });
});

export default router;
