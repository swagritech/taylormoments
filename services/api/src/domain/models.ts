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
  active: boolean;
};

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
    feasible_routes_found: number;
    generated_options_count: number;
    used_fallback: boolean;
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
