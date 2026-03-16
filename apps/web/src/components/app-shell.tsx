"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { WorkflowStatus } from "@/components/workflow-status";
import { useAuth } from "@/lib/auth-state";

type AppShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  actionMode?: boolean;
  showWorkflowStatus?: boolean;
  navMode?: "public" | "partner";
};

const publicNavItemsDefault = [
  { href: "/explore", label: "Explore" },
  { href: "/customer/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Plan a day" },
  { href: "/partner", label: "Partner login" },
];

const partnerNavItems = [
  { href: "/partner", label: "Partner home" },
  { href: "/partner/wineries", label: "Wineries" },
  { href: "/partner/transport", label: "Transport" },
  { href: "/partner/ops", label: "Ops" },
];

function getPartnerNavItems(role?: string) {
  if (role === "winery") {
    return partnerNavItems.filter((item) => item.href === "/partner" || item.href === "/partner/wineries");
  }
  if (role === "transport") {
    return partnerNavItems.filter((item) => item.href === "/partner" || item.href === "/partner/transport");
  }
  if (role === "ops") {
    return partnerNavItems;
  }
  return [{ href: "/partner", label: "Partner home" }];
}

export function AppShell({
  eyebrow,
  title,
  intro,
  children,
  actionMode = false,
  showWorkflowStatus = true,
  navMode = "public",
}: AppShellProps) {
  const { user, logout } = useAuth();
  const navItems = navMode === "partner"
    ? getPartnerNavItems(user?.role)
    : user?.role === "customer"
      ? [
          { href: "/explore", label: "Explore" },
          { href: "/customer/dashboard", label: "Dashboard" },
          { href: "/plan", label: "Plan a day" },
        ]
      : publicNavItemsDefault;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/explore" className="brand">
          <div className="brandBadge">
            <Image
              src="/brand/TM_logo_white-beta.png"
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
              {user ? (
                <>
                  {user.role !== "customer" ? (
                    <span className="status accepted">{user.role}</span>
                  ) : null}
                  <span className="authName">{user.display_name}</span>
                  <button type="button" className="buttonGhost" onClick={logout}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href={navMode === "partner" ? "/partner/register" : "/register"} className="buttonGhost">
                    Create account
                  </Link>
                  <Link href={navMode === "partner" ? "/partner/login" : "/login"} className="buttonPrimary">
                    Log in
                  </Link>
                </>
              )}
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
