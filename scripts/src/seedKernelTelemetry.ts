/**
 * Seed script — kernel telemetry
 *
 * Injects realistic SmokeCraft guest-activity events into telemetry_events
 * across the last 30 days so the E.A.T. Engine dashboard shows non-empty charts
 * on first load.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed:kernel-telemetry
 *
 * Safe to re-run: inserts only when the event table is empty (or --force flag
 * is passed to skip the guard).
 */

import { db, telemetryEventsTable, kernelModulesTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";

const FORCE = process.argv.includes("--force");

const SMOKE_MODULES = [
  { name: "SmokeCraft Swipe Engine",   slug: "smokecraft-swipe",   craftType: "smoke" as const },
  { name: "SmokeCraft Build Flow",      slug: "smokecraft-build",   craftType: "smoke" as const },
  { name: "SmokeCraft POS",             slug: "smokecraft-pos",     craftType: "smoke" as const },
  { name: "Pour Experience",            slug: "pour-swipe",         craftType: "pour"  as const },
  { name: "Brew Experience",            slug: "brew-swipe",         craftType: "brew"  as const },
];

const EVENT_WEIGHTS: Record<string, number> = {
  swipe_start:    40,
  swipe_add:      22,
  swipe_skip:     18,
  build_complete: 10,
  add_to_order:    6,
  session_end:     4,
};

function weightedPick(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number, jitterHours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randomBetween(8, 22), randomBetween(0, 59), randomBetween(0, 59), 0);
  if (jitterHours) {
    d.setTime(d.getTime() + randomBetween(-jitterHours * 3600000, jitterHours * 3600000));
  }
  return d;
}

async function ensureModules(): Promise<Map<string, string>> {
  const slugMap = new Map<string, string>();

  for (const mod of SMOKE_MODULES) {
    const existing = await db
      .select({ id: kernelModulesTable.id })
      .from(kernelModulesTable)
      .where(eq(kernelModulesTable.slug, mod.slug));

    if (existing.length > 0) {
      slugMap.set(mod.slug, existing[0].id);
    } else {
      const [inserted] = await db
        .insert(kernelModulesTable)
        .values({
          name:      mod.name,
          slug:      mod.slug,
          craftType: mod.craftType,
          status:    "active",
        })
        .returning({ id: kernelModulesTable.id });
      slugMap.set(mod.slug, inserted.id);
      console.log(`  ✓ Registered module: ${mod.name} (${inserted.id})`);
    }
  }

  return slugMap;
}

async function main() {
  console.log("🌱  Seeding kernel telemetry…");

  const [{ total }] = await db.select({ total: count() }).from(telemetryEventsTable);

  if (total > 0 && !FORCE) {
    console.log(`  ⚠  telemetry_events already has ${total} rows. Pass --force to re-seed.`);
    process.exit(0);
  }

  if (FORCE && total > 0) {
    console.log(`  ⚡  --force: overriding guard, inserting alongside existing ${total} rows.`);
  }

  const moduleMap = await ensureModules();
  const moduleIds = [...moduleMap.values()];

  const rows: {
    moduleId:  string;
    eventType: string;
    payload:   Record<string, unknown>;
    occurredAt: Date;
  }[] = [];

  for (let day = 29; day >= 0; day--) {
    const dailyVolume = randomBetween(40, 180);

    for (let i = 0; i < dailyVolume; i++) {
      const eventType = weightedPick(EVENT_WEIGHTS);
      const moduleId  = moduleIds[Math.floor(Math.random() * moduleIds.length)];
      const occurredAt = daysAgo(day, 2);

      const payload: Record<string, unknown> = { source: "seed" };

      if (eventType === "swipe_start") {
        payload.craft = "smoke";
        payload.sessionId = `seed-${Date.now()}-${i}`;
      } else if (eventType === "swipe_add" || eventType === "swipe_skip") {
        payload.productId = `prod-${randomBetween(1, 50)}`;
        payload.score     = randomBetween(40, 100);
      } else if (eventType === "build_complete") {
        payload.totalScore = randomBetween(55, 100);
        payload.durationMs = randomBetween(30000, 300000);
      } else if (eventType === "add_to_order") {
        payload.productId = `prod-${randomBetween(1, 50)}`;
        payload.qty       = randomBetween(1, 3);
      }

      rows.push({ moduleId, eventType, payload, occurredAt });
    }
  }

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db.insert(telemetryEventsTable).values(
      batch.map((r) => ({
        moduleId:  r.moduleId,
        eventType: r.eventType,
        payload:   r.payload,
        occurredAt: r.occurredAt,
      }))
    );
    inserted += batch.length;
  }

  console.log(`  ✓ Inserted ${inserted} telemetry events across 30 days.`);
  console.log("  Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
