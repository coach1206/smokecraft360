/**
 * Hardware-tracking e2e — exercises /api/devices/:deviceId/hardware (PUT/GET)
 * and /api/devices/hardware/expiring against a freshly seeded fixture set.
 *
 * Fixtures are inserted via direct SQL to skip auth-side limiters; only the
 * /login endpoint is hit per user (tiny per-IP load on authLimiter). All
 * hardware writes go through real HTTP.
 */

import { db, usersTable, venuesTable, devicesTable, deviceHardwareTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const BASE = process.env.E2E_BASE ?? "http://localhost:80";
const STAMP = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const PW = "TestPass!42";
const HASH = bcrypt.hashSync(PW, 10);

let pass = 0, fail = 0;
const results: { name: string; ok: boolean; detail?: string }[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; results.push({ name, ok: true }); }
  else    { fail++; results.push({ name, ok: false, detail }); }
}

async function api(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: unknown = null;
  const txt = await res.text();
  try { json = txt ? JSON.parse(txt) : null; } catch { json = txt; }
  return { status: res.status, body: json as Record<string, unknown> | null };
}

async function login(email: string) {
  const r = await api("POST", "/api/auth/login", undefined, { email, password: PW });
  if (r.status !== 200 || typeof r.body?.["token"] !== "string") {
    throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body["token"] as string;
}

async function main() {
  // ── Seed fixtures via SQL ──────────────────────────────────────────────────
  const venueA = (await db.insert(venuesTable).values({ name: `HW-A-${STAMP}`, type: "cigar_lounge" }).returning())[0]!;
  const venueB = (await db.insert(venuesTable).values({ name: `HW-B-${STAMP}`, type: "cigar_lounge" }).returning())[0]!;

  const superEmail = `hw-sup-${STAMP}@t.com`;
  const mgrAEmail  = `hw-mgr-a-${STAMP}@t.com`;
  const mgrBEmail  = `hw-mgr-b-${STAMP}@t.com`;
  const stfAEmail  = `hw-stf-a-${STAMP}@t.com`;
  const custEmail  = `hw-cust-${STAMP}@t.com`;

  await db.insert(usersTable).values([
    { name: "HW Super", email: superEmail, passwordHash: HASH, role: "super_admin" },
    { name: "HW MgrA",  email: mgrAEmail,  passwordHash: HASH, role: "manager", venueId: venueA.id },
    { name: "HW MgrB",  email: mgrBEmail,  passwordHash: HASH, role: "manager", venueId: venueB.id },
    { name: "HW StfA",  email: stfAEmail,  passwordHash: HASH, role: "staff",   venueId: venueA.id },
    { name: "HW Cust",  email: custEmail,  passwordHash: HASH, role: "customer" },
  ]);

  const devA = (await db.insert(devicesTable).values({
    venueId: venueA.id, type: "kiosk", nickname: `kioskA-${STAMP}`,
  }).returning())[0]!;
  const devB = (await db.insert(devicesTable).values({
    venueId: venueB.id, type: "tablet", nickname: `tabletB-${STAMP}`,
  }).returning())[0]!;
  // Pre-seed a hardware row on devB with warranty expiring in ~10 days for the report test.
  const warranty10d = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  await db.insert(deviceHardwareTable).values({
    deviceId: devB.id,
    serialNumber: `SN-PRE-${STAMP}`,
    manufacturer: "Acme",
    model: "K1",
    warrantyExpiresAt: warranty10d,
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  const tSuper = await login(superEmail);
  const tMgrA  = await login(mgrAEmail);
  const tMgrB  = await login(mgrBEmail);
  const tStfA  = await login(stfAEmail);
  const tCust  = await login(custEmail);

  // ── 1. Auth: unauthenticated PUT → 401 ────────────────────────────────────
  let r = await api("PUT", `/api/devices/${devA.id}/hardware`, undefined, { manufacturer: "X" });
  check("01 unauth PUT → 401", r.status === 401, `got ${r.status}`);

  // ── 2. Auth: customer PUT → 403 ───────────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tCust, { manufacturer: "X" });
  check("02 customer PUT → 403", r.status === 403, `got ${r.status}`);

  // ── 3. Auth: staff PUT → 403 (staff is read-only) ─────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tStfA, { manufacturer: "X" });
  check("03 staff PUT → 403", r.status === 403, `got ${r.status}`);

  // ── 4. Manager A PUT on own device → 200, returns row ─────────────────────
  const isoFar = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString();
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, {
    serialNumber: `SN-A-${STAMP}`,
    manufacturer: "Acme",
    model: "Pro",
    macAddress: "aa:bb:cc:dd:ee:ff",
    supplier: "Best Buy",
    purchaseDate: "2024-01-15",
    purchasePriceCents: 49999,
    warrantyExpiresAt: isoFar,
    notes: "Initial install",
  });
  check("04 mgrA PUT own device → 200",
    r.status === 200 && r.body?.["deviceId"] === devA.id && r.body?.["manufacturer"] === "Acme",
    `status=${r.status} body=${JSON.stringify(r.body)}`);

  // ── 5. Manager A GET own device → 200, has the row ───────────────────────
  r = await api("GET", `/api/devices/${devA.id}/hardware`, tMgrA);
  check("05 mgrA GET own → 200",
    r.status === 200 && r.body?.["serialNumber"] === `SN-A-${STAMP}`,
    `status=${r.status} body=${JSON.stringify(r.body)}`);

  // ── 6. Cross-tenant: Manager B GET device A → 404 (not 403 — no leak) ─────
  r = await api("GET", `/api/devices/${devA.id}/hardware`, tMgrB);
  check("06 mgrB GET cross-tenant → 404",
    r.status === 404 && /Device not found/i.test(JSON.stringify(r.body)),
    `status=${r.status} body=${JSON.stringify(r.body)}`);

  // ── 7. Cross-tenant: Manager B PUT device A → 404 ─────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrB, { manufacturer: "Hostile" });
  check("07 mgrB PUT cross-tenant → 404", r.status === 404, `got ${r.status}`);

  // ── 8. Cross-tenant did NOT mutate ────────────────────────────────────────
  r = await api("GET", `/api/devices/${devA.id}/hardware`, tMgrA);
  check("08 cross-tenant write was no-op",
    r.status === 200 && r.body?.["manufacturer"] === "Acme",
    `manufacturer=${r.body?.["manufacturer"]}`);

  // ── 9. Super sees any tenant ──────────────────────────────────────────────
  r = await api("GET", `/api/devices/${devA.id}/hardware`, tSuper);
  check("09 super GET any tenant → 200",
    r.status === 200 && r.body?.["deviceId"] === devA.id,
    `status=${r.status}`);

  // ── 10. Idempotent upsert: second PUT only updates supplied fields ────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { notes: "updated note" });
  check("10 partial PUT preserves untouched fields",
    r.status === 200 && r.body?.["notes"] === "updated note" && r.body?.["manufacturer"] === "Acme" && r.body?.["serialNumber"] === `SN-A-${STAMP}`,
    `body=${JSON.stringify(r.body)}`);

  // ── 11. Explicit null clears a field ──────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { macAddress: null });
  check("11 explicit null clears field",
    r.status === 200 && r.body?.["macAddress"] === null && r.body?.["manufacturer"] === "Acme",
    `body=${JSON.stringify(r.body)}`);

  // ── 12. Unknown device id → 404 ───────────────────────────────────────────
  r = await api("GET", `/api/devices/00000000-0000-0000-0000-000000000000/hardware`, tSuper);
  check("12 unknown device → 404", r.status === 404, `got ${r.status}`);

  // ── 13. Bad UUID in path → 400 ────────────────────────────────────────────
  r = await api("GET", `/api/devices/not-a-uuid/hardware`, tSuper);
  check("13 bad uuid → 400", r.status === 400, `got ${r.status}`);

  // ── 14. Invalid MAC rejected ──────────────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { macAddress: "zz:zz:zz:zz:zz:zz" });
  check("14 invalid MAC → 400", r.status === 400, `got ${r.status} body=${JSON.stringify(r.body)}`);

  // ── 15. Negative price rejected ───────────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { purchasePriceCents: -1 });
  check("15 negative price → 400", r.status === 400, `got ${r.status}`);

  // ── 16. Over-cap price rejected ───────────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { purchasePriceCents: 1_000_000_001 });
  check("16 price over cap → 400", r.status === 400, `got ${r.status}`);

  // ── 17. Bad date format rejected ──────────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { purchaseDate: "01/15/2024" });
  check("17 bad date → 400", r.status === 400, `got ${r.status}`);

  // ── 18. Bad warranty datetime rejected ────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { warrantyExpiresAt: "tomorrow" });
  check("18 bad warranty datetime → 400", r.status === 400, `got ${r.status}`);

  // ── 19. Notes >2000 chars rejected ────────────────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { notes: "x".repeat(2001) });
  check("19 notes too long → 400", r.status === 400, `got ${r.status}`);

  // ── 20. Unknown field rejected (strict schema) ────────────────────────────
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, { evil: "extra" });
  check("20 unknown field → 400", r.status === 400, `got ${r.status}`);

  // ── 21. Empty body PUT is a no-op upsert (still 200 — only updatedAt bumps)
  r = await api("PUT", `/api/devices/${devA.id}/hardware`, tMgrA, {});
  check("21 empty body PUT → 200 (idempotent)", r.status === 200, `got ${r.status}`);

  // ── 22. GET on device with no hardware row → 404 with hint ────────────────
  // Make a fresh device with no hardware row.
  const devC = (await db.insert(devicesTable).values({
    venueId: venueA.id, type: "mobile", nickname: `mobC-${STAMP}`,
  }).returning())[0]!;
  r = await api("GET", `/api/devices/${devC.id}/hardware`, tMgrA);
  check("22 no hardware row → 404 with hint",
    r.status === 404 && /No hardware record/i.test(JSON.stringify(r.body)),
    `status=${r.status} body=${JSON.stringify(r.body)}`);

  // ── 23. Staff CAN read own venue (read-only role) ────────────────────────
  r = await api("GET", `/api/devices/${devA.id}/hardware`, tStfA);
  check("23 staff GET own venue → 200",
    r.status === 200 && r.body?.["deviceId"] === devA.id,
    `status=${r.status}`);

  // ── 24. Customer GET → 403 (not in read role list) ────────────────────────
  r = await api("GET", `/api/devices/${devA.id}/hardware`, tCust);
  check("24 customer GET → 403", r.status === 403, `got ${r.status}`);

  // ── 25. Expiring report — super sees devB (warranty in 10d) ──────────────
  r = await api("GET", `/api/devices/hardware/expiring?days=30`, tSuper);
  const reportDevices = (r.body?.["devices"] as Array<Record<string, unknown>> | undefined) ?? [];
  check("25 super expiring report includes devB",
    r.status === 200 && reportDevices.some((d) => d["deviceId"] === devB.id),
    `status=${r.status} count=${reportDevices.length}`);

  // ── 26. Expiring report — devA (400d warranty) NOT in 30d window ─────────
  check("26 expiring report excludes far-future devA",
    !reportDevices.some((d) => d["deviceId"] === devA.id),
    `unexpected devA in report`);

  // ── 27. Expiring report scoped by venueId returns only that venue ────────
  r = await api("GET", `/api/devices/hardware/expiring?days=30&venueId=${venueB.id}`, tSuper);
  const scoped = (r.body?.["devices"] as Array<Record<string, unknown>> | undefined) ?? [];
  check("27 expiring report venue scope works",
    r.status === 200 && scoped.every((d) => d["venueId"] === venueB.id) && scoped.some((d) => d["deviceId"] === devB.id),
    `status=${r.status} venueIds=${scoped.map((d) => d["venueId"]).join(",")}`);

  // ── 28. Expiring report — manager (non-super) → 403 ──────────────────────
  r = await api("GET", `/api/devices/hardware/expiring?days=30`, tMgrA);
  check("28 mgr expiring report → 403", r.status === 403, `got ${r.status}`);

  // ── 29. days param clamped to MAX_EXPIRING_DAYS=365 (no 500, valid resp)
  r = await api("GET", `/api/devices/hardware/expiring?days=99999`, tSuper);
  check("29 days clamp → 200 windowDays=365",
    r.status === 200 && r.body?.["windowDays"] === 365,
    `status=${r.status} windowDays=${r.body?.["windowDays"]}`);

  // ── 30. Report static segment is NOT shadowed by per-device router ───────
  // (regression guard for mount order — `hardware` is not a UUID, so without
  //  the explicit /api/devices/hardware mount the request would hit the
  //  /:deviceId/hardware route and 400 on UUID validation).
  r = await api("GET", `/api/devices/hardware/expiring`, tSuper);
  check("30 report mount order not shadowed",
    r.status === 200 && typeof r.body?.["windowDays"] === "number",
    `status=${r.status} body=${JSON.stringify(r.body)}`);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  // Delete devices first (cascade-friendly; hardware row removed implicitly
  // is NOT enforced — no FK — so kill the hardware row explicitly).
  await db.delete(deviceHardwareTable).where(eq(deviceHardwareTable.deviceId, devA.id));
  await db.delete(deviceHardwareTable).where(eq(deviceHardwareTable.deviceId, devB.id));
  await db.delete(devicesTable).where(eq(devicesTable.id, devA.id));
  await db.delete(devicesTable).where(eq(devicesTable.id, devB.id));
  await db.delete(devicesTable).where(eq(devicesTable.id, devC.id));
  await db.delete(usersTable).where(eq(usersTable.email, superEmail));
  await db.delete(usersTable).where(eq(usersTable.email, mgrAEmail));
  await db.delete(usersTable).where(eq(usersTable.email, mgrBEmail));
  await db.delete(usersTable).where(eq(usersTable.email, stfAEmail));
  await db.delete(usersTable).where(eq(usersTable.email, custEmail));
  await db.delete(venuesTable).where(eq(venuesTable.id, venueA.id));
  await db.delete(venuesTable).where(eq(venuesTable.id, venueB.id));

  // ── Report ───────────────────────────────────────────────────────────────
  console.log(`\n=== Hardware Tracking e2e: ${pass}/${pass + fail} passed ===`);
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : "  — " + r.detail}`);
  }
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error("e2e crashed:", e); process.exit(2); });
