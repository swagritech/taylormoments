import {
  sampleBookings,
  transportJobs,
  wineries,
  type BookingRecord,
  type TransportJob,
  type Winery,
} from "@/lib/demo-data";

export type DemoStoreState = {
  bookings: BookingRecord[];
  activeBookingId: string;
  wineries: Winery[];
  transportJobs: TransportJob[];
};

export interface DemoApi {
  loadState(): DemoStoreState;
  saveState(state: DemoStoreState): void;
}

const STORAGE_KEY = "tailor-moments-demo-store";

export function createDefaultDemoState(): DemoStoreState {
  return {
    bookings: sampleBookings,
    activeBookingId: sampleBookings[0]?.id ?? "",
    wineries,
    transportJobs,
  };
}

export const localDemoApi: DemoApi = {
  loadState() {
    if (typeof window === "undefined") {
      return createDefaultDemoState();
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultDemoState();
    }

    try {
      return JSON.parse(stored) as DemoStoreState;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return createDefaultDemoState();
    }
  },
  saveState(state) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};
