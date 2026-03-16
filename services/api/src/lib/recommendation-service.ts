import type {
  ItineraryOption,
  RecommendItineraryRequest,
  RecommendItineraryResponse,
  Winery,
  WineryAvailability,
} from "../domain/models.js";
import { makeId } from "../lib/crypto.js";
import {
  buildTravelTimeMatrix,
  estimateBaselineTravelMinutes,
  travelConfidenceForSource,
  type Point,
  type TravelTimeMatrix,
} from "./travel-time-provider.js";

type PlannedStop = {
  winery: Winery;
  slot: WineryAvailability;
  driveMinutes: number;
  arrivalMinutes: number;
  departureMinutes: number;
};
type WinerySlotGroup = { winery: Winery; slots: WineryAvailability[] };
type FeasibleRoute = {
  stops: PlannedStop[];
  totalDriveMinutes: number;
  totalIdleMinutes: number;
};
type EvaluatedRoute = {
  route: FeasibleRoute;
  score: number;
  objectiveCost: number;
  stopCount: number;
};
type CandidateBuildDiagnostics = {
  combinationsTested: number;
  permutationsTested: number;
  feasibleRoutesFound: number;
  bestRouteStopCount: number;
  bestRouteDriveMinutes: number;
  bestRouteIdleMinutes: number;
};
type CandidateBuildResult = {
  itineraries: ItineraryOption[];
  diagnostics: CandidateBuildDiagnostics;
  usedFallback: boolean;
};
type SelectedRouteTravelQuality = {
  segmentCount: number;
  fallbackSegmentCount: number;
  fallbackSegmentPercentage: number;
  averageConfidence: number;
  totalDriveMinutes: number;
  estimatedBaselineMinutes: number;
  matrixMinutes: number;
  estimatedVsActualDeltaMinutes: number;
};

const DEFAULT_DAY_START = "09:30";
const DEFAULT_DAY_END = "17:30";
const MAX_STOPS_PER_DAY = 4;
const MIN_STOPS_PER_DAY = 2;
const LUNCH_WINDOW_START = 11 * 60 + 30;
const LUNCH_WINDOW_END = 14 * 60;
const LUNCH_BREAK_MINUTES = 45;
const DEFAULT_TASTING_DURATION_MINUTES = 45;

const pickupPoints: Array<{ key: string; point: Point }> = [
  { key: "margaret river visitor centre", point: { lat: -33.952, lon: 115.075 } },
  { key: "dunsborough town centre", point: { lat: -33.615, lon: 115.106 } },
  { key: "prevelly beach", point: { lat: -33.983, lon: 114.995 } },
  { key: "busselton jetty", point: { lat: -33.644, lon: 115.346 } },
];

