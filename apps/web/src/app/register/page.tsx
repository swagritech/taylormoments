"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        display_name: displayName,
        email,
        password,
        role: "customer",
      });
      router.push("/customer");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Customer account"
      title="Create customer account"
      intro="Create your customer account to plan and manage your winery day bookings."
      showWorkflowStatus={false}
      navMode="public"
    >
      <div className="actionPageShell">
        <SectionCard title="Customer registration" description="This signup is for customers only.">
          <form className="formPreview" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="displayName">Full name</label>
              <input
                id="displayName"
                className="inputLike inputField"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="fieldRow">
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
                  minLength={8}
                  className="inputLike inputField"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            {error ? <div className="callout errorCallout">{error}</div> : null}
            <button type="submit" className="buttonPrimary fullWidthButton" disabled={loading}>
              {loading ? "Creating account..." : "Create customer account"}
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
