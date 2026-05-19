/**
 * Deployment Pipeline Routes
 *
 * GET  /api/download/latest            — public; returns config JSON or redirects
 *                                        to the download URL when ?action=download
 * POST /api/admin/update-deployment    — admin/super_admin; mutates in-memory config
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { z }                from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }      from "../middleware/roles";
import { logger }           from "../lib/logger";

const router: IRouter = Router();

// ── In-memory deployment config (survives restarts via env override on first load) ──

interface DeploymentConfig {
  downloadUrl:  string;
  version:      string;
  releasedAt:   string;
  instructions: {
    step1: string;
    step2: string;
    step3: string;
  };
}

let config: DeploymentConfig = {
  downloadUrl: process.env.NOVEE_DOWNLOAD_URL ?? "https://releases.novee-os.com/latest/novee-os-latest.apk",
  version:     process.env.NOVEE_RELEASE_VERSION ?? "1.0.0",
  releasedAt:  new Date().toISOString(),
  instructions: {
    step1: "Power on the kiosk or tablet and connect to the venue's secure Wi-Fi network.",
    step2: "Once the NOVEE OS installer downloads, open the package and authorize the required security permissions.",
    step3: "Launch CraftHub, select your module (SmokeCraft, PourCraft, BrewCraft, or WineCraft), then enter the assigned Venue ID and Table ID to initialize.",
  },
};

// ── Zod schema for the admin update endpoint ─────────────────────────────────

const updateSchema = z.object({
  newDownloadUrl: z.string().url("Must be a valid URL").optional(),
  newVersion:     z.string().optional(),
  newInstructions: z.object({
    step1: z.string().optional(),
    step2: z.string().optional(),
    step3: z.string().optional(),
  }).optional(),
});

// ── GET /api/download/latest ──────────────────────────────────────────────────

router.get("/download/latest", (req: Request, res: Response) => {
  // Only redirect when the client explicitly requests the download.
  // Omitting the user-agent check ensures fetch() calls from the frontend
  // (which send a Mozilla UA) still receive JSON for the instructions panel.
  if (req.query["action"] === "download") {
    logger.info({}, "deployment: redirecting to download URL");
    return res.redirect(302, config.downloadUrl);
  }

  return res.json({
    success:      true,
    version:      config.version,
    releasedAt:   config.releasedAt,
    downloadUrl:  config.downloadUrl,
    instructions: config.instructions,
  });
});

// ── POST /api/admin/update-deployment ────────────────────────────────────────

router.post(
  "/admin/update-deployment",
  requireAuth,
  requireRole("admin", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }

    const { newDownloadUrl, newVersion, newInstructions } = parsed.data;

    if (newDownloadUrl)   config.downloadUrl  = newDownloadUrl;
    if (newVersion)       config.version      = newVersion;
    if (newInstructions)  config.instructions = { ...config.instructions, ...newInstructions };
    config.releasedAt = new Date().toISOString();

    logger.info({ updatedBy: req.user?.id }, "deployment: config updated");

    return res.json({
      success:       true,
      message:       "Deployment pipeline updated successfully.",
      currentConfig: config,
    });
  },
);

export default router;
