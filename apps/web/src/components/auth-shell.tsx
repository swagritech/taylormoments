"use client";

import Link from "next/link";
import { type ReactNode } from "react";

type AuthShellProps = {
  tag?: string;
  kicker?: string;
  title: string;
  intro?: string;
  maxWidth?: number;
  children: ReactNode;
};

// Estate-styled shell for the account / auth pages (register, login, reset):
// a wordmark topbar that links home + a centered card on the sand background.
export function AuthShell({ tag, kicker, title, intro, maxWidth, children }: AuthShellProps) {
  return (
    <div className="pt-root">
      <header className="pt-topbar">
        <Link href="/" className="pt-brand" aria-label="Tailor Moments — back to homepage">
          <span className="tm-wordmark tm-wordmark--nav">
            <span className="tm-wordmark__name">Tailor Moments</span>
            <span className="tm-wordmark__rule" aria-hidden="true" />
            <span className="tm-wordmark__tag">Your Way</span>
          </span>
        </Link>
        {tag ? <span className="pt-portal-tag">{tag}</span> : null}
      </header>
      <div className="auth-shell">
        <div className="auth-card" style={maxWidth ? { maxWidth } : undefined}>
          <div className="auth-card__head">
            {kicker ? <p className="pt-kicker">{kicker}</p> : null}
            <h1 className="pt-title">{title}</h1>
            {intro ? <p className="pt-lead">{intro}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
