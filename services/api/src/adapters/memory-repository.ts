import type { WorkflowRepository } from "../domain/ports.js";
import type {
  ActionToken,
  Booking,
  CreateBookingRequest,
  UserAccount,
  WineryBookingRequest,
  WineryContact,
  Winery,
  WineryAvailability,
} from "../domain/models.js";
import { makeId, nowIso } from "../lib/crypto.js";

const wineries: Winery[] = [
  { wineryId: "11111111-1111-1111-1111-111111111111", name: "Vasse Felix", region: "Wilyabrup", confirmationMode: "auto_confirm", capacity: 10, active: true },
  { wineryId: "22222222-2222-2222-2222-222222222222", name: "Cullen Wines", region: "Wilyabrup", confirmationMode: "manual_review", capacity: 12, active: true },
  { wineryId: "33333333-3333-3333-3333-333333333333", name: "Fraser Gallop Estate", region: "Wilyabrup", confirmationMode: "auto_confirm", capacity: 8, active: true },
  { wineryId: "44444444-4444-4444-4444-444444444444", name: "Woodlands Wines", region: "Wilyabrup", confirmationMode: "manual_review", capacity: 14, active: true },
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
const users = new Map<string, UserAccount>();

export class MemoryWorkflowRepository implements WorkflowRepository {
  async getWineries(): Promise<Winery[]> {
    return wineries;
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
