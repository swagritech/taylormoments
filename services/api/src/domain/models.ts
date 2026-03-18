export type BookingStatus =
  | "draft"
  | "awaiting_winery"
  | "confirmed"
  | "transport_pending"
  | "exception"
  | "cancelled";

export type ActionTokenStatus = "active" | "used" | "expired" | "revoked";
export type ActionTokenType = "winery_approve" | "transporter_accept" | "calendar_add";
export type WineryBookingRequestStatus = "pending" | "accepted" | "declined" | "expired";
export type UserRole = "customer" | "winery" | "transport" | "ops";

export type Booking = {
  bookingId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  bookingDate: string;
  preferredStartTime?: string;
  preferredEndTime?: string;
  pickupLocation: string;
  partySize: number;
  preferredRegion?: string;
  preferredWineries: string[];
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type Winery = {
  wineryId: string;
  name: string;
  region: string;
  confirmationMode: "auto_confirm" | "manual_review";
  capacity: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  openingHours?: string;
  active: boolean;
  tastingPrice?: number;
  tastingDurationMinutes?: number;
  description?: string;
  famousFor?: string;
  offersCheeseBoard: boolean;
  uniqueExperienceOffers: WineryExperienceOffer[];
  wineStyles: WineStyle[];
  winerySignals: WinerySignal[];
};

export type WineryExperienceOffer = {
  name: string;
  price: number;
};

export type WineStyle =
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
  | "Wines only available at cellar door";

export type WinerySignal =
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
  | "small_production";

export type WineryContact = {
  wineryId: string;
  contactName?: string;
  email?: string;
  phone?: string;
  preferredChannel: "email" | "sms";
};

export type WineryAvailability = {
  availabilityId: string;
  wineryId: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  remainingCapacity: number;
  status: "open" | "held" | "blocked";
};

export type ItineraryStop = {
  wineryId: string;
  wineryName: string;
  arrivalTime: string;
  departureTime: string;
  driveMinutes: number;
};

export type ItineraryOption = {
  itineraryId: string;
  expertPick: boolean;
  justification: string;
  score: number;
  label: string;
  stops: ItineraryStop[];
};

export type ActionToken = {
  tokenId: string;
  bookingId: string;
  tokenType: ActionTokenType;
  targetType: "winery" | "transporter" | "calendar";
  targetId?: string;
  tokenHash: string;
  expiresAt: string;
  status: ActionTokenStatus;
  usedAt?: string;
  createdAt: string;
};

export type WineryBookingRequest = {
  requestId: string;
  bookingId: string;
  wineryId: string;
  actionTokenId: string;
  actionUrl: string;
  status: WineryBookingRequestStatus;
  sentChannel: "email" | "sms" | "preview";
  sentRecipient?: string;
  sentAt: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type WineryMediaAssetStatus = "pending" | "uploaded" | "archived";

export type WineryMediaAsset = {
  mediaId: string;
  wineryId: string;
  objectKey: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  fileSizeBytes?: number;
  caption?: string;
  status: WineryMediaAssetStatus;
  uploadedByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserAccount = {
  userId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  homeCountry?: string;
  ageGroup?: string;
  gender?: string;
  wineryId?: string;
  transportCompany?: string;
  createdAt: string;
  updatedAt: string;
};

export type PasswordResetToken = {
  tokenId: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  status: "active" | "used" | "expired";
  createdAt: string;
  usedAt?: string;
};

export type RecommendItineraryRequest = {
  booking_date: string;
  party_size: number;
  pickup_location: string;
  preferred_wineries?: string[];
  preferred_region?: string;
  preferred_start_time?: string;
  preferred_end_time?: string;
};

export type RecommendItineraryResponse = {
  generated_at: string;
  itineraries: Array<{
    itinerary_id: string;
    expert_pick: boolean;
    justification: string;
    score: number;
    label: string;
    stops: Array<{
      winery_id: string;
      winery_name: string;
      arrival_time: string;
      departure_time: string;
      drive_minutes: number;
    }>;
  }>;
  scheduling_trace?: {
    requested_wineries_count: number;
    recognized_preferred_count: number;
    considered_wineries_count: number;
    wineries_with_slots_count: number;
    combinations_tested: number;
    permutations_tested?: number;
    feasible_routes_found: number;
    generated_options_count: number;
    used_fallback: boolean;
    best_route_stop_count?: number;
    best_route_drive_minutes?: number;
    best_route_idle_minutes?: number;
    travel_time_provider?: "haversine" | "osrm";
    travel_time_point_count?: number;
    travel_time_total_legs?: number;
    travel_time_matrix_legs?: number;
    travel_time_haversine_legs?: number;
    travel_time_default_legs?: number;
    travel_time_fallback_legs?: number;
    travel_time_fallback_percentage?: number;
    travel_time_average_confidence?: number;
    travel_time_cache_hit?: boolean;
    selected_route_segment_count?: number;
    selected_route_fallback_segments?: number;
    selected_route_fallback_percentage?: number;
    selected_route_average_confidence?: number;
    selected_route_total_drive_minutes?: number;
    selected_route_estimated_minutes?: number;
    selected_route_matrix_minutes?: number;
    selected_route_estimated_vs_actual_delta_minutes?: number;
    requested_time_window: {
      start: string;
      end: string;
    };
    dropped_wineries: Array<{
      winery_id: string;
      winery_name: string;
      reason: string;
      slot_count: number;
    }>;
  };
};

export type CreateBookingRequest = RecommendItineraryRequest & {
  lead_name: string;
  lead_email?: string;
  lead_phone?: string;
  turnstile_token?: string;
};

export type RegisterUserRequest = {
  email: string;
  password: string;
  role: UserRole;
  display_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  home_country?: string;
  age_group?: string;
  gender?: string;
  winery_id?: string;
  transport_company?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenActionRequest = {
  turnstile_token?: string;
};
