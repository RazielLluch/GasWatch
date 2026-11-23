"use client";

import { useEffect, useState } from "react";
import type { MapPosition } from "./map-types";

export function useUserLocation() {
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      const timeoutId = window.setTimeout(() => {
        setError("Location services are unavailable in this browser");
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setError(null);
      },
      () => {
        setError("Allow location access to load nearby stations");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error };
}
