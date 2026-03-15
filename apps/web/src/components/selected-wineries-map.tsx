"use client";

import { useEffect, useMemo, useRef } from "react";
import type { WineryCatalogItem } from "@/lib/winery-catalog";

type SelectedWineriesMapProps = {
  wineries: WineryCatalogItem[];
};

export function SelectedWineriesMap({ wineries }: SelectedWineriesMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markerLayerRef = useRef<import("leaflet").LayerGroup | null>(null);

  const stableWineries = useMemo(
    () => wineries.map((entry) => ({ ...entry })),
    [wineries],
  );

  useEffect(() => {
    let active = true;

    async function hydrateMap() {
      if (!mapRef.current || mapInstanceRef.current) {
        return;
      }

      const L = await import("leaflet");
      if (!active || !mapRef.current) {
        return;
      }

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([-33.95, 115.07], 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const markerLayer = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      markerLayerRef.current = markerLayer;
    }

    void hydrateMap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    async function redrawPins() {
      const map = mapInstanceRef.current;
      const layer = markerLayerRef.current;
      if (!map || !layer) {
        return;
      }

      const L = await import("leaflet");
      layer.clearLayers();

      if (stableWineries.length === 0) {
        map.setView([-33.95, 115.07], 10);
        return;
      }

      const markers = stableWineries.map((winery) =>
        L.marker([winery.latitude, winery.longitude]).bindPopup(
          `<strong>${winery.name}</strong><br/>${winery.address}`,
        ),
      );

      markers.forEach((marker) => marker.addTo(layer));

      const bounds = L.featureGroup(markers).getBounds();
      map.fitBounds(bounds.pad(0.25), { maxZoom: 13 });
    }

    void redrawPins();
  }, [stableWineries]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  return <div ref={mapRef} className="selectedMapCanvas" />;
}

