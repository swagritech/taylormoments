import type { WorkflowRepository } from "../domain/ports.js";
import type {
  WinerySignal,
  WineStyle,
  ActionToken,
  Booking,
  CreateBookingRequest,
  PasswordResetToken,
  UserAccount,
  WineryBookingRequest,
  WineryContact,
  Winery,
  WineryAvailability,
  WineryMediaAsset,
} from "../domain/models.js";
import { getPool } from "../lib/db.js";
import { makeId } from "../lib/crypto.js";

const allowedWineStyles = new Set<WineStyle>([
  "Organic & Biodynamic",
  "Natural & Minimal Intervention",
  "Small batch & Boutique",
  "Family-owned Estate",
  "Estate-grown fruit only",
  "Well known Margaret River Name",
  "Lesser known (off the beaten track)",
  "Red Wine Specialist",
  "White Wine Specialist",
  "Sparkling & Method traditionnelle Specialist",
  "Fortfied & Desert Wines",
  "Internationally awarded",
  "Wines only available at cellar door",
]);

const allowedWinerySignals = new Set<WinerySignal>([
  "view_stunning",
  "intimate_welcome",
  "historic_estate",
  "secluded",
  "garden_picnic",
  "mandarin_staff",
  "vietnamese_staff",
  "asian_pairing",
  "wechat_line",
  "hosted_asian_groups",
  "wheelchair_access",
  "minibus_parking",
  "dog_friendly",
  "child_friendly",
  "close_to_town",
  "halliday_5star",
  "gold_medals",
  "exported_asia",
  "trophy_winner",
  "press_featured",
  "multi_generation",
  "female_winemaker",
  "certified_organic",
  "regenerative",
  "small_production",
]);

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
    preferredStartTime: row.preferred_start_time ? String(row.preferred_start_time).slice(0, 5) : undefined,
    preferredEndTime: row.preferred_end_time ? String(row.preferred_end_time).slice(0, 5) : undefined,
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
  const rawOffers = Array.isArray(row.unique_experience_offers)
    ? row.unique_experience_offers
    : [];
  const rawWineStyles = Array.isArray(row.wine_styles)
    ? row.wine_styles
    : [];
  const rawWinerySignals = Array.isArray(row.winery_signals)
    ? row.winery_signals
    : [];

  return {
    wineryId: String(row.winery_id),
    name: String(row.name),
    region: String(row.region),
    confirmationMode: row.confirmation_mode as Winery["confirmationMode"],
    capacity: Number(row.capacity),
    latitude: row.latitude !== null && row.latitude !== undefined
      ? Number(row.latitude)
      : undefined,
    longitude: row.longitude !== null && row.longitude !== undefined
      ? Number(row.longitude)
      : undefined,
    address: row.address ? String(row.address) : undefined,
    openingHours: row.opening_hours ? String(row.opening_hours) : undefined,
    active: Boolean(row.active),
    tastingPrice: row.tasting_price !== null && row.tasting_price !== undefined
      ? Number(row.tasting_price)
      : undefined,
    tastingDurationMinutes: row.tasting_duration_minutes !== null && row.tasting_duration_minutes !== undefined
      ? Number(row.tasting_duration_minutes)
      : undefined,
    description: row.description ? String(row.description) : undefined,
    famousFor: row.famous_for ? String(row.famous_for) : undefined,
    offersCheeseBoard: Boolean(row.offers_cheese_board),
    uniqueExperienceOffers: rawOffers
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const candidate = entry as Record<string, unknown>;
        const name = candidate.name ? String(candidate.name).trim() : "";
        const price = Number(candidate.price);
        if (!name || !Number.isFinite(price)) {
          return null;
        }
        return { name, price };
      })
      .filter((entry): entry is { name: string; price: number } => Boolean(entry)),
    wineStyles: rawWineStyles
      .map((entry) => String(entry).trim())
      .filter((entry): entry is WineStyle => allowedWineStyles.has(entry as WineStyle)),
    winerySignals: rawWinerySignals
      .map((entry) => String(entry).trim())
      .filter((entry): entry is WinerySignal => allowedWinerySignals.has(entry as WinerySignal)),
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

function mapWineryContact(row: Record<string, unknown>): WineryContact {
  return {
    wineryId: String(row.winery_id),
    contactName: row.contact_name ? String(row.contact_name) : undefined,
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    preferredChannel: row.preferred_channel as WineryContact["preferredChannel"],
  };
}

