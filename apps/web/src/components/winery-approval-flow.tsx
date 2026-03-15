"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { approveWineryToken } from "@/lib/live-api";

export function WineryApprovalFlow() {
  const searchParams = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [tokenId, setTokenId] = useState(initialToken);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; booking_id: string; token_id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (!tokenId.trim()) {
      setError("Approval token is missing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await approveWineryToken(tokenId.trim(), turnstileToken);
      setResult(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to confirm this booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="actionPageShell">
      <SectionCard
        title="Approve this winery booking"
        description="One tap should be enough for a partner to confirm the proposed visit."
      >
        <div className="actionCardStack">
          <div className="callout">
            <p className="miniLabel">Partner action</p>
            <p>
              Confirm the requested winery stop for this booking. No login is required and the token expires automatically for security.
            </p>
          </div>

          <div className="field">
            <label htmlFor="tokenId">Approval token</label>
            <input id="tokenId" className="inputLike inputField" value={tokenId} onChange={(event) => setTokenId(event.target.value)} placeholder="Paste or open a link containing the token" />
          </div>

          <TurnstileWidget
            action="winery_confirm"
            label="This protects winery approvals from abuse once the Cloudflare site key is configured."
            onToken={setTurnstileToken}
          />

          <button type="button" className="buttonPrimary fullWidthButton" onClick={handleApprove} disabled={submitting}>
            {submitting ? "Confirming..." : "Approve booking"}
          </button>

          {result ? (
            <div className="callout successCallout">
              <strong>Booking confirmed.</strong> Reference <strong>{result.booking_id}</strong> is now marked as confirmed in Tailor Moments.
            </div>
          ) : null}

          {error ? <div className="callout errorCallout">{error}</div> : null}

          <div className="partnerFooterNote">
            <p className="subtle">
              Need to review the booking with your team first? Contact Tailor Moments before the token expires.
            </p>
            <Link href="/" className="buttonGhost">Return to Tailor Moments</Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
