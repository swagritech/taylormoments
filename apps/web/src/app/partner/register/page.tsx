"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";
import { listWineries } from "@/lib/live-api";

type PartnerRole = "winery" | "transport";

export default function PartnerRegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [partnerRoleTitle, setPartnerRoleTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<PartnerRole>("winery");
  const [wineryId, setWineryId] = useState("");
  const [wineryAddress, setWineryAddress] = useState("");
  const [wineryWebsite, setWineryWebsite] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [transportCompany, setTransportCompany] = useState("");
  const [wineries, setWineries] = useState<Array<{ winery_id: string; name: string; address?: string }>>([]);
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
        const next = response.wineries.map((item) => ({
          winery_id: item.winery_id,
          name: item.name,
          address: item.address,
        }));
        setWineries(next);
        const initialWineryId = next[0]?.winery_id || "";
        setWineryId((current) => current || initialWineryId);
        if (initialWineryId) {
          const selected = next.find((entry) => entry.winery_id === initialWineryId);
          setWineryAddress(selected?.address ?? "");
        }
      } catch {
        // Partner registration should still render if winery list fails.
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
      if (role === "winery" && !termsAccepted) {
        throw new Error("You must agree to the Partner Terms to continue.");
      }
      const normalizedDisplayName = `${firstName} ${lastName}`.trim() || displayName.trim();
      const created = await register({
        display_name: normalizedDisplayName || "Partner",
        email,
        password,
        role,
        first_name: role === "winery" ? firstName.trim() : undefined,
        last_name: role === "winery" ? lastName.trim() : undefined,
        partner_role_title: role === "winery" ? partnerRoleTitle.trim() : undefined,
        phone: role === "winery" ? phone.trim() : undefined,
        winery_id: role === "winery" ? wineryId || undefined : undefined,
        winery_address: role === "winery" ? wineryAddress.trim() || undefined : undefined,
        winery_website: role === "winery" ? wineryWebsite.trim() || undefined : undefined,
        terms_accepted: role === "winery" ? termsAccepted : undefined,
        transport_company: role === "transport" ? transportCompany || undefined : undefined,
      });

      if (created.role === "winery") {
        router.push("/partner/wineries");
      } else {
        router.push("/partner/transport");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Partner account"
      title="Create partner account"
      intro="Create a cellar door or transport partner account."
      showWorkflowStatus={false}
      navMode="partner"
    >
      <div className="actionPageShell">
        <SectionCard title="Partner registration" description="Choose your partner type to continue.">
          <form className="formPreview" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="partnerType">Partner type</label>
              <select
                id="partnerType"
                className="inputLike inputField"
                value={role}
                onChange={(event) => setRole(event.target.value as PartnerRole)}
              >
                <option value="winery">Cellar Door</option>
                <option value="transport">Transport</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                className="inputLike inputField"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Optional - defaults to your first and last name"
              />
            </div>

            {role === "winery" ? (
              <>
                <div className="fieldRow">
                  <div className="field">
                    <label htmlFor="firstName">Your first name</label>
                    <input
                      id="firstName"
                      className="inputLike inputField"
                      required
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="lastName">Your last name</label>
                    <input
                      id="lastName"
                      className="inputLike inputField"
                      required
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                </div>

                <div className="fieldRow">
                  <div className="field">
                    <label htmlFor="partnerRoleTitle">Your role at the winery</label>
                    <input
                      id="partnerRoleTitle"
                      className="inputLike inputField"
                      required
                      value={partnerRoleTitle}
                      onChange={(event) => setPartnerRoleTitle(event.target.value)}
                      placeholder="Owner, Cellar Door Manager"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="phone">Your phone number</label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      className="inputLike inputField"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                </div>

                <div className="fieldRow">
                  <div className="field">
                    <label htmlFor="email">Your email address</label>
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
                    <label htmlFor="password">Create a password</label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      pattern="(?=.*\d).{8,}"
                      title="Minimum 8 characters with at least one number."
                      className="inputLike inputField"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="winery">Winery name</label>
                  <select
                    id="winery"
                    className="inputLike inputField"
                    value={wineryId}
                    onChange={(event) => {
                      const nextWineryId = event.target.value;
                      setWineryId(nextWineryId);
                      const selected = wineries.find((item) => item.winery_id === nextWineryId);
                      setWineryAddress(selected?.address ?? "");
                    }}
                    required
                  >
                    {wineries.map((item) => (
                      <option key={item.winery_id} value={item.winery_id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="fieldRow">
                  <div className="field">
                    <label htmlFor="wineryAddress">Address</label>
                    <input
                      id="wineryAddress"
                      className="inputLike inputField"
                      value={wineryAddress}
                      onChange={(event) => setWineryAddress(event.target.value)}
                      placeholder="Auto-filled from winery record where available"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="wineryWebsite">Your website (optional)</label>
                    <input
                      id="wineryWebsite"
                      type="url"
                      className="inputLike inputField"
                      value={wineryWebsite}
                      onChange={(event) => setWineryWebsite(event.target.value)}
                      placeholder="https://"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="choicePill">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      required
                    />
                    I agree to the Partner Terms
                  </label>
                </div>
              </>
            ) : null}

            {role === "transport" ? (
              <>
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
                  <label htmlFor="transportCompany">Transport company</label>
                  <input
                    id="transportCompany"
                    className="inputLike inputField"
                    value={transportCompany}
                    onChange={(event) => setTransportCompany(event.target.value)}
                    required
                  />
                </div>
              </>
            ) : null}

            {error ? <div className="callout errorCallout">{error}</div> : null}
            <button type="submit" className="buttonPrimary fullWidthButton" disabled={loading}>
              {loading ? "Creating account..." : "Create partner account"}
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
