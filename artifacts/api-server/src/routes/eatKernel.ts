/**
 * E.A.T. SYSTEM BACKEND KERNEL
 * Environment · Asset · Transaction Integration Services
 *
 * /api/v1/environment          — GET/POST (sensor state, climate, audio, scent)
 * /api/v1/environment/configure — POST (apply named preset / tweak sliders)
 * /api/v1/assets               — GET (vault inventory)
 * /api/v1/assets/vault-override — POST (unlock/lock vault item, auto-ledger)
 * /api/v1/transactions         — GET (live billing telemetry)
 * /api/v1/transactions/append  — POST (inject line item)
 * /api/v1/system/viewport-stabilization — POST (readability broadcast)
 *
 * Supporting paths (mounted at /api via full prefix):
 * /api/events/venue/:venueId   — GET  (featured venue events for EAT dashboard)
 * /api/staffFloor/table/:id    — PATCH (persist drag-drop table position)
 */

import { Router, type Request, type Response } from "express";
import { z }                                   from "zod";
import { getIO }                               from "../lib/socketServer.js";
import { logger }                              from "../lib/logger.js";

export const eatKernelRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STATE STORES
// ─────────────────────────────────────────────────────────────────────────────

interface EnvironmentState {
  target_zone:   string;
  active_preset: string;
  climate: {
    current_temp_fahrenheit: number;
    relative_humidity_pct:   number;
    air_exchange_cfm:        number;
    status:                  string;
  };
  audio: {
    zone_id:                   string;
    gain_db:                   number;
    frequency_shaping_profile: string;
  };
  scent: {
    active_fluid_profile:    string;
    diffusion_interval_sec:  number;
    atomization_density_pct: number;
  };
}

interface AssetItem {
  id:           string;
  designation:  string;
  zone:         string;
  weight_grams: number;
  status:       string;
}

interface LedgerItem {
  item_id:     number;
  designation: string;
  category:    string;
  price:       number;
  status:      string;
}

interface TransactionState {
  station_valuation_total:            number;
  session_lifetime_seconds:           number;
  estimated_billing_line_items_count: number;
  active_ledger:                      LedgerItem[];
  pos_gateway: {
    api_port:             number;
    tls_version:          string;
    gateway_sync_status:  string;
  };
}

interface FloorTable {
  id: string;
  x:  number;
  y:  number;
}

// Initialise with representative venue defaults
let environmentState: EnvironmentState = {
  target_zone:   "VIP_LOUNGE_4",
  active_preset: "Smokecraft Dimmed Lounge",
  climate: {
    current_temp_fahrenheit: 70.0,
    relative_humidity_pct:   68.0,
    air_exchange_cfm:        420.0,
    status:                  "OPTIMAL",
  },
  audio: {
    zone_id:                   "Main Lounge B",
    gain_db:                   -18.5,
    frequency_shaping_profile: "DEEP_LOUNGE_LOWS",
  },
  scent: {
    active_fluid_profile:    "Terrane Woods 04",
    diffusion_interval_sec:  12,
    atomization_density_pct: 40.0,
  },
};

let assetVaultInventory: AssetItem[] = [
  { id: "SKU-N92-0482", designation: "Padrón 1926 Serie Exclusive",     zone: "Vault Drawer 4B",    weight_grams: 14.2,  status: "SECURED"  },
  { id: "SKU-RPV-1992", designation: "Rocky Patel Vintage 1992",        zone: "Vault Drawer 1A",    weight_grams: 15.1,  status: "UNLOCKED" },
  { id: "SKU-OPX-0085", designation: "Opus X Double Corona",            zone: "Vault Drawer 2C",    weight_grams: 16.5,  status: "SECURED"  },
  { id: "SKU-BTB-0028", designation: "Buffalo Trace Single Barrel Bourbon", zone: "Spirits Vault Rack 01", weight_grams: 750.0, status: "SECURED"  },
];

