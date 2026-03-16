"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";
import { loadExplorePreferences } from "@/lib/explore-preferences";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadExplorePreferences();
    if (!saved) {
      return;
    }

    if (!email.trim() && saved.email) {
      setEmail(saved.email);
    }

    if (!firstName.trim() && !lastName.trim() && saved.name) {
      const parts = saved.name.trim().split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
      }
    }
  }, [email, firstName, lastName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email,
        password,
        role: "customer",
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        home_country: homeCountry.trim(),
        age_group: ageGroup || undefined,
        gender: gender || undefined,
      });
      router.push("/customer/dashboard");
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
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  className="inputLike inputField"
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last name</label>
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
                <label htmlFor="phone">Phone (international format)</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  className="inputLike inputField"
                  placeholder="+61412345678"
                  pattern="^\+?[1-9]\d{7,14}$"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email (username)</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="inputLike inputField"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="homeCountry">Home country</label>
                <input
                  id="homeCountry"
                  required
                  className="inputLike inputField"
                  placeholder="Australia"
                  value={homeCountry}
                  onChange={(event) => setHomeCountry(event.target.value)}
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
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="ageGroup">Age group (optional)</label>
                <select
                  id="ageGroup"
                  className="inputLike inputField"
                  value={ageGroup}
                  onChange={(event) => setAgeGroup(event.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45-54">45-54</option>
                  <option value="55-64">55-64</option>
                  <option value="65+">65+</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="gender">Gender (optional)</label>
                <select
                  id="gender"
                  className="inputLike inputField"
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Self-described">Self-described</option>
                </select>
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
