// src/app/api/public/places-photo/route.ts
// Secure Public Proxy for Google Places Photos
// Protects the server-side GOOGLE_PLACES_API_KEY while serving verified business photography.

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const maxWidthPx = searchParams.get("maxWidthPx") || "1200";
  const maxHeightPx = searchParams.get("maxHeightPx") || "800";

  if (!name || !name.startsWith("places/")) {
    return NextResponse.json(
      { error: "Invalid photo reference name. Expected 'places/{placeId}/photos/{photoId}'." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

  // If no API key is available or in development/test environment without credentials
  if (!apiKey || apiKey === "placeholder" || apiKey.includes("<") || apiKey.includes("your-api-key")) {
    // Return a sleek SVG fallback placeholder with clean cache headers
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidthPx}" height="${maxHeightPx}" viewBox="0 0 800 600" fill="#18181b">
      <rect width="800" height="600" fill="#18181b"/>
      <path d="M400 240c-33.137 0-60 26.863-60 60s26.863 60 60 60 60-26.863 60-60-26.863-60-60-60zm0 100c-22.091 0-40-17.909-40-40s17.909-40 40-40 40 17.909 40 40-17.909 40-40 40z" fill="#71717a"/>
      <text x="400" y="380" font-family="system-ui, sans-serif" font-size="16" fill="#a1a1aa" text-anchor="middle">Verified Business Photography</text>
    </svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  try {
    const googlePhotoUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}&key=${apiKey}&skipHttpRedirect=true`;

    const res = await fetch(googlePhotoUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google Places photo media request returned HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const photoUri = data.photoUri;

    if (!photoUri) {
      return NextResponse.json({ error: "No photoUri in Google Places response" }, { status: 502 });
    }

    // Redirect client directly to the high-speed CDN photo URI
    return NextResponse.redirect(photoUri, {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to resolve Google Places photo" },
      { status: 500 }
    );
  }
}
