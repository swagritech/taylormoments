import { z } from "zod";

const baseItineraryRequestSchema = z.object({
  booking_date: z.string().min(1),
  party_size: z.number().int().positive(),
  pickup_location: z.string().min(1),
  preferred_wineries: z.array(z.string()).optional(),
  preferred_region: z.string().optional(),
  preferred_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferred_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

function hasValidTimeWindow(value: {
  preferred_start_time?: string;
  preferred_end_time?: string;
}) {
  return (
    !value.preferred_start_time ||
    !value.preferred_end_time ||
    value.preferred_start_time < value.preferred_end_time
  );
}

export const recommendItineraryRequestSchema = baseItineraryRequestSchema.refine(
  (value) =>
    hasValidTimeWindow({
      preferred_start_time: value.preferred_start_time,
      preferred_end_time: value.preferred_end_time,
    }),
  {
    message: "preferred_start_time must be earlier than preferred_end_time.",
    path: ["preferred_end_time"],
  },
);

export const createBookingRequestSchema = baseItineraryRequestSchema.extend({
  lead_name: z.string().min(1),
  lead_email: z.string().email().optional(),
  lead_phone: z.string().min(5).optional(),
  turnstile_token: z.string().min(1).optional(),
}).refine(
  (value) =>
    hasValidTimeWindow({
      preferred_start_time: value.preferred_start_time,
      preferred_end_time: value.preferred_end_time,
    }),
  {
    message: "preferred_start_time must be earlier than preferred_end_time.",
    path: ["preferred_end_time"],
  },
);

export const registerUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["customer", "winery", "transport", "ops"]),
  display_name: z.string().min(1),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  home_country: z.string().min(2).optional(),
  age_group: z.string().min(2).optional(),
  gender: z.string().min(2).optional(),
  winery_id: z.string().uuid().optional(),
  transport_company: z.string().min(1).optional(),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(10),
  new_password: z.string().min(8),
});

export const changePasswordRequestSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

export const actionTokenRouteSchema = z.object({
  tokenId: z.string().uuid(),
});

export const wineryRouteSchema = z.object({
  wineryId: z.string().uuid(),
});

export const wineryMediaRouteSchema = wineryRouteSchema.extend({
  mediaId: z.string().uuid(),
});

export const wineryProfileUpdateSchema = z.object({
  capacity: z.number().int().positive().max(10000),
  address: z.string().max(500).optional(),
  opening_hours: z.string().max(1000).optional(),
  tasting_price: z.number().nonnegative().max(10000).optional(),
  tasting_duration_minutes: z.number().int().positive().max(480).optional(),
  description: z.string().max(3000).optional(),
  famous_for: z.string().max(500).optional(),
  offers_cheese_board: z.boolean(),
  unique_experience_offers: z.array(
    z.object({
      name: z.string().min(1).max(120),
      price: z.number().nonnegative().max(10000),
    }),
  ).max(30),
});

export const createWineryMediaUploadRequestSchema = z.object({
  file_name: z.string().min(1).max(160),
  content_type: z.string().regex(/^image\//i, "content_type must be an image mime type."),
  file_size_bytes: z.number().int().positive().max(20 * 1024 * 1024).optional(),
  caption: z.string().max(240).optional(),
});

export const tokenActionRequestSchema = z.object({
  turnstile_token: z.string().min(1).optional(),
});
