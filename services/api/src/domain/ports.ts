import type {
  ActionToken,
  Booking,
  CreateBookingRequest,
  WineryBookingRequest,
  WineryContact,
  Winery,
  WineryAvailability,
} from "./models.js";

export interface WorkflowRepository {
  getWineries(): Promise<Winery[]>;
  getAvailabilityForDate(serviceDate: string): Promise<WineryAvailability[]>;
  createBooking(request: CreateBookingRequest): Promise<Booking>;
  getBooking(bookingId: string): Promise<Booking | null>;
  getWineryContact(wineryId: string): Promise<WineryContact | null>;
  createWineryBookingRequest(request: Omit<WineryBookingRequest, "createdAt" | "updatedAt">): Promise<WineryBookingRequest>;
  listWineryBookingRequests(wineryId: string): Promise<WineryBookingRequest[]>;
  markWineryBookingRequestAccepted(tokenId: string): Promise<WineryBookingRequest | null>;
  saveActionToken(token: ActionToken): Promise<void>;
  getActionToken(tokenId: string): Promise<ActionToken | null>;
  markActionTokenUsed(tokenId: string): Promise<ActionToken | null>;
}
