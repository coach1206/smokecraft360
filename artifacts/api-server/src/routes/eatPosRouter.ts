import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

const STAFF_PIN = "3600";
const MGMT_PIN  = "7200";

let humidorInventory = 145;

const PosVerifySchema = z.object({
  pin:            z.string().min(4).max(8),
  action:         z.enum(["VERIFY", "DEDUCT_PURO", "RESET_CACHE"]).optional(),
  multiplierData: z.object({
    venueVelocity: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    isExecutive:   z.boolean().optional(),
  }).optional(),
});

router.post("/verify", (req, res) => {
  const parsed = PosVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ authenticated: false, error: "MALFORMED_REQUEST_PAYLOAD" });
    return;
  }

  const { pin, action, multiplierData } = parsed.data;

  if (pin !== STAFF_PIN && pin !== MGMT_PIN) {
    logger.warn({ ip: req.ip }, "EAT POS: invalid PIN attempt");
    res.status(401).json({
      authenticated: false,
      error: "ACCESS DENIED: INVALID AUTHORIZATION SECURITY CREDENTIALS",
    });
    return;
  }

  if (action === "DEDUCT_PURO") {
    humidorInventory = Math.max(0, humidorInventory - 1);
  } else if (action === "RESET_CACHE") {
    humidorInventory = 145;
  }

  let systemMultiplier = 1;
  if (multiplierData?.venueVelocity === "HIGH") {
    systemMultiplier = multiplierData?.isExecutive ? 5 : 3;
  } else if (multiplierData?.venueVelocity === "MEDIUM") {
    systemMultiplier = 2;
  }

  res.json({
    authenticated: true,
    clearance: pin === MGMT_PIN ? "MANAGEMENT" : "STAFF",
    telemetry: {
      humidorCount:      humidorInventory,
      kitchenQueueLength: 4,
      barPourStatus:     "OPTIMAL_94_PERCENT",
      activeMultiplier:  systemMultiplier,
      seatingGridMap: [
        { tableId: "T1", status: "OCCUPIED",    tabTotal: 450  },
        { tableId: "T2", status: "VIP_SESSION", tabTotal: 1250 },
        { tableId: "T3", status: "AVAILABLE",   tabTotal: 0    },
      ],
    },
  });
});

router.get("/status", (_req, res) => {
  res.json({ humidorInventory, status: "ONLINE" });
});

export default router;