function roundTo(value: number, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function scoreCandidate(winery: Winery, availability: WineryAvailability, partySize: number) {
  const capacityFactor = Math.max(0, winery.capacity - partySize);
  const confirmationBoost = winery.confirmationMode === "auto_confirm" ? 8 : 0;
  return 70 + Math.min(20, capacityFactor) + confirmationBoost;
}

function toTimeValue(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}

function toClockValue(minutes: number) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toLocalIso(serviceDate: string, hhmm: string) {
  return `${serviceDate}T${hhmm}:00`;
}

function resolveTastingDurationMinutes(winery: Winery, slot?: WineryAvailability) {
  const wineryDuration = winery.tastingDurationMinutes;
  if (typeof wineryDuration === "number" && Number.isFinite(wineryDuration) && wineryDuration > 0) {
    return Math.round(wineryDuration);
  }

  if (slot) {
    const slotDuration = toTimeValue(slot.endTime) - toTimeValue(slot.startTime);
    if (Number.isFinite(slotDuration) && slotDuration > 0) {
      return slotDuration;
    }
  }

  return DEFAULT_TASTING_DURATION_MINUTES;
}

function resolvePickupPoint(pickupLocation: string) {
  const lowered = pickupLocation.toLowerCase();
  const match = pickupPoints.find((entry) => lowered.includes(entry.key));
  return match?.point;
}

function pointForWinery(winery: Winery): Point | undefined {
  if (
    winery.latitude === undefined ||
    winery.longitude === undefined ||
    !Number.isFinite(winery.latitude) ||
    !Number.isFinite(winery.longitude)
  ) {
    return undefined;
  }

  return { lat: winery.latitude, lon: winery.longitude };
}

function buildTravelPointsById(request: RecommendItineraryRequest, wineries: Winery[]) {
  const pointsById: Record<string, Point | undefined> = {
    pickup: resolvePickupPoint(request.pickup_location),
  };

  for (const winery of wineries) {
    pointsById[winery.wineryId] = pointForWinery(winery);
  }

  return pointsById;
}

function createEmptySelectedRouteQuality(): SelectedRouteTravelQuality {
  return {
    segmentCount: 0,
    fallbackSegmentCount: 0,
    fallbackSegmentPercentage: 0,
    averageConfidence: 0,
    totalDriveMinutes: 0,
    estimatedBaselineMinutes: 0,
    matrixMinutes: 0,
    estimatedVsActualDeltaMinutes: 0,
  };
}

function evaluateSelectedRouteTravelQuality(params: {
  itinerary: ItineraryOption | undefined;
  travelTimes: TravelTimeMatrix;
  pointsById: Record<string, Point | undefined>;
}): SelectedRouteTravelQuality {
  const { itinerary, travelTimes, pointsById } = params;
  if (!itinerary || itinerary.stops.length === 0) {
    return createEmptySelectedRouteQuality();
  }

  let segmentCount = 0;
  let fallbackSegmentCount = 0;
  let confidenceTotal = 0;
  let totalDriveMinutes = 0;
  let estimatedBaselineMinutes = 0;
  let matrixMinutes = 0;
  let previousNodeId = "pickup";

  const processSegment = (fromId: string, toId: string) => {
    const source = travelTimes.sourceForLeg(fromId, toId);
    const driveMinutes = travelTimes.getMinutes(fromId, toId);
    const baselineEstimate = estimateBaselineTravelMinutes(pointsById[fromId], pointsById[toId]);
    const baselineMinutes = baselineEstimate.minutes;

    segmentCount += 1;
    totalDriveMinutes += driveMinutes;
    estimatedBaselineMinutes += baselineMinutes;
    confidenceTotal += travelConfidenceForSource(source);

    if (source === "matrix") {
      matrixMinutes += driveMinutes;
    } else {
      fallbackSegmentCount += 1;
    }
  };

  for (const stop of itinerary.stops) {
    processSegment(previousNodeId, stop.wineryId);
    previousNodeId = stop.wineryId;
  }
  processSegment(previousNodeId, "pickup");

  const fallbackSegmentPercentage = segmentCount > 0
    ? roundTo((fallbackSegmentCount / segmentCount) * 100, 2)
    : 0;
  const averageConfidence = segmentCount > 0
    ? roundTo(confidenceTotal / segmentCount, 3)
    : 0;
  const estimatedVsActualDeltaMinutes = totalDriveMinutes - estimatedBaselineMinutes;

  return {
    segmentCount,
    fallbackSegmentCount,
    fallbackSegmentPercentage,
    averageConfidence,
    totalDriveMinutes,
    estimatedBaselineMinutes,
    matrixMinutes,
    estimatedVsActualDeltaMinutes,
  };
}

function buildSlotCombinations(
  slotGroups: WinerySlotGroup[],
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
  travelTimes: TravelTimeMatrix;
}): FeasibleRoute | null {
  const { request, selection, travelTimes } = params;
  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const dayEnd = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);

  let currentTime = dayStart;
  let currentNodeId = "pickup";
  let totalDriveMinutes = 0;
  let totalIdleMinutes = 0;
  const stops: PlannedStop[] = [];
  const idleWindows: Array<{ start: number; end: number }> = [];

  for (const item of selection) {
    const slotStart = toTimeValue(item.slot.startTime);
    const slotWindowEnd = toTimeValue(item.slot.endTime);
    const tastingDurationMinutes = resolveTastingDurationMinutes(item.winery, item.slot);
    const slotDeparture = slotStart + tastingDurationMinutes;
    const drive = travelTimes.getMinutes(currentNodeId, item.winery.wineryId);
    const earliestArrival = currentTime + drive;

    if (earliestArrival > slotStart || slotDeparture > slotWindowEnd || slotDeparture > dayEnd) {
      return null;
    }
    if (slotStart > earliestArrival) {
      idleWindows.push({ start: earliestArrival, end: slotStart });
      totalIdleMinutes += slotStart - earliestArrival;
    }

    totalDriveMinutes += drive;
    stops.push({
      winery: item.winery,
      slot: item.slot,
      driveMinutes: drive,
      arrivalMinutes: slotStart,
      departureMinutes: slotDeparture,
    });

    currentTime = slotDeparture;
    currentNodeId = item.winery.wineryId;
  }

  const returnDrive = travelTimes.getMinutes(currentNodeId, "pickup");
  if (currentTime + returnDrive > dayEnd) {
    return null;
  }
  totalDriveMinutes += returnDrive;

  const hasLunchBreak = idleWindows.some((window) => {
    const overlapStart = Math.max(window.start, LUNCH_WINDOW_START);
    const overlapEnd = Math.min(window.end, LUNCH_WINDOW_END);
    return overlapEnd - overlapStart >= LUNCH_BREAK_MINUTES;
  });
  const hasLunchAtStop = stops.some((stop) => {
    const stopStart = stop.arrivalMinutes;
    const stopEnd = stop.departureMinutes;
    const overlapStart = Math.max(stopStart, LUNCH_WINDOW_START);
    const overlapEnd = Math.min(stopEnd, LUNCH_WINDOW_END);
    return overlapEnd - overlapStart >= LUNCH_BREAK_MINUTES;
  });

  if (!hasLunchBreak && !hasLunchAtStop) {
    return null;
  }

  return { stops, totalDriveMinutes, totalIdleMinutes };
}

