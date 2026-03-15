"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";

export default function PartnerHomePage() {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return (
      <AppShell
        eyebrow="Partner portal"
        title="Partner login"
        intro="Sign in to manage winery approvals, transport jobs, and operations."
        navMode="partner"
        showWorkflowStatus={false}
      >
        <div className="actionPageShell">
          <SectionCard title="Sign in to continue" description="Partner and ops workflows are only available to authenticated accounts.">
            <div className="ctaRow">
              <Link href="/login" className="buttonPrimary">Log in</Link>
              <Link href="/register" className="buttonGhost">Create account</Link>
            </div>
          </SectionCard>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Partner portal"
      title="Partner workspace"
      intro="Open your role-specific workspace below."
      navMode="partner"
      showWorkflowStatus={false}
    >
      <div className="grid two">
        <SectionCard title="Winery team" description="Approve or review winery booking requests.">
          <div className="ctaRow">
            <Link href="/partner/wineries" className="buttonPrimary">Open wineries</Link>
          </div>
        </SectionCard>
        <SectionCard title="Transport team" description="Review available jobs and current assignments.">
          <div className="ctaRow">
            <Link href="/partner/transport" className="buttonPrimary">Open transport</Link>
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Operations" description="Manage exceptions and monitor active tour day execution.">
        <div className="ctaRow">
          <Link href="/partner/ops" className="buttonPrimary">Open ops dashboard</Link>
        </div>
      </SectionCard>
    </AppShell>
  );
}
