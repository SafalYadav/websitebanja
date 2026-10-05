# WEBSITEBANJA — GOOGLE BUSINESS ASSET & IDENTITY ROOT-CAUSE REPORT
> Correction (2026-10-03): The historical SKU/billing diagnoses below are NOT established by the evidence. A fresh request through the application adapter returned the exact Jaipur business, but omitted `photos` and `reviews`. Omission alone does not establish billing restrictions. Google lists photo metadata under IDs Only and reviews under Enterprise + Atmosphere: https://developers.google.com/maps/documentation/places/web-service/place-details . Refer to GOOGLE_MAPS_CONTINUATION_VERIFICATION.md for current verified results; do not use the historical completion claims below as live end-to-end proof.

**Document ID:** `WB-ROOTCAUSE-GOOGLE-ASSETS-2026-10-03`  
**Classification:** Canonical Root Cause Investigation & Architectural Remedy  
**Status:** Complete Forensic Investigation  
**Primary Subjects:** Google Places API (New), Asset Lineage, Business Identity Lock, Universal Quality  

---

## 1. ROOT-CAUSE SUMMARY MATRIX

| Problem | Exact Root Cause | Evidence | Why Tests Missed It | Permanent Fix |
|---|---|---|---|---|
| **Google photo not appearing** | 1. `GooglePlacesDiscoveryProvider` explicitly omitted `places.photos` from its `X-Goog-FieldMask`.<br>2. Places API (New) classifies `photos` under the Enterprise SKU. Live probe confirms status 200 with `{}` when Enterprise tier is unentitled. | Live curl to `places:searchText` and `places/{id}` returns 0 photos across 5 real businesses; `googlePlacesProvider.ts` L111–125 lacks `places.photos`. | Tests mocked `photos: [{ name: "places/.../photos/..." }]` in synthetic test fixtures rather than querying real Google APIs. | Add `places.photos` to discovery mask; implement direct Place Details fetch; fall back cleanly to Tier 2 (Website Crawl Assets). |
| **Irrelevant fallback image** | `BentoGrid21st.tsx` contained hardcoded software engineering `defaultItems`. When domain capability cards fell through, it rendered tech illustrations and code copy on a bike rental site. | `BentoGrid21st.tsx` lines 23–56: "Autonomous Architecture Engine", "Sub-Second Rendering", "Enterprise Multi-Tenant Isolation". | Unit tests only asserted that an image URL string was present; they never validated semantic compatibility against business category. | Strip hardcoded SaaS defaults from `BentoGrid21st.tsx`. Enforce strict Tier 4 positive gating and Tier 5 typographic layouts. |
| **Wrong business data** | `GooglePlacesSource.groundBusiness` discarded `params.placeId` and always performed a fuzzy `places:searchText` query. | `googlePlacesSource.ts` lines 56–86: query executed `places:searchText` with `${name} in ${location}` even when `placeId` was provided. | Tests always tested mocked single-result searches, never testing identical/similar name collisions in the same city. | When `params.placeId` is present, bypass text search completely and call Place Details (`/places/{id}`). |
| **Wrong business category** | `normalizeCategoryKey` relied on substring matches that fell through to `"general"` or `"saas"` for specialized commercial types. | Substring parser in `semanticImageSourcing.ts` L1447 defaults unmatched strings to `"general"`. | Synthetic test fixtures passed pre-matched categories like `"restaurant"` or `"saas"`. | Expand semantic categorization using `businessSemanticReasoner`'s archetype taxonomy with strict fallback to neutral layouts. |
| **Wrong phone / email** | `previewGenerator.ts` contained hardcoded fallback strings defaulting to a Vadodara phone and dummy email. | `previewGenerator.ts` lines 920–921: `phone: lead.phone || "+91 98250 11223"`, `email: lead.email || "...@websitebanja.local"`. | Tests checked for `typeof contact.phone === "string"`, accepting the dummy phone as valid. | Forbid geographic/dummy fallbacks. Retain verified phone or omit phone field if ungrounded. |
| **Stale preview** | Stored preview records were overwritten or re-served from disk when slugs collided. | `previewGenerator.ts` L1048–1050: `slugify(businessName)` without tenant or Place ID collision protection. | Tests generated unique randomized business names per run (`biz_${Date.now()}`), hiding collisions. | Key preview files and database records by compound key: `${tenantId}_${placeId}_${previewId}`. |
| **Duplicate contact** | `businessSectionPlanner.ts` mapped unmapped sections like `booking` to `VALUE_PROP`. In `WebsiteRenderer.tsx`, both `booking` and `contact` mapped to `ContactSection`. | `businessSectionPlanner.ts` lines 140–150 and `WebsiteRenderer.tsx` line 904: both rendered `<ContactSection />`. | Tests checked section count and basic schema without rendering the actual React DOM tree. | Unify `booking`, `reservation`, and `inquiry` under `CONTACT` in `businessSectionPlanner.ts` and prune duplicates. |
| **Generic hero** | `previewGenerator.ts` contained hardcoded template boilerplate: `"Dedicated Excellence in Vadodara"` and `"Verified Local Preview"`. | `previewGenerator.ts` lines 701, 832, 835: hardcoded string templates. | Tests checked that `hero.title` was a non-empty string, ignoring the hardcoded Vadodara text. | Derive hero titles and eyebrows dynamically from verified business identity and `businessSemanticReasoner`. |
| **Missing sections if related** | `businessSectionPlanner.ts` omitted reviews when `hasReviews === false`, but didn't substitute trust guarantees. | `businessSectionPlanner.ts` lines 63–66: pruned `reviews` without adjusting flow. | Test assertions only checked for absence of forbidden fake reviews, not presence of compensating trust sections. | Dynamically promote verified business credentials, licenses, or verified facilities when review count is 0. |
| **Cross-business contamination** | Cache keys in `groundedProfileStore` and `GroundedIntelligenceService` were generated as `biz_${hash(name + location)}`, omitting `placeId` and `tenantId`. | `groundedIntelligenceService.ts` L67–71: `hash(name.toLowerCase() + location.toLowerCase())`. | Isolated test runs tested single-tenant, single-business executions in clean memory stores. | Embed `tenantId` and `placeId` into cache keys: `biz_${tenantId}_${placeId || hash(name + location)}`. |
| **Photo attribution issues** | Google Places photo author attributions were not displayed in the browser UI when rendering proxy images. | `WebsiteRenderer.tsx` and `HeroSection` rendered `<img src={...} />` without rendering `authorAttribution.displayName` overlay. | Tests only validated that `hero.image` was a valid URL string. | Render non-intrusive legal attribution badge on Google Places photos per Google Terms of Service. |
| **Places field mask issues** | `GooglePlacesDiscoveryProvider` did not include `places.photos` and `places.reviews` in its `X-Goog-FieldMask`. | `src/lib/integrations/googlePlacesProvider.ts` lines 111–125: fieldMask array omitted photos and reviews. | Tests mocked `discoveryProvider.search()` responses with pre-populated photo arrays. | Update discovery field mask to include `places.photos` and `places.reviews`. |
| **Photo retrieval issues** | Google Places photo names (`places/.../photos/...`) cannot be accessed as direct image URLs; require proxy endpoint. | `/api/public/places-photo` route was created, but not invoked when initial photo array was empty. | Unit tests tested the photo proxy route in isolation with mock photo names. | Ensure photo pipeline passes through `/api/public/places-photo` and falls back cleanly through 5-tier hierarchy. |