function scoreRoute(params: {
  request: RecommendItineraryRequest;
  route: FeasibleRoute;
}): { score: number; objectiveCost: number } {
  const { request, route } = params;
  const candidateScore =
    route.stops.reduce(
      (sum, stop) => sum + scoreCandidate(stop.winery, stop.slot, request.party_size),
      0,
    ) / route.stops.length;

  const qualityBonus = Math.max(0, (candidateScore - 70) * 0.18);
  const drivePenalty = route.totalDriveMinutes / 6;
  const idlePenalty = route.totalIdleMinutes / 12;
  const stopBonus = route.stops.length * 4;
  const score = Math.max(
    55,
    Math.min(99, Math.round(80 + stopBonus + qualityBonus - drivePenalty - idlePenalty)),
  );
  const objectiveCost = route.totalDriveMinutes + route.totalIdleMinutes * 1.1 - qualityBonus;

  return { score, objectiveCost };
}

function findBestPermutationForSelection(params: {
  request: RecommendItineraryRequest;
  selection: Array<{ winery: Winery; slot: WineryAvailability }>;
  travelTimes: TravelTimeMatrix;
}): { bestRoute: EvaluatedRoute | null; permutationsTested: number } {
  const { request, selection, travelTimes } = params;
  const remaining = [...selection];
  const current: Array<{ winery: Winery; slot: WineryAvailability }> = [];
  let permutationsTested = 0;
  let bestRoute: EvaluatedRoute | null = null;

  function walk() {
    if (current.length === selection.length) {
      permutationsTested += 1;
      const route = buildFeasibleRoute({
        request,
        selection: [...current],
        travelTimes,
      });
      if (!route) {
        return;
      }
      const { score, objectiveCost } = scoreRoute({ request, route });
      const candidate: EvaluatedRoute = {
        route,
        score,
        objectiveCost,
        stopCount: route.stops.length,
      };

      if (
        !bestRoute ||
        candidate.objectiveCost < bestRoute.objectiveCost ||
        (candidate.objectiveCost === bestRoute.objectiveCost && candidate.score > bestRoute.score)
      ) {
        bestRoute = candidate;
      }
      return;
    }

    for (let index = 0; index < remaining.length; index += 1) {
      const item = remaining.splice(index, 1)[0];
      if (!item) {
        continue;
      }
      current.push(item);
      walk();
      current.pop();
      remaining.splice(index, 0, item);
    }
  }

  walk();

  return { bestRoute, permutationsTested };
}

