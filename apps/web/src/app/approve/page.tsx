import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WineryApprovalFlow } from "@/components/winery-approval-flow";

export default function ApprovePage() {
  return (
    <AppShell
      eyebrow="Winery approval"
      title="Approve a booking from one clear mobile screen."
      intro="This action page is designed for partners who do not want a portal login. Open the link, review the action, and confirm the booking."
    >
      <Suspense fallback={null}>
        <WineryApprovalFlow />
      </Suspense>
    </AppShell>
  );
}
