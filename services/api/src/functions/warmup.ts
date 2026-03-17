import { app, InvocationContext, Timer } from "@azure/functions";
import { workflowRepository } from "../lib/repository-factory.js";
import { getDataMode } from "../lib/config.js";
import { getPool } from "../lib/db.js";

export async function warmupHandler(_timer: Timer, context: InvocationContext): Promise<void> {
  try {
    if (getDataMode() !== "postgres") {
      context.log("Warmup skipped (non-postgres mode).");
      return;
    }

    const pool = getPool();
    await pool.query("select 1");
    await workflowRepository.getWineries();
    context.log("Warmup completed.");
  } catch (error) {
    context.warn(`Warmup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

app.timer("tm-api-warmup", {
  schedule: "0 */5 * * * *",
  handler: warmupHandler,
});
