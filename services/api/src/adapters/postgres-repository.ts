import type { WorkflowRepository } from "../domain/ports.js";
import type {
  ActionToken,
  Booking,
  CreateBookingRequest,
  Winery,
  WineryAvailability,
} from "../domain/models.js";
import { getPool } from "../lib/db.js";
import { makeId } from "../lib/crypto.js";

function formatPgDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    bookingId: String(row.booking_id),
    leadName: String(row.lead_name),
    leadPhone: row.lead_phone ? String(row.lead_phone) : undefined,
    leadEmail: row.lead_email ? String(row.lead_email) : undefined,
    bookingDate: formatPgDate(row.booking_date),
    pickupLocation: String(row.pickup_location),
    partySize: Number(row.party_size),
    preferredRegion: row.preferred_region ? String(row.preferred_region) : undefined,
    preferredWineries: Array.isArray(row.preferred_wineries)
      ? row.preferred_wineries.map((value) => String(value))
      : [],
    status: row.status as Booking["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapWinery(row: Record<string, unknown>): Winery {
  return {
    wineryId: String(row.winery_id),
    name: String(row.name),
    region: String(row.region),
    confirmationMode: row.confirmation_mode as Winery["confirmationMode"],
    capacity: Number(row.capacity),
    active: Boolean(row.active),
  };
}

function mapAvailability(row: Record<string, unknown>): WineryAvailability {
  return {
    availabilityId: String(row.availability_id),
    wineryId: String(row.winery_id),
    serviceDate: formatPgDate(row.service_date),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    remainingCapacity: Number(row.remaining_capacity),
    status: row.status as WineryAvailability["status"],
  };
}

function mapActionToken(row: Record<string, unknown>): ActionToken {
  return {
    tokenId: String(row.token_id),
    bookingId: String(row.booking_id),
    tokenType: row.token_type as ActionToken["tokenType"],
    targetType: row.target_type as ActionToken["targetType"],
    targetId: row.target_id ? String(row.target_id) : undefined,
    tokenHash: String(row.token_hash),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    status: row.status as ActionToken["status"],
    usedAt: row.used_at ? new Date(String(row.used_at)).toISOString() : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export class PostgresWorkflowRepository implements WorkflowRepository {
  async getWineries(): Promise<Winery[]> {
    const pool = getPool();
    const result = await pool.query(`
      select winery_id, name, region, confirmation_mode, capacity, active
      from winery
      order by name asc
    `);

    return result.rows.map((row) => mapWinery(row));
  }

  async getAvailabilityForDate(serviceDate: string): Promise<WineryAvailability[]> {
    const pool = getPool();
    const result = await pool.query(
      `
        select availability_id, winery_id, service_date, start_time, end_time, remaining_capacity, status
        from winery_availability
        where service_date = $1
        order by start_time asc
      `,
      [serviceDate],
    );

    return result.rows.map((row) => mapAvailability(row));
  }

  async createBooking(request: CreateBookingRequest): Promise<Booking> {
    const pool = getPool();
    const bookingId = makeId();
    const result = await pool.query(
      `
        insert into booking (
          booking_id,
          lead_name,
          lead_phone,
          lead_email,
          booking_date,
          pickup_location,
          party_size,
          preferred_region,
          preferred_wineries,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid[], 'draft')
        returning booking_id, lead_name, lead_phone, lead_email, booking_date, pickup_location, party_size,
                  preferred_region, preferred_wineries, status, created_at, updated_at
      `,
      [
        bookingId,
        request.lead_name,
        request.lead_phone ?? null,
        request.lead_email ?? null,
        request.booking_date,
        request.pickup_location,
        request.party_size,
        request.preferred_region ?? null,
        request.preferred_wineries ?? [],
      ],
    );

    return mapBooking(result.rows[0]);
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        select booking_id, lead_name, lead_phone, lead_email, booking_date, pickup_location, party_size,
               preferred_region, preferred_wineries, status, created_at, updated_at
        from booking
        where booking_id = $1
      `,
      [bookingId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapBooking(result.rows[0]);
  }

  async saveActionToken(token: ActionToken): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
        insert into action_token (
          token_id,
          booking_id,
          token_type,
          target_type,
          target_id,
          token_hash,
          expires_at,
          status,
          used_at,
          created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        token.tokenId,
        token.bookingId,
        token.tokenType,
        token.targetType,
        token.targetId ?? null,
        token.tokenHash,
        token.expiresAt,
        token.status,
        token.usedAt ?? null,
        token.createdAt,
      ],
    );
  }

  async getActionToken(tokenId: string): Promise<ActionToken | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        select token_id, booking_id, token_type, target_type, target_id, token_hash,
               expires_at, status, used_at, created_at
        from action_token
        where token_id = $1
      `,
      [tokenId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapActionToken(result.rows[0]);
  }

  async markActionTokenUsed(tokenId: string): Promise<ActionToken | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        update action_token
        set status = 'used', used_at = now()
        where token_id = $1
        returning token_id, booking_id, token_type, target_type, target_id, token_hash,
                  expires_at, status, used_at, created_at
      `,
      [tokenId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapActionToken(result.rows[0]);
  }
}

