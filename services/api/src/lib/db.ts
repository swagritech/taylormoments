import { Pool } from "pg";
import { getEnv } from "./config.js";

let pool: Pool | null = null;

export function getPostgresUrl() {
  return getEnv("TM_POSTGRES_URL", "");
}

export function getPool() {
  const connectionString = getPostgresUrl();

  if (!connectionString) {
    throw new Error("TM_POSTGRES_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }

  return pool;
}
