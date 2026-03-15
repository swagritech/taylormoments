"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";
import { listWineries } from "@/lib/live-api";

type Role = "customer" | "winery" | "transport" | "ops";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [wineryId, setWineryId] = useState("");
  const [transportCompany, setTransportCompany] = useState("");
  const [wineries, setWineries] = useState<Array<{ winery_id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadWineries() {
      try {
        const response = await listWineries();
        if (!active) {
          return;
        }
        setWineries(response.wineries.map((item) => ({ winery_id: item.winery_id, name: item.name })));
        setWineryId((current) => current || response.wineries[0]?.winery_id || "");
      } catch {
        // Keep registration available even if winery list fails.
      }
    }

    void loadWineries();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        display_name: displayName,
        email,
        password,
        role,
        winery_id: role === "winery" ? wineryId || undefined : undefined,
        transport_company: role === "transport" ? transportCompany || undefined : undefined,
      });
      router.push("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Account setup"
      title="Create account"
      intro="Create a customer or partner account with role-based access."
      showWorkflowStatus={false}
    >
      <div className="actionPageShell">
        <SectionCard title="New account" description="Passwords are required for first-party login.">
          <form className="formPreview" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="displayName">Display name</label>
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
            <div className="field">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                className="inputLike inputField"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                <option value="customer">Customer</option>
                <option value="winery">Winery partner</option>
                <option value="transport">Transport partner</option>
                <option value="ops">Ops</option>
              </select>
            </div>
            {role === "winery" ? (
              <div className="field">
                <label htmlFor="winery">Winery</label>
                <select
                  id="winery"
                  className="inputLike inputField"
                  value={wineryId}
                  onChange={(event) => setWineryId(event.target.value)}
                  required
                >
                  {wineries.map((item) => (
                    <option key={item.winery_id} value={item.winery_id}>{item.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {role === "transport" ? (
              <div className="field">
                <label htmlFor="transportCompany">Transport company</label>
                <input
                  id="transportCompany"
                  className="inputLike inputField"
                  value={transportCompany}
                  onChange={(event) => setTransportCompany(event.target.value)}
                  required
                />
              </div>
            ) : null}
            {error ? <div className="callout errorCallout">{error}</div> : null}
            <button type="submit" className="buttonPrimary fullWidthButton" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
