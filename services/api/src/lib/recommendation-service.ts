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

function toTimeValue(value: string) {
  return Number(value.replace(":", ""));
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

  const wineriesWithSlots = filteredWineries
    .map((winery) => ({
      winery,
      slots: openAvailability
        .filter((slot) => slot.wineryId === winery.wineryId)
        .sort((a, b) => toTimeValue(a.startTime) - toTimeValue(b.startTime)),
    }))
    .filter((entry) => entry.slots.length > 0);

  const maxVariants = Math.min(
    3,
    Math.max(1, ...wineriesWithSlots.map((entry) => entry.slots.length)),
  );

  const options: ItineraryOption[] = [];

  for (let variantIndex = 0; variantIndex < maxVariants; variantIndex += 1) {
    const stopBundle = wineriesWithSlots
      .map(({ winery, slots }) => {
        const slot = slots[Math.min(variantIndex, slots.length - 1)];
        return { winery, slot };
      })
      .filter((entry) => entry.slot);

    const sortedStops = stopBundle.sort(
      (a, b) => toTimeValue(a.slot.startTime) - toTimeValue(b.slot.startTime),
    );

    if (sortedStops.length === 0) {
      continue;
    }

    const scoreBase =
      sortedStops.reduce(
        (sum, item) => sum + scoreCandidate(item.winery, item.slot, request.party_size),
        0,
      ) / sortedStops.length;

    options.push({
      itineraryId: makeId(),
      expertPick: variantIndex === 0,
      justification:
        variantIndex === 0
          ? `Best fit for your group size with ${sortedStops.length} winery stops aligned into a practical day.`
          : "Strong backup option with available capacity and practical travel timing.",
      score: Math.round(scoreBase - variantIndex * 4),
      label: variantIndex === 0 ? "TailorMoments Expert Pick" : `Option ${variantIndex + 1}`,
      stops: sortedStops.map((item, stopIndex) => ({
        wineryId: item.winery.wineryId,
        wineryName: item.winery.name,
        arrivalTime: `${item.slot.serviceDate}T${item.slot.startTime}:00Z`,
        departureTime: `${item.slot.serviceDate}T${item.slot.endTime}:00Z`,
        driveMinutes: stopIndex === 0 ? 22 : 14 + stopIndex * 4,
      })),
    });
  }

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
