/**
 * Email diagnostics + admin routes.
 *
 *   GET  /api/email/status — auth required, super_admin — returns whether
 *                             the SendGrid integration is configured. Never
 *                             returns the API key.
 *   POST /api/email/test    — auth required, super_admin — sends a one-off
 *                             test email to a recipient of the operator's
 *                             choosing so they can verify deliverability
 *                             without placing a real order.
 */

import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                   from "../middleware/roles";
import { allowOnly }                     from "../middleware/sanitize";
import { sendEmail, emailServiceStatus } from "../services/email";
import { testEmail }                     from "../services/emailTemplates";

const router: IRouter = Router();

router.get(
  "/status",
  requireAuth,
  requireRole("super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json(emailServiceStatus());
  },
);

const TestSchema = z.object({
  to: z.string().email().max(254),
});

router.post(
  "/test",
  requireAuth,
  requireRole("super_admin"),
  allowOnly("to"),
  async (req: AuthRequest, res: Response) => {
    const parsed = TestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid recipient", issues: parsed.error.issues });
      return;
    }
    const { subject, html } = testEmail({ recipient: parsed.data.to });
    const result = await sendEmail({ to: parsed.data.to, subject, html });
    if (!result.sent) {
      res.status(503).json({
        sent:   false,
        reason: result.reason,
        status: emailServiceStatus(),
      });
      return;
    }
    res.json({ sent: true, messageId: result.messageId, to: parsed.data.to });
  },
);

export default router;
