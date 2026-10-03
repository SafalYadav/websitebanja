import assert from "node:assert/strict";
import { createJiti } from "jiti";
import path from "node:path";
const jiti = createJiti(import.meta.url, { alias: { "@": path.resolve("src") } });
const { GooglePlacesSource } = jiti("../src/lib/intelligence/grounding/sources/googlePlacesSource.ts");
const { GET } = jiti("../src/app/api/public/places-photo/route.ts");
const source = GooglePlacesSource.getInstance();
const originalFetch = globalThis.fetch;
const originalKey = process.env.GOOGLE_PLACES_API_KEY;
process.env.GOOGLE_PLACES_API_KEY = "test-only-key";
let calls = [];
let response;
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  return response;
};
try {
  response = new Response("{}", { status: 404 });
  assert.equal((await source.groundBusiness({ businessName: "Cafe", placeId: "exact" })).isAvailable, false);
  assert.equal(calls.length, 1, "An invalid Place ID must never trigger fuzzy search");
  response = Response.json({ id: "different", displayName: { text: "Wrong business" } });
  assert.equal((await source.groundBusiness({ businessName: "Cafe", placeId: "exact" })).isAvailable, false);
  response = Response.json({ id: "exact", displayName: { text: "Real Cafe" },
    addressComponents: [{ longText: "Jaipur", types: ["locality"] }],
    photos: [{ name: "places/exact/photos/photo", widthPx: 1200, heightPx: 800,
      authorAttributions: [{ displayName: "Actual Photographer" }] }],
    reviews: [{ rating: 3, text: { text: "Actual customer experience." },
      authorAttribution: { displayName: "Actual Reviewer", uri: "https://maps.google.com/reviewer" } }] });
  const actual = await source.groundBusiness({ businessName: "Cafe", placeId: "exact" });
  assert.equal(actual.city, "Jaipur");
  assert.equal(actual.photos.length, 1);
  assert.equal(actual.reviews[0].rating, 3);
  assert.equal(actual.diagnostics.photoStatus, "AVAILABLE");
  response = Response.json({ id: "exact", displayName: { text: "Real Cafe" } });
  const omitted = await source.groundBusiness({ businessName: "Cafe", placeId: "exact" });
  assert.equal(omitted.diagnostics.photoStatus, "OMITTED");
  assert.equal(omitted.diagnostics.reviewStatus, "OMITTED");
  assert.equal((await GET(new Request("https://test/api?name=places/a/photos/b&maxWidthPx=-1"))).status, 400);
  response = Response.json({ photoUri: "https://lh3.googleusercontent.com/photo" });
  const photo = await GET(new Request("https://test/api?name=places/a/photos/b"));
  assert.equal(photo.status, 307);
  assert.equal(photo.headers.get("cache-control"), "no-store");
  assert.ok(!calls.at(-1).url.includes("test-only-key"));
  assert.equal(calls.at(-1).options.headers["X-Goog-Api-Key"], "test-only-key");
  delete process.env.GOOGLE_PLACES_API_KEY;
  assert.equal((await GET(new Request("https://test/api?name=places/a/photos/b"))).status, 503);
  process.stdout.write("Google Places identity, real media, omission, and photo proxy regressions passed.\n");
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
  else process.env.GOOGLE_PLACES_API_KEY = originalKey;
}
