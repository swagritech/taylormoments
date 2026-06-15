import type { DayWeather, WeatherSource } from "../domain/models.js";

// Margaret River region centroid (near the visitor centre). Weather is regional,
// so a single representative point is sufficient for the whole touring area.
const MARGARET_RIVER = { latitude: -33.955, longitude: 115.075 };
const REGION_TIMEZONE = "Australia/Perth"; // UTC+8, no daylight saving.

// Only the nearest week is forecast; beyond that we fall back to climate normals.
// (The user-facing promise is "within 7 days = forecast, further out = averages".)
const FORECAST_HORIZON_DAYS = 7;

// Approximate monthly climate normals for Margaret River (Mediterranean climate:
// warm dry summers, cool wet winters), derived from Bureau of Meteorology averages.
// Index 0 = January. rainProbabilityPercent is the typical chance of a wet day.
const CLIMATE_NORMALS: Array<{
  maxC: number;
  minC: number;
  rainProbabilityPercent: number;
  rainfallMm: number;
}> = [
  { maxC: 27.5, minC: 13.5, rainProbabilityPercent: 8, rainfallMm: 10 }, // Jan
  { maxC: 27.8, minC: 13.8, rainProbabilityPercent: 9, rainfallMm: 12 }, // Feb
  { maxC: 25.7, minC: 12.7, rainProbabilityPercent: 16, rainfallMm: 22 }, // Mar
  { maxC: 22.3, minC: 11.0, rainProbabilityPercent: 30, rainfallMm: 55 }, // Apr
  { maxC: 19.1, minC: 9.6, rainProbabilityPercent: 50, rainfallMm: 120 }, // May
  { maxC: 16.6, minC: 8.4, rainProbabilityPercent: 62, rainfallMm: 175 }, // Jun
  { maxC: 15.6, minC: 7.6, rainProbabilityPercent: 68, rainfallMm: 200 }, // Jul
  { maxC: 16.0, minC: 7.3, rainProbabilityPercent: 62, rainfallMm: 160 }, // Aug
  { maxC: 17.5, minC: 7.6, rainProbabilityPercent: 50, rainfallMm: 110 }, // Sep
  { maxC: 19.5, minC: 8.3, rainProbabilityPercent: 38, rainfallMm: 70 }, // Oct
  { maxC: 22.6, minC: 10.2, rainProbabilityPercent: 24, rainfallMm: 38 }, // Nov
  { maxC: 25.3, minC: 12.1, rainProbabilityPercent: 14, rainfallMm: 18 }, // Dec
];

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Today's date in the region's timezone, as YYYY-MM-DD (en-CA formats that way).
function regionTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REGION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isoDateToUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((isoDateToUtcMs(toIso) - isoDateToUtcMs(fromIso)) / 86_400_000);
}

function monthIndexForIso(iso: string): number {
  const month = Number(iso.slice(5, 7));
  return Math.min(11, Math.max(0, month - 1));
}

function describeWarmth(maxC: number): string {
  if (maxC >= 28) return "Hot";
  if (maxC >= 23) return "Warm";
  if (maxC >= 18) return "Mild";
  if (maxC >= 14) return "Cool";
  return "Cold";
}

function describeSky(rainProbabilityPercent: number): string {
  if (rainProbabilityPercent >= 50) return "with a high chance of rain";
  if (rainProbabilityPercent >= 25) return "with possible showers";
  return "and mostly dry";
}

function summaryText(maxC: number, rainProbabilityPercent: number): string {
  return `${describeWarmth(maxC)} ${describeSky(rainProbabilityPercent)}`;
}

// Plain-language clothing guidance for visitors who may not know the local climate.
function clothingRecommendations(
  maxC: number,
  minC: number,
  rainProbabilityPercent: number,
): string[] {
  const tips: string[] = [];

  if (maxC >= 28) {
    tips.push(
      "Light, breathable clothing — the Margaret River sun is strong, so bring a hat, sunglasses and SPF30+ sunscreen.",
    );
  } else if (maxC >= 23) {
    tips.push(
      "Comfortable warm-weather clothing, plus a light layer for cooler cellar doors and the evening.",
    );
  } else if (maxC >= 18) {
    tips.push("Bring layers — a light jumper or jacket; it's mild but shaded cellar doors feel cool.");
  } else {
    tips.push("Dress warmly with a proper jacket and warm layers — days here are cool in this season.");
  }

  if (minC < 8) {
    tips.push(
      `Mornings and evenings are cold (around ${Math.round(minC)}°C) — pack a warm jacket or jumper.`,
    );
  }

  if (rainProbabilityPercent >= 50) {
    tips.push("Rain is likely — bring a waterproof jacket or umbrella.");
  } else if (rainProbabilityPercent >= 25) {
    tips.push("Showers are possible — a light rain jacket or a compact umbrella is wise.");
  }

  tips.push("Comfortable, flat walking shoes for vineyard grounds and gravel paths.");
  return tips;
}

