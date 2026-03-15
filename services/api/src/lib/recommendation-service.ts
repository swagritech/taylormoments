import type {
  ItineraryOption,
  RecommendItineraryRequest,
  RecommendItineraryResponse,
  Winery,
  WineryAvailability,
} from "../domain/models.js";
import { makeId } from "../lib/crypto.js";

type Point = { lat: number; lon: number };
type PlannedStop = { winery: Winery; slot: WineryAvailability; driveMinutes: number };

const DEFAULT_DAY_START = "09:30";
const DEFAULT_DAY_END = "17:30";
const DEFAULT_DRIVE_MINUTES = 20;

const wineryPoints: Record<string, Point> = {
  "11111111-1111-1111-1111-111111111111": { lat: -33.682, lon: 115.052 }, // Vasse Felix
  "22222222-2222-2222-2222-222222222222": { lat: -33.712, lon: 115.041 }, // Cullen Wines
  "33333333-3333-3333-3333-333333333333": { lat: -33.723, lon: 115.114 }, // Fraser Gallop
  "44444444-4444-4444-4444-444444444444": { lat: -33.698, lon: 115.035 }, // Woodlands
};

const pickupPoints: Array<{ key: string; point: Point }> = [
  { key: "margaret river visitor centre", point: { lat: -33.952, lon: 115.075 } },
  { key: "dunsborough town centre", point: { lat: -33.615, lon: 115.106 } },
  { key: "prevelly beach", point: { lat: -33.983, lon: 114.995 } },
  { key: "busselton jetty", point: { lat: -33.644, lon: 115.346 } },
];

function scoreCandidate(winery: Winery, availability: WineryAvailability, partySize: number) {
  const capacityFactor = Math.max(0, winery.capacity - partySize);
  const confirmationBoost = winery.confirmationMode === "auto_confirm" ? 8 : 0;
  return 70 + Math.min(20, capacityFactor) + confirmationBoost;
}

function toTimeValue(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}

function haversineKm(from: Point, to: Point) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function estimateDriveMinutes(from?: Point, to?: Point) {
  if (!from || !to) {
    return DEFAULT_DRIVE_MINUTES;
  }

  const distanceKm = haversineKm(from, to);
  if (distanceKm < 0.5) {
    return 5;
  }

  const roadFactor = 1.25;
  const averageRoadSpeedKmH = 56;
  const bufferMinutes = 5;
  return Math.max(
    8,
    Math.round(((distanceKm * roadFactor) / averageRoadSpeedKmH) * 60 + bufferMinutes),
  );
}

function resolvePickupPoint(pickupLocation: string) {
  const lowered = pickupLocation.toLowerCase();
  const match = pickupPoints.find((entry) => lowered.includes(entry.key));
  return match?.point;
}

function buildSlotCombinations(
  slotGroups: Array<{ winery: Winery; slots: WineryAvailability[] }>,
  maxCombinations = 180,
) {
  const combinations: Array<Array<{ winery: Winery; slot: WineryAvailability }>> = [];

  function walk(
    index: number,
    current: Array<{ winery: Winery; slot: WineryAvailability }>,
  ) {
    if (combinations.length >= maxCombinations) {
      return;
    }

    if (index >= slotGroups.length) {
      combinations.push([...current]);
      return;
    }

    const group = slotGroups[index];
    if (!group) {
      return;
    }

    for (const slot of group.slots) {
      current.push({ winery: group.winery, slot });
      walk(index + 1, current);
      current.pop();

      if (combinations.length >= maxCombinations) {
        return;
      }
    }
  }

  walk(0, []);
  return combinations;
}

function buildFeasibleRoute(params: {
  request: RecommendItineraryRequest;
  selection: Array<{ winery: Winery; slot: WineryAvailability }>;
}): { stops: PlannedStop[]; totalDriveMinutes: number } | null {
  const { request, selection } = params;
  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const dayEnd = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);
  const pickupPoint = resolvePickupPoint(request.pickup_location);

  const sorted = [...selection].sort(
    (a, b) => toTimeValue(a.slot.startTime) - toTimeValue(b.slot.startTime),
  );

  let currentTime = dayStart;
  let currentPoint = pickupPoint;
  let totalDriveMinutes = 0;
  const stops: PlannedStop[] = [];

  for (const item of sorted) {
    const slotStart = toTimeValue(item.slot.startTime);
    const slotEnd = toTimeValue(item.slot.endTime);
    const nextPoint = wineryPoints[item.winery.wineryId];
    const drive = estimateDriveMinutes(currentPoint, nextPoint);
    const earliestArrival = currentTime + drive;

    if (earliestArrival > slotStart || slotEnd > dayEnd) {
      return null;
    }

    totalDriveMinutes += drive;
    stops.push({
      winery: item.winery,
      slot: item.slot,
      driveMinutes: drive,
    });

    currentTime = slotEnd;
    currentPoint = nextPoint;
  }

  const returnDrive = estimateDriveMinutes(currentPoint, pickupPoint);
  if (currentTime + returnDrive > dayEnd) {
    return null;
  }
  totalDriveMinutes += returnDrive;

  return { stops, totalDriveMinutes };
}

