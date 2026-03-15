import type {
  ActionToken,
  Booking,
  CreateBookingRequest,
  Winery,
  WineryAvailability,
} from "./models.js";

export interface WorkflowRepository {
  getWineries(): Promise<Winery[]>;
  getAvailabilityForDate(serviceDate: string): Promise<WineryAvailability[]>;
  createBooking(request: CreateBookingRequest): Promise<Booking>;
  getBooking(bookingId: string): Promise<Booking | null>;
  saveActionToken(token: ActionToken): Promise<void>;
  getActionToken(tokenId: string): Promise<ActionToken | null>;
  markActionTokenUsed(tokenId: string): Promise<ActionToken | null>;
}
