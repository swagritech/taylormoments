"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth-state";

export type PortalNavItem = {
  key: string;
  label: string;
  icon: string;
  badge?: number;
};

type CrossLink = { href: string; label: string };

type PortalShellProps = {
  portalTag: string;
  navLabel: string;
  navItems: PortalNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  accountName: string;
  accountRole: string;
  kicker: string;
  title: string;
  lead: string;
  crossLink?: CrossLink;
  children: ReactNode;
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "TM";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PortalShell({
  portalTag,
  navLabel,
  navItems,
  activeKey,
  onSelect,
  accountName,
  accountRole,
  kicker,
  title,
  lead,
  crossLink,
  children,
}: PortalShellProps) {
  const { logout } = useAuth();

  return (
    <div className="pt-root">
      <header className="pt-topbar">
        <Link href="/" className="pt-brand" aria-label="Tailor Moments home">
          <span className="tm-wordmark tm-wordmark--nav">
            <span className="tm-wordmark__name">Tailor Moments</span>
            <span className="tm-wordmark__rule" aria-hidden="true" />
            <span className="tm-wordmark__tag">Your Way</span>
          </span>
        </Link>
        <span className="pt-portal-tag">{portalTag}</span>
        <div className="pt-topbar__spacer" />
        <div className="pt-account">
          <span className="pt-account__btn">
            <span className="pt-avatar" aria-hidden="true">{initialsFrom(accountName)}</span>
            <span className="pt-account__meta">
              <span className="pt-account__name">{accountName}</span>
              <span className="pt-account__role">{accountRole}</span>
            </span>
          </span>
        </div>
      </header>

      <div className="pt-body">
        <aside className="pt-sidebar" aria-label="Portal navigation">
          <p className="pt-nav-label">{navLabel}</p>
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pt-nav-item ${activeKey === item.key ? "is-active" : ""}`}
              onClick={() => onSelect(item.key)}
            >
              <span className="pt-nav-item__ico" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="pt-nav-item__badge">{item.badge}</span> : null}
            </button>
          ))}
          <div className="pt-sidebar__foot">
            <Link href="/" className="pt-sidebar__link">← Back to homepage</Link>
            {crossLink ? <Link href={crossLink.href} className="pt-sidebar__link">{crossLink.label}</Link> : null}
            <button type="button" className="pt-sidebar__link" onClick={() => logout()}>Sign out</button>
          </div>
        </aside>

        <main className="pt-main">
          <div className="pt-page-head">
            <p className="pt-kicker">{kicker}</p>
            <h1 className="pt-title">{title}</h1>
            <p className="pt-lead">{lead}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function PortalGate({
  portalTag,
  title,
  lead,
}: {
  portalTag: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="pt-root">
      <header className="pt-topbar">
        <Link href="/" className="pt-brand" aria-label="Tailor Moments home">
          <span className="tm-wordmark tm-wordmark--nav">
            <span className="tm-wordmark__name">Tailor Moments</span>
            <span className="tm-wordmark__rule" aria-hidden="true" />
            <span className="tm-wordmark__tag">Your Way</span>
          </span>
        </Link>
        <span className="pt-portal-tag">{portalTag}</span>
      </header>
      <div className="pt-gate">
        <div className="pt-gate__card">
          <p className="pt-kicker">{portalTag}</p>
          <h1 className="pt-title">{title}</h1>
          <p className="pt-lead" style={{ margin: "0 auto" }}>{lead}</p>
          <div className="pt-gate__actions">
            <Link href="/partner/login" className="pt-btn pt-btn--primary">Log in</Link>
            <Link href="/partner/register" className="pt-btn pt-btn--ghost">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortalToast({ message, show }: { message: string; show: boolean }) {
  return (
    <div className={`pt-toast ${show ? "is-on" : ""}`} role="status" aria-live="polite">
      {message ? <span className="pt-toast__check" aria-hidden="true">✓</span> : null}
      {message}
    </div>
  );
}
