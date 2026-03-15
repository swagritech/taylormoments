import {
  sampleBookings,
  transportJobs,
  wineries,
  type BookingRecord,
  type TransportJob,
  type Winery,
} from "@/lib/demo-data";

export type AppStoreState = {
  bookings: BookingRecord[];
  activeBookingId: string;
  wineries: Winery[];
  transportJobs: TransportJob[];
};

export function createDefaultAppState(): AppStoreState {
  return {
    bookings: sampleBookings,
    activeBookingId: sampleBookings[0]?.id ?? "",
    wineries,
    transportJobs,
  };
}
