"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { resetPassword } from "@/lib/live-api";

export default function PartnerResetPasswordPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawToken = params.get("token") ?? "";
    if (rawToken) {
      setToken(rawToken);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token.trim()) {
      setError("Reset token is required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await resetPassword({
        token: token.trim(),
        new_password: newPassword,
      });
      setMessage(response.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Partner access"
      title="Reset password"
      intro="Use your secure email link token to set a new password."
      showWorkflowStatus={false}
      navMode="partner"
    >
      <div className="actionPageShell">
        <SectionCard title="Secure reset" description="Paste the token from your email, then choose a new password.">
          <form className="formPreview" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="resetToken">Reset token</label>
              <input
                id="resetToken"
                required
                className="inputLike inputField"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  className="inputLike inputField"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  className="inputLike inputField"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>
            {error ? <div className="callout errorCallout">{error}</div> : null}
            {message ? <div className="callout successCallout">{message}</div> : null}
            <button type="submit" className="buttonPrimary fullWidthButton" disabled={loading}>
              {loading ? "Updating..." : "Set new password"}
            </button>
          </form>
          <div className="ctaRow" style={{ marginTop: 10 }}>
            <span className="subtle">Back to sign in</span>
            <Link href="/partner/login" className="buttonGhost">Partner login</Link>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
