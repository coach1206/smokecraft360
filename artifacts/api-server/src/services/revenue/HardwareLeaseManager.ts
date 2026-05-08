/**
 * HardwareLeaseManager — Lease + Rental Tracking.
 *
 * Manages the full lifecycle of hardware leases (long-term) and
 * rentals (short-term event/demo deployments).
 *
 * Lease lifecycle: quoted → active → maintenance_due → terminated/completed
 * Rental lifecycle: booked → active → returned / overdue
 */

import { pool } from "@workspace/db";

export interface HardwareLease {
  id:                  string;
  venueId:             string;
  deviceType:          string;
  serialNumber?:       string;
  leaseStart:          string;
  leaseEnd?:           string;
  monthlyCents:        number;
  setupFeeCents:       number;
  status:              "active" | "paused" | "terminated" | "completed";
  maintenanceSchedule?: "monthly" | "quarterly" | "annual";
  nextMaintenanceAt?:  string;
  ownershipStatus:     "axiom_owned" | "financed" | "byod";
  financingTerms:      Record<string, unknown>;
}

export interface HardwareRental {
  id:            string;
  venueId:       string;
  deviceType:    string;
  rentalStart:   string;
  rentalEnd:     string;
  dailyRateCents: number;
  depositCents:  number;
  setupFeeCents: number;
  status:        "active" | "returned" | "overdue" | "cancelled";
  purpose?:      string;
  totalCents:    number;
}

export class HardwareLeaseManager {

  static async createLease(params: Omit<HardwareLease, "id">): Promise<HardwareLease> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO hardware_leases
         (venue_id, device_type, serial_number, lease_start, lease_end, monthly_cents,
          setup_fee_cents, status, maintenance_schedule, next_maintenance_at,
          ownership_status, financing_terms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        params.venueId, params.deviceType, params.serialNumber ?? null,
        params.leaseStart, params.leaseEnd ?? null,
        params.monthlyCents, params.setupFeeCents, params.status,
        params.maintenanceSchedule ?? null, params.nextMaintenanceAt ?? null,
        params.ownershipStatus, JSON.stringify(params.financingTerms),
      ],
    );
    return { ...params, id: rows[0]!.id };
  }

  static async createRental(params: Omit<HardwareRental, "id" | "totalCents">): Promise<HardwareRental> {
    const days       = Math.max(1, Math.ceil((new Date(params.rentalEnd).getTime() - new Date(params.rentalStart).getTime()) / 86400000));
    const totalCents = params.dailyRateCents * days + params.setupFeeCents + params.depositCents;

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO hardware_rentals
         (venue_id, device_type, rental_start, rental_end, daily_rate_cents, deposit_cents, setup_fee_cents, status, purpose)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [params.venueId, params.deviceType, params.rentalStart, params.rentalEnd,
       params.dailyRateCents, params.depositCents, params.setupFeeCents, params.status, params.purpose ?? null],
    );
    return { ...params, id: rows[0]!.id, totalCents };
  }

  static async updateLeaseStatus(id: string, status: HardwareLease["status"]): Promise<void> {
    await pool.query(`UPDATE hardware_leases SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
  }

  static async listByVenue(venueId: string): Promise<{ leases: HardwareLease[]; rentals: HardwareRental[] }> {
    const [leaseRows, rentalRows] = await Promise.all([
      pool.query<{ id: string; venue_id: string; device_type: string; serial_number: string | null; lease_start: string; lease_end: string | null; monthly_cents: number; setup_fee_cents: number; status: string; maintenance_schedule: string | null; next_maintenance_at: string | null; ownership_status: string; financing_terms: unknown }>(
        `SELECT * FROM hardware_leases WHERE venue_id = $1 ORDER BY lease_start DESC`, [venueId],
      ).catch(() => ({ rows: [] as never[] })),
      pool.query<{ id: string; venue_id: string; device_type: string; rental_start: string; rental_end: string; daily_rate_cents: number; deposit_cents: number; setup_fee_cents: number; status: string; purpose: string | null }>(
        `SELECT * FROM hardware_rentals WHERE venue_id = $1 ORDER BY rental_start DESC`, [venueId],
      ).catch(() => ({ rows: [] as never[] })),
    ]);

    return {
      leases: leaseRows.rows.map(r => ({
        id: r.id, venueId: r.venue_id, deviceType: r.device_type,
        serialNumber: r.serial_number ?? undefined,
        leaseStart: r.lease_start, leaseEnd: r.lease_end ?? undefined,
        monthlyCents: r.monthly_cents, setupFeeCents: r.setup_fee_cents,
        status: r.status as HardwareLease["status"],
        maintenanceSchedule: r.maintenance_schedule as HardwareLease["maintenanceSchedule"],
        nextMaintenanceAt: r.next_maintenance_at ?? undefined,
        ownershipStatus: r.ownership_status as HardwareLease["ownershipStatus"],
        financingTerms: (r.financing_terms as Record<string, unknown>) ?? {},
      })),
      rentals: rentalRows.rows.map(r => {
        const days = Math.max(1, Math.ceil((new Date(r.rental_end).getTime() - new Date(r.rental_start).getTime()) / 86400000));
        return {
          id: r.id, venueId: r.venue_id, deviceType: r.device_type,
          rentalStart: r.rental_start, rentalEnd: r.rental_end,
          dailyRateCents: r.daily_rate_cents, depositCents: r.deposit_cents,
          setupFeeCents: r.setup_fee_cents,
          status: r.status as HardwareRental["status"],
          purpose: r.purpose ?? undefined,
          totalCents: r.daily_rate_cents * days + r.setup_fee_cents + r.deposit_cents,
        };
      }),
    };
  }

  static async getPlatformHardwareMrr(): Promise<{ leaseMrr: number; rentalMrr: number; total: number }> {
    const [lRow, rRow] = await Promise.all([
      pool.query<{ mrr: string }>(`SELECT COALESCE(SUM(monthly_cents),0) AS mrr FROM hardware_leases WHERE status = 'active'`).catch(() => ({ rows: [{ mrr: "0" }] })),
      pool.query<{ mrr: string }>(`SELECT COALESCE(SUM(daily_rate_cents * GREATEST(EXTRACT(EPOCH FROM (rental_end - rental_start)) / 86400, 1) / 30),0) AS mrr FROM hardware_rentals WHERE status = 'active'`).catch(() => ({ rows: [{ mrr: "0" }] })),
    ]);
    const lease  = parseInt(lRow.rows[0]!.mrr, 10);
    const rental = Math.round(parseFloat(rRow.rows[0]!.mrr));
    return { leaseMrr: lease, rentalMrr: rental, total: lease + rental };
  }
}
