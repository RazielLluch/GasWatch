"use client";

import { useEffect } from "react";
import { latLngBounds } from "leaflet";
import { useMap } from "react-leaflet";
import type { MapPosition, MapStation } from "./map-types";

export function FitStations({ stations }: { stations: MapStation[] }) {
  const map = useMap();

  useEffect(() => {
    if (stations.length === 0) return;

    if (stations.length === 1) {
      map.setView([stations[0].lat, stations[0].lng], 15);
      return;
    }

    map.fitBounds(
      latLngBounds(stations.map((station) => [station.lat, station.lng])),
      { padding: [40, 40], maxZoom: 15 },
    );
  }, [map, stations]);

  return null;
}

export function FollowUser({ position }: { position: MapPosition | null }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
  }, [map, position]);

  return null;
}