function buildDayWeather(params: {
  date: string;
  source: WeatherSource;
  tempMaxC: number;
  tempMinC: number;
  rainProbabilityPercent: number;
  rainfallMm?: number;
}): DayWeather {
  const tempMaxC = Math.round(params.tempMaxC);
  const tempMinC = Math.round(params.tempMinC);
  const rainProbabilityPercent = Math.round(params.rainProbabilityPercent);
  return {
    date: params.date,
    source: params.source,
    tempMaxC,
    tempMinC,
    rainProbabilityPercent,
    rainfallMm: params.rainfallMm === undefined ? undefined : Math.round(params.rainfallMm),
    summary: summaryText(tempMaxC, rainProbabilityPercent),
    clothing: clothingRecommendations(tempMaxC, tempMinC, rainProbabilityPercent),
  };
}

function climateNormalForDate(date: string): DayWeather {
  const normal = CLIMATE_NORMALS[monthIndexForIso(date)] ?? CLIMATE_NORMALS[0]!;
  return buildDayWeather({
    date,
    source: "climate_normal",
    tempMaxC: normal.maxC,
    tempMinC: normal.minC,
    rainProbabilityPercent: normal.rainProbabilityPercent,
    rainfallMm: normal.rainfallMm,
  });
}

type OpenMeteoDaily = {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  precipitation_sum?: number[];
};

// Short-lived cache so repeated plans for the same dates don't re-hit the API.
const forecastCache = new Map<string, { value: Map<string, DayWeather>; expiresAt: number }>();
const FORECAST_CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchForecast(startIso: string, endIso: string): Promise<Map<string, DayWeather>> {
  const cacheKey = `${startIso}_${endIso}`;
  const now = Date.now();
  const cached = forecastCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.value;
  }

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${MARGARET_RIVER.latitude}&longitude=${MARGARET_RIVER.longitude}` +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum" +
    `&timezone=${encodeURIComponent(REGION_TIMEZONE)}` +
    `&start_date=${startIso}&end_date=${endIso}`;

  const result = new Map<string, DayWeather>();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return result;
    }
    const body = (await response.json()) as { daily?: OpenMeteoDaily };
    const daily = body.daily;
    const times = daily?.time ?? [];
    for (let i = 0; i < times.length; i += 1) {
      const date = times[i];
      const maxC = daily?.temperature_2m_max?.[i];
      const minC = daily?.temperature_2m_min?.[i];
      if (!date || typeof maxC !== "number" || typeof minC !== "number") {
        continue;
      }
      const rainProb = daily?.precipitation_probability_max?.[i];
      const rainSum = daily?.precipitation_sum?.[i];
      result.set(
        date,
        buildDayWeather({
          date,
          source: "forecast",
          tempMaxC: maxC,
          tempMinC: minC,
          rainProbabilityPercent: typeof rainProb === "number" ? rainProb : 0,
          rainfallMm: typeof rainSum === "number" ? rainSum : undefined,
        }),
      );
    }
  } catch {
    // Network/timeout failure — caller falls back to climate normals.
    return result;
  }

  forecastCache.set(cacheKey, { value: result, expiresAt: now + FORECAST_CACHE_TTL_MS });
  return result;
}

// Resolve weather for each requested date: a real forecast when the date falls
// within the forecast horizon, otherwise the climate normal for that time of year.
export async function getWeatherForDates(dates: string[]): Promise<DayWeather[]> {
  const validDates = dates.filter(isIsoDate);
  if (validDates.length === 0) {
    return [];
  }

  const today = regionTodayIso();
  const forecastable = validDates.filter((date) => {
    const delta = daysBetween(today, date);
    return delta >= 0 && delta <= FORECAST_HORIZON_DAYS;
  });

  let forecastMap = new Map<string, DayWeather>();
  if (forecastable.length > 0) {
    const sorted = [...forecastable].sort();
    forecastMap = await fetchForecast(sorted[0]!, sorted[sorted.length - 1]!);
  }

  return validDates.map((date) => forecastMap.get(date) ?? climateNormalForDate(date));
}