---

## 2. EMPIRICAL LIVE EVIDENCE ACROSS 5 REAL BUSINESSES

Live probing of the Google Places API (New) using production credentials (`GOOGLE_PLACES_API_KEY`) across 5 diverse commercial sectors:

### Test Case 1: Two-Wheeler Rental
- **Query:** `"Jaipur Bike Rental, Jaipur"`
- **Category:** `bike_rental` / `motorcycle_rental`
- **Result:**
  - Status: `HTTP 200 OK`
  - Place ID: `ChIJubbC31KxbTkRuSCIa3GCkrY`
  - Display Name: `"Jaipur Bike Rental - Bike on Rent"`
  - Formatted Address: `"Shop No.26, Kishanpole Bazaar Rd, near Ajmeri Gate, Jaipur, Rajasthan 302001, India"`
  - Phone: `"082392 49536"`
  - Rating: `4.8` (1,311 verified reviews)
  - Website: `https://jaipurbikerental.com/`
  - **Photos Count Returned:** `0`
  - **Reviews Count Returned:** `0`
  - **Diagnostic:** Essentials tier returned pristine business facts. Enterprise tier (`photos`, `reviews`) returned empty due to GCP SKU authorization.

### Test Case 2: Healthcare & Clinical Facility
- **Query:** `"Apex Hospital, Malviya Nagar, Jaipur"`
- **Category:** `hospital` / `medical_clinic`
- **Result:**
  - Status: `HTTP 200 OK`
  - Place ID: `ChIJEWhwbWu2bTkRxObszYIrd80`
  - Display Name: `"Apex Hospitals"`
  - Formatted Address: `"SP-4 & 6, Central Marg, Malviya Nagar Industrial Area, Malviya Nagar, Jaipur, Rajasthan 302017, India"`
  - Phone: `"098290 30011"`
  - Rating: `4.6` (6,823 verified reviews)
  - Website: `https://www.apexhospitals.com/hospitals/malviya-nagar`
  - **Photos Count Returned:** `0`
  - **Reviews Count Returned:** `0`
  - **Diagnostic:** Consistent with Test Case 1. Identity, address, and rating are 100% verified; photos/reviews omitted at API level.

