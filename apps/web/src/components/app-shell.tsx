import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/customer", label: "Customer journey" },
  { href: "/wineries", label: "Winery portal" },
  { href: "/transport", label: "Transport board" },
  { href: "/ops", label: "Ops view" },
];

export function AppShell({ eyebrow, title, intro, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brandMark">TM</span>
          <span>
            <strong>Tailor Moments</strong>
            <small>Partner feedback MVP</small>
          </span>
        </Link>
        <nav className="topnav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="navLink">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="pageFrame">
        <section className="heroPanel">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="heroCopy">{intro}</p>
        </section>
        {children}
      </main>
    </div>
  );
}

