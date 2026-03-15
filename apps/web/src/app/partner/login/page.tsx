"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";

export default function PartnerLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const signedIn = await login({ email, password });
      if (signedIn.role === "winery") {
        router.push("/partner/wineries");
      } else if (signedIn.role === "transport") {
        router.push("/partner/transport");
      } else if (signedIn.role === "ops") {
        router.push("/partner/ops");
      } else {
        setError("Customer accounts should use customer login.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Partner access"
      title="Partner login"
      intro="Sign in as cellar door, transport, or ops."
      showWorkflowStatus={false}
      navMode="partner"
    >
      <div className="actionPageShell">
        <SectionCard title="Partner login" description="Use your partner account credentials.">
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
          <div className="ctaRow" style={{ marginTop: 10 }}>
            <span className="subtle">Need a new partner account?</span>
            <Link href="/partner/register" className="buttonGhost">Create account</Link>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