let transactionTelemetry: TransactionState = {
  station_valuation_total:            1420.50,
  session_lifetime_seconds:           8051,
  estimated_billing_line_items_count: 3,
  active_ledger: [
    { item_id: 1, designation: "Rocky Patel Vintage 1992",    category: "Cigar", price: 42.00, status: "Checked Out"         },
    { item_id: 2, designation: "Buffalo Trace Single Barrel", category: "Pour",  price: 28.00, status: "Dispensed"            },
    { item_id: 3, designation: "Opus X Double Corona",        category: "Cigar", price: 85.00, status: "Pending Vault Scan"   },
  ],
  pos_gateway: {
    api_port:            8443,
    tls_version:         "TLS 1.3 Link Active",
    gateway_sync_status: "CONNECTED",
  },
};

// Per-table position store (id → {x, y})
const floorTablePositions = new Map<string, FloorTable>();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function broadcast(channel: string, payload: unknown): void {
  try {
    const io = getIO();
    io.emit("eat:telemetry", { channel, timestamp: new Date().toISOString(), payload });
  } catch {
    // Socket.io may not be ready during startup — non-fatal
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const configureEnvSchema = z.object({
  active_preset:    z.string().optional(),
  target_temp:      z.union([z.number(), z.string()]).optional(),
  target_humidity:  z.union([z.number(), z.string()]).optional(),
  audio_gain:       z.union([z.number(), z.string()]).optional(),
  scent_interval:   z.union([z.number(), z.string()]).optional(),
});

const vaultOverrideSchema = z.object({
  manager_passcode:  z.string(),
  asset_id:          z.string(),
  force_disposition: z.string().optional(),
});

const appendTransactionSchema = z.object({
  designation: z.string().min(1).max(200),
  category:    z.string().optional(),
  price:       z.union([z.number(), z.string()]),
});

const viewportStabilizationSchema = z.object({
  enforce_high_readability: z.boolean().optional(),
});

const tablePatchSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENVIRONMENT CONSOLE
// ─────────────────────────────────────────────────────────────────────────────

eatKernelRouter.get("/v1/environment", (_req: Request, res: Response) => {
  res.json({ success: true, schema_type: "ENVIRONMENT_STATE", data: environmentState });
});

eatKernelRouter.post("/v1/environment/configure", (req: Request, res: Response) => {
  const parsed = configureEnvSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "ERR_INVALID_PAYLOAD", issues: parsed.error.issues });
    return;
  }
  const { active_preset, target_temp, target_humidity, audio_gain, scent_interval } = parsed.data;

  if (active_preset)   environmentState.active_preset                        = active_preset;
  if (target_temp)     environmentState.climate.current_temp_fahrenheit       = parseFloat(String(target_temp));
  if (target_humidity) environmentState.climate.relative_humidity_pct         = parseFloat(String(target_humidity));
  if (audio_gain)      environmentState.audio.gain_db                         = parseFloat(String(audio_gain));
  if (scent_interval)  environmentState.scent.diffusion_interval_sec          = parseInt(String(scent_interval));

  broadcast("ENVIRONMENT_ALTERATION", environmentState);

  res.json({
    success:       true,
    message:       "Environmental variables dispatched to physical logic arrays successfully.",
    updated_state: environmentState,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ASSET VAULT CONSOLE
// ─────────────────────────────────────────────────────────────────────────────

eatKernelRouter.get("/v1/assets", (_req: Request, res: Response) => {
  res.json({
    success:     true,
    schema_type: "ASSET_VAULT_LEDGER",
    count:       assetVaultInventory.length,
    data:        assetVaultInventory,
  });
});

eatKernelRouter.post("/v1/assets/vault-override", (req: Request, res: Response) => {
  const parsed = vaultOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "ERR_INVALID_PAYLOAD", issues: parsed.error.issues });
    return;
  }

  const { manager_passcode, asset_id, force_disposition } = parsed.data;

  if (manager_passcode !== "3600") {
    res.status(403).json({ success: false, error: "ERR_AUTH_DENIED", message: "Invalid authorization profile token parameters." });
    return;
  }

  const targetedAsset = assetVaultInventory.find(item => item.id === asset_id);
  if (!targetedAsset) {
    res.status(404).json({ success: false, error: "ERR_SKU_MISMATCH", message: "Target asset identification tag signature missing." });
    return;
  }

  if (force_disposition) {
    targetedAsset.status = force_disposition;

    if (
      force_disposition === "UNLOCKED" &&
      !transactionTelemetry.active_ledger.some(l => l.designation === targetedAsset.designation)
    ) {
      transactionTelemetry.active_ledger.push({
        item_id:     transactionTelemetry.active_ledger.length + 1,
        designation: targetedAsset.designation,
        category:    "Vault Item",
        price:       125.00,
        status:      "Pending Vault Scan",
      });
      transactionTelemetry.estimated_billing_line_items_count = transactionTelemetry.active_ledger.length;
      transactionTelemetry.station_valuation_total            += 125.00;
    }
  }

  broadcast("ASSET_VAULT_MUTATION", assetVaultInventory);
  broadcast("TRANSACTION_ALTERATION", transactionTelemetry);

  res.json({ success: true, message: "Vault lock configuration mutated successfully.", target_asset: targetedAsset });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TRANSACTION CONSOLE
// ─────────────────────────────────────────────────────────────────────────────

eatKernelRouter.get("/v1/transactions", (_req: Request, res: Response) => {
  res.json({ success: true, schema_type: "TRANSACTION_TELEMETRY", data: transactionTelemetry });
});

eatKernelRouter.post("/v1/transactions/append", (req: Request, res: Response) => {
  const parsed = appendTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "ERR_MALFORMED_PAYLOAD", issues: parsed.error.issues });
    return;
  }

  const { designation, category, price } = parsed.data;
  const priceNum = parseFloat(String(price));

  const item: LedgerItem = {
    item_id:     transactionTelemetry.active_ledger.length + 1,
    designation,
    category:    category ?? "General Curation",
    price:       priceNum,
    status:      "Checked Out",
  };

  transactionTelemetry.active_ledger.push(item);
  transactionTelemetry.estimated_billing_line_items_count = transactionTelemetry.active_ledger.length;
  transactionTelemetry.station_valuation_total            += priceNum;

  broadcast("TRANSACTION_ALTERATION", transactionTelemetry);

  res.status(201).json({
    success:       true,
    message:       "Line item injected successfully into active point of sale checkout escrow stack.",
    active_ledger: transactionTelemetry.active_ledger,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SYSTEM VIEWPORT STABILIZATION
// ─────────────────────────────────────────────────────────────────────────────

eatKernelRouter.post("/v1/system/viewport-stabilization", (req: Request, res: Response) => {
  const parsed = viewportStabilizationSchema.safeParse(req.body);
  const enforce = parsed.success ? (parsed.data.enforce_high_readability ?? true) : true;

  const directives = {
    system_directive: enforce ? "ENFORCE_HIGH_READABILITY" : "RESTORE_DEFAULT_THEME",
    global_constraints: {
      override_ambient_lux_response: enforce,
      base_font_size_pt:             enforce ? 24 : 14,
      active_accent_hex:             "#D4AF37",
      surface_material_rendering:    "TRUE_OBSIDIAN_SOLID",
    },
  };

  broadcast("SYSTEM_VIEWPORT_OVERRIDE", directives);

  res.json({
    success: true,
    message: "High-Readability Viewport stabilization payload broadcasted to all terminal endpoints.",
    directives,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4b. ADMIN SYSTEM OVERRIDE — POST /api/v1/admin/system-override
// ─────────────────────────────────────────────────────────────────────────────

interface SystemThemeState {
  current_mode:       string;
  base_background_hex: string;
  primary_text_hex:   string;
  accent_glow_hex:    string;
}

let systemThemeState: SystemThemeState = {
  current_mode:        "IVORY_SOVEREIGN",
  base_background_hex: "#F9F8F6",
  primary_text_hex:    "#010101",
  accent_glow_hex:     "#D4AF37",
};

const adminOverrideSchema = z.object({
  action_directive: z.string().min(1).max(100),
  auth_token:       z.string().min(1),
});

eatKernelRouter.post("/v1/admin/system-override", (req: Request, res: Response) => {
  const parsed = adminOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "ERR_INVALID_PAYLOAD", issues: parsed.error.issues });
    return;
  }

  const { action_directive, auth_token } = parsed.data;

  if (auth_token !== "SOVEREIGN_360_AUTH") {
    res.status(403).json({
      success: false,
      error:   "ERR_AUTH_DENIED",
      message: "Administrative validation parameters mismatch. Access locked.",
    });
    return;
  }

  logger.info({ action_directive }, "TACTICAL OVERRIDE EXECUTION: dispatching directive");

  if (action_directive === "FORCE_HIGH_READABILITY") {
    systemThemeState.current_mode = "HIGH_READABILITY_IVORY";
  } else if (action_directive === "RESET_ACTIVE_VENUE") {
    systemThemeState.current_mode                                    = "IVORY_SOVEREIGN";
    environmentState.hardware_sliders.spatial_lux_level              = 4.5;
    environmentState.hardware_sliders.scent_atomization_volume_pct   = 65.0;
  } else if (action_directive === "RE-CALIBRATE_ENVIRONMENT") {
    environmentState.climate.current_temp_fahrenheit = 70.0;
    environmentState.climate.relative_humidity_pct   = 52.0;
    environmentState.climate.air_exchange_cfm        = 420.0;
    environmentState.climate.status                  = "OPTIMAL";
  }

  broadcast("ADMIN_DIRECTIVE_BROADCAST", {
    directive:         action_directive,
    theme_state:       systemThemeState,
    environment_reset: environmentState,
    origin_node:       "COMMAND_HUB_MASTER",
    dispatched_at:     new Date().toISOString(),
  });

  res.json({ success: true, applied_directive: action_directive, theme_state: systemThemeState });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. VENUE EVENTS  — GET /api/events/venue/:venueId
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_EVENTS = [
  { id: "ev-001", title: "Reserve Night: Padrón 1926",       starts_at: "2026-05-22T20:00:00Z", type: "tasting",  capacity: 20, registered: 14, description: "An intimate evening with Padrón's crown jewel."      },
  { id: "ev-002", title: "Master Mixologist Showcase",        starts_at: "2026-05-23T19:30:00Z", type: "spirits",  capacity: 30, registered: 22, description: "Hand-crafted cocktail pairings with aged Scotch."   },
  { id: "ev-003", title: "Lounge League Finals — VIP Tier",  starts_at: "2026-05-24T21:00:00Z", type: "league",   capacity: 50, registered: 41, description: "Championship round of the Lounge League season."    },
  { id: "ev-004", title: "New Arrival: Opus X Double Corona", starts_at: "2026-05-25T18:00:00Z", type: "preview",  capacity: 15, registered: 8,  description: "First pour event for the new Opus X Double Corona." },
];

eatKernelRouter.get("/events/venue/:venueId", (req: Request, res: Response) => {
  // venueId is accepted but events are the same across venues in this initial implementation
  const { venueId } = req.params as { venueId: string };
  res.json({ venueId, events: SAMPLE_EVENTS, total: SAMPLE_EVENTS.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. STAFF FLOOR TABLE POSITION — PATCH /api/staffFloor/table/:id
// ─────────────────────────────────────────────────────────────────────────────

eatKernelRouter.patch("/staffFloor/table/:id", (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const parsed = tablePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", issues: parsed.error.issues });
    return;
  }

  const existing = floorTablePositions.get(id) ?? { id, x: 0, y: 0 };
  const updated: FloorTable = {
    id,
    x: parsed.data.x ?? existing.x,
    y: parsed.data.y ?? existing.y,
  };
  floorTablePositions.set(id, updated);

  logger.info({ tableId: id, x: updated.x, y: updated.y }, "floor table position updated");
  res.json({ ok: true, table: updated });
});
