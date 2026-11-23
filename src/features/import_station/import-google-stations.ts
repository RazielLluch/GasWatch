/**
 * Import gas stations from Google Places API (New) into the GasWatch `stations` table (Drizzle).
 *
 * Usage:
 *   npx tsx scripts/import-google-stations.ts --region davao --dry-run
 *   npx tsx scripts/import-google-stations.ts --region ph
 *   npx tsx scripts/import-google-stations.ts --region ph --photos
 *
 * Env: GOOGLE_MAPS_API_KEY, DATABASE_URL
 * Deps: npm i postgres dotenv && npm i -D tsx
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray, sql } from "drizzle-orm";
import { brands, stations, stationPhotos } from "@/src/server/db/schema";

type Rect = { south: number; west: number; north: number; east: number };
type Found = {
  placeId: string; name: string; address: string | null;
  city: string | null; province: string | null;
  lat: number; lng: number; closed: boolean;
  photoRef: string | null; photoAttribution: string | null;
};

const REGIONS: Record<string, Rect> = {
  davao: { south: 6.9, west: 125.2, north: 7.4, east: 125.75 }, // small area for a first test
  ph: { south: 4.5, west: 116.9, north: 21.2, east: 126.7 },
  northern_mindanao: { south: 7.8, west: 123.5, north: 9.0, east: 125.3 },
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const WITH_PHOTOS = args.includes("--photos");
const REGION = args[args.indexOf("--region") + 1] ?? "davao";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
// Billing follows the most expensive field requested, so only ask for what you store.
const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.addressComponents",
  "places.location", "places.businessStatus",
  ...(WITH_PHOTOS ? ["places.photos"] : []),
  "nextPageToken",
].join(",");

const MAX_PER_QUERY = 60;   // Text Search: 3 pages x 20
const MIN_TILE_DEG = 0.005; // ~500 m; stop subdividing below this
const TILE_DEG = 1;

const client = postgres(process.env.DATABASE_URL!, { prepare: false }); // prepare:false for Supabase pooler
const db = drizzle(client, { casing: "snake_case" });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------- Google ---------- */

async function post(body: object, attempt = 0): Promise<any> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await sleep(1000 * 2 ** attempt);
    return post(body, attempt + 1);
  }
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  return res.json();
}

const component = (p: any, type: string): string | null =>
  p.addressComponents?.find((c: any) => c.types?.includes(type))?.longText ?? null;

function toFound(p: any): Found {
  const photo = p.photos?.[0];
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "Unknown station",
    address: p.formattedAddress ?? null,
    // Best effort: check these on a --dry-run, Philippine address components vary by area.
    city: component(p, "locality") ?? component(p, "administrative_area_level_2"),
    province: component(p, "administrative_area_level_2") ?? component(p, "administrative_area_level_1"),
    lat: p.location.latitude,
    lng: p.location.longitude,
    closed: p.businessStatus === "CLOSED_PERMANENTLY",
    photoRef: photo?.name ?? null,
    photoAttribution: photo?.authorAttributions?.[0]?.displayName ?? null,
  };
}

async function searchRect(r: Rect): Promise<Found[]> {
  const out: Found[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 3; page++) {
    const data = await post({
      textQuery: "gas station",
      includedType: "gas_station",
      strictTypeFiltering: true,
      regionCode: "PH",
      pageSize: 20,
      ...(pageToken && { pageToken }),
      locationRestriction: {
        rectangle: {
          low: { latitude: r.south, longitude: r.west },
          high: { latitude: r.north, longitude: r.east },
        },
      },
    });
    out.push(...(data.places ?? []).map(toFound));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await sleep(150);
  }
  return out;
}

/** A tile that returns the 60-result cap may be truncated, so split it into 4 and retry. */
async function crawl(r: Rect, found: Map<string, Found>): Promise<void> {
  const results = await searchRect(r);
  results.forEach((s) => found.set(s.placeId, s));

  const tooSmall = r.north - r.south <= MIN_TILE_DEG;
  if (results.length >= MAX_PER_QUERY && !tooSmall) {
    const midLat = (r.south + r.north) / 2, midLng = (r.west + r.east) / 2;
    for (const q of [
      { south: r.south, west: r.west, north: midLat, east: midLng },
      { south: r.south, west: midLng, north: midLat, east: r.east },
      { south: midLat, west: r.west, north: r.north, east: midLng },
      { south: midLat, west: midLng, north: r.north, east: r.east },
    ]) await crawl(q, found);
  } else if (results.length >= MAX_PER_QUERY) {
    console.warn(`Tile still saturated at max zoom: ${JSON.stringify(r)}`);
  }
}

