import { createDefaultAppState, type AppStoreState } from "@/lib/app-state";
import { getApiBaseUrl, getDataMode, type DataMode } from "@/lib/config";

export type RepositoryInfo = {
  mode: DataMode;
  label: string;
};

export interface AppRepository {
  info: RepositoryInfo;
  loadState(): Promise<AppStoreState>;
  saveState(state: AppStoreState): Promise<void>;
}

const STORAGE_KEY = "tailor-moments-demo-store";

function parseState(value: string | null) {
  if (!value) {
    return createDefaultAppState();
  }

  try {
    return JSON.parse(value) as AppStoreState;
  } catch {
    return createDefaultAppState();
  }
}

export function createLocalRepository(): AppRepository {
  return {
    info: {
      mode: "demo",
      label: "Demo data",
    },
    async loadState() {
      if (typeof window === "undefined") {
        return createDefaultAppState();
      }

      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = parseState(stored);
      if (stored && JSON.stringify(parsed) === JSON.stringify(createDefaultAppState())) {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      return parsed;
    },
    async saveState(state) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
  };
}

export function createRemoteRepository(apiBaseUrl: string): AppRepository {
  const endpoint = `${apiBaseUrl}/api/v1/workbench-state`;
  const localRepository = createLocalRepository();
  let endpointUnavailable = false;

  return {
    info: {
      mode: "remote",
      label: "Azure workflow API",
    },
    async loadState() {
      if (endpointUnavailable) {
        return localRepository.loadState();
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 404) {
        endpointUnavailable = true;
        return localRepository.loadState();
      }

      if (!response.ok) {
        throw new Error(`Unable to load workbench state (${response.status})`);
      }

      return (await response.json()) as AppStoreState;
    },
    async saveState(state) {
      if (endpointUnavailable) {
        return localRepository.saveState(state);
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
      });

      if (response.status === 404) {
        endpointUnavailable = true;
        await localRepository.saveState(state);
        return;
      }

      if (!response.ok) {
        throw new Error(`Unable to save workbench state (${response.status})`);
      }
    },
  };
}

export function createRepository(): AppRepository {
  const mode = getDataMode();
  const apiBaseUrl = getApiBaseUrl();
  const remoteWorkbenchEnabled = process.env.NEXT_PUBLIC_ENABLE_WORKBENCH_STATE === "true";

  if (remoteWorkbenchEnabled && mode === "remote" && apiBaseUrl) {
    return createRemoteRepository(apiBaseUrl);
  }

  return createLocalRepository();
}
