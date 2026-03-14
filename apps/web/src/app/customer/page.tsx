import { AppShell } from "@/components/app-shell";
import { CustomerPlanner } from "@/components/customer-planner";

export default function CustomerPage() {
  return (
    <AppShell
      eyebrow="Customer journey"
      title="A guest can request a tour in minutes and still feel the plan is tailored."
      intro="For the MVP, this page now acts like a live planning tool. You can change pickups, party size, and preferred wineries in front of partners and show the itinerary adjusting immediately."
    >
      <CustomerPlanner />
    </AppShell>
  );
}