function buildRelaxedFallbackItinerary(params: {
  request: RecommendItineraryRequest;
  slotGroups: WinerySlotGroup[];
  targetStops?: number;
  travelTimes: TravelTimeMatrix;
}): ItineraryOption | null {
  const { request, slotGroups, targetStops, travelTimes } = params;
  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const dayEnd = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);

  const selectedGroups = [...slotGroups]
    .sort((a, b) => b.slots.length - a.slots.length)
    .slice(0, Math.min(targetStops ?? MAX_STOPS_PER_DAY, MAX_STOPS_PER_DAY));

  if (selectedGroups.length === 0) {
    return null;
  }

  const unvisited = [...selectedGroups];
  let currentTime = dayStart;
  let currentNodeId = "pickup";
  let totalDriveMinutes = 0;
  const stops: Array<{
    wineryId: string;
    wineryName: string;
    arrivalTime: string;
    departureTime: string;
    driveMinutes: number;
  }> = [];

  while (unvisited.length > 0 && stops.length < MAX_STOPS_PER_DAY) {
    let nextIndex = 0;
    let nextDrive = Number.MAX_SAFE_INTEGER;

    for (let index = 0; index < unvisited.length; index += 1) {
      const group = unvisited[index];
      if (!group) {
        continue;
      }
      const drive = travelTimes.getMinutes(currentNodeId, group.winery.wineryId);
      if (drive < nextDrive) {
        nextDrive = drive;
        nextIndex = index;
      }
    }

    const nextGroup = unvisited.splice(nextIndex, 1)[0];
    if (!nextGroup) {
      continue;
    }

    const representativeSlot = nextGroup.slots[0];
    const slotDurationMinutes = resolveTastingDurationMinutes(nextGroup.winery, representativeSlot);

    const arrivalMinutes = currentTime + nextDrive;
    const departureMinutes = arrivalMinutes + slotDurationMinutes;
    if (departureMinutes > dayEnd) {
      continue;
    }

    totalDriveMinutes += nextDrive;
    stops.push({
      wineryId: nextGroup.winery.wineryId,
      wineryName: nextGroup.winery.name,
      arrivalTime: toLocalIso(request.booking_date, toClockValue(arrivalMinutes)),
      departureTime: toLocalIso(request.booking_date, toClockValue(departureMinutes)),
      driveMinutes: nextDrive,
    });

    currentTime = departureMinutes;
    currentNodeId = nextGroup.winery.wineryId;
  }

  if (stops.length === 0) {
    return null;
  }

  const averageDrive = totalDriveMinutes / Math.max(1, stops.length);
  const score = Math.max(62, Math.min(86, Math.round(84 - averageDrive / 2)));

  return {
    itineraryId: makeId(),
    expertPick: true,
    justification:
      "Sequenced fallback route generated with non-overlapping stops and estimated inter-venue travel timings.",
    score,
    label: "TailorMoments Expert Pick",
    stops,
  };
}

function buildGroupSubsets(slotGroups: WinerySlotGroup[]) {
  const maxSize = Math.min(MAX_STOPS_PER_DAY, slotGroups.length);
  const minSize = Math.min(MIN_STOPS_PER_DAY, maxSize);
  const subsets: WinerySlotGroup[][] = [];

  function walk(start: number, size: number, current: WinerySlotGroup[]) {
    if (current.length === size) {
      subsets.push([...current]);
      return;
    }
    for (let index = start; index < slotGroups.length; index += 1) {
      const group = slotGroups[index];
      if (!group) {
        continue;
      }
      current.push(group);
      walk(index + 1, size, current);
      current.pop();
      if (subsets.length >= 36) {
        return;
      }
    }
  }

  for (let size = maxSize; size >= minSize; size -= 1) {
    walk(0, size, []);
    if (subsets.length >= 36) {
      break;
    }
  }

  if (subsets.length === 0) {
    return [slotGroups];
  }
  return subsets;
}

function createEmptyDiagnostics(): CandidateBuildDiagnostics {
  return {
    combinationsTested: 0,
    permutationsTested: 0,
    feasibleRoutesFound: 0,
    bestRouteStopCount: 0,
    bestRouteDriveMinutes: 0,
    bestRouteIdleMinutes: 0,
  };
}

