"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";
import { routeForUser } from "@/lib/auth-routing";
import { changePassword, forgotPassword } from "@/lib/live-api";

export default function PartnerLoginPage() {
  const router = useRouter();
  const { login, token, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [changeCurrentPassword, setChangeCurrentPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [changeConfirmPassword, setChangeConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    setMessage(null);

    try {
      const signedIn = await login({ email, password });
      router.push(routeForUser(signedIn));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setForgotLoading(true);
      const response = await forgotPassword({
        email: forgotEmail,
      });
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Sign in first to change your password.");
      return;
    }

    setError(null);
    setMessage(null);

    if (changeNewPassword !== changeConfirmPassword) {
      setError("Change password confirmation does not match.");
      return;
    }

    try {
      setChangeLoading(true);
      const response = await changePassword(token, {
        current_password: changeCurrentPassword,
        new_password: changeNewPassword,
      });
      setMessage(response.message);
      setChangeCurrentPassword("");
      setChangeNewPassword("");
      setChangeConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to change password.");
    } finally {
      setChangeLoading(false);
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
          <form className="formPreview" onSubmit={handleForgotPassword} style={{ marginTop: 12 }}>
            <p className="miniLabel">Forgot password</p>
            <div className="field">
              <label htmlFor="forgotEmail">Account email</label>
              <input
                id="forgotEmail"
                type="email"
                required
                className="inputLike inputField"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
              />
            </div>
            <p className="subtle">We will email a secure reset link if this account exists.</p>
            <button type="submit" className="buttonGhost fullWidthButton" disabled={forgotLoading}>
              {forgotLoading ? "Sending..." : "Send reset link"}
            </button>
            <div className="ctaRow">
              <span className="subtle">Have a reset link already?</span>
              <Link href="/partner/reset-password" className="buttonGhost">Open reset page</Link>
            </div>
          </form>
          <form className="formPreview" onSubmit={handleChangePassword} style={{ marginTop: 12 }}>
            <p className="miniLabel">Change password (signed-in)</p>
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="changeCurrentPassword">Current password</label>
                <input
                  id="changeCurrentPassword"
                  type="password"
                  className="inputLike inputField"
                  value={changeCurrentPassword}
                  onChange={(event) => setChangeCurrentPassword(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="changeNewPassword">New password</label>
                <input
                  id="changeNewPassword"
                  type="password"
                  minLength={8}
                  className="inputLike inputField"
                  value={changeNewPassword}
                  onChange={(event) => setChangeNewPassword(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="changeConfirmPassword">Confirm new password</label>
              <input
                id="changeConfirmPassword"
                type="password"
                minLength={8}
                className="inputLike inputField"
                value={changeConfirmPassword}
                onChange={(event) => setChangeConfirmPassword(event.target.value)}
              />
            </div>
            <button type="submit" className="buttonGhost fullWidthButton" disabled={changeLoading}>
              {changeLoading ? "Updating..." : "Change password"}
            </button>
          </form>
          {message ? <div className="callout successCallout" style={{ marginTop: 10 }}>{message}</div> : null}
          <div className="ctaRow" style={{ marginTop: 10 }}>
            <span className="subtle">Need a new partner account?</span>
            <Link href="/partner/register" className="buttonGhost">Create account</Link>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
