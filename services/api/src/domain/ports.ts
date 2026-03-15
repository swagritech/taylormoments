import type {
  ActionToken,
  Booking,
  CreateBookingRequest,
  LoginRequest,
  RegisterUserRequest,
  UserAccount,
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
  listBookingsByLeadEmail(email: string): Promise<Booking[]>;
  getWineryContact(wineryId: string): Promise<WineryContact | null>;
  createWineryBookingRequest(request: Omit<WineryBookingRequest, "createdAt" | "updatedAt">): Promise<WineryBookingRequest>;
  listWineryBookingRequests(wineryId: string): Promise<WineryBookingRequest[]>;
  markWineryBookingRequestAccepted(tokenId: string): Promise<WineryBookingRequest | null>;
  createUserAccount(request: RegisterUserRequest & { password_hash: string }): Promise<UserAccount>;
  getUserByEmail(email: string): Promise<UserAccount | null>;
  getUserById(userId: string): Promise<UserAccount | null>;
  saveActionToken(token: ActionToken): Promise<void>;
  getActionToken(tokenId: string): Promise<ActionToken | null>;
  markActionTokenUsed(tokenId: string): Promise<ActionToken | null>;
}
