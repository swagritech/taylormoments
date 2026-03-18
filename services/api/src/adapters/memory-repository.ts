import type { WorkflowRepository } from "../domain/ports.js";
import type {
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
import { makeId, nowIso } from "../lib/crypto.js";

const wineries: Winery[] = [
  {
    wineryId: "11111111-1111-1111-1111-111111111111",
    name: "Vasse Felix",
    region: "Wilyabrup",
    confirmationMode: "auto_confirm",
    capacity: 10,
    latitude: -33.81799462,
    longitude: 115.03681765,
    address: "4357 Caves Rd, Wilyabrup WA 6280",
    openingHours: "Daily 10:00-17:00",
    active: true,
    tastingPrice: 35,
    tastingDurationMinutes: 45,
    description: "Founding Margaret River estate with premium tastings and vineyard views.",
    famousFor: "Cabernet Sauvignon and Chardonnay",
    offersCheeseBoard: true,
    uniqueExperienceOffers: [{ name: "Estate tour", price: 70 }],
    wineStyles: ["Well known Margaret River Name", "Internationally awarded"],
  },
  {
    wineryId: "22222222-2222-2222-2222-222222222222",
    name: "Cullen Wines",
    region: "Wilyabrup",
    confirmationMode: "manual_review",
    capacity: 12,
    latitude: -33.81791409,
    longitude: 115.03893560,
    address: "4323 Caves Rd, Wilyabrup WA 6280",
    openingHours: "Daily 10:00-17:00",
    active: true,
    tastingPrice: 40,
    tastingDurationMinutes: 45,
    description: "Biodynamic winery known for immersive food and wine experiences.",
    famousFor: "Biodynamic wines and dining",
    offersCheeseBoard: true,
    uniqueExperienceOffers: [{ name: "Private biodynamic tasting", price: 95 }],
    wineStyles: ["Organic & Biodynamic", "Well known Margaret River Name"],
  },
  {
    wineryId: "33333333-3333-3333-3333-333333333333",
    name: "Fraser Gallop Estate",
    region: "Wilyabrup",
    confirmationMode: "auto_confirm",
    capacity: 8,
    latitude: -33.78755329,
    longitude: 115.07903354,
    address: "281 Treeton Rd, Wilyabrup WA 6280",
    openingHours: "Daily 10:00-16:30",
    active: true,
    tastingPrice: 30,
    tastingDurationMinutes: 45,
    description: "Boutique estate delivering classic Margaret River varietals.",
    famousFor: "Parterre Cabernet Sauvignon",
    offersCheeseBoard: false,
    uniqueExperienceOffers: [{ name: "Library release tasting", price: 80 }],
    wineStyles: ["Small batch & Boutique", "Red Wine Specialist"],
  },
  {
    wineryId: "44444444-4444-4444-4444-444444444444",
    name: "Woodlands Wines",
    region: "Wilyabrup",
    confirmationMode: "manual_review",
    capacity: 14,
    latitude: -33.78835900,
    longitude: 115.03129902,
    address: "3948 Caves Rd, Wilyabrup WA 6280",
    openingHours: "Daily 10:00-17:00",
    active: true,
    tastingPrice: 25,
    tastingDurationMinutes: 45,
    description: "Family-run estate with relaxed tastings in a heritage setting.",
    famousFor: "Classic reds and warm hospitality",
    offersCheeseBoard: true,
    uniqueExperienceOffers: [{ name: "Winemaker meet-and-greet", price: 60 }],
    wineStyles: ["Family-owned Estate", "Small batch & Boutique"],
  },
];

const wineryContacts = new Map<string, WineryContact>([
  [
    "11111111-1111-1111-1111-111111111111",
    {
      wineryId: "11111111-1111-1111-1111-111111111111",
      contactName: "Vasse Felix Cellar Door",
      email: "bookings@vassefelix.example",
      phone: "+61412000001",
      preferredChannel: "email",
    },
  ],
  [
    "22222222-2222-2222-2222-222222222222",
    {
      wineryId: "22222222-2222-2222-2222-222222222222",
      contactName: "Cullen Wines Host Team",
      email: "hosting@cullenwines.example",
      phone: "+61412000002",
      preferredChannel: "email",
    },
  ],
  [
    "33333333-3333-3333-3333-333333333333",
    {
      wineryId: "33333333-3333-3333-3333-333333333333",
      contactName: "Fraser Gallop Concierge",
      email: "team@frasergallop.example",
      phone: "+61412000003",
      preferredChannel: "sms",
    },
  ],
  [
    "44444444-4444-4444-4444-444444444444",
    {
      wineryId: "44444444-4444-4444-4444-444444444444",
      contactName: "Woodlands Hosting Team",
      email: "concierge@woodlandswines.example",
      phone: "+61412000004",
      preferredChannel: "email",
    },
  ],
]);

const availability: WineryAvailability[] = [
  { availabilityId: makeId(), wineryId: wineries[0].wineryId, serviceDate: "2026-04-10", startTime: "10:00", endTime: "11:15", remainingCapacity: 8, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[1].wineryId, serviceDate: "2026-04-10", startTime: "11:30", endTime: "12:30", remainingCapacity: 10, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[2].wineryId, serviceDate: "2026-04-10", startTime: "09:45", endTime: "11:15", remainingCapacity: 6, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[3].wineryId, serviceDate: "2026-04-10", startTime: "12:30", endTime: "13:45", remainingCapacity: 12, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[0].wineryId, serviceDate: "2026-04-11", startTime: "10:15", endTime: "11:30", remainingCapacity: 10, status: "open" },
];

const bookings = new Map<string, Booking>();
const tokens = new Map<string, ActionToken>();
const wineryRequests = new Map<string, WineryBookingRequest>();
const wineryMediaAssets = new Map<string, WineryMediaAsset>();
const users = new Map<string, UserAccount>();
const passwordResetTokens = new Map<string, PasswordResetToken>();

export class MemoryWorkflowRepository implements WorkflowRepository {
  async getWineries(): Promise<Winery[]> {
    return wineries;
  }

  async getWineryById(wineryId: string): Promise<Winery | null> {
    return wineries.find((item) => item.wineryId === wineryId) ?? null;
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
  }): Promise<Winery | null> {
    const index = wineries.findIndex((item) => item.wineryId === request.wineryId);
    if (index < 0) {
      return null;
    }

    const current = wineries[index];
    wineries[index] = {
      ...current,
      capacity: request.capacity,
      address: request.address,
      openingHours: request.openingHours,
      tastingPrice: request.tastingPrice,
      tastingDurationMinutes: request.tastingDurationMinutes ?? current.tastingDurationMinutes ?? 45,
      description: request.description,
      famousFor: request.famousFor,
      offersCheeseBoard: request.offersCheeseBoard,
      uniqueExperienceOffers: request.uniqueExperienceOffers,
      wineStyles: request.wineStyles ?? [],
    };

    return wineries[index];
  }

  async getAvailabilityForDate(serviceDate: string): Promise<WineryAvailability[]> {
    return availability.filter((slot) => slot.serviceDate === serviceDate);
  }

  async createBooking(request: CreateBookingRequest): Promise<Booking> {
    const now = nowIso();
    const booking: Booking = {
      bookingId: makeId(),
      leadName: request.lead_name,
      leadPhone: request.lead_phone,
      leadEmail: request.lead_email,
      bookingDate: request.booking_date,
      preferredStartTime: request.preferred_start_time,
      preferredEndTime: request.preferred_end_time,
      pickupLocation: request.pickup_location,
      partySize: request.party_size,
      preferredRegion: request.preferred_region,
      preferredWineries: request.preferred_wineries ?? [],
      status: "awaiting_winery",
      createdAt: now,
      updatedAt: now,
    };

    bookings.set(booking.bookingId, booking);
    return booking;
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    return bookings.get(bookingId) ?? null;
  }

  async listBookingsByLeadEmail(email: string): Promise<Booking[]> {
    const normalized = email.trim().toLowerCase();
    return Array.from(bookings.values())
      .filter((booking) => (booking.leadEmail ?? "").trim().toLowerCase() === normalized)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async getWineryContact(wineryId: string): Promise<WineryContact | null> {
    return wineryContacts.get(wineryId) ?? null;
  }

  async createWineryBookingRequest(
    request: Omit<WineryBookingRequest, "createdAt" | "updatedAt">,
  ): Promise<WineryBookingRequest> {
    const now = nowIso();
    const saved: WineryBookingRequest = {
      ...request,
      createdAt: now,
      updatedAt: now,
    };

    wineryRequests.set(saved.requestId, saved);
    return saved;
  }

  async listWineryBookingRequests(wineryId: string): Promise<WineryBookingRequest[]> {
    return Array.from(wineryRequests.values())
      .filter((request) => request.wineryId === wineryId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async markWineryBookingRequestAccepted(tokenId: string): Promise<WineryBookingRequest | null> {
    const request = Array.from(wineryRequests.values()).find((item) => item.actionTokenId === tokenId);
    if (!request) {
      return null;
    }

    const now = nowIso();
    const updated: WineryBookingRequest = {
      ...request,
      status: "accepted",
      approvedAt: now,
      updatedAt: now,
    };

    wineryRequests.set(updated.requestId, updated);
    return updated;
  }

  async createWineryMediaAsset(
    request: Omit<WineryMediaAsset, "createdAt" | "updatedAt">,
  ): Promise<WineryMediaAsset> {
    const now = nowIso();
    const asset: WineryMediaAsset = {
      ...request,
      createdAt: now,
      updatedAt: now,
    };
    wineryMediaAssets.set(asset.mediaId, asset);
    return asset;
  }

  async listWineryMediaAssets(wineryId: string): Promise<WineryMediaAsset[]> {
    return Array.from(wineryMediaAssets.values())
      .filter((item) => item.wineryId === wineryId && item.status !== "archived")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async markWineryMediaAssetUploaded(
    mediaId: string,
    wineryId: string,
    fileSizeBytes?: number,
  ): Promise<WineryMediaAsset | null> {
    const current = wineryMediaAssets.get(mediaId);
    if (!current || current.wineryId !== wineryId) {
      return null;
    }

    const updated: WineryMediaAsset = {
      ...current,
      status: "uploaded",
      fileSizeBytes: fileSizeBytes ?? current.fileSizeBytes,
      updatedAt: nowIso(),
    };
    wineryMediaAssets.set(mediaId, updated);
    return updated;
  }

  async archiveWineryMediaAsset(mediaId: string, wineryId: string): Promise<WineryMediaAsset | null> {
    const current = wineryMediaAssets.get(mediaId);
    if (!current || current.wineryId !== wineryId) {
      return null;
    }

    const updated: WineryMediaAsset = {
      ...current,
      status: "archived",
      updatedAt: nowIso(),
    };
    wineryMediaAssets.set(mediaId, updated);
    return updated;
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
    const now = nowIso();
    const user: UserAccount = {
      userId: makeId(),
      email: request.email.toLowerCase(),
      passwordHash: request.password_hash,
      role: request.role,
      displayName: request.display_name,
      firstName: request.first_name,
      lastName: request.last_name,
      phone: request.phone,
      homeCountry: request.home_country,
      ageGroup: request.age_group,
      gender: request.gender,
      wineryId: request.winery_id,
      transportCompany: request.transport_company,
      createdAt: now,
      updatedAt: now,
    };
    users.set(user.userId, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<UserAccount | null> {
    const normalized = email.toLowerCase();
    return Array.from(users.values()).find((user) => user.email === normalized) ?? null;
  }

  async getUserById(userId: string): Promise<UserAccount | null> {
    return users.get(userId) ?? null;
  }

  async updateUserPasswordByUserId(userId: string, passwordHash: string): Promise<boolean> {
    const existing = users.get(userId);
    if (!existing) {
      return false;
    }
    users.set(userId, {
      ...existing,
      passwordHash,
      updatedAt: nowIso(),
    });
    return true;
  }

  async updateUserPasswordByEmail(email: string, passwordHash: string): Promise<boolean> {
    const normalized = email.toLowerCase();
    const existing = Array.from(users.values()).find((user) => user.email === normalized);
    if (!existing) {
      return false;
    }
    users.set(existing.userId, {
      ...existing,
      passwordHash,
      updatedAt: nowIso(),
    });
    return true;
  }

  async savePasswordResetToken(token: PasswordResetToken): Promise<void> {
    passwordResetTokens.set(token.tokenId, token);
  }

  async getPasswordResetToken(tokenId: string): Promise<PasswordResetToken | null> {
    return passwordResetTokens.get(tokenId) ?? null;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<PasswordResetToken | null> {
    const existing = passwordResetTokens.get(tokenId);
    if (!existing) {
      return null;
    }

    const updated: PasswordResetToken = {
      ...existing,
      status: "used",
      usedAt: nowIso(),
    };
    passwordResetTokens.set(tokenId, updated);
    return updated;
  }

  async expireActivePasswordResetTokensForUser(userId: string): Promise<number> {
    let count = 0;
    for (const [tokenId, token] of passwordResetTokens.entries()) {
      if (token.userId !== userId || token.status !== "active") {
        continue;
      }
      passwordResetTokens.set(tokenId, {
        ...token,
        status: "expired",
      });
      count += 1;
    }
    return count;
  }

  async saveActionToken(token: ActionToken): Promise<void> {
    tokens.set(token.tokenId, token);
  }

  async getActionToken(tokenId: string): Promise<ActionToken | null> {
    return tokens.get(tokenId) ?? null;
  }

  async markActionTokenUsed(tokenId: string): Promise<ActionToken | null> {
    const token = tokens.get(tokenId);
    if (!token) {
      return null;
    }

    const used: ActionToken = {
      ...token,
      status: "used",
      usedAt: nowIso(),
    };
    tokens.set(tokenId, used);
    return used;
  }
}
