"use client";

import { useEffect, useMemo, useState } from "react";
import { listWineries, type WineryListResponse } from "@/lib/live-api";
import { slugToWineryUuid } from "@/lib/winery-id";
import type { WineryCatalogItem } from "@/lib/winery-catalog";

export type RemoteWineryProfile = WineryListResponse["wineries"][number];

export function useRemoteWineryProfiles() {
  const [profilesById, setProfilesById] = useState<Record<string, RemoteWineryProfile>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await listWineries();
        if (!active) {
          return;
        }
        const next: Record<string, RemoteWineryProfile> = {};
        for (const winery of response.wineries) {
          next[winery.winery_id] = winery;
        }
        setProfilesById(next);
      } catch {
        if (active) {
          setProfilesById({});
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return { profilesById, loading };
}

export function useRemoteProfileForCatalogItem(
  winery: WineryCatalogItem,
  profilesById: Record<string, RemoteWineryProfile>,
) {
  return useMemo(() => {
    const uuid = slugToWineryUuid(winery.id);
    return profilesById[uuid];
  }, [profilesById, winery.id]);
}

export function experienceSummary(
  profile: RemoteWineryProfile | undefined,
  fallback: string,
) {
  if (!profile) {
    return fallback;
  }

  const parts: string[] = [];
  const offers = profile.unique_experience_offers ?? [];
  if (offers.length > 0) {
    parts.push(...offers.map((entry) => `${entry.name} ($${entry.price})`));
  }
  if (profile.offers_cheese_board) {
    parts.push("Cheese board");
  }
  if (parts.length === 0) {
    return fallback;
  }
  return parts.join(", ");
}
