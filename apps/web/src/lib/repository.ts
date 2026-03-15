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

  return {
    info: {
      mode: "remote",
      label: "Azure workflow API",
    },
    async loadState() {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Unable to load workbench state (${response.status})`);
      }

      return (await response.json()) as AppStoreState;
    },
    async saveState(state) {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        throw new Error(`Unable to save workbench state (${response.status})`);
      }
    },
  };
}

export function createRepository(): AppRepository {
  const mode = getDataMode();
  const apiBaseUrl = getApiBaseUrl();

  if (mode === "remote" && apiBaseUrl) {
    return createRemoteRepository(apiBaseUrl);
  }

  return createLocalRepository();
}
