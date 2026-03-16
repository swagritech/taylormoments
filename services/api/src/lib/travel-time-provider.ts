import {
  getTravelTimeCacheTtlSeconds,
  getTravelTimeOsrmBaseUrl,
  getTravelTimeProvider,
  type TravelTimeProvider,
} from "./config.js";

export type Point = { lat: number; lon: number };
export type TravelLegSource = "matrix" | "haversine" | "default";

type MatrixBuildInput = {
  pointsById: Record<string, Point | undefined>;
  departureHint: string;
};

type MatrixCacheEntry = {
  expiresAt: number;
  matrixByPair: Record<string, number>;
  sourceByPair: Record<string, TravelLegSource>;
  summary: Omit<TravelTimeMatrix["summary"], "cache_hit">;
};

export type TravelTimeMatrix = {
  getMinutes: (fromId: string, toId: string) => number;
  sourceForLeg: (fromId: string, toId: string) => TravelLegSource;
  summary: {
    provider: TravelTimeProvider;
    point_count: number;
    total_leg_count: number;
    matrix_leg_count: number;
    haversine_leg_count: number;
    default_leg_count: number;
    fallback_leg_count: number;
    fallback_leg_percentage: number;
    average_leg_confidence: number;
    cache_hit: boolean;
  };
};

const DEFAULT_DRIVE_MINUTES = 20;
const USER_AGENT = "TailorMoments/1.0 (dev@swagritech.com.au)";
const osrmMatrixCache = new Map<string, MatrixCacheEntry>();
const LEG_CONFIDENCE_BY_SOURCE: Record<TravelLegSource, number> = {
  matrix: 0.97,
  haversine: 0.68,
  default: 0.32,
};

function pairKey(fromId: string, toId: string) {
  return `${fromId}__${toId}`;
}

