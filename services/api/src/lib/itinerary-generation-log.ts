import { makeId } from "./crypto.js";
import { getPool } from "./db.js";
import type { RecommendItineraryResponse } from "../domain/models.js";

type ItineraryGenerationStatus = "success" | "no_match" | "error";

type ItineraryGenerationLogInput = {
  generationId: string;
  requestTraceId?: string;
  status: ItineraryGenerationStatus;
  durationMs: number;
  inputSnapshot?: unknown;
  normalizedInputSnapshot?: unknown;
  resultSnapshot?: unknown;
  schedulingTrace?: unknown;
  decisionSummary?: string;
  errorMessage?: string;
};

type CandidateLogRow = {
  wineryId?: string;
  wineryName: string;
  included: boolean;
  exclusionReasons?: string[];
  scoringBreakdown?: unknown;
  notes?: string;
};

function normalizeUuid(value?: string) {
  if (!value) {
    return null;
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value) ? value : null;
}

function summarizeDecision(response?: RecommendItineraryResponse) {
  if (!response) {
    return undefined;
  }

  const trace = response.scheduling_trace;
  const first = response.itineraries[0];
  if (!trace || !first) {
    return "No itinerary options generated.";
  }

  const fallbackSuffix = trace.used_fallback ? "used fallback path." : "used primary optimization path.";
  return `Generated ${response.itineraries.length} option(s); selected option has ${first.stops.length} stop(s), ${trace.best_route_drive_minutes ?? 0} drive minutes, and ${trace.feasible_routes_found} feasible route(s); ${fallbackSuffix}`;
}

function extractCandidateRows(response?: RecommendItineraryResponse): CandidateLogRow[] {
  if (!response) {
    return [];
  }

  const rows: CandidateLogRow[] = [];
  const selected = response.itineraries[0];
  if (selected) {
    selected.stops.forEach((stop, index) => {
      rows.push({
        wineryId: stop.winery_id,
        wineryName: stop.winery_name,
        included: true,
        exclusionReasons: [],
        scoringBreakdown: {
          selected_order: index + 1,
          arrival_time: stop.arrival_time,
          departure_time: stop.departure_time,
          drive_minutes: stop.drive_minutes,
        },
        notes: "Included in selected itinerary.",
      });
    });
  }

  for (const dropped of response.scheduling_trace?.dropped_wineries ?? []) {
    rows.push({
      wineryId: dropped.winery_id,
      wineryName: dropped.winery_name,
      included: false,
      exclusionReasons: [dropped.reason],
      scoringBreakdown: {
        slot_count: dropped.slot_count,
      },
      notes: "Excluded during eligibility/time-window filtering.",
    });
  }

  return rows;
}

async function insertGenerationLog(entry: ItineraryGenerationLogInput, candidates: CandidateLogRow[]) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    await client.query(
      `insert into itinerary_generation_log (
        generation_id, request_trace_id, status, duration_ms,
        input_snapshot, normalized_input_snapshot, result_snapshot, scheduling_trace,
        decision_summary, error_message
      ) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10)`,
      [
        entry.generationId,
        entry.requestTraceId ?? null,
        entry.status,
        Math.max(0, Math.round(entry.durationMs)),
        JSON.stringify(entry.inputSnapshot ?? {}),
        JSON.stringify(entry.normalizedInputSnapshot ?? {}),
        entry.resultSnapshot !== undefined ? JSON.stringify(entry.resultSnapshot) : null,
        entry.schedulingTrace !== undefined ? JSON.stringify(entry.schedulingTrace) : null,
        entry.decisionSummary ?? null,
        entry.errorMessage ?? null,
      ],
    );

    if (candidates.length > 0) {
      const candidateLogIds = candidates.map(() => makeId());
      const generationIds = candidates.map(() => entry.generationId);
      const wineryIds = candidates.map((candidate) => normalizeUuid(candidate.wineryId));
      const wineryNames = candidates.map((candidate) => candidate.wineryName);
      const includedFlags = candidates.map((candidate) => candidate.included);
      const exclusionReasons = candidates.map((candidate) => JSON.stringify(candidate.exclusionReasons ?? []));
      const scoringBreakdowns = candidates.map((candidate) => JSON.stringify(candidate.scoringBreakdown ?? {}));
      const notes = candidates.map((candidate) => candidate.notes ?? null);

      await client.query(
        `insert into itinerary_generation_candidate_log (
          candidate_log_id, generation_id, winery_id, winery_name, included, exclusion_reasons, scoring_breakdown, notes
        )
        select *
        from unnest(
          $1::uuid[],
          $2::uuid[],
          $3::uuid[],
          $4::text[],
          $5::boolean[],
          $6::jsonb[],
          $7::jsonb[],
          $8::text[]
        )`,
        [
          candidateLogIds,
          generationIds,
          wineryIds,
          wineryNames,
          includedFlags,
          exclusionReasons,
          scoringBreakdowns,
          notes,
        ],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function isMissingLogTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function logItineraryGeneration(entry: ItineraryGenerationLogInput) {
  const candidates = extractCandidateRows(
    entry.resultSnapshot as RecommendItineraryResponse | undefined,
  );
  const normalized: ItineraryGenerationLogInput = {
    ...entry,
    decisionSummary: entry.decisionSummary ?? summarizeDecision(entry.resultSnapshot as RecommendItineraryResponse | undefined),
  };

  try {
    await insertGenerationLog(normalized, candidates);
  } catch (error) {
    if (isMissingLogTableError(error)) {
      // Migration may not be applied yet. Do not fail recommendation response.
      return;
    }
    throw error;
  }
}
