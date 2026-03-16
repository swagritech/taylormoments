"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CustomerWineryCatalog } from "@/components/customer-winery-catalog";
import { LiveBookingFlow } from "@/components/live-booking-flow";
import { loadExplorePreferences } from "@/lib/explore-preferences";

export default function CustomerPage() {
  const [selectedWineries, setSelectedWineries] = useState<string[]>(() => {
    const saved = loadExplorePreferences();
    return (saved?.matchedWineryIds ?? []).slice(0, 6);
  });
  const [stage, setStage] = useState<"catalog" | "schedule">("catalog");

  function toggleWinery(wineryId: string) {
    setSelectedWineries((current) => {
      if (current.includes(wineryId)) {
        return current.filter((entry) => entry !== wineryId);
      }
      return [...current, wineryId];
    });
  }

  return (
    <AppShell
      eyebrow="Customer booking"
      title="Plan your Margaret River winery day"
      intro="Discover wineries in the catalog, add your favourites to schedule cart, then generate a tailored day plan."
      showWorkflowStatus={false}
    >
      {stage === "catalog" ? (
        <CustomerWineryCatalog
          selectedWineries={selectedWineries}
          onToggleWinery={toggleWinery}
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

