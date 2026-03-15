import { AppShell } from "@/components/app-shell";
import { LiveBookingFlow } from "@/components/live-booking-flow";

export default function CustomerPage() {
  return (
    <AppShell
      eyebrow="Customer booking"
      title="Plan your Margaret River winery day"
      intro="Share your preferred date, group size, pickup point, and favourite wineries to receive a tailored itinerary recommendation."
      showWorkflowStatus={false}
    >
      <LiveBookingFlow />
    </AppShell>
  );
}

