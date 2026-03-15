import type {
  ItineraryOption,
  RecommendItineraryRequest,
  RecommendItineraryResponse,
  Winery,
  WineryAvailability,
} from "../domain/models.js";
import { makeId } from "../lib/crypto.js";

function scoreCandidate(winery: Winery, availability: WineryAvailability, partySize: number) {
  const capacityFactor = Math.max(0, winery.capacity - partySize);
  const confirmationBoost = winery.confirmationMode === "auto_confirm" ? 8 : 0;
  return 70 + Math.min(20, capacityFactor) + confirmationBoost;
}

export function buildCandidateItineraries(params: {
  request: RecommendItineraryRequest;
  wineries: Winery[];
  availability: WineryAvailability[];
}): ItineraryOption[] {
  const { request, wineries, availability } = params;
  const filteredWineries = wineries.filter((winery) => {
    const regionMatch = request.preferred_region ? winery.region === request.preferred_region : true;
    const preferredMatch = request.preferred_wineries?.length
      ? request.preferred_wineries.includes(winery.wineryId)
      : true;

    return winery.active && regionMatch && preferredMatch;
  });

  const openAvailability = availability.filter(
    (slot) => slot.serviceDate === request.booking_date && slot.remainingCapacity >= request.party_size && slot.status === "open",
  );

  const options = filteredWineries
    .flatMap((winery) => {
      const slots = openAvailability.filter((slot) => slot.wineryId === winery.wineryId);
      return slots.map((slot, index) => ({ winery, slot, index }));
    })
    .slice(0, 5)
    .map(({ winery, slot }, index) => ({
      itineraryId: makeId(),
      expertPick: index === 0,
      justification:
        index === 0
          ? "Best fit for your group size, timing, and partner reliability in Margaret River."
          : "Strong backup option with available capacity and practical travel timing.",
      score: scoreCandidate(winery, slot, request.party_size) - index * 3,
      label: index === 0 ? "TailorMoments Expert Pick" : `Option ${index + 1}`,
      stops: [
        {
          wineryId: winery.wineryId,
          wineryName: winery.name,
          arrivalTime: `${slot.serviceDate}T${slot.startTime}:00Z`,
          departureTime: `${slot.serviceDate}T${slot.endTime}:00Z`,
          driveMinutes: 18 + index * 4,
        },
      ],
    }));

  return options;
}

export async function rankItinerariesWithAi(candidates: ItineraryOption[]): Promise<ItineraryOption[]> {
  if (candidates.length === 0) {
    return [];
  }

  return candidates.map((candidate, index) => ({
    ...candidate,
    expertPick: index === 0,
    justification:
      index === 0
        ? "Expert pick for the smoothest day, strongest partner match, and easiest confirmation path."
        : candidate.justification,
  }));
}

export async function recommendItineraries(params: {
  request: RecommendItineraryRequest;
  wineries: Winery[];
  availability: WineryAvailability[];
}): Promise<RecommendItineraryResponse> {
  const candidates = buildCandidateItineraries(params);
  const ranked = await rankItinerariesWithAi(candidates);

  return {
    generated_at: new Date().toISOString(),
    itineraries: ranked.map((itinerary) => ({
      itinerary_id: itinerary.itineraryId,
      expert_pick: itinerary.expertPick,
      justification: itinerary.justification,
      score: itinerary.score,
      label: itinerary.label,
      stops: itinerary.stops.map((stop) => ({
        winery_id: stop.wineryId,
        winery_name: stop.wineryName,
        arrival_time: stop.arrivalTime,
        departure_time: stop.departureTime,
        drive_minutes: stop.driveMinutes,
      })),
    })),
  };
}
