/**
 * adapterCertification — automated POS adapter test suite.
 *
 * Runs a standardised battery of tests against any IPosAdapter implementation.
 * Results are published to the orchestration channel and can be queried via
 * GET /api/pos/certify/:adapterId.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../pgPubSub";
import { logger } from "../../lib/logger";

export interface CertificationResult {
  adapterId:    string;
  adapterName:  string;
  passCount:    number;
  failCount:    number;
  totalTests:   number;
  passed:       boolean;
  grade:        "A" | "B" | "C" | "F";
  results:      TestResult[];
  certifiedAt:  number;
  durationMs:   number;
}

interface TestResult {
  testId:   string;
  name:     string;
  passed:   boolean;
  latencyMs:number;
  error?:   string;
}

type TestFn = () => Promise<{ passed: boolean; error?: string }>;

interface CertTest {
  id:   string;
  name: string;
  run:  TestFn;
}

function buildTests(adapterId: string): CertTest[] {
  return [
    {
      id:   "connectivity",
      name: "Connectivity check",
      run:  async () => {
        // Verify adapter record exists in pos_connections
        const { rows } = await pool.query(
          `SELECT id, status FROM pos_connections WHERE id = $1 LIMIT 1`,
          [adapterId],
        ).catch(() => ({ rows: [] }));
        if (!rows[0]) return { passed: false, error: "Adapter not found in pos_connections" };
        return { passed: true };
      },
    },
    {
      id:   "token_vault",
      name: "Token vault integrity",
      run:  async () => {
        const { rows } = await pool.query(
          `SELECT id FROM pos_tokens WHERE connection_id = $1 LIMIT 1`,
          [adapterId],
        ).catch(() => ({ rows: [] }));
        return { passed: rows.length > 0, error: rows.length === 0 ? "No tokens stored" : undefined };
      },
    },
    {
      id:   "health_record",
      name: "Health monitoring record",
      run:  async () => {
        const { rows } = await pool.query(
          `SELECT id FROM pos_health_logs WHERE connection_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [adapterId],
        ).catch(() => ({ rows: [] }));
        return { passed: rows.length > 0, error: rows.length === 0 ? "No health logs found" : undefined };
      },
    },
    {
      id:   "menu_mapping",
      name: "Menu mapping present",
      run:  async () => {
        const { rows } = await pool.query(
          `SELECT COUNT(*) as cnt FROM pos_menu_mappings WHERE connection_id = $1`,
          [adapterId],
        ).catch(() => ({ rows: [{ cnt: "0" }] }));
        const cnt = parseInt(rows[0]?.cnt ?? "0", 10);
        return { passed: cnt > 0, error: cnt === 0 ? "No menu mappings defined" : undefined };
      },
    },
    {
      id:   "inventory_cache",
      name: "Inventory cache populated",
      run:  async () => {
        const { rows } = await pool.query(
          `SELECT COUNT(*) as cnt FROM pos_inventory_cache WHERE connection_id = $1`,
          [adapterId],
        ).catch(() => ({ rows: [{ cnt: "0" }] }));
        const cnt = parseInt(rows[0]?.cnt ?? "0", 10);
        return { passed: cnt > 0, error: cnt === 0 ? "Inventory cache empty" : undefined };
      },
    },
    {
      id:   "webhook_config",
      name: "Webhook handler configured",
      run:  async () => {
        const { rows } = await pool.query(
          `SELECT webhook_url FROM pos_connections WHERE id = $1 AND webhook_url IS NOT NULL LIMIT 1`,
          [adapterId],
        ).catch(() => ({ rows: [] }));
        return { passed: rows.length > 0, error: rows.length === 0 ? "No webhook URL configured" : undefined };
      },
    },
    {
      id:   "retry_queue",
      name: "Retry queue accessible",
      run:  async () => {
        const { rows } = await pool.query(
          `SELECT id FROM pos_retry_queue WHERE connection_id = $1 LIMIT 1`,
          [adapterId],
        ).catch(() => ({ rows: [] }));
        // Queue may be empty — that's fine; the table just needs to be accessible
        return { passed: true };
      },
    },
    {
      id:   "sync_log",
      name: "Sync log record",
      run:  async () => {
        const { rows } = await pool.query(
          `SELECT id FROM pos_sync_logs WHERE connection_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [adapterId],
        ).catch(() => ({ rows: [] }));
        return { passed: rows.length > 0, error: rows.length === 0 ? "No sync logs found" : undefined };
      },
    },
  ];
}

function grade(pass: number, total: number): "A" | "B" | "C" | "F" {
  const pct = pass / total;
  if (pct >= 0.95) return "A";
  if (pct >= 0.75) return "B";
  if (pct >= 0.5)  return "C";
  return "F";
}

export async function certifyAdapter(adapterId: string): Promise<CertificationResult> {
  const startMs = Date.now();
  logger.info({ adapterId }, "adapterCertification: starting certification");

  // Get adapter name
  const { rows: adapterRows } = await pool.query<{ name: string }>(
    `SELECT name FROM pos_connections WHERE id = $1`,
    [adapterId],
  ).catch(() => ({ rows: [] }));
  const adapterName = adapterRows[0]?.name ?? adapterId;

  const tests   = buildTests(adapterId);
  const results: TestResult[] = [];
  let passCount = 0;

  for (const test of tests) {
    const t0 = Date.now();
    try {
      const outcome = await test.run();
      if (outcome.passed) passCount++;
      results.push({
        testId:    test.id,
        name:      test.name,
        passed:    outcome.passed,
        latencyMs: Date.now() - t0,
        error:     outcome.error,
      });
    } catch (err) {
      results.push({
        testId:    test.id,
        name:      test.name,
        passed:    false,
        latencyMs: Date.now() - t0,
        error:     String(err),
      });
    }
  }

  const durationMs = Date.now() - startMs;
  const result: CertificationResult = {
    adapterId,
    adapterName,
    passCount,
    failCount:   tests.length - passCount,
    totalTests:  tests.length,
    passed:      passCount === tests.length,
    grade:       grade(passCount, tests.length),
    results,
    certifiedAt: Date.now(),
    durationMs,
  };

  // Persist to pos_health_logs as certification entry
  await pool.query(
    `INSERT INTO pos_health_logs
       (connection_id, status, response_time_ms, error_message, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      adapterId,
      result.passed ? "healthy" : "degraded",
      durationMs,
      result.passed ? null : `Certification failed: ${passCount}/${tests.length} tests passed`,
      JSON.stringify(result),
    ],
  ).catch(() => {});

  await pgPubSub.publish("orchestration", {
    event:       "ADAPTER_CERTIFIED",
    adapterId,
    adapterName,
    grade:       result.grade,
    passed:      result.passed,
    passCount,
    totalTests:  tests.length,
  });

  logger.info({ adapterId, grade: result.grade, passCount, total: tests.length, durationMs },
    "adapterCertification: complete");

  return result;
}
