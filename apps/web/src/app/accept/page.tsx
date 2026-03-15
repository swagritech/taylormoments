import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { TransportAcceptFlow } from "@/components/transport-accept-flow";

export default function AcceptPage() {
  return (
    <AppShell
      eyebrow="Transport acceptance"
      title="Let drivers and operators accept work without a detour through a dashboard."
      intro="This page is the direct-action surface for transport links sent by Tailor Moments. One token, one decision, one clear outcome."
    >
      <Suspense fallback={null}>
        <TransportAcceptFlow />
      </Suspense>
    </AppShell>
  );
}
