"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CustomerWineryCatalog } from "@/components/customer-winery-catalog";
import { loadExploreTourSummary, saveExploreTourSummary, type ExploreTourSummary } from "@/lib/explore-tour-summary";
import { useRemoteWineryProfiles } from "@/lib/remote-winery-profiles";
import { wineryCatalog } from "@/lib/winery-catalog";
import { slugToWineryUuid } from "@/lib/winery-id";
import { recommendItineraries } from "@/lib/live-api";

export default function CustomPage() {
  const router = useRouter();
  const [selectedWineries, setSelectedWineries] = useState<string[]>([]);
  const [summary, setSummary] = useState<ExploreTourSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profilesById } = useRemoteWineryProfiles();

  useEffect(() => {
    const existing = loadExploreTourSummary();
    setSummary(existing);
    if (!existing) {
      setSelectedWineries([]);
      return;
    }

    if (existing.matched_winery_ids.length > 0) {
      setSelectedWineries(existing.matched_winery_ids.slice(0, 10));
      return;
    }

    const reverseSlugMap = new Map(
      wineryCatalog.map((winery) => [slugToWineryUuid(winery.id), winery.id] as const),
    );
    const fromStops = existing.stops
      .map((stop) => reverseSlugMap.get(stop.winery_id))
      .filter((value): value is string => Boolean(value));
    setSelectedWineries(fromStops.slice(0, 10));
  }, []);

  const wineryNameBySlug = useMemo(
    () => new Map(wineryCatalog.map((winery) => [winery.id, winery.name] as const)),
    [],
  );

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

  async function saveAndReturnToSummary() {
    const latestSummary = summary ?? loadExploreTourSummary();
    if (!latestSummary) {
      router.push("/explore/summary");
      return;
    }
    if (selectedWineries.length === 0) {
      setError("Please keep at least one winery in the itinerary.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const preferredUuids = selectedWineries.map((slug) => slugToWineryUuid(slug));
      const recalc = await recommendItineraries({
        booking_date: latestSummary.preview_date,
        pickup_location: latestSummary.pickup_location,
        party_size: latestSummary.party_size,
        preferred_start_time: latestSummary.preferred_start_time,
        preferred_end_time: latestSummary.preferred_end_time,
        preferred_wineries: preferredUuids,
      });

      const chosen =
        [...recalc.itineraries].sort(
          (a, b) => Number(b.expert_pick) - Number(a.expert_pick) || b.score - a.score,
        )[0] ?? null;

      const uuidToSlug = new Map(wineryCatalog.map((winery) => [slugToWineryUuid(winery.id), winery.id] as const));

      if (chosen) {
        const nextSummary: ExploreTourSummary = {
          ...latestSummary,
          matched_winery_ids: chosen.stops
            .map((stop) => uuidToSlug.get(stop.winery_id))
            .filter((value): value is string => Boolean(value)),
          stops: chosen.stops.map((stop) => {
            const profile = profilesById[stop.winery_id];
            return {
              ...stop,
              tasting_price: profile?.tasting_price,
            };
          }),
          generated_at: new Date().toISOString(),
        };
        saveExploreTourSummary(nextSummary);
        router.push("/explore/summary");
        return;
      }

      const stopsById = new Map(latestSummary.stops.map((stop) => [stop.winery_id, stop]));
      const updatedStops = selectedWineries.map((slug) => {
        const wineryUuid = slugToWineryUuid(slug);
        const existingStop = stopsById.get(wineryUuid);
        if (existingStop) {
          const remoteProfile = profilesById[wineryUuid];
          return {
            ...existingStop,
            tasting_price: remoteProfile?.tasting_price ?? existingStop.tasting_price,
          };
        }

        const remoteProfile = profilesById[wineryUuid];
        return {
          winery_id: wineryUuid,
          winery_name: remoteProfile?.name ?? wineryNameBySlug.get(slug) ?? slug,
          arrival_time: "",
          departure_time: "",
          drive_minutes: 0,
          tasting_price: remoteProfile?.tasting_price,
        };
      });

      const fallbackSummary: ExploreTourSummary = {
        ...latestSummary,
        matched_winery_ids: selectedWineries,
        stops: updatedStops,
        generated_at: new Date().toISOString(),
      };
      saveExploreTourSummary(fallbackSummary);
      router.push("/explore/summary");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to recalculate itinerary right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      eyebrow="Custom"
      title="Customise your itinerary"
      intro="Adjust your selected wineries, drag to reorder, then save and return to summary."
      showWorkflowStatus={false}
      navMode="public"
    >
      <CustomerWineryCatalog
        selectedWineries={selectedWineries}
        onToggleWinery={toggleWinery}
        onRemoveWinery={removeWinery}
        onReorderWineries={reorderWineries}
        onContinue={saveAndReturnToSummary}
        onClearCart={() => setSelectedWineries([])}
        continueLabel={saving ? "Recalculating..." : "Save and return to summary"}
        continueDisabled={saving}
        mapTilePosition="top"
      />
      {error ? (
        <section className="sectionCard">
          <div className="callout errorCallout">{error}</div>
        </section>
      ) : null}
    </AppShell>
  );
}
