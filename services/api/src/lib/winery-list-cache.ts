import type { Winery } from "../domain/models.js";
import type { WorkflowRepository } from "../domain/ports.js";

type WineryListCache = {
  wineries: Winery[];
  expiresAt: number;
};

const WINERY_CACHE_TTL_MS = 5 * 60 * 1000;
let wineryCache: WineryListCache | null = null;

export function invalidateWineryListCache() {
  wineryCache = null;
}

export async function getCachedWineries(repository: WorkflowRepository): Promise<Winery[]> {
  if (wineryCache && Date.now() < wineryCache.expiresAt) {
    return wineryCache.wineries;
  }

  const wineries = await repository.getWineries();
  wineryCache = {
    wineries,
    expiresAt: Date.now() + WINERY_CACHE_TTL_MS,
  };
  return wineries;
}
