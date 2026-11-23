import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import { stationsWithCoords } from "@/server/db/schema";

export type MapStation = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
};

export type StationFilter = {
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

export async function getActiveStations(
  filter: StationFilter = {},
): Promise<MapStation[]> {
  const rows = await db
    .select({
      id: stationsWithCoords.id,
      name: stationsWithCoords.name,
      address: stationsWithCoords.address,
      city: stationsWithCoords.city,
      lat: stationsWithCoords.lat,
      lng: stationsWithCoords.lng,
    })
    .from(stationsWithCoords)
    .where(
      filter.city
        ? and(
            eq(stationsWithCoords.status, "active"),
            ilike(stationsWithCoords.city, filter.city),
          )
        : eq(stationsWithCoords.status, "active"),
    );

  return rows
    .filter(
      (row): row is MapStation =>
        row.id !== null &&
        row.name !== null &&
        row.lat !== null &&
        row.lng !== null &&
        Number.isFinite(row.lat) &&
        Number.isFinite(row.lng),
    )
    .map((row) => ({
      ...row,
      lat: Number(row.lat),
      lng: Number(row.lng),
    }))
    .filter((row) => {
      if (filter.lat === undefined || filter.lng === undefined) {
        return true;
      }

      return haversineKm(
        filter.lat,
        filter.lng,
        row.lat,
        row.lng,
      ) <= (filter.radiusKm ?? 25);
    });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}