function roundTo(value: number, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
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

function estimateHaversineMinutes(from?: Point, to?: Point) {
  if (!from || !to) {
    return { minutes: DEFAULT_DRIVE_MINUTES, source: "default" as const };
  }

  const distanceKm = haversineKm(from, to);
  if (distanceKm < 0.5) {
    return { minutes: 5, source: "haversine" as const };
  }

  const roadFactor = 1.25;
  const averageRoadSpeedKmH = 56;
  const bufferMinutes = 5;
  const minutes = Math.max(
    8,
    Math.round(((distanceKm * roadFactor) / averageRoadSpeedKmH) * 60 + bufferMinutes),
  );
  return { minutes, source: "haversine" as const };
}

export function estimateBaselineTravelMinutes(from?: Point, to?: Point) {
  return estimateHaversineMinutes(from, to);
}

export function travelConfidenceForSource(source: TravelLegSource) {
  return LEG_CONFIDENCE_BY_SOURCE[source] ?? LEG_CONFIDENCE_BY_SOURCE.default;
}

function buildMatrixSummary(params: {
  provider: TravelTimeProvider;
  ids: string[];
  sourceByPair: Record<string, TravelLegSource>;
  cacheHit: boolean;
}) {
  const { provider, ids, sourceByPair, cacheHit } = params;
  let matrixLegCount = 0;
  let haversineLegCount = 0;
  let defaultLegCount = 0;
  let confidenceTotal = 0;

  for (const fromId of ids) {
    for (const toId of ids) {
      if (fromId === toId) {
        continue;
      }
      const source = sourceByPair[pairKey(fromId, toId)] ?? "default";
      if (source === "matrix") {
        matrixLegCount += 1;
      } else if (source === "haversine") {
        haversineLegCount += 1;
      } else {
        defaultLegCount += 1;
      }
      confidenceTotal += travelConfidenceForSource(source);
    }
  }

  const totalLegCount = matrixLegCount + haversineLegCount + defaultLegCount;
  const fallbackLegCount = haversineLegCount + defaultLegCount;
  const fallbackLegPercentage = totalLegCount > 0
    ? roundTo((fallbackLegCount / totalLegCount) * 100, 2)
    : 0;
  const averageLegConfidence = totalLegCount > 0
    ? roundTo(confidenceTotal / totalLegCount, 3)
    : 0;

  return {
    provider,
    point_count: ids.length,
    total_leg_count: totalLegCount,
    matrix_leg_count: matrixLegCount,
    haversine_leg_count: haversineLegCount,
    default_leg_count: defaultLegCount,
    fallback_leg_count: fallbackLegCount,
    fallback_leg_percentage: fallbackLegPercentage,
    average_leg_confidence: averageLegConfidence,
    cache_hit: cacheHit,
  };
}

function buildCacheKey(
  provider: TravelTimeProvider,
  pointsById: Record<string, Point | undefined>,
  departureHint: string,
) {
  const departureBucket = departureHint.slice(0, 13);
  const sortedPointKeys = Object.keys(pointsById).sort();
  const pointSignature = sortedPointKeys
    .map((key) => {
      const point = pointsById[key];
      if (!point) {
        return `${key}:missing`;
      }
      return `${key}:${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
    })
    .join("|");

  return `${provider}|${departureBucket}|${pointSignature}`;
}

async function fetchOsrmDurationMatrix(validPoints: Array<{ id: string; point: Point }>) {
  if (validPoints.length < 2) {
    return null;
  }

  const baseUrl = getTravelTimeOsrmBaseUrl().replace(/\/+$/, "");
  if (!baseUrl) {
    return null;
  }

  const coordinateList = validPoints
    .map((entry) => `${entry.point.lon},${entry.point.lat}`)
    .join(";");
  const url = `${baseUrl}/table/v1/driving/${coordinateList}?annotations=duration`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    code?: string;
    durations?: Array<Array<number | null>>;
  };

  if (payload.code !== "Ok" || !Array.isArray(payload.durations)) {
    return null;
  }

  return payload.durations;
}

export async function buildTravelTimeMatrix(input: MatrixBuildInput): Promise<TravelTimeMatrix> {
  const { pointsById, departureHint } = input;
  const provider = getTravelTimeProvider();
  const ids = Object.keys(pointsById).sort();
  const matrixByPair: Record<string, number> = {};
  const sourceByPair: Record<string, TravelLegSource> = {};
  let cacheHit = false;

  if (provider === "osrm") {
    const cacheKey = buildCacheKey(provider, pointsById, departureHint);
    const cached = osrmMatrixCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      cacheHit = true;
      return {
        getMinutes: (fromId, toId) =>
          cached.matrixByPair[pairKey(fromId, toId)] ?? DEFAULT_DRIVE_MINUTES,
        sourceForLeg: (fromId, toId) =>
          cached.sourceByPair[pairKey(fromId, toId)] ?? "default",
        summary: {
          ...cached.summary,
          cache_hit: true,
        },
      };
    }

    const validPoints = ids
      .map((id) => ({ id, point: pointsById[id] }))
      .filter((entry): entry is { id: string; point: Point } => Boolean(entry.point));

    try {
      const durations = await fetchOsrmDurationMatrix(validPoints);
      if (durations) {
        for (let fromIndex = 0; fromIndex < validPoints.length; fromIndex += 1) {
          const from = validPoints[fromIndex];
          if (!from) {
            continue;
          }

          for (let toIndex = 0; toIndex < validPoints.length; toIndex += 1) {
            const to = validPoints[toIndex];
            if (!to) {
              continue;
            }

            const key = pairKey(from.id, to.id);
            if (from.id === to.id) {
              matrixByPair[key] = 0;
              sourceByPair[key] = "matrix";
              continue;
            }

            const seconds = durations[fromIndex]?.[toIndex];
            if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
              matrixByPair[key] = Math.max(1, Math.round(seconds / 60));
              sourceByPair[key] = "matrix";
            }
          }
        }
      }
    } catch {
      // Matrix provider failures are tolerated; we fall back below.
    }

    for (const fromId of ids) {
      for (const toId of ids) {
        const key = pairKey(fromId, toId);
        if (matrixByPair[key] !== undefined) {
          continue;
        }
        if (fromId === toId) {
          matrixByPair[key] = 0;
          sourceByPair[key] = "haversine";
          continue;
        }

        const estimate = estimateHaversineMinutes(pointsById[fromId], pointsById[toId]);
        matrixByPair[key] = estimate.minutes;
        sourceByPair[key] = estimate.source;
      }
    }

    const summary = buildMatrixSummary({
      provider,
      ids,
      sourceByPair,
      cacheHit,
    });

    osrmMatrixCache.set(cacheKey, {
      expiresAt: now + getTravelTimeCacheTtlSeconds() * 1000,
      matrixByPair,
      sourceByPair,
      summary: {
        provider: summary.provider,
        point_count: summary.point_count,
        total_leg_count: summary.total_leg_count,
        matrix_leg_count: summary.matrix_leg_count,
        haversine_leg_count: summary.haversine_leg_count,
        default_leg_count: summary.default_leg_count,
        fallback_leg_count: summary.fallback_leg_count,
        fallback_leg_percentage: summary.fallback_leg_percentage,
        average_leg_confidence: summary.average_leg_confidence,
      },
    });

    return {
      getMinutes: (fromId, toId) => matrixByPair[pairKey(fromId, toId)] ?? DEFAULT_DRIVE_MINUTES,
      sourceForLeg: (fromId, toId) => sourceByPair[pairKey(fromId, toId)] ?? "default",
      summary,
    };
  }

  for (const fromId of ids) {
    for (const toId of ids) {
      const key = pairKey(fromId, toId);
      if (fromId === toId) {
        matrixByPair[key] = 0;
        sourceByPair[key] = "haversine";
        continue;
      }

      const estimate = estimateHaversineMinutes(pointsById[fromId], pointsById[toId]);
      matrixByPair[key] = estimate.minutes;
      sourceByPair[key] = estimate.source;
    }
  }

  return {
    getMinutes: (fromId, toId) => matrixByPair[pairKey(fromId, toId)] ?? DEFAULT_DRIVE_MINUTES,
    sourceForLeg: (fromId, toId) => sourceByPair[pairKey(fromId, toId)] ?? "default",
    summary: buildMatrixSummary({
      provider,
      ids,
      sourceByPair,
      cacheHit: false,
    }),
  };
}
