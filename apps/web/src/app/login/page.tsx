"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";

export default function LoginPage() {
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
      if (signedIn.role === "customer") {
        router.push("/customer");
      } else if (signedIn.role === "winery") {
        router.push("/partner/wineries");
      } else if (signedIn.role === "transport") {
        router.push("/partner/transport");
      } else if (signedIn.role === "ops") {
        router.push("/partner/ops");
      } else {
        router.push("/partner");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Account access"
      title="Log in"
      intro="Sign in with your Tailor Moments account to access customer, winery, transport, or ops features."
      showWorkflowStatus={false}
    >
      <div className="actionPageShell">
        <SectionCard title="Account login" description="Use the email and password you registered with.">
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
        </SectionCard>
      </div>
    </AppShell>
  );
}
