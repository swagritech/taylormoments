# Travel Time Logic Proposal (Explore + Plan)

## Current Logic (what the system does now)

Primary schedule drive times for Explore and Plan come from the API recommendation engine:
- `services/api/src/lib/recommendation-service.ts`

Key behavior today:
1. Uses an internal estimator:
- `DEFAULT_DRIVE_MINUTES = 20`
- `estimateDriveMinutes(from?, to?)` falls back to 20 if either point is missing.

2. Winery coordinates are hardcoded for only 4 wineries:
- `wineryPoints` contains the original seeded UUIDs only.
- Any winery outside that list has no point, so travel frequently falls back to 20.

3. Pickup points are hardcoded to a few string-matched locations:
- `resolvePickupPoint` uses substring match against a short static list.
- If pickup text does not match, first/return legs can also fall back to 20.

4. Route feasibility sorts selected slots by slot start time:
- It does not optimize stop order by real drive time + time windows together.
- This can produce non-optimal or unstable route quality.

5. Explore pre-shortlisting on the client uses synthetic coordinates from catalog fallback:
- `apps/web/src/app/explore/page.tsx` uses haversine for nearest shortlist.
- `apps/web/src/lib/winery-catalog.ts` can generate fallback coordinates by slug/region anchor (not true geocoded points).

Note:
- `apps/web/src/lib/scheduler.ts` has a static travel matrix with fallback 45, but this is demo logic and not the live API schedule path used by Explore/Plan.

## Why this is inaccurate

1. Missing coordinates trigger default travel time too often.
2. String pickup parsing is brittle and can silently degrade to defaults.
3. Straight-line haversine + fixed speed/factor does not reflect road topology.
4. Time-of-day, day-of-week, and traffic are not represented.
5. Stop ordering is constrained by slot sort rather than solving a time-window routing problem.

## Recommended Solution (accurate and production-safe)

### Phase 1: Data foundation (must-do first)

1. Add canonical coordinates to DB:
- Add `latitude`, `longitude` to `winery` table.
- Backfill from geocoding using `winery.address`.
- Validate coordinates are in expected Margaret River bounds.

2. Normalize pickup into structured locations:
- Create `pickup_location` table (id, label, lat, lon, active).
- API request should carry `pickup_location_id` (keep label for display only).

3. Replace hardcoded `wineryPoints`/`pickupPoints` with DB-backed coordinates.

Outcome:
- Eliminate most accidental 20-minute defaults before external routing work.

### Phase 2: Routing accuracy engine

1. Introduce provider abstraction:
- `TravelTimeProvider.getMinutes(from, to, departureTime)`

2. Use a matrix-routing API for driving durations:
- Build durations via route matrix endpoint for selected stops + pickup.
- Cache results aggressively (keyed by from/to + time bucket + day type).

3. Keep deterministic fallback:
- If provider unavailable, use haversine model but with:
  - no silent 20 default unless truly unknown
  - explicit “low-confidence estimate” flag in trace.

Outcome:
- Real road-network travel time replaces geometric approximation.

### Phase 3: Route optimization with time windows

1. For each candidate stop set:
- Evaluate permutations (small N <= 4 is cheap) and slot combinations.
- Use earliest-arrival feasibility checks with matrix travel times.

2. Scoring:
- Minimize total drive + idle time.
- Respect requested time window and lunch constraints.
- Keep existing winery quality/capacity scoring as secondary.

Outcome:
- Better schedules and fewer false negatives/positives in feasibility.

### Phase 4: Quality controls

1. Add trace metrics:
- `% segments using fallback`, average travel confidence, total estimated vs route-matrix minutes.

2. Regression suite:
- Fixed sample bookings with expected route validity and bounded travel-time deltas.

3. Optional calibration loop:
- Compare predicted times vs actual transport telemetry/check-in deltas.

## Practical rollout plan

1. Ship Phase 1 first (DB coordinates + pickup normalization + hardcoded removal).
2. Add matrix provider behind feature flag (Phase 2).
3. Switch optimizer to permutation + time windows (Phase 3).
4. Turn on metrics/alerts and compare baseline before full rollout (Phase 4).

## Acceptance targets

1. Fallback usage < 5% of legs in normal operation.
2. p50 absolute travel-time error <= 5 min; p90 <= 12 min (against map baseline sample set).
3. No reduction in generated itinerary availability from baseline without explainable cause.
