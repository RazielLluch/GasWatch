"use client";

import { useEffect, useRef, useState } from "react";
import type { MapPosition, MapStation } from "./map-types";

export function useNearbyStations(position: MapPosition | null) {
  const [stations, setStations] = useState<MapStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedPosition = useRef<MapPosition | null>(null);

  useEffect(() => {
    if (!position) return;
    const activePosition = position;
    if (
      lastFetchedPosition.current &&
      distanceKm(lastFetchedPosition.current, activePosition) < 1
    ) {
      return;
    }

    const controller = new AbortController();

    async function loadStations() {
      try {
        setLoading(true);
        setError(null);

        const [lat, lng] = activePosition;
        const response = await fetch(
          `/api/stations?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=25`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );

        if (!response.ok) {
          throw new Error(`Stations request failed with status ${response.status}`);
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("The stations response is not an array");
        }

        const validStations = data.filter(
          (station): station is MapStation =>
            typeof station === "object" &&
            station !== null &&
            typeof (station as MapStation).id === "string" &&
            typeof (station as MapStation).name === "string" &&
            ((station as MapStation).city === null ||
              typeof (station as MapStation).city === "string") &&
            typeof (station as MapStation).lat === "number" &&
            typeof (station as MapStation).lng === "number" &&
            Number.isFinite((station as MapStation).lat) &&
            Number.isFinite((station as MapStation).lng),
        );

        setStations(validStations);
        lastFetchedPosition.current = activePosition;
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError("Unable to load station markers");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadStations();
    return () => controller.abort();
  }, [position]);

  return { stations, loading, error };
}

function distanceKm(
  [lat1, lng1]: MapPosition,
  [lat2, lng2]: MapPosition,
): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
