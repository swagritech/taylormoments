"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BookingRecord, TourRequest, Winery } from "@/lib/demo-data";
import type { AppStoreState } from "@/lib/app-state";
import { createDefaultAppState } from "@/lib/app-state";
import { createRepository } from "@/lib/repository";
import { buildLivePlans, buildLiveTransportJob, deriveBookingStage } from "@/lib/planning";

type SyncStatus = "loading" | "ready" | "saving" | "error";

type DemoStateValue = {
  bookings: BookingRecord[];
  activeBookingId: string;
  activeBooking: BookingRecord | undefined;
  wineries: Winery[];
  cannedTransportJobs: AppStoreState["transportJobs"];
  dataSourceLabel: string;
  dataSourceMode: "demo" | "remote";
  syncStatus: SyncStatus;
  syncError: string | null;
  setActiveBookingId: (bookingId: string) => void;
  createBooking: () => void;
  request: TourRequest;
  setGuestName: (guestName: string) => void;
  setDate: (date: string) => void;
  setPickup: (pickup: string) => void;
  setPartySize: (partySize: number) => void;
  toggleWinery: (wineryId: string) => void;
  updateWineryStatus: (wineryId: string, status: Winery["status"]) => void;
  updateWinerySlots: (wineryId: string, slots: string[]) => void;
  plans: ReturnType<typeof buildLivePlans>;
  selectedPlan: ReturnType<typeof buildLivePlans>[number] | undefined;
  liveTransportJob: ReturnType<typeof buildLiveTransportJob>;
};

const DemoStateContext = createContext<DemoStateValue | null>(null);
const repository = createRepository();

function makeBookingId() {
  return `booking-${Math.random().toString(36).slice(2, 8)}`;
}

function rederiveStages(bookings: BookingRecord[], wineries: Winery[]) {
  return bookings.map((booking) => ({
    ...booking,
    stage: deriveBookingStage(booking, wineries),
  }));
}

const emptyRequest: TourRequest = {
  guestName: "",
  date: "",
  pickup: "Margaret River Visitor Centre",
  partySize: 2,
  wineries: [],
};

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<AppStoreState>(createDefaultAppState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setSyncStatus("loading");
      setSyncError(null);

      try {
        const initial = await repository.loadState();
        if (!isMounted) {
          return;
        }

        setStore({
          ...initial,
          bookings: rederiveStages(initial.bookings, initial.wineries),
        });
        hasLoaded.current = true;
        setSyncStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        hasLoaded.current = true;
        setStore(createDefaultAppState());
        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "Unable to load workflow data.",
        );
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) {
      return;
    }

    let isMounted = true;

    async function save() {
      setSyncStatus((current) => (current === "loading" ? current : "saving"));
      setSyncError(null);

      try {
        await repository.saveState(store);
        if (!isMounted) {
          return;
        }

        setSyncStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "Unable to save workflow data.",
        );
      }
    }

    void save();

    return () => {
      isMounted = false;
    };
  }, [store]);

  const activeBooking = useMemo(
    () => store.bookings.find((booking) => booking.id === store.activeBookingId) ?? store.bookings[0],
    [store.activeBookingId, store.bookings],
  );

  const request = useMemo(() => activeBooking?.request ?? emptyRequest, [activeBooking]);
  const plans = useMemo(() => buildLivePlans(request, store.wineries), [request, store.wineries]);
  const selectedPlan = plans[0];
  const liveTransportJob = useMemo(
    () =>
      buildLiveTransportJob(
        request,
        selectedPlan,
        activeBooking ? `TM-${activeBooking.id.slice(-4).toUpperCase()}` : "TM-LIVE",
      ),
    [activeBooking, request, selectedPlan],
  );

  function updateActiveBooking(updater: (booking: BookingRecord) => BookingRecord) {
    setStore((current) => {
      const bookings = current.bookings.map((booking) =>
        booking.id === current.activeBookingId ? updater(booking) : booking,
      );

      return {
        ...current,
        bookings: rederiveStages(bookings, current.wineries),
      };
    });
  }

  const value: DemoStateValue = {
    bookings: store.bookings,
    activeBookingId: store.activeBookingId,
    activeBooking,
    wineries: store.wineries,
    cannedTransportJobs: store.transportJobs,
    dataSourceLabel: repository.info.label,
    dataSourceMode: repository.info.mode,
    syncStatus,
    syncError,
    setActiveBookingId: (bookingId) =>
      setStore((current) => ({ ...current, activeBookingId: bookingId })),
    createBooking: () =>
      setStore((current) => {
        const newBooking: BookingRecord = {
          id: makeBookingId(),
          label: `New enquiry ${current.bookings.length + 1}`,
          stage: "Draft",
          request: {
            guestName: "New enquiry",
            date: "Tuesday, 14 April",
            pickup: "Margaret River Visitor Centre",
            partySize: 4,
            wineries: current.wineries.slice(0, 2).map((winery) => winery.id),
          },
        };

        const bookings = rederiveStages([...current.bookings, newBooking], current.wineries);
        return {
          ...current,
          bookings,
          activeBookingId: newBooking.id,
        };
      }),
    request,
    setGuestName: (guestName) =>
      updateActiveBooking((booking) => ({
        ...booking,
        label: guestName || booking.label,
        request: { ...booking.request, guestName },
      })),
    setDate: (date) =>
      updateActiveBooking((booking) => ({
        ...booking,
        request: { ...booking.request, date },
      })),
    setPickup: (pickup) =>
      updateActiveBooking((booking) => ({
        ...booking,
        request: { ...booking.request, pickup },
      })),
    setPartySize: (partySize) =>
      updateActiveBooking((booking) => ({
        ...booking,
        request: { ...booking.request, partySize },
      })),
    toggleWinery: (wineryId) =>
      updateActiveBooking((booking) => {
        const exists = booking.request.wineries.includes(wineryId);
        const wineries = exists
          ? booking.request.wineries.length > 2
            ? booking.request.wineries.filter((id) => id !== wineryId)
            : booking.request.wineries
          : [...booking.request.wineries, wineryId];

        return {
          ...booking,
          request: { ...booking.request, wineries },
        };
      }),
    updateWineryStatus: (wineryId, status) =>
      setStore((current) => {
        const wineries = current.wineries.map((winery) =>
          winery.id === wineryId ? { ...winery, status } : winery,
        );
        return {
          ...current,
          wineries,
          bookings: rederiveStages(current.bookings, wineries),
        };
      }),
    updateWinerySlots: (wineryId, slots) =>
      setStore((current) => ({
        ...current,
        wineries: current.wineries.map((winery) =>
          winery.id === wineryId ? { ...winery, availableSlots: slots } : winery,
        ),
      })),
    plans,
    selectedPlan,
    liveTransportJob,
  };

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState() {
  const context = useContext(DemoStateContext);

  if (!context) {
    throw new Error("useDemoState must be used within DemoStateProvider");
  }

  return context;
}
