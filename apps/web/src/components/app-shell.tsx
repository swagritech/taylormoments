import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { WorkflowStatus } from "@/components/workflow-status";
import { getCustomerSignInUrl, getOpsSignInUrl, getPartnerSignInUrl } from "@/lib/config";

type AppShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  actionMode?: boolean;
  showWorkflowStatus?: boolean;
};

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/customer", label: "Plan a day" },
  { href: "/wineries", label: "Wineries" },
  { href: "/transport", label: "Transport" },
  { href: "/ops", label: "Ops" },
];

export function AppShell({
  eyebrow,
  title,
  intro,
  children,
  actionMode = false,
  showWorkflowStatus = true,
}: AppShellProps) {
  const partnerSignInUrl = getPartnerSignInUrl();
  const opsSignInUrl = getOpsSignInUrl();
  const customerSignInUrl = getCustomerSignInUrl();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <div className="brandBadge">
            <Image
              src="/brand/tailormoments-logo.jpeg"
              alt="Tailor Moments"
              fill
              sizes="120px"
              className="brandLogoImage"
            />
          </div>
          <span>
            <strong>Tailor Moments</strong>
            <small>Your Way</small>
          </span>
        </Link>
        {!actionMode ? (
          <>
            <nav className="topnav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="navLink">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ctaRow authRow">
              {customerSignInUrl ? (
                <Link href={customerSignInUrl} className="buttonGhost">
                  Customer sign in
                </Link>
              ) : null}
              {partnerSignInUrl ? (
                <Link href={partnerSignInUrl} className="buttonGhost">
                  Partner sign in
                </Link>
              ) : null}
              {opsSignInUrl ? (
                <Link href={opsSignInUrl} className="buttonPrimary">
                  Ops sign in
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <div className="status ready">Direct action page</div>
        )}
      </header>

      <main className="pageFrame">
        <section className="pageHeader">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="heroCopy">{intro}</p>
          {!actionMode && showWorkflowStatus ? <WorkflowStatus /> : null}
        </section>
        {children}
      </main>
    </div>
  );
}
