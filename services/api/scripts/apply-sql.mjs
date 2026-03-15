import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

async function run() {
  const connectionString = process.env.TM_POSTGRES_URL;

  if (!connectionString) {
    throw new Error("TM_POSTGRES_URL is required to bootstrap the Tailor Moments database.");
  }

  const sqlDir = path.resolve(process.cwd(), "sql");
  const scripts = [
    "001_init.sql",
    "002_seed_wineries.sql",
    "003_winery_partner_workflow.sql",
    "004_booking_time_preferences.sql",
    "005_user_auth.sql",
  ];
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    for (const scriptName of scripts) {
      const sql = (await readFile(path.join(sqlDir, scriptName), "utf8")).replace(/^\uFEFF/, "");
      process.stdout.write(`Applying ${scriptName}...\n`);
      await client.query(sql);
    }

    process.stdout.write("Tailor Moments database bootstrap completed.\n");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
