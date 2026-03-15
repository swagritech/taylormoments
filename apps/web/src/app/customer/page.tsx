import { AppShell } from "@/components/app-shell";
import { LiveBookingFlow } from "@/components/live-booking-flow";

export default function CustomerPage() {
  return (
    <AppShell
      eyebrow="Customer booking"
      title="Create and submit guest booking requests"
      intro="Capture guest details, choose preferred wineries, generate ranked itineraries, and submit directly into the live workflow."
    >
      <LiveBookingFlow />
    </AppShell>
  );
}

