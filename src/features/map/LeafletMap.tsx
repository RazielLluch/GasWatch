"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import { FitStations, FollowUser } from "./MapEffects";
import { StationMarkers, UserMarker } from "./StationMarkers";
import { useNearbyStations } from "./useNearbyStations";
import { useUserLocation } from "./useUserLocation";

export default function LeafletMap() {
  const { position: userPosition, error: locationError } = useUserLocation();
  const {
    stations,
    loading,
    error: stationsError,
  } = useNearbyStations(userPosition);
  const error = locationError ?? stationsError;

  return (
    <>
      {loading && (
        <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-md bg-background px-3 py-2 text-sm shadow-md">
          Loading stations...
        </div>
      )}
      {error && (
        <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground shadow-md">
          {error}
        </div>
      )}

      <MapContainer
        center={userPosition ?? [8.2289, 124.2434]}
        zoom={13}
        className="absolute inset-0 z-0"
      >
        <TileLayer
          url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <FitStations stations={stations} />
        <FollowUser position={userPosition} />
        <UserMarker position={userPosition} />
        <StationMarkers stations={stations} />
      </MapContainer>
    </>
  );
}
