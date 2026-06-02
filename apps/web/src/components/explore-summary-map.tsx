/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

export type ExploreSummaryMapStop = {
  winery_id: string;
  winery_name: string;
  address?: string;
  latitude: number;
  longitude: number;
};

type ExploreSummaryMapProps = {
  stops: ExploreSummaryMapStop[];
  pickupLocation?: string;
};

export function ExploreSummaryMap({ stops, pickupLocation }: ExploreSummaryMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstancesRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [mapError, setMapError] = useState("");

  const stableStops = useMemo(() => stops.map((entry) => ({ ...entry })), [stops]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  function buildInfoContent(stop: ExploreSummaryMapStop, order: number) {
    const safeName = stop.winery_name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeAddress = (stop.address ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const addressRow = safeAddress ? `<br/>${safeAddress}` : "";
    return `<strong>${order + 1}. ${safeName}</strong>${addressRow}`;
  }

  async function loadGoogleMaps() {
    if (typeof window === "undefined") {
      return null;
    }
    const anyWindow = window as Window & {
      google?: any;
      __tmGoogleMapsLoaderPromise?: Promise<any>;
      __tmGoogleMapsReady?: () => void;
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
            setMapError("Google Maps constructor unavailable.");
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
    let active = true;
    if (mapStatus !== "ready") {
      return () => {
        active = false;
      };
    }
    const google = googleRef.current;
    const map = mapInstanceRef.current;
    if (!map || !google?.maps) {
      return () => {
        active = false;
      };
    }

    async function geocodePickup() {
      const candidate = (pickupLocation ?? "").trim();
      if (!candidate || candidate.toLowerCase().includes("self-drive")) {
        return null;
      }
      let geocoder: any = null;
      try {
        geocoder = new google.maps.Geocoder();
      } catch {
        return null;
      }
      return new Promise<{ lat: number; lng: number } | null>((resolve) => {
        try {
          geocoder.geocode({ address: candidate }, (results: any[], status: string) => {
            if (!active || status !== "OK" || !results?.[0]?.geometry?.location) {
              resolve(null);
              return;
            }
            const location = results[0].geometry.location;
            resolve({ lat: location.lat(), lng: location.lng() });
          });
        } catch {
          resolve(null);
        }
      });
    }

    async function redraw() {
      const css = window.getComputedStyle(document.documentElement);
      const mapStrokeColor = css.getPropertyValue("--teal").trim() || "#2f7a74";
      const mapLabelColor = css.getPropertyValue("--paper").trim() || "#ffffff";

      for (const marker of markerInstancesRef.current) {
        marker.setMap(null);
      }
      markerInstancesRef.current = [];
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }

      let pickupPoint: { lat: number; lng: number } | null = null;
      try {
        pickupPoint = await geocodePickup();
      } catch {
        pickupPoint = null;
      }
      if (!active) {
        return;
      }

      if (stableStops.length === 0 && !pickupPoint) {
        map.setCenter({ lat: -33.95, lng: 115.07 });
        map.setZoom(10);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      const markers: any[] = [];
      const routePath: Array<{ lat: number; lng: number }> = [];

      if (pickupPoint) {
        const pickupMarker = new google.maps.Marker({
          map,
          position: pickupPoint,
          title: "Start location",
          icon: {
            url: "https://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png",
            scaledSize: new google.maps.Size(30, 30),
          },
          zIndex: 1100,
        });
        pickupMarker.addListener("click", () => {
          if (!infoWindowRef.current) {
            return;
          }
          infoWindowRef.current.setContent("<strong>Start location</strong>");
          infoWindowRef.current.open({ anchor: pickupMarker, map });
        });
        markers.push(pickupMarker);
        bounds.extend(pickupPoint);
        routePath.push(pickupPoint);
      }

      for (const [index, stop] of stableStops.entries()) {
        const point = { lat: stop.latitude, lng: stop.longitude };
        const marker = new google.maps.Marker({
          map,
          position: point,
          title: stop.winery_name,
          label: {
            text: String(index + 1),
            color: mapLabelColor,
            fontSize: "12px",
            fontWeight: "700",
          },
        });
        marker.addListener("click", () => {
          if (!infoWindowRef.current) {
            return;
          }
          infoWindowRef.current.setContent(buildInfoContent(stop, index));
          infoWindowRef.current.open({ anchor: marker, map });
        });
        markers.push(marker);
        bounds.extend(point);
        routePath.push(point);
      }

      markerInstancesRef.current = markers;

      if (routePath.length > 1) {
        try {
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
              strokeColor: mapStrokeColor,
              strokeOpacity: 0.82,
              strokeWeight: 4,
            },
          });

          const origin = routePath[0];
          const destination = routePath[routePath.length - 1];
          const waypoints =
            routePath.length > 2
              ? routePath.slice(1, -1).map((point) => ({ location: point, stopover: true }))
              : [];

          const directions = await directionsService.route({
            origin,
            destination,
            waypoints,
            optimizeWaypoints: false,
            travelMode: google.maps.TravelMode.DRIVING,
          });
          if (active) {
            directionsRenderer.setDirections(directions);
            directionsRendererRef.current = directionsRenderer;
          }
        } catch {
          routePolylineRef.current = new google.maps.Polyline({
            map,
            path: routePath,
            geodesic: true,
            strokeColor: mapStrokeColor,
            strokeOpacity: 0.75,
            strokeWeight: 3,
          });
        }
      }

      map.fitBounds(bounds, 70);
      const zoom = map.getZoom();
      if (zoom && zoom > 13) {
        map.setZoom(13);
      }
    }

    void redraw();
    return () => {
      active = false;
    };
  }, [mapStatus, pickupLocation, stableStops]);

  useEffect(() => {
    return () => {
      for (const marker of markerInstancesRef.current) {
        marker.setMap(null);
      }
      markerInstancesRef.current = [];
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      mapInstanceRef.current = null;
      googleRef.current = null;
    };
  }, []);

  return (
    <div className="summaryMapCanvas mapCanvasRoot">
      <div ref={mapRef} className="mapCanvasInner360" />
      {!apiKey || (mapStatus === "loading" || mapStatus === "idle") ? (
        <div className="summaryMapOverlay">
          {apiKey ? "Loading map and route..." : "Map unavailable: Google Maps API key is not configured."}
        </div>
      ) : null}
      {mapStatus === "error" && apiKey ? (
        <div className="summaryMapOverlay summaryMapOverlayError">Map unavailable: {mapError || "Google Maps failed to load."}</div>
      ) : null}
    </div>
  );
}
