import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const response = HealthCheckResponse.parse({ status: "ok" });

/** GET /api/health  — primary health check */
router.get("/health",  (_req, res) => { res.json(response); });

/** GET /api/healthz — alias kept for backwards compatibility */
router.get("/healthz", (_req, res) => { res.json(response); });

export default router;
