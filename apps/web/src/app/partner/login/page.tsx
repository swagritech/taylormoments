"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth-state";
import { routeForUser } from "@/lib/auth-routing";
import { forgotPassword } from "@/lib/live-api";

export default function PartnerLoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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

  return (
    <AuthShell
      tag="Partner access"
      kicker="Partner access"
      title="Partner login"
      intro="Sign in as cellar door, transport, or ops."
    >
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
          <div className="ctaRow ctaRowAlignCenter ctaRowMt12">
            <button
              type="button"
              className="inlineLinkButton"
              onClick={() => setShowForgotPassword((current) => !current)}
            >
              Forgot Password?
            </button>
          </div>
          {showForgotPassword ? (
            <form className="formPreview formMt8" onSubmit={handleForgotPassword}>
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
          ) : null}
          {message ? <div className="callout successCallout calloutMt10">{message}</div> : null}
          <div className="ctaRow ctaRowMt10">
            <span className="subtle">Need a new partner account?</span>
            <Link href="/partner/register" className="buttonGhost">Create account</Link>
          </div>
    </AuthShell>
  );
}
