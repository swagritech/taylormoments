import type {
  ActionToken,
  Booking,
  CreateBookingRequest,
  PasswordResetToken,
  RegisterUserRequest,
  UserAccount,
  WineryMediaAsset,
  WineryBookingRequest,
  WineryContact,
  Winery,
  WineryAvailability,
} from "./models.js";

export interface WorkflowRepository {
  getWineries(): Promise<Winery[]>;
  getWineryById(wineryId: string): Promise<Winery | null>;
  updateWineryProfile(request: {
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
    wineStyles: Array<
      | "Organic & Biodynamic"
      | "Natural & Minimal Intervention"
      | "Small batch & Boutique"
      | "Family-owned Estate"
      | "Estate-grown fruit only"
      | "Well known Margaret River Name"
      | "Lesser known (off the beaten track)"
      | "Red Wine Specialist"
      | "White Wine Specialist"
      | "Sparkling & Method traditionnelle Specialist"
      | "Fortfied & Desert Wines"
      | "Internationally awarded"
      | "Wines only available at cellar door"
    >;
    winerySignals: Array<
      | "view_stunning"
      | "intimate_welcome"
      | "historic_estate"
      | "secluded"
      | "garden_picnic"
      | "halliday_5star"
      | "gold_medals"
      | "exported_asia"
      | "trophy_winner"
      | "press_featured"
      | "multi_generation"
      | "female_winemaker"
      | "certified_organic"
      | "regenerative"
      | "small_production"
    >;
  }): Promise<Winery | null>;
  getAvailabilityForDate(serviceDate: string): Promise<WineryAvailability[]>;
  createBooking(request: CreateBookingRequest): Promise<Booking>;
  getBooking(bookingId: string): Promise<Booking | null>;
  listBookingsByLeadEmail(email: string): Promise<Booking[]>;
  getWineryContact(wineryId: string): Promise<WineryContact | null>;
  createWineryBookingRequest(request: Omit<WineryBookingRequest, "createdAt" | "updatedAt">): Promise<WineryBookingRequest>;
  listWineryBookingRequests(wineryId: string): Promise<WineryBookingRequest[]>;
  markWineryBookingRequestAccepted(tokenId: string): Promise<WineryBookingRequest | null>;
  createWineryMediaAsset(request: Omit<WineryMediaAsset, "createdAt" | "updatedAt">): Promise<WineryMediaAsset>;
  listWineryMediaAssets(wineryId: string): Promise<WineryMediaAsset[]>;
  markWineryMediaAssetUploaded(mediaId: string, wineryId: string, fileSizeBytes?: number): Promise<WineryMediaAsset | null>;
  archiveWineryMediaAsset(mediaId: string, wineryId: string): Promise<WineryMediaAsset | null>;
  createUserAccount(request: RegisterUserRequest & { password_hash: string }): Promise<UserAccount>;
  getUserByEmail(email: string): Promise<UserAccount | null>;
  getUserById(userId: string): Promise<UserAccount | null>;
  updateUserPasswordByUserId(userId: string, passwordHash: string): Promise<boolean>;
  updateUserPasswordByEmail(email: string, passwordHash: string): Promise<boolean>;
  savePasswordResetToken(token: PasswordResetToken): Promise<void>;
  getPasswordResetToken(tokenId: string): Promise<PasswordResetToken | null>;
  markPasswordResetTokenUsed(tokenId: string): Promise<PasswordResetToken | null>;
  expireActivePasswordResetTokensForUser(userId: string): Promise<number>;
  saveActionToken(token: ActionToken): Promise<void>;
  getActionToken(tokenId: string): Promise<ActionToken | null>;
  markActionTokenUsed(tokenId: string): Promise<ActionToken | null>;
}
