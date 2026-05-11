/**
 * /api/vault — Reserve Vault · Palate DNA persistence.
 *
 * POST /api/vault/save  — saves guest's Palate_DNA from PourCraft Spirit Construction.
 * GET  /api/vault/:guestId — retrieve saved palate profiles for a guest.
 */

import { Router } from "express";
import { z }      from "zod";

const router = Router();

// ── Validation schema ─────────────────────────────────────────────────────────

const PalateDNASchema = z.object({
  proof:        z.number().min(0).max(100),
  barrelFinish: z.string().min(1).max(64),
  tags:         z.array(z.string()).max(40).default([]),
  craftType:    z.string().default("pour"),
  timestamp:    z.string().datetime({ offset: true }).optional(),
});

const SaveBodySchema = z.object({
  palate_dna: PalateDNASchema,
  guestId:    z.string().optional(),
  sessionId:  z.string().optional(),
});

// ── POST /api/vault/save ──────────────────────────────────────────────────────

router.post("/save", async (req, res) => {
  const parse = SaveBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid Palate_DNA payload", details: parse.error.flatten() });
    return;
  }

  const { palate_dna, guestId, sessionId } = parse.data;
  const savedAt = new Date().toISOString();

  // Persist to DB if user_memories table available, otherwise log and return
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    await db.execute(sql`
      INSERT INTO user_memories (user_id, memory_type, content, created_at)
      VALUES (
        ${guestId ?? "guest"},
        'palate_dna',
        ${JSON.stringify({ ...palate_dna, sessionId, savedAt })}::jsonb,
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
  } catch {
    req.log?.info({ guestId, craftType: palate_dna.craftType }, "vault/save: DB unavailable, palate logged only");
  }

  res.json({
    ok:       true,
    savedAt,
    vaultRef: `vault:${palate_dna.craftType}:${Date.now()}`,
    summary: {
      proof:   palate_dna.proof,
      finish:  palate_dna.barrelFinish,
      tagCount: palate_dna.tags.length,
    },
  });
});

// ── GET /api/vault/:guestId ───────────────────────────────────────────────────

router.get("/:guestId", async (req, res) => {
  const { guestId } = req.params;
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    const rows = await db.execute(sql`
      SELECT content, created_at
      FROM user_memories
      WHERE user_id = ${guestId}
        AND memory_type = 'palate_dna'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    res.json({ vaults: rows.rows ?? [] });
  } catch {
    res.json({ vaults: [] });
  }
});

export default router;
