"use client";

import {MapContainer, TileLayer} from "react-leaflet";

export default function LeafletMap() {
  return (
    <MapContainer
      center={[8.2289, 124.2434]}
      zoom={14}
      className="absolute inset-0 z-0"
    >
      <TileLayer
        url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

    </MapContainer>
  );
}

