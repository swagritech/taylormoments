import { readFile, readdir } from "node:fs/promises";
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
  const scripts = (await readdir(sqlDir))
    .filter((fileName) => /^\d+_.+\.sql$/i.test(fileName))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  if (scripts.length === 0) {
    throw new Error(`No SQL migration scripts found in ${sqlDir}`);
  }
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
