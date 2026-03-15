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

  const origin = wineries[0];
  const destination = wineries[wineries.length - 1];
  const waypoints = wineries.slice(1, -1);
  const waypointParam = waypoints
    .map((entry) => `${entry.name}, ${entry.address}`)
    .join("|");

  const base = new URL("https://www.google.com/maps/dir/");
  base.searchParams.set("api", "1");
  base.searchParams.set("origin", `${origin?.name ?? "Origin"}, ${origin?.address ?? "Margaret River"}`);
  base.searchParams.set("destination", `${destination?.name ?? "Destination"}, ${destination?.address ?? "Margaret River"}`);
  if (waypointParam) {
    base.searchParams.set("waypoints", waypointParam);
  }
  base.searchParams.set("travelmode", "driving");
  base.searchParams.set("output", "embed");
  return base.toString();
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
