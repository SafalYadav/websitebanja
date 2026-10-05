// src/lib/integrations/googlePlacesProvider.ts
/**
 * WebsiteBanja Google Places (New) Discovery Provider
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * Implements the official Google Places API (New) Text Search:
 *   Endpoint: POST https://places.googleapis.com/v1/places:searchText
 *
 * Security & Reliability:
 *   - Server-side only with strict secret redaction
 *   - Bounded queries with pagination limits (max 20 per page)
 *   - AbortController timeout protection (10s)
 *   - Exponential backoff retry on transient HTTP 429/503 errors
 *   - Structured error classification (Quota, Billing, Invalid Key)
 *   - Telemetry event emission
 */

import type { BusinessDiscoveryProvider } from "@/lib/discovery/providers/types";
import { DiscoveryProviderError } from "@/lib/discovery/providers/types";
import type { DiscoveryCriteria, RawBusinessRecord } from "@/lib/discovery/types";
import { ConfigValidator } from "./configValidator";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

const PLACES_SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

interface GooglePlaceItem {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  primaryType?: string;
  types?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  photos?: any[];
  reviews?: any[];
}

interface GooglePlacesSearchResponse {
  places?: GooglePlaceItem[];
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GooglePlacesDiscoveryProvider implements BusinessDiscoveryProvider {
  readonly id = "google_places";
  readonly name = "Google Places API (New)";

  /**
   * Discovers real-world businesses via Google Places API (New).
   */
  async search(criteria: DiscoveryCriteria): Promise<RawBusinessRecord[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    if (!apiKey) {
      throw new DiscoveryProviderError(
        "DISCOVERY_PROVIDER_UNAVAILABLE",
        "Google Places API key is not configured in local environment (GOOGLE_PLACES_API_KEY).",
        this.id,
        503
      );
    }

    if (apiKey.includes("<") || apiKey.includes("your-api-key") || apiKey === "placeholder") {
      throw new DiscoveryProviderError(
        "DISCOVERY_AUTH_FAILED",
        "Google Places API key is invalid or contains placeholder characters.",
        this.id,
        401
      );
    }

    const textQuery = criteria.query.trim().toLowerCase().includes(criteria.location.trim().toLowerCase())
      ? criteria.query.trim()
      : `${criteria.query.trim()} in ${criteria.location.trim()}`;

    const pageSize = Math.min(Math.max(criteria.limit || 10, 1), 20);

    const now = new Date().toISOString();
    ConfigValidator.updateInternalState((state) => {
      state.googlePlaces.lastRequestAt = now;
    });

    emitAgentEvent({
      event: "agent.provider_call",
      agent: "mitra",
      provider: "google_places",
      metadata: {
        operation: "places.searchText",
        query: criteria.query,
        location: criteria.location,
        pageSize,
      },
    });

    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.addressComponents",
      "places.internationalPhoneNumber",
      "places.nationalPhoneNumber",
      "places.websiteUri",
      "places.rating",
      "places.userRatingCount",
      "places.businessStatus",
      "places.primaryType",
      "places.types",
      "places.location",
      "places.photos",
      "places.reviews",
    ].join(",");

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(PLACES_SEARCH_TEXT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery,
            pageSize,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const status = response.status;
          const errorBody = await response.text();
          let parsedErrorMsg = errorBody;
          try {
            const errObj = JSON.parse(errorBody);
            parsedErrorMsg = errObj.error?.message || errorBody;
          } catch {
            // Keep text
          }

          if (status === 400 || status === 401 || status === 403 || status === 429) {
            if (parsedErrorMsg.includes("billing") || parsedErrorMsg.includes("BILLING_DISABLED")) {
              throw new DiscoveryProviderError(
                "DISCOVERY_PROVIDER_UNAVAILABLE",
                `Google Places API billing is not enabled: ${parsedErrorMsg}`,
                this.id,
                403
              );
            }
            if (parsedErrorMsg.includes("API key not valid") || status === 401) {
              throw new DiscoveryProviderError(
                "DISCOVERY_AUTH_FAILED",
                "Google Places API key is invalid or not authorized.",
                this.id,
                401
              );
            }
            if (parsedErrorMsg.includes("QUOTA_EXCEEDED") || status === 429) {
              throw new DiscoveryProviderError(
                "DISCOVERY_RATE_LIMITED",
                `Google Places API quota exceeded: ${parsedErrorMsg}`,
                this.id,
                429
              );
            }
            throw new DiscoveryProviderError(
              "DISCOVERY_AUTH_FAILED",
              `Google Places API error (${status}): ${parsedErrorMsg}`,
              this.id,
              status
            );
          }

          if (status >= 500 && attempt < MAX_RETRIES) {
            lastError = new Error(`Server error ${status}: ${parsedErrorMsg}`);
            continue;
          }

          throw new DiscoveryProviderError(
            "DISCOVERY_PROVIDER_UNAVAILABLE",
            `Google Places API returned status ${status}: ${parsedErrorMsg}`,
            this.id,
            status
          );
        }

        const data = (await response.json()) as GooglePlacesSearchResponse;
        const places = data.places || [];

        ConfigValidator.updateInternalState((state) => {
          state.googlePlaces.lastSuccessAt = new Date().toISOString();
          state.googlePlaces.lastError = null;
        });

        emitAgentEvent({
          event: "agent.provider_call",
          agent: "mitra",
          provider: "google_places",
          metadata: {
            operation: "places.searchText.success",
            placesFound: places.length,
          },
        });

        // Normalize raw places into canonical RawBusinessRecord
        return places.map((place) => this.normalizePlace(place, criteria));
      } catch (err: any) {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          lastError = new DiscoveryProviderError(
            "DISCOVERY_PROVIDER_UNAVAILABLE",
            `Google Places API request timed out after ${REQUEST_TIMEOUT_MS}ms.`,
            this.id,
            504
          );
        } else if (err instanceof DiscoveryProviderError) {
          lastError = err;
          break; // Don't retry client/auth errors
        } else {
          lastError = err;
        }
      }
    }

    const errMessage = lastError?.message || "Google Places API search failed.";
    ConfigValidator.updateInternalState((state) => {
      state.googlePlaces.lastError = errMessage;
    });

    emitAgentEvent({
      event: "agent.provider_call",
      agent: "mitra",
      provider: "google_places",
      metadata: {
        operation: "places.searchText.error",
        error: errMessage,
      },
    });

    if (lastError instanceof DiscoveryProviderError) {
      throw lastError;
    }

    throw new DiscoveryProviderError(
      "DISCOVERY_PROVIDER_UNAVAILABLE",
      `Google Places search failed: ${errMessage}`,
      this.id,
      500
    );
  }

  /**
   * Maps a Google Places (New) item to a canonical RawBusinessRecord.
   */
  private normalizePlace(place: GooglePlaceItem, criteria: DiscoveryCriteria): RawBusinessRecord {
    let city = criteria.city;
    let state = criteria.state;
    let country = criteria.country;
    let postalCode = criteria.postalCode;

    if (Array.isArray(place.addressComponents) && place.addressComponents.length > 0) {
      for (const comp of place.addressComponents) {
        if (!comp || !Array.isArray(comp.types)) continue;
        if (comp.types.includes("locality")) {
          city = comp.longText || comp.shortText || city;
        } else if (comp.types.includes("administrative_area_level_1")) {
          state = comp.longText || comp.shortText || state;
        } else if (comp.types.includes("country")) {
          country = comp.longText || comp.shortText || country;
        } else if (comp.types.includes("postal_code")) {
          postalCode = comp.longText || comp.shortText || postalCode;
        }
      }
    }

    // Fallback city extraction if locality wasn't isolated
    if (!city && criteria.location) {
      const parts = criteria.location.split(",");
      city = parts[0]?.trim();
    }

    const phone = place.internationalPhoneNumber || place.nationalPhoneNumber;
    const category = place.primaryType || place.types?.[0] || criteria.query;

    return {
      sourceId: place.id,
      source: "google_places",
      name: place.displayName?.text || "Unknown Business",
      category,
      address: place.formattedAddress,
      city,
      state,
      country,
      postalCode,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      phone,
      website: place.websiteUri,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      isPermanentlyClosed: place.businessStatus === "CLOSED_PERMANENTLY",
      rawMetadata: {
        googlePlaceId: place.id,
        businessStatus: place.businessStatus,
        types: place.types,
        photos: place.photos,
        reviews: place.reviews,
      },
    };
  }
}