export function buildCandidateItineraries(params: {
  request: RecommendItineraryRequest;
  wineries: Winery[];
  availability: WineryAvailability[];
  travelTimes: TravelTimeMatrix;
}): CandidateBuildResult {
  const { request, wineries, availability, travelTimes } = params;
  const diagnostics = createEmptyDiagnostics();
  const preferredIds = request.preferred_wineries ?? [];
  const activeWineryIds = new Set(wineries.map((winery) => winery.wineryId));
  const recognizedPreferredIds = preferredIds.filter((id) => activeWineryIds.has(id));
  const preferredSet = new Set(recognizedPreferredIds);

  const filteredWineries = wineries.filter((winery) => {
    const regionMatch = request.preferred_region ? winery.region === request.preferred_region : true;
    const preferredMatch = preferredIds.length > 0 ? preferredSet.has(winery.wineryId) : true;
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
    return {
      itineraries: [],
      diagnostics,
      usedFallback: false,
    };
  }

  const groupSubsets = buildGroupSubsets(slotGroups);
  const combinations = groupSubsets.flatMap((subset) => buildSlotCombinations(subset, 120));
  diagnostics.combinationsTested = combinations.length;
  const scoredRoutes: EvaluatedRoute[] = [];

  for (const selection of combinations) {
    const permutationResult = findBestPermutationForSelection({
      request,
      selection,
      travelTimes,
    });
    diagnostics.permutationsTested += permutationResult.permutationsTested;

    if (permutationResult.bestRoute) {
      scoredRoutes.push(permutationResult.bestRoute);
    }
  }
  diagnostics.feasibleRoutesFound = scoredRoutes.length;

  const maxFeasibleStopCount = scoredRoutes.reduce(
    (max, entry) => Math.max(max, entry.stopCount),
    0,
  );
  const targetStopCount = Math.min(
    MAX_STOPS_PER_DAY,
    preferredSet.size > 0 ? preferredSet.size : slotGroups.length,
  );

  // Prioritize fuller itineraries: if we can schedule more selected wineries, do that first.
  const feasibleOptions = scoredRoutes
    .filter((entry) => entry.stopCount === maxFeasibleStopCount)
    .sort((a, b) => a.objectiveCost - b.objectiveCost || b.score - a.score)
    .slice(0, 3);

  if (feasibleOptions.length === 0 || maxFeasibleStopCount < targetStopCount) {
    const fallback = buildRelaxedFallbackItinerary({
      request,
      slotGroups,
      targetStops: targetStopCount,
      travelTimes,
    });
    return {
      itineraries: fallback ? [fallback] : [],
      diagnostics,
      usedFallback: Boolean(fallback),
    };
  }

  const bestRoute = feasibleOptions[0]?.route;
  if (bestRoute) {
    diagnostics.bestRouteStopCount = bestRoute.stops.length;
    diagnostics.bestRouteDriveMinutes = bestRoute.totalDriveMinutes;
    diagnostics.bestRouteIdleMinutes = bestRoute.totalIdleMinutes;
  }

  return {
    itineraries: feasibleOptions.map(({ route, score }, index) => ({
      itineraryId: makeId(),
      expertPick: index === 0,
      justification:
        index === 0
          ? `Best fit for your requested day window with ${route.stops.length} winery stops and optimized stop ordering.`
          : "Backup option that still fits your requested hours and transfer constraints.",
      score,
      label: index === 0 ? "TailorMoments Expert Pick" : `Option ${index + 1}`,
      stops: route.stops.map((stop) => ({
        wineryId: stop.winery.wineryId,
        wineryName: stop.winery.name,
        arrivalTime: toLocalIso(stop.slot.serviceDate, toClockValue(stop.arrivalMinutes)),
        departureTime: toLocalIso(stop.slot.serviceDate, toClockValue(stop.departureMinutes)),
        driveMinutes: stop.driveMinutes,
      })),
    })),
    diagnostics,
    usedFallback: false,
  };
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
  const { request, wineries, availability } = params;
  const preferredIds = request.preferred_wineries ?? [];
  const activeWineryIds = new Set(wineries.map((winery) => winery.wineryId));
  const recognizedPreferredIds = preferredIds.filter((id) => activeWineryIds.has(id));
  const preferredSet = new Set(recognizedPreferredIds);
  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const dayEnd = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);

  const filteredWineries = wineries.filter((winery) => {
    const regionMatch = request.preferred_region ? winery.region === request.preferred_region : true;
    const preferredMatch = preferredIds.length > 0 ? preferredSet.has(winery.wineryId) : true;
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
          return slotStart >= dayStart && slotEnd <= dayEnd;
        })
        .sort((a, b) => toTimeValue(a.startTime) - toTimeValue(b.startTime)),
    }))
    .filter((entry) => entry.slots.length > 0);

  const droppedWineries = filteredWineries
    .map((winery) => {
      const slotCount = openAvailability.filter((slot) => {
        if (slot.wineryId !== winery.wineryId) {
          return false;
        }
        const slotStart = toTimeValue(slot.startTime);
        const slotEnd = toTimeValue(slot.endTime);
        return slotStart >= dayStart && slotEnd <= dayEnd;
      }).length;
      return { winery, slotCount };
    })
    .filter((entry) => entry.slotCount === 0)
    .map((entry) => ({
      winery_id: entry.winery.wineryId,
      winery_name: entry.winery.name,
      reason: "no_slots_in_requested_time_window",
      slot_count: 0,
    }));

  const travelPointsById = buildTravelPointsById(request, filteredWineries);
  const travelTimes = await buildTravelTimeMatrix({
    pointsById: travelPointsById,
    departureHint: `${request.booking_date}T${request.preferred_start_time ?? DEFAULT_DAY_START}`,
  });

  const candidateBuild = buildCandidateItineraries({
    request,
    wineries,
    availability,
    travelTimes,
  });
  const ranked = await rankItinerariesWithAi(candidateBuild.itineraries);
  const selectedRouteQuality = evaluateSelectedRouteTravelQuality({
    itinerary: ranked[0],
    travelTimes,
    pointsById: travelPointsById,
  });

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
    scheduling_trace: {
      requested_wineries_count: preferredIds.length,
      recognized_preferred_count: recognizedPreferredIds.length,
      considered_wineries_count: filteredWineries.length,
      wineries_with_slots_count: slotGroups.length,
      combinations_tested: candidateBuild.diagnostics.combinationsTested,
      permutations_tested: candidateBuild.diagnostics.permutationsTested,
      feasible_routes_found: candidateBuild.diagnostics.feasibleRoutesFound,
      generated_options_count: ranked.length,
      used_fallback: candidateBuild.usedFallback,
      best_route_stop_count: candidateBuild.diagnostics.bestRouteStopCount,
      best_route_drive_minutes: candidateBuild.diagnostics.bestRouteDriveMinutes,
      best_route_idle_minutes: candidateBuild.diagnostics.bestRouteIdleMinutes,
      travel_time_provider: travelTimes.summary.provider,
      travel_time_point_count: travelTimes.summary.point_count,
      travel_time_total_legs: travelTimes.summary.total_leg_count,
      travel_time_matrix_legs: travelTimes.summary.matrix_leg_count,
      travel_time_haversine_legs: travelTimes.summary.haversine_leg_count,
      travel_time_default_legs: travelTimes.summary.default_leg_count,
      travel_time_fallback_legs: travelTimes.summary.fallback_leg_count,
      travel_time_fallback_percentage: travelTimes.summary.fallback_leg_percentage,
      travel_time_average_confidence: travelTimes.summary.average_leg_confidence,
      travel_time_cache_hit: travelTimes.summary.cache_hit,
      selected_route_segment_count: selectedRouteQuality.segmentCount,
      selected_route_fallback_segments: selectedRouteQuality.fallbackSegmentCount,
      selected_route_fallback_percentage: selectedRouteQuality.fallbackSegmentPercentage,
      selected_route_average_confidence: selectedRouteQuality.averageConfidence,
      selected_route_total_drive_minutes: selectedRouteQuality.totalDriveMinutes,
      selected_route_estimated_minutes: selectedRouteQuality.estimatedBaselineMinutes,
      selected_route_matrix_minutes: selectedRouteQuality.matrixMinutes,
      selected_route_estimated_vs_actual_delta_minutes: selectedRouteQuality.estimatedVsActualDeltaMinutes,
      requested_time_window: {
        start: request.preferred_start_time ?? DEFAULT_DAY_START,
        end: request.preferred_end_time ?? DEFAULT_DAY_END,
      },
      dropped_wineries: droppedWineries,
    },
  };
}
