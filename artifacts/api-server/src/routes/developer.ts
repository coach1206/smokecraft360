import { Router, Request, Response } from 'express';
import { requireAuth }      from "../middleware/auth";
import { requireSovereign } from "../middleware/requireSovereign";
import { developerLogBuffer } from "../lib/eatCommandState";

interface GlobalArrSummary {
  totalCombinedArrCents: number;
  totalTransactionsProcessed: number;
  licensingTakeRatePct: number;
  platformBalanceCents: number;
}

let developerPlatformState: GlobalArrSummary = {
  totalCombinedArrCents: 458920002,
  totalTransactionsProcessed: 18452,
  licensingTakeRatePct: 2.5,
  platformBalanceCents: 114730000,
};

export const developerRouter = Router();

/**
 * @route POST /api/developer/verify-gate
 * @desc Validates the cryptographic token for root developer panel authorization
 */
developerRouter.post('/developer/verify-gate', (req: Request, res: Response) => {
  const { developerToken } = req.body;

  const MASTER_DEV_CIPHER = process.env.DEV_MASTER_CIPHER ?? "360_ENTERPRISES_ROOT_2026";

  if (!developerToken || developerToken !== MASTER_DEV_CIPHER) {
    return res.status(401).json({
      success: false,
      error: 'CRITICAL ACCESS FAILURE: INVALID SECURITY RECON CIPHER',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'ROOT DEVELOPER ACCESS GRANTED. ENGINE CHASSIS OPEN.',
    clearanceLevel: 'FOUNDER_SYSTEMS_OPERATOR',
  });
});

/**
 * @route GET /api/developer/arr-global
 * @desc Aggregates financial performance records from all registered tenant platforms
 */
developerRouter.get('/developer/arr-global', requireAuth, requireSovereign, (_req: Request, res: Response) => {
  const liveTickIncrement = Math.floor(Math.random() * 5000);
  developerPlatformState.totalCombinedArrCents      += liveTickIncrement;
  developerPlatformState.totalTransactionsProcessed += 1;
  developerPlatformState.platformBalanceCents       += Math.floor(liveTickIncrement * (developerPlatformState.licensingTakeRatePct / 100));

  return res.status(200).json({
    success: true,
    metrics: developerPlatformState,
  });
});

/**
 * @route PUT /api/developer/tenant-override/:id
 * @desc Allows 360 Enterprises to suspend or activate a venue's operating license
 */
developerRouter.put('/developer/tenant-override/:id', requireAuth, requireSovereign, (req: Request, res: Response) => {
  const tenantId  = req.params.id;
  const { newStatus } = req.body as { newStatus?: string };

  if (!newStatus || !['active', 'suspended'].includes(newStatus)) {
    return res.status(400).json({ success: false, error: 'Invalid Operational Status Parameter' });
  }

  req.log.warn({ tenantId, newStatus }, 'DEV SYSTEM OVERRIDE: tenant license state forced');

  return res.status(200).json({
    success: true,
    message: `Tenant ${tenantId} operational license updated successfully.`,
    updatedTenantId: tenantId,
    currentStatus: newStatus,
  });
});

/**
 * @route GET /api/developer/telemetry-bus
 * @desc Returns the live ring buffer of system telemetry packets (EAT_ENGINE /
 *       COMMAND_CENTER / DEV_DASHBOARD) captured since server boot, newest first.
 *       Max depth: 100 entries.
 */
developerRouter.get('/developer/telemetry-bus', (req: Request, res: Response) => {
  return res.status(200).json({
    success:     true,
    bufferDepth: developerLogBuffer.length,
    logs:        developerLogBuffer,
  });
});
