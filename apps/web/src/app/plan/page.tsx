"use client";

import { startTransition, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CustomerWineryCatalog } from "@/components/customer-winery-catalog";
import { LiveBookingFlow } from "@/components/live-booking-flow";
import { loadExplorePreferences } from "@/lib/explore-preferences";
import { loadExploreTourSummary } from "@/lib/explore-tour-summary";

export default function PlanPage() {
  const [selectedWineries, setSelectedWineries] = useState<string[]>([]);
  const [stage, setStage] = useState<"catalog" | "schedule">("catalog");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cameFromFlow = false;
    if (document.referrer) {
      try {
        const referrerPath = new URL(document.referrer).pathname;
        cameFromFlow =
          referrerPath.startsWith("/explore") ||
          referrerPath.startsWith("/customer") ||
          referrerPath.startsWith("/plan");
      } catch {
        cameFromFlow = false;
      }
    }

    const query = new URLSearchParams(window.location.search);
    const forcePrefill = query.get("prefill") === "1";
    if (!cameFromFlow && !forcePrefill) {
      startTransition(() => {
        setSelectedWineries([]);
      });
      return;
    }

    const summary = loadExploreTourSummary();
    if (summary?.matched_winery_ids?.length) {
      startTransition(() => {
        setSelectedWineries(summary.matched_winery_ids.slice(0, 6));
      });
      return;
    }

    const saved = loadExplorePreferences();
    startTransition(() => {
      setSelectedWineries((saved?.matchedWineryIds ?? []).slice(0, 6));
    });
  }, []);

  function toggleWinery(wineryId: string) {
    setSelectedWineries((current) => {
      if (current.includes(wineryId)) {
        return current.filter((entry) => entry !== wineryId);
      }
      return [...current, wineryId];
    });
  }

  function removeWinery(wineryId: string) {
    setSelectedWineries((current) => current.filter((entry) => entry !== wineryId));
  }

  function reorderWineries(draggedWineryId: string, targetWineryId: string) {
    setSelectedWineries((current) => {
      const fromIndex = current.indexOf(draggedWineryId);
      const toIndex = current.indexOf(targetWineryId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) {
        return current;
      }
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  return (
    <AppShell
      eyebrow="Plan"
      title="Plan your Margaret River winery day"
      intro="Discover wineries in the catalogue, add your favourites to schedule cart, then generate a tailored day plan."
      showWorkflowStatus={false}
    >
      {stage === "catalog" ? (
        <CustomerWineryCatalog
          selectedWineries={selectedWineries}
          onToggleWinery={toggleWinery}
          onRemoveWinery={removeWinery}
          onReorderWineries={reorderWineries}
          onContinue={() => setStage("schedule")}
          onClearCart={() => setSelectedWineries([])}
        />
      ) : (
        <LiveBookingFlow
          selectedWineries={selectedWineries}
          onSelectedWineriesChange={setSelectedWineries}
          onOpenCatalog={() => setStage("catalog")}
        />
      )}
    </AppShell>
  );
}
