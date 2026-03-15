import { AppShell } from "@/components/app-shell";
import { LiveBookingFlow } from "@/components/live-booking-flow";

export default function CustomerPage() {
  return (
    <AppShell
      eyebrow="Guest booking"
      title="Let guests request a tailored Margaret River day in a few calm, confident steps."
      intro="This is now the live customer-facing surface: generate ranked itinerary options from the Azure API, then submit the chosen day into the Tailor Moments workflow."
    >
      <LiveBookingFlow />
    </AppShell>
  );
}
