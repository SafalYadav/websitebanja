// src/app/api/public/places-photo/route.ts
// Secure Public Proxy for Google Places Photos
// Protects the server-side GOOGLE_PLACES_API_KEY while serving verified business photography.

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const maxWidthPx = searchParams.get("maxWidthPx") || "1200";
  const maxHeightPx = searchParams.get("maxHeightPx") || "800";

  if (!name || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name) ||
      ![maxWidthPx, maxHeightPx].every(value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 4800)) {
    return NextResponse.json(
      { error: "Invalid photo reference name. Expected 'places/{placeId}/photos/{photoId}'." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

  // If no API key is available or in development/test environment without credentials
  if (!apiKey || apiKey === "placeholder" || apiKey.includes("<") || apiKey.includes("your-api-key")) {
    return NextResponse.json({ error: "Google Places photography is not configured." }, { status: 503 });
  }

  try {
    const googlePhotoUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}&skipHttpRedirect=true`;

    const res = await fetch(googlePhotoUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google Places photo media request returned HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const photoUri = data.photoUri;

    if (typeof photoUri !== "string" || new URL(photoUri).protocol !== "https:") {
      return NextResponse.json({ error: "No photoUri in Google Places response" }, { status: 502 });
    }

    // Redirect client directly to the high-speed CDN photo URI
    return NextResponse.redirect(photoUri, {
      status: 307,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Google Places photo resolution failed or timed out" },
      { status: 500 }
    );
  }
}
