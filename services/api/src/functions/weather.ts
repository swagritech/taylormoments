import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ok, badRequest, internalServerError } from "../lib/http.js";
import { getWeatherForDates } from "../lib/weather-provider.js";
import type { WeatherResponse } from "../domain/models.js";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 7;
const REGION_LABEL = "Margaret River, Western Australia";

export async function weatherHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    // Accept either ?dates=a,b,c or repeated/single ?date=a.
    const datesParam = request.query.get("dates") ?? request.query.get("date") ?? "";
    const requested = datesParam
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const unique = Array.from(new Set(requested));
    if (unique.length === 0) {
      return badRequest("Provide one or more dates via ?dates=YYYY-MM-DD,YYYY-MM-DD.");
    }
    if (unique.length > MAX_DATES) {
      return badRequest(`Too many dates requested (max ${MAX_DATES}).`);
    }
    if (unique.some((value) => !ISO_DATE_RE.test(value))) {
      return badRequest("Dates must be in YYYY-MM-DD format.");
    }

    const days = await getWeatherForDates(unique);
    const response: WeatherResponse = {
      generated_at: new Date().toISOString(),
      location: REGION_LABEL,
      days: days.map((day) => ({
        date: day.date,
        source: day.source,
        temp_min_c: day.tempMinC,
        temp_max_c: day.tempMaxC,
        rain_probability_percent: day.rainProbabilityPercent,
        rainfall_mm: day.rainfallMm,
        summary: day.summary,
        clothing: day.clothing,
      })),
    };
    return ok(response);
  } catch (error) {
    context.error("weather_lookup_failed", error);
    return internalServerError("Unable to fetch weather right now.");
  }
}

app.http("weather", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/weather",
  handler: weatherHandler,
});
