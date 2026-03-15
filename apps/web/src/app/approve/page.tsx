import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WineryApprovalFlow } from "@/components/winery-approval-flow";

export default function ApprovePage() {
  return (
    <AppShell
      eyebrow="Winery approval"
      title="Approve winery booking request"
      intro="This page is used by winery partners from email or SMS links to confirm a booking request without signing in."
      actionMode
    >
      <Suspense fallback={null}>
        <WineryApprovalFlow />
      </Suspense>
    </AppShell>
  );
}

