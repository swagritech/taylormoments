"use client";

import { useMemo } from "react";
import type { WineryCatalogItem } from "@/lib/winery-catalog";

type SelectedWineriesMapProps = {
  wineries: WineryCatalogItem[];
};

function mapEmbedUrl(wineries: WineryCatalogItem[]) {
  if (wineries.length === 0) {
    return "https://www.google.com/maps?q=Margaret+River,+Western+Australia&output=embed";
  }

  if (wineries.length === 1) {
    const only = wineries[0];
    return `https://www.google.com/maps?q=${encodeURIComponent(`${only?.name ?? "Winery"}, ${only?.address ?? "Margaret River"}`)}&output=embed`;
  }

  const markerQuery = wineries
    .map((entry) => `loc:${entry.latitude},${entry.longitude}`)
    .join("|");

  const centerLat =
    wineries.reduce((sum, entry) => sum + entry.latitude, 0) / wineries.length;
  const centerLon =
    wineries.reduce((sum, entry) => sum + entry.longitude, 0) / wineries.length;

  return `https://www.google.com/maps?q=${encodeURIComponent(markerQuery)}&ll=${centerLat},${centerLon}&z=10&output=embed`;
}

export function SelectedWineriesMap({ wineries }: SelectedWineriesMapProps) {
  const src = useMemo(() => mapEmbedUrl(wineries), [wineries]);

  return (
    <iframe
      className="selectedMapCanvas"
      title="Selected winery pins map"
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
