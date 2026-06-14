"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { WorkflowStatus } from "@/components/workflow-status";
import { useAuth } from "@/lib/auth-state";
import { clearExplorePreferences, hasExplorePreferences } from "@/lib/explore-preferences";
import { clearExploreTourSummary } from "@/lib/explore-tour-summary";

type AppShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  actionMode?: boolean;
  showWorkflowStatus?: boolean;
  showPageHeader?: boolean;
  navMode?: "public" | "partner";
};

const publicNavItemsDefault = [
  { href: "/explore", label: "Explore" },
  { href: "/customer/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Plan a day" },
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
  showPageHeader = true,
  navMode = "public",
}: AppShellProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSavedPlan, setHasSavedPlan] = useState(false);

  // Show "Start over" only on the public flow once the visitor has a saved trip,
  // so they can clear their answers and begin a fresh search.
  useEffect(() => {
    setHasSavedPlan(hasExplorePreferences());
  }, []);

  function handleStartOver() {
    clearExplorePreferences();
    clearExploreTourSummary();
    setHasSavedPlan(false);
    setMobileMenuOpen(false);
    router.push("/");
  }
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
        <Link href="/" className="brand">
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
            <button
              type="button"
              className="buttonGhost mobileMenuToggle"
              aria-expanded={mobileMenuOpen}
              aria-controls="primary-mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? "\u2715" : "\u2630"}
            </button>
            <nav
              id="primary-mobile-menu"
              className={`topnav ${mobileMenuOpen ? "\u2715" : "\u2630"}`}
              aria-label="Primary navigation"
            >
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="navLink" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className={`ctaRow authRow ${mobileMenuOpen ? "\u2715" : "\u2630"}`}>
              {navMode === "public" && hasSavedPlan ? (
                <button
                  type="button"
                  className="buttonGhost"
                  onClick={handleStartOver}
                  title="Clear your answers and plan a new day"
                >
                  Start over
                </button>
              ) : null}
              {user ? (
                <>
                  {user.role !== "customer" ? (
                    <span className="status accepted">{user.role}</span>
                  ) : null}
                  <span className="authName">{user.display_name}</span>
                  <button
                    type="button"
                    className="buttonGhost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={navMode === "partner" ? "/partner/register" : "/register"}
                    className="buttonGhost"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Create account
                  </Link>
                  <Link
                    href={navMode === "partner" ? "/partner/login" : "/login"}
                    className="buttonPrimary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
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
        {showPageHeader ? (
          <section className="pageHeader">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="heroCopy">{intro}</p>
            {!actionMode && showWorkflowStatus ? <WorkflowStatus /> : null}
          </section>
        ) : null}
        {children}
      </main>
    </div>
  );
}

