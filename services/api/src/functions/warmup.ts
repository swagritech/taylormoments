import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from "@azure/functions";
import { workflowRepository } from "../lib/repository-factory.js";
import { getDataMode, getTravelTimeProvider } from "../lib/config.js";
import { getPool } from "../lib/db.js";
import { buildTravelTimeMatrix } from "../lib/travel-time-provider.js";
import { badRequest, ok } from "../lib/http.js";

function formatDateOffset(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function warmTravelCache(context: InvocationContext) {
  if (getTravelTimeProvider() !== "osrm") {
    context.log("Warmup matrix skipped (travel provider is not OSRM).");
    return;
  }

  const wineries = await workflowRepository.getWineries();
  const warmableWineries = wineries
    .filter((winery) => winery.active && Number.isFinite(winery.latitude) && Number.isFinite(winery.longitude));

  if (warmableWineries.length < 2) {
    context.log("Warmup matrix skipped (insufficient winery coordinates).");
    return;
  }

  const pointsById: Record<string, { lat: number; lon: number } | undefined> = {
    pickup: { lat: -33.952, lon: 115.075 },
  };

  for (const winery of warmableWineries) {
    pointsById[winery.wineryId] = {
      lat: winery.latitude as number,
      lon: winery.longitude as number,
    };
  }

  const departureHints = [
    `${formatDateOffset(0)}T09:00`,
    `${formatDateOffset(1)}T09:00`,
  ];

  for (const departureHint of departureHints) {
    const matrix = await buildTravelTimeMatrix({ pointsById, departureHint });
    context.log(
      `Warmup matrix ${departureHint}: provider=${matrix.summary.provider}, cache_hit=${matrix.summary.cache_hit}, matrix_legs=${matrix.summary.matrix_leg_count}`,
    );
  }
}

async function runWarmup(context: InvocationContext) {
  try {
    if (getDataMode() !== "postgres") {
      context.log("Warmup skipped (non-postgres mode).");
      return;
    }

    const pool = getPool();
    await pool.query("select 1");
    await warmTravelCache(context);
    context.log("Warmup completed.");
  } catch (error) {
    context.warn(`Warmup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function warmupHandler(_timer: Timer, context: InvocationContext): Promise<void> {
  await runWarmup(context);
}

export async function warmupHttpHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const token = request.headers.get("x-tm-warmup-token")?.trim();
  const expected = process.env.TM_WARMUP_TOKEN?.trim();
  if (expected && token !== expected) {
    return badRequest("Invalid warmup token.");
  }

  await runWarmup(context);
  return ok({ status: "ok" });
}

app.timer("tm-api-warmup", {
  schedule: "0 */5 * * * *",
  handler: warmupHandler,
});

app.http("api-warmup", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "v1/warmup",
  handler: warmupHttpHandler,
});