function mapWineryBookingRequest(row: Record<string, unknown>): WineryBookingRequest {
  return {
    requestId: String(row.request_id),
    bookingId: String(row.booking_id),
    wineryId: String(row.winery_id),
    actionTokenId: String(row.action_token_id),
    actionUrl: String(row.action_url),
    status: row.status as WineryBookingRequest["status"],
    sentChannel: row.sent_channel as WineryBookingRequest["sentChannel"],
    sentRecipient: row.sent_recipient ? String(row.sent_recipient) : undefined,
    sentAt: new Date(String(row.sent_at)).toISOString(),
    approvedAt: row.approved_at ? new Date(String(row.approved_at)).toISOString() : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapWineryMediaAsset(row: Record<string, unknown>): WineryMediaAsset {
  return {
    mediaId: String(row.media_id),
    wineryId: String(row.winery_id),
    objectKey: String(row.object_key),
    publicUrl: String(row.public_url),
    fileName: String(row.file_name),
    contentType: String(row.content_type),
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
    caption: row.caption ? String(row.caption) : undefined,
    status: row.status as WineryMediaAsset["status"],
    uploadedByUserId: row.uploaded_by_user_id ? String(row.uploaded_by_user_id) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapUserAccount(row: Record<string, unknown>): UserAccount {
  return {
    userId: String(row.user_id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role as UserAccount["role"],
    displayName: String(row.display_name),
    firstName: row.first_name ? String(row.first_name) : undefined,
    lastName: row.last_name ? String(row.last_name) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    homeCountry: row.home_country ? String(row.home_country) : undefined,
    ageGroup: row.age_group ? String(row.age_group) : undefined,
    gender: row.gender ? String(row.gender) : undefined,
    wineryId: row.winery_id ? String(row.winery_id) : undefined,
    transportCompany: row.transport_company ? String(row.transport_company) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapPasswordResetToken(row: Record<string, unknown>): PasswordResetToken {
  return {
    tokenId: String(row.token_id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    status: row.status as PasswordResetToken["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    usedAt: row.used_at ? new Date(String(row.used_at)).toISOString() : undefined,
  };
}

export class PostgresWorkflowRepository implements WorkflowRepository {
  async getWineries(): Promise<Winery[]> {
    const pool = getPool();
    const result = await pool.query(`
      select distinct on (lower(name))
             winery_id, name, region, confirmation_mode, capacity, latitude, longitude, address, opening_hours, active,
             tasting_price, tasting_duration_minutes, description, famous_for, offers_cheese_board, unique_experience_offers, wine_styles, winery_signals
      from winery
      order by lower(name) asc, updated_at desc, created_at desc
    `);

    return result.rows.map((row) => mapWinery(row));
  }

  async getWineryById(wineryId: string): Promise<Winery | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        select winery_id, name, region, confirmation_mode, capacity, latitude, longitude, active,
               address, opening_hours,
               tasting_price, tasting_duration_minutes, description, famous_for, offers_cheese_board, unique_experience_offers, wine_styles, winery_signals
        from winery
        where winery_id = $1
      `,
      [wineryId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapWinery(result.rows[0]);
  }

  async updateWineryProfile(request: {
    wineryId: string;
    capacity: number;
    address?: string;
    openingHours?: string;
    tastingPrice?: number;
    tastingDurationMinutes?: number;
    description?: string;
    famousFor?: string;
    offersCheeseBoard: boolean;
    uniqueExperienceOffers: Array<{ name: string; price: number }>;
    wineStyles: Winery["wineStyles"];
    winerySignals: Winery["winerySignals"];
  }): Promise<Winery | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        update winery
        set capacity = $2,
            address = $3,
            opening_hours = $4,
            tasting_price = $5,
            tasting_duration_minutes = coalesce($10, tasting_duration_minutes),
            description = $6,
            famous_for = $7,
            offers_cheese_board = $8,
            unique_experience_offers = $9::jsonb,
            wine_styles = $11::jsonb,
            winery_signals = $12::jsonb,
            updated_at = now()
        where winery_id = $1
        returning winery_id, name, region, confirmation_mode, capacity, latitude, longitude, address, opening_hours, active,
                  tasting_price, tasting_duration_minutes, description, famous_for, offers_cheese_board, unique_experience_offers, wine_styles, winery_signals
      `,
      [
        request.wineryId,
        request.capacity,
        request.address ?? null,
        request.openingHours ?? null,
        request.tastingPrice ?? null,
        request.description ?? null,
        request.famousFor ?? null,
        request.offersCheeseBoard,
        JSON.stringify(request.uniqueExperienceOffers ?? []),
        request.tastingDurationMinutes ?? null,
        JSON.stringify(request.wineStyles ?? []),
        JSON.stringify(request.winerySignals ?? []),
      ],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapWinery(result.rows[0]);
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
          preferred_start_time,
          preferred_end_time,
          pickup_location,
          party_size,
          preferred_region,
          preferred_wineries,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid[], 'awaiting_winery')
        returning booking_id, lead_name, lead_phone, lead_email, booking_date, preferred_start_time, preferred_end_time,
                  pickup_location, party_size, preferred_region, preferred_wineries, status, created_at, updated_at
      `,
      [
        bookingId,
        request.lead_name,
        request.lead_phone ?? null,
        request.lead_email ?? null,
        request.booking_date,
        request.preferred_start_time ?? null,
        request.preferred_end_time ?? null,
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
        select booking_id, lead_name, lead_phone, lead_email, booking_date, preferred_start_time, preferred_end_time,
               pickup_location, party_size,
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

  async listBookingsByLeadEmail(email: string): Promise<Booking[]> {
    const pool = getPool();
    const result = await pool.query(
      `
        select booking_id, lead_name, lead_phone, lead_email, booking_date, preferred_start_time, preferred_end_time,
               pickup_location, party_size, preferred_region, preferred_wineries, status, created_at, updated_at
        from booking
        where lower(lead_email) = lower($1)
        order by created_at desc
      `,
      [email],
    );

    return result.rows.map((row) => mapBooking(row));
  }

  async getWineryContact(wineryId: string): Promise<WineryContact | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        select winery_id, contact_name, email, phone, preferred_channel
        from winery_contact
        where winery_id = $1
      `,
      [wineryId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapWineryContact(result.rows[0]);
  }

  async createWineryBookingRequest(
    request: Omit<WineryBookingRequest, "createdAt" | "updatedAt">,
  ): Promise<WineryBookingRequest> {
    const pool = getPool();
    const result = await pool.query(
      `
        insert into winery_booking_request (
          request_id,
          booking_id,
          winery_id,
          action_token_id,
          action_url,
          status,
          sent_channel,
          sent_recipient,
          sent_at,
          approved_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning request_id, booking_id, winery_id, action_token_id, action_url, status,
                  sent_channel, sent_recipient, sent_at, approved_at, created_at, updated_at
      `,
      [
        request.requestId,
        request.bookingId,
        request.wineryId,
        request.actionTokenId,
        request.actionUrl,
        request.status,
        request.sentChannel,
        request.sentRecipient ?? null,
        request.sentAt,
        request.approvedAt ?? null,
      ],
    );

    return mapWineryBookingRequest(result.rows[0]);
  }

  async listWineryBookingRequests(wineryId: string): Promise<WineryBookingRequest[]> {
    const pool = getPool();
    const result = await pool.query(
      `
        select request_id, booking_id, winery_id, action_token_id, action_url, status,
               sent_channel, sent_recipient, sent_at, approved_at, created_at, updated_at
        from winery_booking_request
        where winery_id = $1
        order by created_at desc
      `,
      [wineryId],
    );

    return result.rows.map((row) => mapWineryBookingRequest(row));
  }

  async markWineryBookingRequestAccepted(tokenId: string): Promise<WineryBookingRequest | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        update winery_booking_request
        set status = 'accepted', approved_at = now(), updated_at = now()
        where action_token_id = $1
        returning request_id, booking_id, winery_id, action_token_id, action_url, status,
                  sent_channel, sent_recipient, sent_at, approved_at, created_at, updated_at
      `,
      [tokenId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapWineryBookingRequest(result.rows[0]);
  }

  async createWineryMediaAsset(
    request: Omit<WineryMediaAsset, "createdAt" | "updatedAt">,
  ): Promise<WineryMediaAsset> {
    const pool = getPool();
    const result = await pool.query(
      `
        insert into winery_media_asset (
          media_id,
          winery_id,
          object_key,
          public_url,
          file_name,
          content_type,
          file_size_bytes,
          caption,
          status,
          uploaded_by_user_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning media_id, winery_id, object_key, public_url, file_name, content_type, file_size_bytes, caption,
                  status, uploaded_by_user_id, created_at, updated_at
      `,
      [
        request.mediaId,
        request.wineryId,
        request.objectKey,
        request.publicUrl,
        request.fileName,
        request.contentType,
        request.fileSizeBytes ?? null,
        request.caption ?? null,
        request.status,
        request.uploadedByUserId ?? null,
      ],
    );

    return mapWineryMediaAsset(result.rows[0]);
  }

  async listWineryMediaAssets(wineryId: string): Promise<WineryMediaAsset[]> {
    const pool = getPool();
    const result = await pool.query(
      `
        select media_id, winery_id, object_key, public_url, file_name, content_type, file_size_bytes, caption,
               status, uploaded_by_user_id, created_at, updated_at
        from winery_media_asset
        where winery_id = $1
          and status <> 'archived'
        order by created_at desc
      `,
      [wineryId],
    );

    return result.rows.map((row) => mapWineryMediaAsset(row));
  }

  async markWineryMediaAssetUploaded(
    mediaId: string,
    wineryId: string,
    fileSizeBytes?: number,
  ): Promise<WineryMediaAsset | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        update winery_media_asset
        set status = 'uploaded',
            file_size_bytes = coalesce($3, file_size_bytes),
            updated_at = now()
        where media_id = $1
          and winery_id = $2
        returning media_id, winery_id, object_key, public_url, file_name, content_type, file_size_bytes, caption,
                  status, uploaded_by_user_id, created_at, updated_at
      `,
      [mediaId, wineryId, fileSizeBytes ?? null],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapWineryMediaAsset(result.rows[0]);
  }

  async archiveWineryMediaAsset(mediaId: string, wineryId: string): Promise<WineryMediaAsset | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        update winery_media_asset
        set status = 'archived',
            updated_at = now()
        where media_id = $1
          and winery_id = $2
        returning media_id, winery_id, object_key, public_url, file_name, content_type, file_size_bytes, caption,
                  status, uploaded_by_user_id, created_at, updated_at
      `,
      [mediaId, wineryId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapWineryMediaAsset(result.rows[0]);
  }

  async createUserAccount(request: {
    email: string;
    password: string;
    role: "customer" | "winery" | "transport" | "ops";
    display_name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    home_country?: string;
    age_group?: string;
    gender?: string;
    winery_id?: string;
    transport_company?: string;
    password_hash: string;
  }): Promise<UserAccount> {
    const pool = getPool();
    const userId = makeId();
    const result = await pool.query(
      `
        insert into user_account (
          user_id,
          email,
          password_hash,
          role,
          display_name,
          first_name,
          last_name,
          phone,
          home_country,
          age_group,
          gender,
          winery_id,
          transport_company
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        returning user_id, email, password_hash, role, display_name, first_name, last_name, phone, home_country, age_group, gender,
                  winery_id, transport_company, created_at, updated_at
      `,
      [
        userId,
        request.email.toLowerCase(),
        request.password_hash,
        request.role,
        request.display_name,
        request.first_name ?? null,
        request.last_name ?? null,
        request.phone ?? null,
        request.home_country ?? null,
        request.age_group ?? null,
        request.gender ?? null,
        request.winery_id ?? null,
        request.transport_company ?? null,
      ],
    );

    return mapUserAccount(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<UserAccount | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        select user_id, email, password_hash, role, display_name, first_name, last_name, phone, home_country, age_group, gender,
               winery_id, transport_company, created_at, updated_at
        from user_account
        where email = $1
      `,
      [email.toLowerCase()],
    );

    if (result.rowCount === 0) {
      return null;
    }
    return mapUserAccount(result.rows[0]);
  }

  async getUserById(userId: string): Promise<UserAccount | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        select user_id, email, password_hash, role, display_name, first_name, last_name, phone, home_country, age_group, gender,
               winery_id, transport_company, created_at, updated_at
        from user_account
        where user_id = $1
      `,
      [userId],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserAccount(result.rows[0]);
  }

  async updateUserPasswordByUserId(userId: string, passwordHash: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      `
        update user_account
        set password_hash = $2, updated_at = now()
        where user_id = $1
      `,
      [userId, passwordHash],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserPasswordByEmail(email: string, passwordHash: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      `
        update user_account
        set password_hash = $2, updated_at = now()
        where lower(email) = lower($1)
      `,
      [email, passwordHash],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async savePasswordResetToken(token: PasswordResetToken): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
        insert into password_reset_token (
          token_id,
          user_id,
          token_hash,
          expires_at,
          status,
          created_at,
          used_at
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        token.tokenId,
        token.userId,
        token.tokenHash,
        token.expiresAt,
        token.status,
        token.createdAt,
        token.usedAt ?? null,
      ],
    );
  }

  async getPasswordResetToken(tokenId: string): Promise<PasswordResetToken | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        select token_id, user_id, token_hash, expires_at, status, created_at, used_at
        from password_reset_token
        where token_id = $1
      `,
      [tokenId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapPasswordResetToken(result.rows[0]);
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<PasswordResetToken | null> {
    const pool = getPool();
    const result = await pool.query(
      `
        update password_reset_token
        set status = 'used', used_at = now()
        where token_id = $1
        returning token_id, user_id, token_hash, expires_at, status, created_at, used_at
      `,
      [tokenId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapPasswordResetToken(result.rows[0]);
  }

  async expireActivePasswordResetTokensForUser(userId: string): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `
        update password_reset_token
        set status = 'expired'
        where user_id = $1
          and status = 'active'
      `,
      [userId],
    );

    return result.rowCount ?? 0;
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
