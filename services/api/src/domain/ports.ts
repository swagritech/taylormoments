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
      | "mandarin_staff"
      | "vietnamese_staff"
      | "asian_pairing"
      | "wechat_line"
      | "hosted_asian_groups"
      | "wheelchair_access"
      | "minibus_parking"
      | "dog_friendly"
      | "child_friendly"
      | "close_to_town"
      | "cellar_door_tasting"
      | "guided_tasting"
      | "private_tasting_room"
      | "barrel_tasting"
      | "sunset_tasting"
      | "winery_lunch"
      | "cheese_board"
      | "wine_chocolate"
      | "charcuterie_board"
      | "cooking_class"
      | "picnic_on_estate"
      | "vineyard_walk"
      | "cellar_tour"
      | "blending_experience"
      | "harvest_experience"
      | "accommodation"
      | "corporate_events"
      | "wedding_venue"
      | "wheelchair_pathways"
      | "wheelchair_tasting"
      | "accessible_bathroom"
      | "step_free_entry"
      | "accessible_parking"
      | "minibus_access"
      | "hearing_loop"
      | "large_print"
      | "seated_tasting"
      | "quiet_space"
      | "vegetarian"
      | "vegan"
      | "dairy_free"
      | "gluten_free"
      | "gluten_free_strict"
      | "nut_free"
      | "halal"
      | "kosher"
      | "no_food"
      | "byo_food"
      | "custom_on_request"
      | "mon"
      | "tue"
      | "wed"
      | "thu"
      | "fri"
      | "sat"
      | "sun"
      | "same_day"
      | "24_hours"
      | "48_hours"
      | "72_hours"
      | "1_week"
      | "2_weeks"
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
