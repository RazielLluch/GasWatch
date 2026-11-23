import { NextResponse } from "next/server";
import { getActiveStations } from "@/server/Stations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const radiusParam = searchParams.get("radius");

  try {
    if (city && city.length > 100) {
      return NextResponse.json(
        { error: "City name is too long" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const lat = latParam === null ? undefined : Number(latParam);
    const lng = lngParam === null ? undefined : Number(lngParam);
    const radiusKm = radiusParam === null ? 25 : Number(radiusParam);

    if (
      (latParam !== null &&
        (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lngParam !== null &&
        (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180)) ||
      (latParam === null) !== (lngParam === null) ||
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0 ||
      radiusKm > 100
    ) {
      return NextResponse.json(
        { error: "Provide valid lat and lng, and a radius between 1 and 100 km" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const stations = await getActiveStations({
      city: city || undefined,
      lat,
      lng,
      radiusKm,
    });

    return NextResponse.json(stations, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to load stations:", error);

    return NextResponse.json(
      { error: "Unable to load stations" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}