/**
 * /api/training/accounts — Returns fake training accounts for demo/sandbox use.
 *
 * These are sandbox-only credentials for Training Mode demonstrations.
 * They are NEVER stored in the production user table.
 * The endpoint is public (no auth required) since it serves demo presenters.
 */

import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const TRAINING_ACCOUNTS = [
  {
    email:       "training.owner@vaultdemo.com",
    password:    "VaultDemo2025!",
    role:        "venue_owner",
    roleLabel:   "Venue Owner",
    name:        "Demo Owner",
    description: "Full access to all Axiom OS modules. Use for owner training and investor demos.",
    color:       "#d4af37",
  },
  {
    email:       "training.manager@vaultdemo.com",
    password:    "VaultDemo2025!",
    role:        "manager",
    roleLabel:   "Floor Manager",
    name:        "Demo Manager",
    description: "Access to Operations dashboard, staff management, override panel, and reconciliation.",
    color:       "#f59e0b",
  },
  {
    email:       "training.server@vaultdemo.com",
    password:    "VaultDemo2025!",
    role:        "staff",
    roleLabel:   "Server",
    name:        "Demo Server",
    description: "Access to table management, order routing, loyalty communication, and upsell panel.",
    color:       "#34d399",
  },
  {
    email:       "training.cashier@vaultdemo.com",
    password:    "VaultDemo2025!",
    role:        "staff",
    roleLabel:   "Cashier",
    name:        "Demo Cashier",
    description: "Access to POS checkout, payment processing, receipt delivery, and loyalty readout.",
    color:       "#06b6d4",
  },
  {
    email:       "training.inventory@vaultdemo.com",
    password:    "VaultDemo2025!",
    role:        "staff",
    roleLabel:   "Inventory Manager",
    name:        "Demo Inventory",
    description: "Access to inventory grid, reorder workflow, suppression flags, and distributor portal.",
    color:       "#ef4444",
  },
  {
    email:       "training.investor@vaultdemo.com",
    password:    "VaultDemo2025!",
    role:        "venue_owner",
    roleLabel:   "Investor Demo",
    name:        "Investor Guest",
    description: "Read-only view optimized for investor demos. Full analytics and AI engine access.",
    color:       "#a78bfa",
  },
];

router.get("/", (_req: Request, res: Response) => {
  res.json({
    accounts: TRAINING_ACCOUNTS,
    notice:   "These are sandbox-only credentials. They exist solely for Training Mode demonstrations and have no access to production data or real user records.",
    demoVenue: "Vault Cigar Lounge",
    resetUrl:  "/api/training/reset",
  });
});

export default router;
