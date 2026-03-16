# Travel Time Phase 4 Quality Controls

## What was added

Phase 4 introduces three quality-control layers for Explore/Plan itinerary generation:

1. Trace-level confidence and fallback metrics.
2. Selected-route quality diagnostics (the expert-pick route).
3. A regression/health script with hard thresholds and failing exit code.

## New scheduling trace fields

Travel matrix quality:
- `travel_time_total_legs`
- `travel_time_fallback_legs`
- `travel_time_fallback_percentage`
- `travel_time_average_confidence`

Selected route quality:
- `selected_route_segment_count`
- `selected_route_fallback_segments`
- `selected_route_fallback_percentage`
- `selected_route_average_confidence`
- `selected_route_total_drive_minutes`
- `selected_route_estimated_minutes`
- `selected_route_matrix_minutes`
- `selected_route_estimated_vs_actual_delta_minutes`

Confidence source model:
- matrix leg: `0.97`
- haversine leg: `0.68`
- default leg: `0.32`

## Regression script

Script:
- `services/api/scripts/travel-quality-check.mjs`

NPM command:
- `npm run quality:travel`

Behavior:
- Runs fixed sample booking scenarios against `/v1/itinerary/recommend`.
- Validates:
  - itinerary generation still succeeds,
  - fallback percentages remain below thresholds,
  - confidence remains above threshold,
  - estimated-vs-actual delta is bounded,
  - permutation-based optimizer is active.
- Returns non-zero exit code on failure so it can be wired to CI/automation alerts.

## Configurable thresholds

Environment variables:
- `TM_API_BASE_URL` (default: production API)
- `TM_REGRESSION_BOOKING_DATE` (default: `2026-03-20`)
- `TM_QUALITY_MAX_SELECTED_FALLBACK_PCT` (default: `20`)
- `TM_QUALITY_MAX_GLOBAL_FALLBACK_PCT` (default: `35`)
- `TM_QUALITY_MIN_SELECTED_CONFIDENCE` (default: `0.65`)
- `TM_QUALITY_MAX_ESTIMATED_DELTA_MINUTES` (default: `45`)
- `TM_QUALITY_MIN_GENERATED_OPTIONS` (default: `1`)
