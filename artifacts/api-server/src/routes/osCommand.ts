/**
 * POST /api/os/command — unified admin command dispatcher for the OS layer.
 *
 *   { command: "theme.switch",          venueId, themeProfile }
 *   { command: "venue.lock",            venueId }
 *   { command: "venue.unlock",          venueId }
 *   { command: "flag.toggle",           name, enabled, themeSlug?, venueId? }
 *   { command: "subscription.extend_grace", venueId, days }
 *
 * Every command is audit-logged with before/after state. super_admin only.
 *
 * Note on session.force_logout: JWTs in this app are stateless (no server-side
 * session table), so there is no revocation primitive. Implementing it would
 * require a token denylist — left out of scope here; see /api/auth for the
 * stateless design.
 */
import { Router, type IRouter, type Response } from "express";
import { and, eq, isNull }                     from "drizzle-orm";
import { z }                                   from "zod/v4";
import {
  db, venuesTable, themeProfilesTable, featureFlagsTable, subscriptionsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { logAudit }                            from "../lib/audit";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_RE = /^[a-z][a-z0-9-]{1,40}$/;

const commandSchema = z.discriminatedUnion("command", [
  z.object({
    command:      z.literal("theme.switch"),
    venueId:      z.string().regex(UUID_RE),
    themeProfile: z.string().min(1),
  }),
  z.object({ command: z.literal("venue.lock"),   venueId: z.string().regex(UUID_RE) }),
  z.object({ command: z.literal("venue.unlock"), venueId: z.string().regex(UUID_RE) }),
  z.object({
    command:   z.literal("flag.toggle"),
    name:      z.string().regex(NAME_RE),
    enabled:   z.boolean(),
    themeSlug: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/).nullable().optional(),
    venueId:   z.string().regex(UUID_RE).nullable().optional(),
  }),
  z.object({
    command: z.literal("subscription.extend_grace"),
    venueId: z.string().regex(UUID_RE),
    days:    z.number().int().min(1).max(90),
  }),
]);

router.post(
  "/command",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = commandSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid command", issues: parsed.error.issues });
      return;
    }
    const cmd = parsed.data;
    const now = new Date();
    void now; // used in subscription branch only

    try {
      switch (cmd.command) {
        case "theme.switch": {
          const [theme] = await db.select({ slug: themeProfilesTable.slug })
            .from(themeProfilesTable)
            .where(eq(themeProfilesTable.slug, cmd.themeProfile)).limit(1);
          if (!theme) { res.status(400).json({ error: `Unknown themeProfile '${cmd.themeProfile}'` }); return; }

          const [existing] = await db.select().from(venuesTable).where(eq(venuesTable.id, cmd.venueId)).limit(1);
          if (!existing) { res.status(404).json({ error: "Venue not found" }); return; }

          await db.update(venuesTable)
            .set({ themeProfile: cmd.themeProfile })
            .where(eq(venuesTable.id, cmd.venueId));

          await logAudit(req, {
            action: "os.theme.switch", entityType: "venue", entityId: cmd.venueId,
            before: { themeProfile: existing.themeProfile },
            after:  { themeProfile: cmd.themeProfile },
            venueId: cmd.venueId,
          });
          res.json({ ok: true, command: cmd.command, venueId: cmd.venueId, themeProfile: cmd.themeProfile });
          return;
        }

        case "venue.lock":
        case "venue.unlock": {
          const desired = cmd.command === "venue.unlock";
          const [existing] = await db.select().from(venuesTable).where(eq(venuesTable.id, cmd.venueId)).limit(1);
          if (!existing) { res.status(404).json({ error: "Venue not found" }); return; }

          await db.update(venuesTable)
            .set({ active: desired })
            .where(eq(venuesTable.id, cmd.venueId));

          await logAudit(req, {
            action: `os.${cmd.command}`, entityType: "venue", entityId: cmd.venueId,
            before: { active: existing.active }, after: { active: desired },
            venueId: cmd.venueId,
          });
          res.json({ ok: true, command: cmd.command, venueId: cmd.venueId, active: desired });
          return;
        }

        case "flag.toggle": {
          const themeSlug = cmd.themeSlug ?? null;
          const venueId   = cmd.venueId   ?? null;
          const [existing] = await db.select().from(featureFlagsTable).where(and(
            themeSlug ? eq(featureFlagsTable.themeSlug, themeSlug) : isNull(featureFlagsTable.themeSlug),
            venueId   ? eq(featureFlagsTable.venueId,   venueId)   : isNull(featureFlagsTable.venueId),
            eq(featureFlagsTable.name, cmd.name),
          )).limit(1);

          if (existing) {
            await db.update(featureFlagsTable)
              .set({ enabled: cmd.enabled, updatedAt: now })
              .where(eq(featureFlagsTable.id, existing.id));
          } else {
            await db.insert(featureFlagsTable).values({
              themeSlug, venueId, name: cmd.name, enabled: cmd.enabled,
            });
          }

          await logAudit(req, {
            action: "os.flag.toggle", entityType: "feature_flag", entityId: existing?.id ?? null,
            before: existing ? { enabled: existing.enabled } : null,
            after:  { themeSlug, venueId, name: cmd.name, enabled: cmd.enabled },
            venueId: venueId ?? null,
          });
          res.json({ ok: true, command: cmd.command, name: cmd.name, enabled: cmd.enabled });
          return;
        }

        case "subscription.extend_grace": {
          const [existing] = await db.select().from(subscriptionsTable)
            .where(eq(subscriptionsTable.venueId, cmd.venueId)).limit(1);
          if (!existing) { res.status(404).json({ error: "Subscription not found" }); return; }

          const base   = existing.gracePeriodEndsAt && existing.gracePeriodEndsAt > now
            ? existing.gracePeriodEndsAt : now;
          const newEnd = new Date(base.getTime() + cmd.days * 24 * 60 * 60 * 1000);

          await db.update(subscriptionsTable)
            .set({ gracePeriodEndsAt: newEnd, updatedAt: now })
            .where(eq(subscriptionsTable.id, existing.id));

          await logAudit(req, {
            action: "os.subscription.extend_grace", entityType: "subscription", entityId: existing.id,
            before: { gracePeriodEndsAt: existing.gracePeriodEndsAt?.toISOString() ?? null },
            after:  { gracePeriodEndsAt: newEnd.toISOString(), addedDays: cmd.days },
            venueId: cmd.venueId,
          });
          res.json({ ok: true, command: cmd.command, venueId: cmd.venueId, gracePeriodEndsAt: newEnd.toISOString() });
          return;
        }
      }
    } catch (err) {
      req.log.error({ err, command: cmd.command }, "os.command failed");
      res.status(500).json({ error: "Command execution failed" });
    }
  },
);

export default router;
