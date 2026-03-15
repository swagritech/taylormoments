import { z } from "zod";

export const recommendItineraryRequestSchema = z.object({
  booking_date: z.string().min(1),
  party_size: z.number().int().positive(),
  pickup_location: z.string().min(1),
  preferred_wineries: z.array(z.string()).optional(),
  preferred_region: z.string().optional(),
});

export const createBookingRequestSchema = recommendItineraryRequestSchema.extend({
  lead_name: z.string().min(1),
  lead_email: z.string().email().optional(),
  lead_phone: z.string().min(5).optional(),
  preferred_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferred_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  turnstile_token: z.string().min(1).optional(),
});

export const actionTokenRouteSchema = z.object({
  tokenId: z.string().uuid(),
});

export const wineryRouteSchema = z.object({
  wineryId: z.string().uuid(),
});

export const tokenActionRequestSchema = z.object({
  turnstile_token: z.string().min(1).optional(),
});
