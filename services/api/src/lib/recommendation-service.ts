import type {
  ItineraryOption,
  RecommendItineraryRequest,
  RecommendItineraryResponse,
  SchedulePace,
  Winery,
  WineryAvailability,
} from "../domain/models.js";
import { makeId } from "../lib/crypto.js";
import { enhanceWithAiJustifications, type WineryFactsById } from "./recommendation-ai.js";
import {
  buildTravelTimeMatrix,
  estimateBaselineTravelMinutes,
  travelConfidenceForSource,
  type Point,
  type TravelTimeMatrix,
} from "./travel-time-provider.js";

type PlannedStop = {
  winery: Winery;
  driveMinutes: number;
  arrivalMinutes: number;
  departureMinutes: number;
};
// A winery treated as an open booking window for the day, derived from its
// availability slots: openStart = earliest a tasting can begin, latestStart = the
// last time one can begin. With the catalog's near-all-day availability this gives
// the scheduler freedom to order stops by driving efficiency rather than by slot.
type WineryWindow = { winery: Winery; openStart: number; latestStart: number };
// A placed lunch: which winery hosts it and the time window it occupies (usually the
// gap after that winery's tasting). null when the day has nowhere sensible for lunch.
type RouteLunch = {
  winery: Winery;
  startMinutes: number;
  endMinutes: number;
};
type FeasibleRoute = {
  stops: PlannedStop[];
  totalDriveMinutes: number;
  totalIdleMinutes: number;
  lunch: RouteLunch | null;
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
const ACCEPTABLE_DRIVE_MINUTES_PER_STOP = 30;
const LUNCH_WINDOW_START = 11 * 60 + 30;
const LUNCH_WINDOW_END = 14 * 60;
const DEFAULT_TASTING_DURATION_MINUTES = 45;
const CANDIDATE_BUILD_TIME_BUDGET_MS = 1200;
// One candidate set per subset now (no slot enumeration), so we can evaluate more.
const MAX_GROUP_SUBSETS_TO_EVALUATE = 40;
// Each subset's optimal visiting order is found by exact permutation; 4! = 24, so
// this fully explores up to a 4-stop day.
const MAX_PERMUTATIONS_PER_SELECTION = 24;
const MAX_FEASIBLE_ROUTES_TO_SCORE = 60;
// Breathing room between consecutive stops, and the lunch break at the food venue,
// by pace. The day starts near dayStart (no dead morning) and ends when it ends —
// a relaxed 2-winery day is simply shorter, not stretched to fill the window.
const BREATHING_GAP_BY_PACE: Record<SchedulePace, number> = {
  relaxed: 35,
  balanced: 20,
  maximise: 8,
};
const LUNCH_BREAK_BY_PACE: Record<SchedulePace, number> = {
  relaxed: 105,
  balanced: 75,
  maximise: 45,
};

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

function isPastDeadline(deadlineMs?: number) {
  return typeof deadlineMs === "number" && Date.now() > deadlineMs;
}

function scoreCandidate(winery: Winery, partySize: number) {
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

function roundUpToNearestQuarterHour(minutes: number) {
  if (!Number.isFinite(minutes)) {
    return minutes;
  }
  return Math.ceil(minutes / 15) * 15;
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

function resolvePickupPoint(request: RecommendItineraryRequest) {
  if (
    typeof request.pickup_latitude === "number" &&
    Number.isFinite(request.pickup_latitude) &&
    typeof request.pickup_longitude === "number" &&
    Number.isFinite(request.pickup_longitude)
  ) {
    return { lat: request.pickup_latitude, lon: request.pickup_longitude };
  }

  const pickupLocation = request.pickup_location;
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
    pickup: resolvePickupPoint(request),
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

// Collapse a winery's open availability slots into a single bookable window.
function deriveWineryWindow(winery: Winery, slots: WineryAvailability[]): WineryWindow {
  const starts = slots.map((slot) => toTimeValue(slot.startTime));
  const openStart = Math.min(...starts);
  const latestStart = Math.max(...starts);
  return { winery, openStart, latestStart };
}

const LUNCH_OFFER_RE = /lunch|restaurant|degustation|dining|feast|tapas|long table|grazing|kitchen|caf[eé]|bistro|share plates?/i;
const FOOD_OFFER_RE = /lunch|restaurant|degustation|dining|feast|tapas|grazing|platter|board|cheese|charcuterie|nougat|chocolate|picnic|kitchen|caf[eé]|bistro|share|tasting plate/i;

function wineryFoodOffers(winery: Winery): string[] {
  return (winery.uniqueExperienceOffers ?? [])
    .map((offer) => offer.name)
    .filter((name) => FOOD_OFFER_RE.test(name));
}
function offersSitDownLunch(winery: Winery): boolean {
  return (
    winery.winerySignals.includes("winery_lunch") ||
    (winery.uniqueExperienceOffers ?? []).some((offer) => LUNCH_OFFER_RE.test(offer.name))
  );
}
function offersAnyFood(winery: Winery): boolean {
  return (
    offersSitDownLunch(winery) ||
    winery.offersCheeseBoard ||
    winery.winerySignals.includes("cheese_board") ||
    winery.winerySignals.includes("charcuterie_board") ||
    winery.winerySignals.includes("picnic_on_estate") ||
    winery.winerySignals.includes("garden_picnic") ||
    winery.winerySignals.includes("wine_chocolate") ||
    wineryFoodOffers(winery).length > 0
  );
}
export function describeWineryFood(winery: Winery): string {
  const offers = wineryFoodOffers(winery);
  if (offers.length > 0) {
    return offers.slice(0, 2).join("; ");
  }
  const parts: string[] = [];
  if (winery.winerySignals.includes("winery_lunch")) parts.push("winery restaurant");
  if (winery.winerySignals.includes("charcuterie_board")) parts.push("charcuterie boards");
  if (winery.winerySignals.includes("cheese_board") || winery.offersCheeseBoard) parts.push("cheese boards");
  if (winery.winerySignals.includes("picnic_on_estate") || winery.winerySignals.includes("garden_picnic")) {
    parts.push("estate picnic");
  }
  if (winery.winerySignals.includes("wine_chocolate")) parts.push("wine & chocolate");
  return parts.length > 0 ? parts.slice(0, 2).join("; ") : "cellar-door platters";
}

// Place lunch in the gap after the stop that best lands around midday. We PREFER a
// food-capable venue (and a real sit-down lunch most of all), but we do not require
// one: most Margaret River cellar doors offer at least platters, and the catalog's
// food signals are still sparse, so gating on them would leave many days with no
// lunch at all. describeWineryFood() supplies a sensible regional default when a
// winery has no explicit food data, so a placed lunch always has a description.
function computeRouteLunch(stops: PlannedStop[], dayEnd: number): RouteLunch | null {
  let best: { winery: Winery; startMinutes: number; endMinutes: number; score: number } | null = null;
  for (let i = 0; i < stops.length; i += 1) {
    const stop = stops[i];
    if (!stop) {
      continue;
    }
    const next = stops[i + 1];
    const startMinutes = stop.departureMinutes;
    const endMinutes = next ? next.arrivalMinutes : Math.min(dayEnd, startMinutes + 75);
    const windowMinutes = endMinutes - startMinutes;
    if (windowMinutes < 30) {
      continue;
    }
    const overlap = Math.min(endMinutes, LUNCH_WINDOW_END) - Math.max(startMinutes, LUNCH_WINDOW_START);
    if (overlap < 20) {
      continue;
    }
    // Prefer longer windows, midday timing, and (strongly) food-capable venues —
    // a real sit-down lunch outranks platters, which outrank a plain cellar door.
    const foodBonus = offersSitDownLunch(stop.winery) ? 120 : offersAnyFood(stop.winery) ? 60 : 0;
    const score = windowMinutes + overlap + foodBonus;
    if (!best || score > best.score) {
      best = { winery: stop.winery, startMinutes, endMinutes, score };
    }
  }
  return best ? { winery: best.winery, startMinutes: best.startMinutes, endMinutes: best.endMinutes } : null;
}

// Schedule a GIVEN visiting order. The order is chosen elsewhere to minimise drive;
// here we lay it out across the day. Because cellar doors are effectively open all
// day, earliest-feasible packing would finish a relaxed 2-stop day by lunchtime, so
// we deliberately SPREAD the stops across the available hours (more for relaxed,
// less for maximise) and anchor a real lunch break at a midday food venue. Returns
// null if the order can't physically fit the day window.
function scheduleOrderedRoute(params: {
  request: RecommendItineraryRequest;
  order: WineryWindow[];
  travelTimes: TravelTimeMatrix;
}): FeasibleRoute | null {
  const { request, order, travelTimes } = params;
  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const dayEnd = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);
  const pace = request.pace ?? "balanced";
  const n = order.length;
  if (n === 0) {
    return null;
  }

  // Drive legs (pickup → s0 → … → sN-1 → pickup) and tasting durations.
  const legs: number[] = [];
  let node = "pickup";
  for (const window of order) {
    legs.push(travelTimes.getMinutes(node, window.winery.wineryId));
    node = window.winery.wineryId;
  }
  const returnLeg = travelTimes.getMinutes(node, "pickup");
  const tastings = order.map((window) => resolveTastingDurationMinutes(window.winery));
  const driveTotal = legs.reduce((sum, value) => sum + value, 0) + returnLeg;
  const minimalSpan = driveTotal + tastings.reduce((sum, value) => sum + value, 0);
  if (dayStart + minimalSpan > dayEnd) {
    return null; // Doesn't fit even packed tight.
  }

  // The lunch venue: the food-capable stop nearest the middle of the route, so the
  // break lands around midday rather than at the very start or end.
  let foodIdx = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  const middle = (n - 1) / 2;
  for (let i = 0; i < n; i += 1) {
    if (offersAnyFood(order[i]!.winery)) {
      const distance = Math.abs(i - middle);
      if (distance < bestDistance) {
        bestDistance = distance;
        foodIdx = i;
      }
    }
  }

  // Desired gaps: a breathing gap between consecutive stops + a lunch break after the
  // food venue. The day starts near dayStart (no gap before the first stop). If the
  // desired gaps don't fit the day window, scale them down proportionally so the route
  // stays feasible rather than being rejected.
  const desiredBreathing = BREATHING_GAP_BY_PACE[pace];
  const desiredLunch = foodIdx >= 0 ? LUNCH_BREAK_BY_PACE[pace] : 0;
  const desiredGapTotal = desiredBreathing * Math.max(0, n - 1) + desiredLunch;
  const slack = Math.max(0, dayEnd - dayStart - minimalSpan);
  const scale = desiredGapTotal > slack && desiredGapTotal > 0 ? slack / desiredGapTotal : 1;
  const breathingGap = Math.floor(desiredBreathing * scale);
  const lunchBreak = Math.floor(desiredLunch * scale);

  let currentTime = dayStart;
  node = "pickup";
  let totalIdleMinutes = 0;
  const stops: PlannedStop[] = [];

  for (let i = 0; i < n; i += 1) {
    const window = order[i]!;
    const leg = legs[i]!;
    // No gap before the first stop (start the day promptly); a breathing gap before
    // the rest; plus the lunch break right after the food venue.
    let gap = i === 0 ? 0 : breathingGap;
    if (foodIdx >= 0 && i === foodIdx + 1) {
      gap += lunchBreak;
    }
    let arrival = roundUpToNearestQuarterHour(currentTime + leg + gap);
    const earliest = roundUpToNearestQuarterHour(currentTime + leg);
    // A forced wait is only when we'd arrive before the winery opens — that's the
    // unproductive idle the scorer should penalise. The breathing/lunch gaps are
    // intentional spread, NOT counted here.
    if (earliest < window.openStart) {
      totalIdleMinutes += window.openStart - earliest;
    }
    if (arrival < window.openStart) {
      arrival = window.openStart;
    }
    if (arrival > window.latestStart) {
      // Can't sit past this winery's last start; pull the gap back to its window.
      if (earliest > window.latestStart) {
        return null;
      }
      arrival = window.latestStart;
    }
    if (arrival < earliest) {
      arrival = earliest;
    }
    const departure = arrival + tastings[i]!;
    if (departure > dayEnd) {
      return null;
    }
    stops.push({
      winery: window.winery,
      driveMinutes: leg,
      arrivalMinutes: arrival,
      departureMinutes: departure,
    });
    currentTime = departure;
    node = window.winery.wineryId;
  }

  if (currentTime + returnLeg > dayEnd) {
    return null;
  }

  const lunch = computeRouteLunch(stops, dayEnd);
  return { stops, totalDriveMinutes: driveTotal, totalIdleMinutes, lunch };
}

// Pace tuning. stopReward lowers objectiveCost per stop (higher = pack more in);
// idleWeight penalises gaps in the day (higher = tighter); lunchBonus rewards a
// relaxed lunch window; scoreStopBonus shapes the displayed 0-99 score.
// Each pace TARGETS a stop count; routes are penalised for deviating from it. A
// linear per-stop reward can't settle on a middle count (the day collapses to the
// min or max), so a target model is what produces a clean relaxed/balanced/maximise
// ladder. idleWeight still nudges toward compact days; lunchBonus rewards a lunch
// window; scoreStopBonus only shapes the displayed 0-99 score.
const STOP_DEVIATION_WEIGHT = 14;
const PACE_WEIGHTS: Record<SchedulePace, {
  targetStops: number;
  idleWeight: number;
  lunchBonus: number;
  // How strongly to penalise a day with NO lunch venue. High for relaxed (a long
  // lunch is the point) so a lunch route trumps a slightly shorter no-lunch one —
  // exactly the "lunch may have to trump efficiency" trade-off.
  lunchMissPenalty: number;
  scoreStopBonus: number;
}> = {
  relaxed: { targetStops: 2, idleWeight: 0.25, lunchBonus: 10, lunchMissPenalty: 24, scoreStopBonus: 2 },
  balanced: { targetStops: 3, idleWeight: 0.3, lunchBonus: 5, lunchMissPenalty: 14, scoreStopBonus: 4 },
  maximise: { targetStops: MAX_STOPS_PER_DAY, idleWeight: 0.2, lunchBonus: 3, lunchMissPenalty: 6, scoreStopBonus: 8 },
};

function scoreRoute(params: {
  request: RecommendItineraryRequest;
  route: FeasibleRoute;
}): { score: number; objectiveCost: number } {
  const { request, route } = params;
  const weights = PACE_WEIGHTS[request.pace ?? "balanced"];
  const candidateScore =
    route.stops.reduce((sum, stop) => sum + scoreCandidate(stop.winery, request.party_size), 0) /
    route.stops.length;

  const qualityBonus = Math.max(0, (candidateScore - 70) * 0.18);
  const acceptableDriveMinutes = route.stops.length * ACCEPTABLE_DRIVE_MINUTES_PER_STOP;
  const excessDriveMinutes = Math.max(0, route.totalDriveMinutes - acceptableDriveMinutes);
  const drivePenalty = excessDriveMinutes / 6;
  const idlePenalty = (route.totalIdleMinutes / 12) * weights.idleWeight;
  const stopBonus = route.stops.length * weights.scoreStopBonus;
  // Lunch is a preference, not a gate (the old hard gate caused empty results).
  // A longer lunch window scores better, which matters most for the relaxed pace.
  const lunchMinutes = route.lunch ? route.lunch.endMinutes - route.lunch.startMinutes : 0;
  const lunchBonus = route.lunch ? weights.lunchBonus + Math.min(6, lunchMinutes / 20) : 0;
  const lunchPenalty = route.lunch ? 0 : weights.lunchMissPenalty;
  const score = Math.max(
    55,
    Math.min(99, Math.round(80 + stopBonus + qualityBonus + lunchBonus - drivePenalty - idlePenalty)),
  );
  // Lower objectiveCost wins. The dominant term is how far the day is from the pace's
  // target stop count, so relaxed lands on ~2 stops, balanced ~3, maximise the fullest
  // feasible. Idle/drive break ties toward compact days; missing lunch is penalised.
  const stopDeviationPenalty =
    Math.abs(route.stops.length - weights.targetStops) * STOP_DEVIATION_WEIGHT;
  const objectiveCost =
    stopDeviationPenalty
    + excessDriveMinutes
    + route.totalIdleMinutes * weights.idleWeight
    - qualityBonus
    + lunchPenalty;

  return { score, objectiveCost };
}

// Find the lowest-cost VISITING ORDER for a fixed set of wineries by trying every
// permutation (exact TSP for our small day sizes), scheduling each, and keeping the
// best. Because stops are no longer pinned to slot times, this genuinely minimises
// driving rather than just sorting by slot.
function findBestPermutationForSelection(params: {
  request: RecommendItineraryRequest;
  selection: WineryWindow[];
  travelTimes: TravelTimeMatrix;
  deadlineMs?: number;
  maxPermutations?: number;
}): { bestRoute: EvaluatedRoute | null; permutationsTested: number } {
  const { request, selection, travelTimes, deadlineMs, maxPermutations } = params;
  const remaining = [...selection];
  const current: WineryWindow[] = [];
  let permutationsTested = 0;
  let bestRoute: EvaluatedRoute | null = null;

  function walk() {
    if (isPastDeadline(deadlineMs)) {
      return;
    }
    if (typeof maxPermutations === "number" && permutationsTested >= maxPermutations) {
      return;
    }

    if (current.length === selection.length) {
      permutationsTested += 1;
      const route = scheduleOrderedRoute({
        request,
        order: [...current],
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
      if (isPastDeadline(deadlineMs)) {
        return;
      }
      if (typeof maxPermutations === "number" && permutationsTested >= maxPermutations) {
        return;
      }

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
  windows: WineryWindow[];
  targetStops?: number;
  travelTimes: TravelTimeMatrix;
}): ItineraryOption | null {
  const { request, windows, targetStops, travelTimes } = params;
  const dayStart = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const dayEnd = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);

  const selectedGroups = [...windows].slice(
    0,
    Math.min(targetStops ?? MAX_STOPS_PER_DAY, MAX_STOPS_PER_DAY),
  );

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

    const slotDurationMinutes = resolveTastingDurationMinutes(nextGroup.winery);

    const arrivalMinutes = roundUpToNearestQuarterHour(currentTime + nextDrive);
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
    lunch: null,
  };
}

const MAX_SUBSETS_PER_STOP_COUNT = 12;

function buildGroupSubsets(windows: WineryWindow[]) {
  const maxSize = Math.min(MAX_STOPS_PER_DAY, windows.length);
  const minSize = Math.min(MIN_STOPS_PER_DAY, maxSize);

  // Order the pool so food-capable wineries come first. The candidate subsets are
  // generated greedily from the front, so this makes most subsets include a lunch
  // venue — letting the scorer's lunch preference actually find one to reward.
  const ordered = [...windows].sort(
    (a, b) => Number(offersAnyFood(b.winery)) - Number(offersAnyFood(a.winery)),
  );

  // Generate up to MAX_SUBSETS_PER_STOP_COUNT subsets for EACH stop count (min..max),
  // then interleave so a truncated evaluation still sees a mix of 2-, 3- and 4-stop
  // options instead of all of one size.
  const bySize = new Map<number, WineryWindow[][]>();
  for (let size = maxSize; size >= minSize; size -= 1) {
    const sized: WineryWindow[][] = [];
    const walk = (start: number, current: WineryWindow[]) => {
      if (sized.length >= MAX_SUBSETS_PER_STOP_COUNT) {
        return;
      }
      if (current.length === size) {
        sized.push([...current]);
        return;
      }
      for (let index = start; index < ordered.length; index += 1) {
        const window = ordered[index];
        if (!window) {
          continue;
        }
        current.push(window);
        walk(index + 1, current);
        current.pop();
        if (sized.length >= MAX_SUBSETS_PER_STOP_COUNT) {
          return;
        }
      }
    };
    walk(0, []);
    bySize.set(size, sized);
  }

  const subsets: WineryWindow[][] = [];
  for (let round = 0; ; round += 1) {
    let added = false;
    for (let size = maxSize; size >= minSize; size -= 1) {
      const entry = bySize.get(size)?.[round];
      if (entry) {
        subsets.push(entry);
        added = true;
      }
    }
    if (!added) {
      break;
    }
  }

  if (subsets.length === 0) {
    return [ordered];
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
  const startBound = toTimeValue(request.preferred_start_time ?? DEFAULT_DAY_START);
  const endBound = toTimeValue(request.preferred_end_time ?? DEFAULT_DAY_END);
  const slotsByWineryId = new Map<string, WineryAvailability[]>();

  for (const slot of openAvailability) {
    const slotStart = toTimeValue(slot.startTime);
    const slotEnd = toTimeValue(slot.endTime);
    if (slotStart < startBound || slotEnd > endBound) {
      continue;
    }

    const existing = slotsByWineryId.get(slot.wineryId);
    if (existing) {
      existing.push(slot);
    } else {
      slotsByWineryId.set(slot.wineryId, [slot]);
    }
  }

  for (const entries of slotsByWineryId.values()) {
    entries.sort((a, b) => toTimeValue(a.startTime) - toTimeValue(b.startTime));
  }

  // Collapse each winery's slots into a single open window so the scheduler can
  // order stops by driving efficiency rather than by slot time.
  const wineryWindows = filteredWineries
    .map((winery) => {
      const slots = slotsByWineryId.get(winery.wineryId) ?? [];
      return slots.length > 0 ? deriveWineryWindow(winery, slots) : null;
    })
    .filter((entry): entry is WineryWindow => entry !== null);

  if (wineryWindows.length === 0) {
    return {
      itineraries: [],
      diagnostics,
      usedFallback: false,
    };
  }

  // Each candidate set is scheduled in its optimal (lowest-drive) visiting order.
  const groupSubsets = buildGroupSubsets(wineryWindows);
  const limitedSubsets = groupSubsets.slice(0, MAX_GROUP_SUBSETS_TO_EVALUATE);
  const searchDeadlineMs = Date.now() + CANDIDATE_BUILD_TIME_BUDGET_MS;
  const scoredRoutes: EvaluatedRoute[] = [];

  for (const subset of limitedSubsets) {
    if (
      isPastDeadline(searchDeadlineMs) ||
      scoredRoutes.length >= MAX_FEASIBLE_ROUTES_TO_SCORE
    ) {
      break;
    }

    diagnostics.combinationsTested += 1;
    const permutationResult = findBestPermutationForSelection({
      request,
      selection: subset,
      travelTimes,
      deadlineMs: searchDeadlineMs,
      maxPermutations: MAX_PERMUTATIONS_PER_SELECTION,
    });
    diagnostics.permutationsTested += permutationResult.permutationsTested;

    if (permutationResult.bestRoute) {
      scoredRoutes.push(permutationResult.bestRoute);
    }
  }
  diagnostics.feasibleRoutesFound = scoredRoutes.length;

  const paceTargetStops =
    request.pace === "relaxed"
      ? MIN_STOPS_PER_DAY
      : request.pace === "maximise"
        ? MAX_STOPS_PER_DAY
        : 3;
  const targetStopCount = Math.min(
    paceTargetStops,
    preferredSet.size > 0 ? preferredSet.size : wineryWindows.length,
  );

  // Rank ALL feasible routes by the pace-aware objective cost (which already encodes
  // how strongly to reward extra stops vs a calmer day), rather than always forcing the
  // fullest possible day. This is what makes "relaxed" vs "maximise" actually differ.
  const feasibleOptions = [...scoredRoutes]
    .sort((a, b) => a.objectiveCost - b.objectiveCost || b.score - a.score)
    .slice(0, 3);

  // Only fall back to the heuristic when the real scheduler found NO feasible route
  // at all. Previously it also fell back whenever the best feasible day had fewer
  // than the (capped) target stop count — so a perfectly good 2- or 3-stop day was
  // discarded in favour of an availability-blind fallback.
  if (feasibleOptions.length === 0) {
    const fallback = buildRelaxedFallbackItinerary({
      request,
      windows: wineryWindows,
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
        arrivalTime: toLocalIso(request.booking_date, toClockValue(stop.arrivalMinutes)),
        departureTime: toLocalIso(request.booking_date, toClockValue(stop.departureMinutes)),
        driveMinutes: stop.driveMinutes,
      })),
      lunch: route.lunch
        ? {
            wineryId: route.lunch.winery.wineryId,
            wineryName: route.lunch.winery.name,
            foodDescription: describeWineryFood(route.lunch.winery),
            arrivalTime: toLocalIso(request.booking_date, toClockValue(route.lunch.startMinutes)),
            departureTime: toLocalIso(request.booking_date, toClockValue(route.lunch.endMinutes)),
          }
        : null,
    })),
    diagnostics,
    usedFallback: false,
  };
}

export async function rankItinerariesWithAi(
  candidates: ItineraryOption[],
  factsById?: WineryFactsById,
  locale?: RecommendItineraryRequest["locale"],
): Promise<ItineraryOption[]> {
  if (candidates.length === 0) {
    return [];
  }

  // Mark the expert pick deterministically, then (best-effort) replace the top
  // pick's justification with a real OpenAI-generated one grounded in the wineries'
  // actual facts and written in the requested locale. If no key is set or the call
  // fails/times out, the deterministic justifications stand unchanged.
  const ranked = candidates.map((candidate, index) => ({
    ...candidate,
    expertPick: index === 0,
  }));

  return enhanceWithAiJustifications(ranked, factsById, locale ?? "en");
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
  const wineryFactsById: WineryFactsById = {};
  for (const winery of wineries) {
    wineryFactsById[winery.wineryId] = {
      name: winery.name,
      famousFor: winery.famousFor,
      description: winery.description,
    };
  }
  // Skip the slow OpenAI justification when the caller only needs the schedule
  // (the explore planner's exploratory/option calls). Still mark the expert pick.
  const ranked = request.skip_justification
    ? candidateBuild.itineraries.map((candidate, index) => ({ ...candidate, expertPick: index === 0 }))
    : await rankItinerariesWithAi(candidateBuild.itineraries, wineryFactsById, request.locale);
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
      lunch: itinerary.lunch
        ? {
            winery_id: itinerary.lunch.wineryId,
            winery_name: itinerary.lunch.wineryName,
            food_description: itinerary.lunch.foodDescription,
            arrival_time: itinerary.lunch.arrivalTime,
            departure_time: itinerary.lunch.departureTime,
          }
        : null,
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
