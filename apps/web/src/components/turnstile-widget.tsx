"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTurnstileSiteKey } from "@/lib/config";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";

async function ensureScript() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.turnstile) {
    return;
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    await new Promise<void>((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Turnstile."));
    document.head.appendChild(script);
  });
}

export function TurnstileWidget({
  action,
  label,
  onToken,
}: {
  action: "request_quote" | "winery_confirm";
  label: string;
  onToken: (token?: string) => void;
}) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      onToken(undefined);
      return;
    }

    let mounted = true;

    void ensureScript()
      .then(() => {
        if (!mounted || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(undefined),
          "error-callback": () => setLoadError("Security check could not be loaded."),
        });
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Unable to load security check.");
      });

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [action, onToken, siteKey]);

  const helper = useMemo(() => {
    if (siteKey) {
      return label;
    }

    return "Turnstile is not configured yet. The flow still works while security is disabled in the API.";
  }, [label, siteKey]);

  return (
    <div className="turnstileBlock">
      <p className="miniLabel">Security check</p>
      <p className="subtle">{helper}</p>
      {siteKey ? <div ref={containerRef} className="turnstileMount" /> : <div className="turnstilePlaceholder">Turnstile ready when site key is added</div>}
      {loadError ? <p className="subtle">{loadError}</p> : null}
    </div>
  );
}