/* ---------- Database ---------- */

async function loadBrandMatcher() {
  const rows = await db.select({ id: brands.id, name: brands.name }).from(brands);
  const matchers = rows
    .sort((a, b) => b.name.length - a.name.length) // prefer the longest brand name
    .map((b) => ({ id: b.id, re: new RegExp(`\\b${escapeRe(b.name)}\\b`, "i") }));
  return (stationName: string) => matchers.find((m) => m.re.test(stationName))?.id ?? null;
}

async function upsertBatch(batch: Found[], matchBrand: (n: string) => string | null) {
  const now = new Date().toISOString();
  await db
    .insert(stations)
    .values(
      batch.map((s) => ({
        name: s.name,
        address: s.address,
        city: s.city,
        province: s.province,
        brandId: matchBrand(s.name),
        location: sql`ST_SetSRID(ST_MakePoint(${s.lng}, ${s.lat}), 4326)::geography`,
        source: "google" as const,
        googlePlaceId: s.placeId,
        externalSyncedAt: now,
        status: s.closed ? ("closed" as const) : ("active" as const),
        activatedAt: s.closed ? null : now,
      })),
    )
    .onConflictDoUpdate({
      target: stations.googlePlaceId,
      set: {
        name: sql`excluded.name`,
        address: sql`excluded.address`,
        city: sql`excluded.city`,
        province: sql`excluded.province`,
        location: sql`excluded.location`,
        externalSyncedAt: sql`excluded.external_synced_at`,
        updatedAt: sql`now()`,
        // keep a brand a moderator set if Google's name doesn't match any brand
        brandId: sql`coalesce(excluded.brand_id, ${stations.brandId})`,
        // only ever auto-close; never re-activate something a moderator rejected or closed
        status: sql`case when excluded.status = 'closed' then 'closed'::station_status else ${stations.status} end`,
      },
    });
}

async function insertPhotos(batch: Found[]) {
  const withPhoto = batch.filter((s) => s.photoRef);
  if (!withPhoto.length) return;

  const idRows = await db
    .select({ id: stations.id, placeId: stations.googlePlaceId })
    .from(stations)
    .where(inArray(stations.googlePlaceId, withPhoto.map((s) => s.placeId)));
  const idByPlace = new Map(idRows.map((r) => [r.placeId!, r.id]));

  // station_photos has no unique key on (station, photo), so skip stations that already have a Google photo
  const existing = await db
    .select({ stationId: stationPhotos.stationId })
    .from(stationPhotos)
    .where(and(eq(stationPhotos.source, "google"), inArray(stationPhotos.stationId, [...idByPlace.values()])));
  const has = new Set(existing.map((e) => e.stationId));

  const rows = withPhoto
    .filter((s) => idByPlace.has(s.placeId) && !has.has(idByPlace.get(s.placeId)!))
    .map((s) => ({
      stationId: idByPlace.get(s.placeId)!,
      source: "google",
      googlePhotoReference: s.photoRef,
      attribution: s.photoAttribution,
    }));
  if (rows.length) await db.insert(stationPhotos).values(rows);
}

/* ---------- Main ---------- */

async function main() {
  const bounds = REGIONS[REGION];
  if (!bounds) throw new Error(`Unknown region "${REGION}". Options: ${Object.keys(REGIONS).join(", ")}`);

  const found = new Map<string, Found>();
  for (let lat = bounds.south; lat < bounds.north; lat += TILE_DEG) {
    for (let lng = bounds.west; lng < bounds.east; lng += TILE_DEG) {
      await crawl(
        {
          south: lat, west: lng,
          north: Math.min(lat + TILE_DEG, bounds.north),
          east: Math.min(lng + TILE_DEG, bounds.east),
        },
        found,
      );
      console.log(`tile ${lat.toFixed(1)},${lng.toFixed(1)} -> ${found.size} stations so far`);
    }
  }

  const all = [...found.values()];
  console.log(`Found ${all.length} (${all.filter((s) => s.closed).length} permanently closed)`);

  if (DRY_RUN) {
    console.table(all.slice(0, 20).map(({ photoRef, photoAttribution, ...rest }) => rest));
    return;
  }

  const matchBrand = await loadBrandMatcher();
  for (let i = 0; i < all.length; i += 200) {
    const batch = all.slice(i, i + 200);
    await upsertBatch(batch, matchBrand);
    if (WITH_PHOTOS) await insertPhotos(batch);
    console.log(`upserted ${Math.min(i + 200, all.length)}/${all.length}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => client.end());