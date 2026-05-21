import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { getCoachResponse, getDocumentSearchResponse } from "../services/coachHelpAIService";
import { buildDocumentIndex, getIndexStats } from "../services/documentIndexService";
import { KNOWLEDGE_BASE, getAllDomains, getChunksByDomain } from "../services/coachKnowledgeBase";
import { MASTER_MANUALS, getManual, getManualsByCategory } from "../services/masterManuals";
import { ROLE_PROFILES } from "../services/coachRoleProfiles";

buildDocumentIndex();

const router = Router();

const CoachQuerySchema = z.object({
  question: z.string().min(3).max(500),
  role: z.string().optional(),
  context: z.string().max(300).optional(),
  venueId: z.string().optional(),
});

const DocSearchSchema = z.object({
  query: z.string().min(2).max(200),
  role: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

router.post("/ask", async (req, res) => {
  const parsed = CoachQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const response = await getCoachResponse(parsed.data);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Coach AI ask failed");
    res.status(500).json({ error: "Coach AI temporarily unavailable" });
  }
});

router.post("/search", async (req, res) => {
  const parsed = DocSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await getDocumentSearchResponse(parsed.data.query, parsed.data.role);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Coach document search failed");
    res.status(500).json({ error: "Search temporarily unavailable" });
  }
});

router.get("/manuals", (_req, res) => {
  const manuals = MASTER_MANUALS.map(m => ({
    id: m.id,
    title: m.title,
    version: m.version,
    category: m.category,
    description: m.description,
    lastUpdated: m.lastUpdated,
    sectionCount: m.sections.length,
  }));
  res.json({ manuals });
});

router.get("/manuals/:id", (req, res) => {
  const manual = getManual(req.params.id);
  if (!manual) {
    res.status(404).json({ error: "Manual not found" });
    return;
  }
  res.json(manual);
});

router.get("/manuals/category/:category", (req, res) => {
  const manuals = getManualsByCategory(req.params.category);
  res.json({ manuals });
});

router.get("/knowledge", (_req, res) => {
  const domains = getAllDomains();
  const summary = domains.map(domain => ({
    domain,
    chunks: getChunksByDomain(domain).map(c => ({
      id: c.id,
      title: c.title,
      subdomain: c.subdomain,
      keywords: c.keywords.slice(0, 5),
    })),
  }));
  res.json({ domains: summary });
});

router.get("/roles", (_req, res) => {
  const roles = Object.values(ROLE_PROFILES).map(r => ({
    id: r.id,
    label: r.label,
    description: r.description,
    primaryDomains: r.primaryDomains,
  }));
  res.json({ roles });
});

router.get("/stats", (_req, res) => {
  const stats = getIndexStats();
  res.json({
    ...stats,
    knowledgeChunks: KNOWLEDGE_BASE.length,
    manuals: MASTER_MANUALS.length,
    roles: Object.keys(ROLE_PROFILES).length,
  });
});

export default router;
