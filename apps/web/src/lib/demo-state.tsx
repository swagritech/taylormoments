"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BookingRecord, TourRequest, Winery } from "@/lib/demo-data";
import { localDemoApi } from "@/lib/demo-api";
import { buildLivePlans, buildLiveTransportJob, deriveBookingStage } from "@/lib/planning";

type DemoStateValue = {
  bookings: BookingRecord[];
  activeBookingId: string;
  activeBooking: BookingRecord | undefined;
  wineries: Winery[];
  cannedTransportJobs: ReturnType<typeof localDemoApi.loadState>["transportJobs"];
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
  const [store, setStore] = useState(() => {
    const initial = localDemoApi.loadState();
    return {
      ...initial,
      bookings: rederiveStages(initial.bookings, initial.wineries),
    };
  });

  useEffect(() => {
    localDemoApi.saveState(store);
  }, [store]);

  const activeBooking = useMemo(
    () => store.bookings.find((booking) => booking.id === store.activeBookingId) ?? store.bookings[0],
    [store.activeBookingId, store.bookings],
  );

  const request = useMemo(() => activeBooking?.request ?? emptyRequest, [activeBooking]);
  const plans = useMemo(() => buildLivePlans(request, store.wineries), [request, store.wineries]);
  const selectedPlan = plans[0];
  const liveTransportJob = useMemo(
    () => buildLiveTransportJob(request, selectedPlan, activeBooking ? `TM-${activeBooking.id.slice(-4).toUpperCase()}` : "TM-LIVE"),
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