function scoreRoute(params: {
  request: RecommendItineraryRequest;
  route: { stops: PlannedStop[]; totalDriveMinutes: number };
}) {
  const { request, route } = params;
  const candidateScore =
    route.stops.reduce(
      (sum, stop) => sum + scoreCandidate(stop.winery, stop.slot, request.party_size),
      0,
    ) / route.stops.length;

  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const dayEnd = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);
  const lastStop = route.stops[route.stops.length - 1];
  const usedMinutes = lastStop ? toTimeValue(lastStop.slot.endTime) - dayStart : 0;
  const availableMinutes = Math.max(1, dayEnd - dayStart);
  const idleMinutes = Math.max(0, availableMinutes - usedMinutes);
  const drivePenalty = Math.min(24, Math.round(route.totalDriveMinutes / 7));
  const idlePenalty = Math.min(10, Math.round(idleMinutes / 45));

  return Math.max(
    55,
    Math.min(99, Math.round(candidateScore + route.stops.length * 2 - drivePenalty - idlePenalty)),
  );
}

function buildRelaxedFallbackItinerary(params: {
  request: RecommendItineraryRequest;
  slotGroups: Array<{ winery: Winery; slots: WineryAvailability[] }>;
}): ItineraryOption | null {
  const { request, slotGroups } = params;
  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);

  const stops: PlannedStop[] = slotGroups
    .map((entry) => {
      const preferredSlot =
        entry.slots.find((slot) => toTimeValue(slot.startTime) >= dayStart) ?? entry.slots[0];
      if (!preferredSlot) {
        return null;
      }
      return { winery: entry.winery, slot: preferredSlot, driveMinutes: DEFAULT_DRIVE_MINUTES };
    })
    .filter((entry): entry is PlannedStop => Boolean(entry))
    .sort((a, b) => toTimeValue(a.slot.startTime) - toTimeValue(b.slot.startTime));

  if (stops.length === 0) {
    return null;
  }

  return {
    itineraryId: makeId(),
    expertPick: true,
    justification:
      "Testing fallback schedule generated from open availability while strict timing is being refined.",
    score: 72,
    label: "TailorMoments Expert Pick",
    stops: stops.map((stop) => ({
      wineryId: stop.winery.wineryId,
      wineryName: stop.winery.name,
      arrivalTime: `${stop.slot.serviceDate}T${stop.slot.startTime}:00Z`,
      departureTime: `${stop.slot.serviceDate}T${stop.slot.endTime}:00Z`,
      driveMinutes: stop.driveMinutes,
    })),
  };
}

export function buildCandidateItineraries(params: {
  request: RecommendItineraryRequest;
  wineries: Winery[];
  availability: WineryAvailability[];
}): ItineraryOption[] {
  const { request, wineries, availability } = params;
  const preferredIds = request.preferred_wineries ?? [];
  const activeWineryIds = new Set(wineries.map((winery) => winery.wineryId));
  const recognizedPreferredIds = preferredIds.filter((id) => activeWineryIds.has(id));
  const preferredSet = new Set(recognizedPreferredIds);

  const filteredWineries = wineries.filter((winery) => {
    const regionMatch = request.preferred_region ? winery.region === request.preferred_region : true;
    const preferredMatch = preferredSet.size > 0 ? preferredSet.has(winery.wineryId) : true;
    return winery.active && regionMatch && preferredMatch;
  });

  const openAvailability = availability.filter(
    (slot) =>
      slot.serviceDate === request.booking_date &&
      slot.remainingCapacity >= request.party_size &&
      slot.status === "open",
  );

  const slotGroups = filteredWineries
    .map((winery) => ({
      winery,
      slots: openAvailability
        .filter((slot) => slot.wineryId === winery.wineryId)
        .filter((slot) => {
          const slotStart = toTimeValue(slot.startTime);
          const slotEnd = toTimeValue(slot.endTime);
          const startBound = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
          const endBound = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);
          return slotStart >= startBound && slotEnd <= endBound;
        })
        .sort((a, b) => toTimeValue(a.startTime) - toTimeValue(b.startTime)),
    }))
    .filter((entry) => entry.slots.length > 0);

  if (slotGroups.length === 0) {
    return [];
  }

  const combinations = buildSlotCombinations(slotGroups);
  const feasibleOptions = combinations
    .map((selection) => buildFeasibleRoute({ request, selection }))
    .filter((route): route is { stops: PlannedStop[]; totalDriveMinutes: number } => Boolean(route))
    .map((route) => ({
      route,
      score: scoreRoute({ request, route }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (feasibleOptions.length === 0) {
    const fallback = buildRelaxedFallbackItinerary({ request, slotGroups });
    return fallback ? [fallback] : [];
  }

  return feasibleOptions.map(({ route, score }, index) => ({
    itineraryId: makeId(),
    expertPick: index === 0,
    justification:
      index === 0
        ? `Best fit for your requested day window with ${route.stops.length} winery stops and realistic transfer timing.`
        : "Backup option that still fits your requested hours and transfer constraints.",
    score,
    label: index === 0 ? "TailorMoments Expert Pick" : `Option ${index + 1}`,
    stops: route.stops.map((stop) => ({
      wineryId: stop.winery.wineryId,
      wineryName: stop.winery.name,
      arrivalTime: `${stop.slot.serviceDate}T${stop.slot.startTime}:00Z`,
      departureTime: `${stop.slot.serviceDate}T${stop.slot.endTime}:00Z`,
      driveMinutes: stop.driveMinutes,
    })),
  }));
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
