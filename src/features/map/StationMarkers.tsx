"use client";

import { useMemo } from "react";
import { divIcon } from "leaflet";
import { CircleMarker, Marker, Popup } from "react-leaflet";
import type { MapPosition, MapStation } from "./map-types";

export function StationMarkers({ stations }: { stations: MapStation[] }) {
  const stationIcon = useMemo(
    () =>
      divIcon({
        className: "",
        html: '<div class="station-marker" aria-hidden="true"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -26],
      }),
    [],
  );

  return (
    <>
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lng]}
          icon={stationIcon}
        >
          <Popup>
            <strong>{station.name}</strong>
            {station.address && (
              <>
                <br />
                {station.address}
              </>
            )}
            {station.city && (
              <>
                <br />
                {station.city}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function UserMarker({ position }: { position: MapPosition | null }) {
  if (!position) return null;

  return (
    <CircleMarker
      center={position}
      radius={7}
      pathOptions={{
        color: "#ffffff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }}
    >
      <Popup>Your location</Popup>
    </CircleMarker>
  );
}
