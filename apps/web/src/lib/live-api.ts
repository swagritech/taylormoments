import { getApiBaseUrl } from "@/lib/config";

export type RecommendationStop = {
  winery_id: string;
  winery_name: string;
  arrival_time: string;
  departure_time: string;
  drive_minutes: number;
};

export type Recommendation = {
  itinerary_id: string;
  expert_pick: boolean;
  justification: string;
  score: number;
  label: string;
  stops: RecommendationStop[];
};

export type RecommendResponse = {
  generated_at: string;
  itineraries: Recommendation[];
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

export type CreateBookingRequest = {
  lead_name: string;
  lead_email?: string;
  lead_phone?: string;
  booking_date: string;
  preferred_start_time?: string;
  preferred_end_time?: string;
  pickup_location: string;
  party_size: number;
  preferred_region?: string;
  preferred_wineries: string[];
  turnstile_token?: string;
};

export type BookingResponse = {
  bookingId: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  bookingDate: string;
  preferredStartTime?: string;
  preferredEndTime?: string;
  pickupLocation: string;
  partySize: number;
  preferredWineries: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  partner_dispatch?: {
    winery_requests_created: number;
    winery_requests: Array<{
      winery_id: string;
      token_id: string;
      action_url: string;
      expires_at: string;
      notification: {
        channel: string;
        configured: boolean;
        recipient?: string;
        message: string;
      };
    }>;
  };
};

export type MyBookingsResponse = {
  bookings: Array<{
    bookingId: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
    bookingDate: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    pickupLocation: string;
    partySize: number;
    preferredWineries: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type TokenResponse = {
  token_id: string;
  action_url: string;
  expires_at: string;
  notification?: {
    channel: string;
    configured: boolean;
    recipient?: string;
    message: string;
  };
};

export type TokenActionResponse = {
  status: string;
  booking_id: string;
  token_id: string;
};

export type WineryPortalItem = {
  request_id: string;
  booking_id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  action_url: string;
  sent_channel: "email" | "sms" | "preview";
  sent_recipient?: string;
  sent_at: string;
  approved_at?: string;
  booking: {
    bookingId: string;
    leadName: string;
    bookingDate: string;
    pickupLocation: string;
    partySize: number;
    status: string;
  } | null;
};

export type WineryPortalResponse = {
  winery: {
    winery_id: string;
    name: string;
    region: string;
    confirmation_mode: "auto_confirm" | "manual_review";
  } | null;
  summary: {
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  };
  requests: WineryPortalItem[];
};

export type WineryMediaAsset = {
  media_id: string;
  winery_id: string;
  public_url: string;
  object_key: string;
  file_name: string;
  content_type: string;
  file_size_bytes?: number;
  caption?: string;
  status: "pending" | "uploaded" | "archived";
  created_at: string;
  updated_at: string;
};

export type WineryMediaListResponse = {
  storage_configured: boolean;
  assets: WineryMediaAsset[];
};

export type WineryMediaUploadTicket = {
  media_id: string;
  winery_id: string;
  object_key: string;
  public_url: string;
  upload_url: string;
  upload_method: "PUT";
  upload_headers: {
    "Content-Type": string;
  };
  expires_at: string;
};

export type WineryListResponse = {
  wineries: Array<{
    winery_id: string;
    name: string;
    region: string;
    confirmation_mode: "auto_confirm" | "manual_review";
    tasting_price?: number;
    description?: string;
    famous_for?: string;
    offers_cheese_board?: boolean;
    unique_experience_offers?: Array<{
      name: string;
      price: number;
    }>;
  }>;
};

export type WineryProfileResponse = {
  winery_id: string;
  name: string;
  region: string;
  tasting_price?: number;
  description?: string;
  famous_for?: string;
  offers_cheese_board: boolean;
  unique_experience_offers: Array<{
    name: string;
    price: number;
  }>;
};

export type AuthUser = {
  user_id: string;
  email: string;
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
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type AuthMessageResponse = {
  status: "ok";
  message: string;
};

function getRequiredApiBaseUrl() {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("Live API URL is not configured.");
  }

  return apiBaseUrl;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function recommendItineraries(payload: {
  booking_date: string;
  pickup_location: string;
  party_size: number;
  preferred_region?: string;
  preferred_wineries: string[];
  preferred_start_time?: string;
  preferred_end_time?: string;
}) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/itinerary/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<RecommendResponse>(response);
}

export async function createBooking(payload: CreateBookingRequest) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<BookingResponse>(response);
}

export async function getMyBookings(token: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/bookings/mine`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson<MyBookingsResponse>(response);
}

export async function createWineryApprovalToken(bookingId: string, wineryId: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/action-tokens/winery-approve?booking_id=${bookingId}&winery_id=${wineryId}`, {
    method: "POST",
  });

  return parseJson<TokenResponse>(response);
}

export async function approveWineryToken(tokenId: string, turnstileToken?: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/action-tokens/${tokenId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ turnstile_token: turnstileToken }),
  });

  return parseJson<TokenActionResponse>(response);
}

export async function acceptTransportToken(tokenId: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/action-tokens/${tokenId}/accept`, {
    method: "POST",
  });

  return parseJson<TokenActionResponse>(response);
}

export async function listWineries() {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries`, {
    method: "GET",
  });

  return parseJson<WineryListResponse>(response);
}

export async function getWineryPortalRequests(wineryId: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries/${wineryId}/requests`, {
    method: "GET",
  });

  return parseJson<WineryPortalResponse>(response);
}

export async function getWineryPortalRequestsAuthed(wineryId: string, token: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries/${wineryId}/requests`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson<WineryPortalResponse>(response);
}

export async function getWineryProfileAuthed(wineryId: string, token: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries/${wineryId}/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson<WineryProfileResponse>(response);
}

export async function updateWineryProfileAuthed(
  wineryId: string,
  token: string,
  payload: {
    tasting_price?: number;
    description?: string;
    famous_for?: string;
    offers_cheese_board: boolean;
    unique_experience_offers: Array<{
      name: string;
      price: number;
    }>;
  },
) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries/${wineryId}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseJson<WineryProfileResponse>(response);
}

export async function getWineryMediaAuthed(wineryId: string, token: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries/${wineryId}/media`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson<WineryMediaListResponse>(response);
}

export async function createWineryMediaUploadUrl(
  wineryId: string,
  token: string,
  payload: {
    file_name: string;
    content_type: string;
    file_size_bytes?: number;
    caption?: string;
  },
) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries/${wineryId}/media/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseJson<WineryMediaUploadTicket>(response);
}

export async function completeWineryMediaUpload(
  wineryId: string,
  mediaId: string,
  token: string,
) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/wineries/${wineryId}/media/${mediaId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson<WineryMediaAsset>(response);
}

export async function registerAccount(payload: {
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
}) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<AuthResponse>(response);
}

export async function loginAccount(payload: { email: string; password: string }) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<AuthResponse>(response);
}

export async function getMe(token: string) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson<{ user: AuthUser }>(response);
}

export async function forgotPassword(payload: { email: string; new_password: string }) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<AuthMessageResponse>(response);
}

export async function changePassword(
  token: string,
  payload: { current_password: string; new_password: string },
) {
  const response = await fetch(`${getRequiredApiBaseUrl()}/api/v1/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseJson<AuthMessageResponse>(response);
}

export function formatDisplayTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}
