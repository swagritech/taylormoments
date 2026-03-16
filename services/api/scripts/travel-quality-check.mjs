#!/usr/bin/env node

const apiBaseUrl = (process.env.TM_API_BASE_URL ?? "https://swagri-tailormoments-api-01.azurewebsites.net/api").replace(/\/+$/, "");
const bookingDate = process.env.TM_REGRESSION_BOOKING_DATE ?? "2026-03-20";
const maxSelectedFallbackPercent = Number(process.env.TM_QUALITY_MAX_SELECTED_FALLBACK_PCT ?? 20);
const maxGlobalFallbackPercent = Number(process.env.TM_QUALITY_MAX_GLOBAL_FALLBACK_PCT ?? 35);
const minSelectedConfidence = Number(process.env.TM_QUALITY_MIN_SELECTED_CONFIDENCE ?? 0.65);
const maxDeltaMinutes = Number(process.env.TM_QUALITY_MAX_ESTIMATED_DELTA_MINUTES ?? 45);
const minGeneratedOptions = Number(process.env.TM_QUALITY_MIN_GENERATED_OPTIONS ?? 1);

const scenarios = [
  {
    name: "classic_three_stop",
    payload: {
      booking_date: bookingDate,
      party_size: 2,
      pickup_location: "Margaret River Visitor Centre",
      preferred_wineries: [
        "11111111-1111-1111-1111-111111111111",
        "8023295f-0fda-e61e-8ff9-cf418ffe0f7d",
        "81c43507-fd2d-866e-7ce9-b3697ef1bb75",
      ],
      preferred_start_time: "10:00",
      preferred_end_time: "17:00",
    },
  },
  {
    name: "mixed_four_stop",
    payload: {
      booking_date: bookingDate,
      party_size: 2,
      pickup_location: "Margaret River Visitor Centre",
      preferred_wineries: [
        "11111111-1111-1111-1111-111111111111",
        "33333333-3333-3333-3333-333333333333",
        "44444444-4444-4444-4444-444444444444",
        "8023295f-0fda-e61e-8ff9-cf418ffe0f7d",
      ],
      preferred_start_time: "10:00",
      preferred_end_time: "17:00",
    },
  },
];

function asNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function recommend(payload) {
  const response = await fetch(`${apiBaseUrl}/v1/itinerary/recommend`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  return response.json();
}

async function run() {
  const failures = [];
  const reports = [];

  for (const scenario of scenarios) {
    try {
      const data = await recommend(scenario.payload);
      const trace = data?.scheduling_trace ?? {};
      const options = Array.isArray(data?.itineraries) ? data.itineraries.length : 0;
      const selectedFallbackPct = asNumber(trace.selected_route_fallback_percentage, 100);
      const selectedConfidence = asNumber(trace.selected_route_average_confidence, 0);
      const globalFallbackPct = asNumber(trace.travel_time_fallback_percentage, 100);
      const deltaMinutesAbs = Math.abs(asNumber(trace.selected_route_estimated_vs_actual_delta_minutes, 999));
      const permutations = asNumber(trace.permutations_tested, 0);

      const missingTraceFields = [
        "travel_time_fallback_percentage",
        "travel_time_average_confidence",
        "selected_route_fallback_percentage",
        "selected_route_average_confidence",
        "selected_route_estimated_vs_actual_delta_minutes",
      ].filter((key) => trace[key] === undefined);

      const scenarioFailures = [];
      if (missingTraceFields.length > 0) {
        scenarioFailures.push(`missing trace fields: ${missingTraceFields.join(", ")}`);
      }
      if (options < minGeneratedOptions) {
        scenarioFailures.push(`generated options ${options} < ${minGeneratedOptions}`);
      }
      if (selectedFallbackPct > maxSelectedFallbackPercent) {
        scenarioFailures.push(
          `selected route fallback ${selectedFallbackPct}% > ${maxSelectedFallbackPercent}%`,
        );
      }
      if (globalFallbackPct > maxGlobalFallbackPercent) {
        scenarioFailures.push(
          `global fallback ${globalFallbackPct}% > ${maxGlobalFallbackPercent}%`,
        );
      }
      if (selectedConfidence < minSelectedConfidence) {
        scenarioFailures.push(
          `selected route confidence ${selectedConfidence} < ${minSelectedConfidence}`,
        );
      }
      if (deltaMinutesAbs > maxDeltaMinutes) {
        scenarioFailures.push(`estimated vs actual delta ${deltaMinutesAbs} min > ${maxDeltaMinutes} min`);
      }
      if (permutations <= 0) {
        scenarioFailures.push("permutations_tested <= 0");
      }

      reports.push({
        scenario: scenario.name,
        options,
        permutations_tested: permutations,
        selected_route_fallback_percentage: selectedFallbackPct,
        selected_route_average_confidence: selectedConfidence,
        travel_time_fallback_percentage: globalFallbackPct,
        selected_route_estimated_vs_actual_delta_minutes: asNumber(
          trace.selected_route_estimated_vs_actual_delta_minutes,
          0,
        ),
        status: scenarioFailures.length === 0 ? "pass" : "fail",
      });

      for (const failure of scenarioFailures) {
        failures.push(`${scenario.name}: ${failure}`);
      }
    } catch (error) {
      failures.push(`${scenario.name}: request failed - ${error instanceof Error ? error.message : String(error)}`);
      reports.push({
        scenario: scenario.name,
        status: "error",
      });
    }
  }

  console.log(JSON.stringify({
    checked_at: new Date().toISOString(),
    api_base_url: apiBaseUrl,
    booking_date: bookingDate,
    thresholds: {
      max_selected_fallback_percent: maxSelectedFallbackPercent,
      max_global_fallback_percent: maxGlobalFallbackPercent,
      min_selected_confidence: minSelectedConfidence,
      max_estimated_delta_minutes: maxDeltaMinutes,
      min_generated_options: minGeneratedOptions,
    },
    reports,
    failures,
  }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
