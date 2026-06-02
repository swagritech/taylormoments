/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
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
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [mapError, setMapError] = useState<string>("");

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
    const anyWindow = window as Window & {
      google?: any;
      __tmGoogleMapsLoaderPromise?: Promise<any>;
      __tmGoogleMapsReady?: () => void;
      __tmGoogleMapsError?: (error: Error) => void;
    };
    if (anyWindow.google?.maps) {
      return anyWindow.google;
    }
    if (!apiKey) {
      return null;
    }

    if (!anyWindow.__tmGoogleMapsLoaderPromise) {
      anyWindow.__tmGoogleMapsLoaderPromise = new Promise((resolve, reject) => {
        anyWindow.__tmGoogleMapsReady = () => {
          if (anyWindow.google?.maps) {
            resolve(anyWindow.google);
            return;
          }
          reject(new Error("Google Maps script loaded but maps namespace is unavailable."));
        };
        anyWindow.__tmGoogleMapsError = (error: Error) => reject(error);

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=__tmGoogleMapsReady`;
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error("Failed to load Google Maps API script."));
        document.head.appendChild(script);
      });
    }
    return anyWindow.__tmGoogleMapsLoaderPromise ?? null;
  }

  useEffect(() => {
    let active = true;
    if (!apiKey) {
      return () => {
        active = false;
      };
    }

    async function hydrateMap() {
      if (!mapRef.current || mapInstanceRef.current) {
        return;
      }
      startTransition(() => {
        setMapStatus("loading");
      });

      try {
        const anyWindow = window as Window & { gm_authFailure?: () => void };
        anyWindow.gm_authFailure = () => {
          if (!active) {
            return;
          }
          startTransition(() => {
            setMapStatus("error");
            setMapError("Google Maps authentication failed. Check API key restrictions and enabled APIs.");
          });
        };

        const google = await loadGoogleMaps();
        if (!active || !mapRef.current || !google?.maps) {
          startTransition(() => {
            setMapStatus("error");
            setMapError("Google Maps failed to initialise.");
          });
          return;
        }
        const MapConstructor = google.maps.Map;
        if (typeof MapConstructor !== "function") {
          startTransition(() => {
            setMapStatus("error");
            setMapError(
              "Google Maps constructor missing. Ensure Maps JavaScript API is enabled and referrer allows booking.swagritech.com.au.",
            );
          });
          return;
        }

        googleRef.current = google;
        mapInstanceRef.current = new MapConstructor(mapRef.current, {
          center: { lat: -33.95, lng: 115.07 },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        startTransition(() => {
          setMapStatus("ready");
        });
      } catch (error) {
        if (!active) {
          return;
        }
        startTransition(() => {
          setMapStatus("error");
          setMapError(error instanceof Error ? error.message : "Google Maps failed to load.");
        });
      }
    }

    void hydrateMap();
    return () => {
      active = false;
    };
  }, [apiKey]);

  useEffect(() => {
    if (mapStatus !== "ready") {
      return;
    }
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

      const BoundsConstructor = google.maps.LatLngBounds;
      if (!BoundsConstructor) {
        return;
      }
      const bounds = new BoundsConstructor();
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
  }, [mapStatus, stableWineries]);

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

  return (
    <div className="selectedMapCanvas mapCanvasRoot">
      <div ref={mapRef} className="mapCanvasInner320" />
      {!apiKey || (mapStatus === "loading" || mapStatus === "idle") ? (
        <div className="summaryMapOverlay">
          {apiKey ? "Loading Google Map..." : "Map unavailable: Google Maps API key is not configured."}
        </div>
      ) : null}
      {mapStatus === "error" && apiKey && (
        <div className="summaryMapOverlay summaryMapOverlayError">
          Map unavailable: {mapError || "Google Maps failed to load."}
        </div>
      )}
    </div>
  );
}
