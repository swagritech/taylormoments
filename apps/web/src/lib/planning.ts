import {
  type BookingRecord,
  type ItineraryPlan,
  type TourRequest,
  type TransportJob,
  type Winery,
  transportProviders,
  wineries,
} from "@/lib/demo-data";
import { buildItineraryPlans } from "@/lib/scheduler";

export function recommendedCarrier(partySize: number, pickup: string) {
  if (partySize >= 9) {
    return transportProviders.find((provider) => provider.id === "south-west-charters");
  }

  if (pickup === "Prevelly Beach") {
    return transportProviders.find((provider) => provider.id === "forest-coast-shuttle");
  }

  return transportProviders.find((provider) => provider.id === "cape-to-vine");
}

export function buildLivePlans(request: TourRequest, availableWineries: Winery[] = wineries) {
  return buildItineraryPlans(request, availableWineries);
}

export function buildLiveTransportJob(
  request: TourRequest,
  plan: ItineraryPlan | undefined,
  bookingId = "TM-LIVE",
): TransportJob | null {
  if (!plan || plan.stops.length === 0) {
    return null;
  }

  const carrier = recommendedCarrier(request.partySize, request.pickup);
  const routeStops = plan.stops.map((stop) => stop.wineryName).join(" -> ");

  return {
    id: bookingId,
    date: request.date,
    pickupTime: plan.transportWindow.split(" - ")[0] ?? "09:00",
    routeLabel: `${request.pickup} -> ${routeStops} -> ${request.pickup}`,
    passengers: request.partySize,
    vehicleType: request.partySize >= 9 ? "Midi coach" : "Premium van",
    payout: request.partySize >= 9 ? "$760" : "$560",
    status: "Open",
    recommendedProvider: carrier?.name ?? transportProviders[0]?.name ?? "Unassigned",
  };
}

export function deriveBookingStage(booking: BookingRecord, availableWineries: Winery[]) {
  const selected = availableWineries.filter((winery) => booking.request.wineries.includes(winery.id));

  if (selected.some((winery) => winery.status === "Manual review")) {
    return "Needs winery confirmation" as const;
  }

  if (booking.request.partySize >= 8) {
    return "Transport planning" as const;
  }

  return booking.stage === "Confirmed" ? "Confirmed" as const : "Draft" as const;
}
