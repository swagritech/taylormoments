import { MemoryWorkflowRepository } from "../adapters/memory-repository.js";
import { PostgresWorkflowRepository } from "../adapters/postgres-repository.js";
import { getDataMode } from "./config.js";

const mode = getDataMode();

export const workflowRepository = mode === "postgres"
  ? new PostgresWorkflowRepository()
  : new MemoryWorkflowRepository();
