import type { WorkflowRepository } from "../domain/ports.js";
import type {
  ActionToken,
  Booking,
  CreateBookingRequest,
  Winery,
  WineryAvailability,
} from "../domain/models.js";
import { makeId, nowIso } from "../lib/crypto.js";

const wineries: Winery[] = [
  { wineryId: "11111111-1111-1111-1111-111111111111", name: "Leeuwin Coast Estate", region: "Wilyabrup", confirmationMode: "auto_confirm", capacity: 10, active: true },
  { wineryId: "22222222-2222-2222-2222-222222222222", name: "Redgate Ridge", region: "Redgate", confirmationMode: "manual_review", capacity: 12, active: true },
  { wineryId: "33333333-3333-3333-3333-333333333333", name: "Caves Road Cellars", region: "Cowaramup", confirmationMode: "auto_confirm", capacity: 8, active: true },
  { wineryId: "44444444-4444-4444-4444-444444444444", name: "Yallingup Hills Winery", region: "Yallingup Siding", confirmationMode: "manual_review", capacity: 14, active: true },
];

const availability: WineryAvailability[] = [
  { availabilityId: makeId(), wineryId: wineries[0].wineryId, serviceDate: "2026-04-10", startTime: "10:00", endTime: "11:15", remainingCapacity: 8, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[1].wineryId, serviceDate: "2026-04-10", startTime: "11:30", endTime: "12:30", remainingCapacity: 10, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[2].wineryId, serviceDate: "2026-04-10", startTime: "09:45", endTime: "11:15", remainingCapacity: 6, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[3].wineryId, serviceDate: "2026-04-10", startTime: "12:30", endTime: "13:45", remainingCapacity: 12, status: "open" },
  { availabilityId: makeId(), wineryId: wineries[0].wineryId, serviceDate: "2026-04-11", startTime: "10:15", endTime: "11:30", remainingCapacity: 10, status: "open" },
];

const bookings = new Map<string, Booking>();
const tokens = new Map<string, ActionToken>();

export class MemoryWorkflowRepository implements WorkflowRepository {
  async getWineries(): Promise<Winery[]> {
    return wineries;
  }

  async getAvailabilityForDate(serviceDate: string): Promise<WineryAvailability[]> {
    return availability.filter((slot) => slot.serviceDate === serviceDate);
  }

  async createBooking(request: CreateBookingRequest): Promise<Booking> {
    const booking: Booking = {
      bookingId: makeId(),
      leadName: request.lead_name,
      leadPhone: request.lead_phone,
      leadEmail: request.lead_email,
      bookingDate: request.booking_date,
      pickupLocation: request.pickup_location,
      partySize: request.party_size,
      preferredRegion: request.preferred_region,
      preferredWineries: request.preferred_wineries ?? [],
      status: "draft",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    bookings.set(booking.bookingId, booking);
    return booking;
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    return bookings.get(bookingId) ?? null;
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
