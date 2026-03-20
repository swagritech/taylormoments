"use client";

import { useEffect, useMemo, useRef } from "react";
import type { WineryCatalogItem } from "@/lib/winery-catalog";

type SelectedWineriesMapProps = {
  wineries: WineryCatalogItem[];
};

export function SelectedWineriesMap({ wineries }: SelectedWineriesMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstancesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const stableWineries = useMemo(
    () => wineries.map((entry) => ({ ...entry })),
    [wineries],
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  function buildInfoContent(winery: WineryCatalogItem) {
    const safeName = winery.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeAddress = winery.address.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<strong>${safeName}</strong><br/>${safeAddress}`;
  }

  async function loadGoogleMaps() {
    if (typeof window === "undefined") {
      return null;
    }
    const anyWindow = window as Window & { google?: any; __tmGoogleMapsLoaderPromise?: Promise<any> };
    if (anyWindow.google?.maps) {
      return anyWindow.google;
    }
    if (!apiKey) {
      return null;
    }

    if (!anyWindow.__tmGoogleMapsLoaderPromise) {
      anyWindow.__tmGoogleMapsLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (anyWindow.google?.maps) {
            resolve(anyWindow.google);
            return;
          }
          reject(new Error("Google Maps API loaded without maps namespace."));
        };
        script.onerror = () => reject(new Error("Failed to load Google Maps API."));
        document.head.appendChild(script);
      });
    }
    return anyWindow.__tmGoogleMapsLoaderPromise ?? null;
  }

  useEffect(() => {
    let active = true;

    async function hydrateMap() {
      if (!mapRef.current || mapInstanceRef.current) {
        return;
      }

      const google = await loadGoogleMaps();
      if (!active || !mapRef.current || !google?.maps) {
        return;
      }

      googleRef.current = google;
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: -33.95, lng: 115.07 },
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    void hydrateMap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function redrawPins() {
      const google = googleRef.current;
      const map = mapInstanceRef.current;
      if (!map || !google?.maps) {
        return;
      }

      for (const marker of markerInstancesRef.current) {
        marker.setMap(null);
      }
      markerInstancesRef.current = [];

      if (stableWineries.length === 0) {
        map.setCenter({ lat: -33.95, lng: 115.07 });
        map.setZoom(10);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      const markers = stableWineries.map((winery) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: winery.latitude, lng: winery.longitude },
          title: winery.name,
        });
        marker.addListener("click", () => {
          if (!infoWindowRef.current) {
            return;
          }
          infoWindowRef.current.setContent(buildInfoContent(winery));
          infoWindowRef.current.open({ anchor: marker, map });
        });
        bounds.extend({ lat: winery.latitude, lng: winery.longitude });
        return marker;
      });

      markerInstancesRef.current = markers;
      map.fitBounds(bounds, 80);
      const zoom = map.getZoom();
      if (zoom && zoom > 13) {
        map.setZoom(13);
      }
    }

    redrawPins();
  }, [stableWineries]);

  useEffect(() => {
    return () => {
      for (const marker of markerInstancesRef.current) {
        marker.setMap(null);
      }
      markerInstancesRef.current = [];
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      mapInstanceRef.current = null;
      googleRef.current = null;
    };
  }, []);

  if (!apiKey) {
    return <div className="selectedMapCanvas">Google Maps unavailable: API key not configured.</div>;
  }

  return <div ref={mapRef} className="selectedMapCanvas" />;
}