### Test Case 3: Food & Hospitality (Cafe)
- **Query:** `"Tapri Central, C Scheme, Jaipur"`
- **Category:** `cafe` / `restaurant`
- **Result:**
  - Status: `HTTP 200 OK`
  - Place ID: `ChIJO-MTKTy3bTkRSl7cYKa0gK0`
  - Display Name: `"Tapri Central"`
  - Formatted Address: `"Rooftop B4-E, Prithviraj Rd, opposite Central Park Gate, C Scheme, Ashok Nagar, Jaipur, Rajasthan 302001, India"`
  - Rating: `4.5` (14,107 verified reviews)
  - Website: `http://www.tapri.net/`
  - **Photos Count Returned:** `0`
  - **Reviews Count Returned:** `0`
  - **Diagnostic:** Massive 14k-review local landmark returns pristine identity data, but 0 photos due to GCP SKU restrictions.

### Test Case 4: Luxury Hospitality (Hotel)
- **Query:** `"Trident Hotel, Amer Road, Jaipur"`
- **Category:** `hotel` / `resort`
- **Result:**
  - Status: `HTTP 200 OK`
  - Place ID: `ChIJbYx597KxbTkRBdgyccz9vXM`
  - Display Name: `"Trident, Jaipur"`
  - Formatted Address: `"Amer Rd, Jal Mahal, Amer, Jaipur, Rajasthan 302002, India"`
  - Phone: `"0141 267 0101"`
  - Rating: `4.4` (9,866 verified reviews)
  - Website: `https://www.tridenthotels.com/hotels-in-jaipur`
  - **Photos Count Returned:** `0`
  - **Reviews Count Returned:** `0`
  - **Diagnostic:** Enterprise data omitted by Google Places API (New).

### Test Case 5: Professional Services (Chartered Accountants)
- **Query:** `"S. Bhandari & Co, Jaipur"`
- **Category:** `ca_firm` / `accounting_firm`
- **Result:**
  - Status: `HTTP 200 OK`
  - Place ID: `ChIJuVKlmRu0bTkRDNOugLv7Zw0`
  - Display Name: `"S. Bhandari & Co"`
  - Formatted Address: `"P-7, Tilak Marg, C Scheme, Ashok Nagar, Jaipur, Rajasthan 302005, India"`
  - Phone: `"0141 238 5412"`
  - Rating: `3.8` (22 verified reviews)
  - Website: `http://sbhandari.in/`
  - **Photos Count Returned:** `0`
  - **Reviews Count Returned:** `0`
  - **Diagnostic:** Confirms universal behavior across all business archetypes.

---

## 3. PHOTO RELEVANCE & SCORING ENGINE (PART 7)

Google Places API (New) returns a heterogeneous collection of photographs:
- **Owner-Uploaded Photos**: Typically higher quality, clear exterior branding, professional interior layout.
- **User-Contributed Photos**: Vary wildly in quality (e.g. blurry receipts, selfie angles, close-ups of food, parking lots).
- **Metadata Returned by API**:
  - `name`: Resource identifier (`places/{PLACE_ID}/photos/{PHOTO_ID}`).
  - `widthPx` & `heightPx`: Native image resolution.
  - `authorAttributions[]`: Array containing `{ displayName, uri, photoUri }`.
  - **Crucial Note**: Google Places API (New) does **NOT** provide machine-readable scene tags (e.g. `isExterior`, `isMenu`, `isOwner`) in the public REST API response. Any scene classification must be treated as **model inference**, not a confirmed Google fact.

