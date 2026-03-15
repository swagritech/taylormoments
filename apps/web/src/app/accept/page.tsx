import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { TransportAcceptFlow } from "@/components/transport-accept-flow";

export default function AcceptPage() {
  return (
    <AppShell
      eyebrow="Transport acceptance"
      title="Accept transport job"
      intro="This page is used by transport partners from direct links to accept a job assignment quickly on mobile."
      actionMode
    >
      <Suspense fallback={null}>
        <TransportAcceptFlow />
      </Suspense>
    </AppShell>
  );
}

