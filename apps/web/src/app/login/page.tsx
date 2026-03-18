"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";
import { routeForUser } from "@/lib/auth-routing";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    router.replace(routeForUser(user));
  }, [authLoading, router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const signedIn = await login({ email, password });
      router.push(routeForUser(signedIn));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Customer access"
      title="Customer login"
      intro="Sign in to manage your winery day bookings."
      showWorkflowStatus={false}
      navMode="public"
    >
      <div className="actionPageShell">
        <SectionCard title="Customer login" description="Use your customer email and password.">
          <form className="formPreview" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="inputLike inputField"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="inputLike inputField"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <div className="callout errorCallout">{error}</div> : null}
            <button type="submit" className="buttonPrimary fullWidthButton" disabled={loading}>
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
          <div className="ctaRow" style={{ marginTop: 10, alignItems: "center" }}>
            <span className="subtle">Are you a partner?</span>
            <Link href="/partner/login" className="buttonGhost">Partner login</Link>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