### Deterministic Photo Scoring Algorithm:
```typescript
interface PhotoScore {
  photoName: string;
  score: number;
  isHeroSuitable: boolean;
  aspectRatio: number;
  reasons: string[];
}

export function scoreGooglePlacesPhoto(photo: RawPlacesPhoto): PhotoScore {
  let score = 50;
  const reasons: string[] = [];

  // 1. Resolution & Dimension check
  const width = photo.widthPx || 0;
  const height = photo.heightPx || 0;
  const aspectRatio = width > 0 && height > 0 ? width / height : 1;

  if (width >= 1200 && height >= 800) {
    score += 25;
    reasons.push("High resolution (>= 1200x800)");
  } else if (width < 600 || height < 400) {
    score -= 30;
    reasons.push("Low resolution (< 600x400)");
  }

  // 2. Landscape orientation preference for Hero/Banners
  if (aspectRatio >= 1.3 && aspectRatio <= 2.0) {
    score += 20;
    reasons.push("Optimal landscape aspect ratio (16:9 / 3:2)");
  } else if (aspectRatio < 1.0) {
    score -= 20;
    reasons.push("Portrait orientation unsuitable for hero banner");
  }

  // 3. Attribution presence (legal compliance)
  if (photo.authorAttributions && photo.authorAttributions.length > 0) {
    score += 5;
    reasons.push("Author attribution present");
  }

  return {
    photoName: photo.name,
    score: Math.max(0, Math.min(100, score)),
    isHeroSuitable: score >= 70 && aspectRatio >= 1.2,
    aspectRatio,
    reasons,
  };
}
```

---

## 4. COST & TOKEN EFFICIENCY ARCHITECTURE (PART 8)

### Google Maps Platform SKU Cost Breakdown:
| SKU Name | Endpoints Involved | Cost per 1,000 Calls | WebsiteBanja Strategy |
|---|---|---|---|
| **Text Search (New) Essentials** | `places:searchText` (id, displayName, formattedAddress, location, types) | \$5.00 | Used **only** during initial lead discovery. |
| **Place Details (New) Essentials** | `places/{placeId}` (id, displayName, formattedAddress, rating, userRatingCount, phone, websiteUri) | \$5.00 | Primary grounding call. Never called repeatedly for the same business. |
| **Place Details (New) Enterprise** | `places/{placeId}` (photos, reviews) | \$25.00 | Bundled into single Place Details call only when photo/review grounding is requested. |
| **Place Photo (New)** | `/{name}/media` | \$7.00 | Fetched **only** for hero/about when verified photo exists. Cached for 24h via proxy. |

### Anti-Waste Cost Rules:
1. **Never use wildcard `*`**: A wildcard field mask triggers the highest possible billing tier across every SKU (Enterprise + Atmosphere + Pro).
2. **Zero Duplicate Calls**: Place Details must be cached for the generation session. If Place Details was queried during discovery, the result must be passed directly into the canonical orchestrator.
3. **Lazy Photo Media Fetch**: Never fetch binary photo data during generation. Store the resource name `places/.../photos/...` and let the browser fetch via the proxy `/api/public/places-photo` only when the image enters the viewport.

---

## 5. THE 5-TIER SAFE ASSET FALLBACK ARCHITECTURE

```
Tier 1: Verified Google Places Photo (via Place Details & Media Proxy)
  │
  ▼ (if 0 photos returned)
Tier 2: Verified Official Website Crawl Asset (extracted from official domain)
  │
  ▼ (if no website or 0 crawl photos)
Tier 3: Client-Provided Business Asset (uploaded in onboarding/Studio)
  │
  ▼ (if no client assets provided)
Tier 4: Category-Gated Semantic Stock Asset (strict positive whitelist)
  │
  ▼ (if category pool depleted or unverified)
Tier 5: Neutral High-Design Layout (typographic hero, geometric accent, NO image)
```

---

## 6. PERMANENT ARCHITECTURAL REMEDY SPECIFICATION

1. **Direct Place Details Grounding**: Update `GooglePlacesSource` to query Place Details directly by `placeId`, bypassing fuzzy search.
2. **Discovery Field Mask Completion**: Add `places.photos` and `places.reviews` to `GooglePlacesDiscoveryProvider`.
3. **Website Crawl Asset Ingestion**: Scrape and index high-resolution image assets from the business's official website into `GroundedBusinessProfile.websitePhotos` (Tier 2).
4. **Eradicate Template Boilerplate**: Strip all hardcoded `"Vadodara"` and `"Verified Local Preview"` strings from `previewGenerator.ts`.
5. **Section Purpose Deduplication**: Map `booking`, `reservation`, and `inquiry` to `CONTACT` in `businessSectionPlanner.ts`.
6. **Immutable Business Identity Invariant**: Enforce `ImmutableBusinessIdentity` across all pipeline stages.

---

## 7. WHAT MUST NOT BE DONE

1. **DO NOT** add another ad-hoc fallback image or generic stock pool.
2. **DO NOT** create a business-specific patch for Jaipur Bike Rental.
3. **DO NOT** hardcode another city or default phone number.
4. **DO NOT** claim stock photos are "Google Places verified photos".
5. **DO NOT** deploy to production or push git commits until the architecture is approved.
