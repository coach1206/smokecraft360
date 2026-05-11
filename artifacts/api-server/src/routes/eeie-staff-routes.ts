/**
 * EEIE Staff Routes
 * Mounts under /api/eeie
 *
 * Staff Cockpit:
 *   GET  /api/eeie/staff/sessions
 *   POST /api/eeie/staff/sessions/:id/cart/add
 *   POST /api/eeie/staff/sessions/:id/cart/remove
 *   POST /api/eeie/staff/sessions/:id/send-pos
 *   POST /api/eeie/staff/sessions/:id/toggle-pause
 *   POST /api/eeie/staff/sessions/:id/note
 *   GET  /api/eeie/staff/logs
 *
 * Product Wall:
 *   GET  /api/eeie/products
 *   POST /api/eeie/products/:id/stock
 *
 * Media Library:
 *   GET  /api/eeie/media/assets
 *   POST /api/eeie/media/assets/upload
 *   POST /api/eeie/media/assets/link-url
 *   POST /api/eeie/media/assets/:id/approve
 *   POST /api/eeie/media/assets/:id/reject
 *   GET  /api/eeie/media/logs
 */

import { Router, Request, Response } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth";
import {
  getSessions, addItemToCart, removeFromCart, sendToPOS,
  toggleSessionPause, addNote, getStaffLogs,
  getProducts, updateProductStock,
  getMediaAssets, approveMediaAsset, rejectMediaAsset,
  addMediaAssetFromUrl, simulateMediaUpload, getMediaLogs,
} from "../services/eeie-staff-service";

const router = Router();

// ── Staff Cockpit ─────────────────────────────────────────────

router.get("/staff/sessions", optionalAuth, (_req: Request, res: Response) => {
  res.json(getSessions());
});

router.get("/staff/logs", optionalAuth, (_req: Request, res: Response) => {
  res.json(getStaffLogs());
});

router.post("/staff/sessions/:id/cart/add", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(addItemToCart(String(req.params.id), String(body?.productId ?? "")));
});

router.post("/staff/sessions/:id/cart/remove", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(removeFromCart(String(req.params.id), String(body?.productId ?? "")));
});

router.post("/staff/sessions/:id/send-pos", requireAuth, (req: Request, res: Response) => {
  res.json(sendToPOS(String(req.params.id)));
});

router.post("/staff/sessions/:id/toggle-pause", requireAuth, (req: Request, res: Response) => {
  res.json(toggleSessionPause(String(req.params.id)));
});

router.post("/staff/sessions/:id/note", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(addNote(String(req.params.id), String(body?.note ?? "")));
});

// ── Product Wall ──────────────────────────────────────────────

router.get("/products", optionalAuth, (req: Request, res: Response) => {
  const { category, stock } = req.query as Record<string, string>;
  const result = getProducts();
  if (category && category !== "all") {
    result.products = result.products.filter(p => p.category === category);
  }
  if (stock && stock !== "all") {
    result.products = result.products.filter(p => p.stock === stock);
  }
  res.json(result);
});

router.post("/products/:id/stock", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(updateProductStock(String(req.params.id), body?.stock as "in_stock" | "low_stock" | "out_of_stock"));
});

// ── Media Library ─────────────────────────────────────────────

router.get("/media/assets", optionalAuth, (req: Request, res: Response) => {
  const { category, status } = req.query as Record<string, string>;
  res.json(getMediaAssets(category, status));
});

router.get("/media/logs", optionalAuth, (_req: Request, res: Response) => {
  res.json(getMediaLogs());
});

router.post("/media/assets/upload", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(simulateMediaUpload(String(body?.title ?? ""), String(body?.category ?? "Uncategorized")));
});

router.post("/media/assets/link-url", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(addMediaAssetFromUrl(
    String(body?.url ?? ""), String(body?.title ?? "Untitled"), String(body?.category ?? "Uncategorized"),
  ));
});

router.post("/media/assets/:id/approve", requireAuth, (req: Request, res: Response) => {
  res.json(approveMediaAsset(String(req.params.id)));
});

router.post("/media/assets/:id/reject", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(rejectMediaAsset(String(req.params.id), body?.reason as string | undefined));
});

export default router;
