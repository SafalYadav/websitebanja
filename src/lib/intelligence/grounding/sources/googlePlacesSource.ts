// src/lib/intelligence/grounding/sources/googlePlacesSource.ts
// Grounded Business Intelligence — Google Places Source Adapter
// Complies strictly with Google Places API terms:
// - Never permanently caches or dumps raw Places response bodies, raw reviews, or photos.
// - Retains only Place ID, internal derived classification, and attribution references.
// - Handles multiple matches with ambiguity detection rather than random selection.
// - Fails gracefully when unconfigured or rate-limited.

import { createEvidenceItem } from "../evidenceEngine";
import type { EvidenceItem, BusinessAmbiguity } from "../types";
import type { RawPlacesPhoto, RawPlacesReview } from "../assetTypes";
import { sanitizeReview } from "../reviewSanitizer";

export interface GooglePlacesDiagnostics {
  lookupMethod: "place_details" | "text_search";
  photoStatus: "AVAILABLE" | "EMPTY_GENUINE" | "OMITTED" | "UNAVAILABLE";
  photoDiagnosticMessage: string;
  reviewStatus: "AVAILABLE" | "EMPTY_GENUINE" | "OMITTED" | "UNAVAILABLE";
  reviewDiagnosticMessage: string;
}

export interface GooglePlacesGroundedData {
  isAvailable: boolean;
  placeId?: string;
  name?: string;
  formattedAddress?: string;
  city?: string;
  country?: string;
  phone?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  photos?: RawPlacesPhoto[];
  reviews?: RawPlacesReview[];
  evidence: EvidenceItem[];
  ambiguity: BusinessAmbiguity;
  diagnostics?: GooglePlacesDiagnostics;
  error?: string;
}

export class GooglePlacesSource {
  private static instance: GooglePlacesSource;

  private constructor() {}

  public static getInstance(): GooglePlacesSource {
    if (!GooglePlacesSource.instance) {
      GooglePlacesSource.instance = new GooglePlacesSource();
    }
    return GooglePlacesSource.instance;
  }

  public isConfigured(): boolean {
    const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
    return Boolean(key && !key.includes("<") && !key.includes("your-api-key") && key !== "placeholder");
  }

  /**
   * Grounds business identity and physical attributes against Google Places API (New).
   * Invariant: If placeId is provided, queries Place Details directly. NEVER fuzzy-searches by name/location.
   */
  public async groundBusiness(params: {
    businessName: string;
    location?: string;
    placeId?: string;
  }): Promise<GooglePlacesGroundedData> {
    const defaultAmbiguity: BusinessAmbiguity = {
      isAmbiguous: false,
      candidatesCount: 0,
      candidateMatches: [],
      resolutionMessage: "No ambiguity detected",
    };

    if (!this.isConfigured()) {
      return {
        isAvailable: false,
        evidence: [],
        ambiguity: defaultAmbiguity,
        error: "Google Places API is not configured in environment (GOOGLE_PLACES_API_KEY).",
      };
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY!.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    try {
      let matchedPlace: any = null;
      let lookupMethod: "place_details" | "text_search" = "text_search";

      // ─── 1. DIRECT PLACE DETAILS BY PLACE ID (IMMUTABLE IDENTITY LOCK) ───────
      if (params.placeId && typeof params.placeId === "string" && params.placeId.trim().length > 0) {
        lookupMethod = "place_details";
        const cleanPlaceId = params.placeId.trim();
        const detailsUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}`;

        const detailsRes = await fetch(detailsUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "id,displayName,formattedAddress,addressComponents,websiteUri,nationalPhoneNumber,rating,userRatingCount,primaryType,primaryTypeDisplayName,types,location,photos,reviews,googleMapsUri",
          },
          signal: controller.signal,
        });

        if (detailsRes.ok) {
          matchedPlace = await detailsRes.json();
          if (matchedPlace?.id !== cleanPlaceId) {
            return { isAvailable: false, evidence: [], ambiguity: defaultAmbiguity,
              error: "Google Places returned a different business identity than the requested Place ID." };
          }
        } else {
          return {
            isAvailable: false,
            evidence: [],
            ambiguity: defaultAmbiguity,
            error: `Google Places Place Details API returned status HTTP ${detailsRes.status}`,
          };
        }
      }

      // Text search is permitted only when no authoritative Place ID was supplied.
      if (!matchedPlace) {
        lookupMethod = "text_search";
        const query = params.location
          ? `${params.businessName} in ${params.location}`
          : params.businessName;

        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.primaryType,places.types,places.location,places.photos,places.reviews",
          },
          body: JSON.stringify({
            textQuery: query,
            pageSize: 5,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          return {
            isAvailable: false,
            evidence: [],
            ambiguity: defaultAmbiguity,
            error: `Google Places API returned status HTTP ${res.status}`,
          };
        }

        const json = await res.json();
        const places: any[] = json.places || [];

        if (places.length === 0) {
          return {
            isAvailable: true,
            evidence: [],
            ambiguity: {
              isAmbiguous: false,
              candidatesCount: 0,
              candidateMatches: [],
              resolutionMessage: `No Google Places match found for query '${query}'.`,
            },
          };
        }

        // Check for ambiguity: if multiple places returned and none have high exact name similarity
        const normalizedQueryName = params.businessName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const exactMatches = places.filter((p) => {
          const placeName = (p.displayName?.text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return placeName.includes(normalizedQueryName) || normalizedQueryName.includes(placeName);
        });

        if (places.length > 1 && exactMatches.length !== 1) {
          return {
            isAvailable: true,
            evidence: [],
            ambiguity: {
              isAmbiguous: true,
              candidatesCount: places.length,
              candidateMatches: places.slice(0, 3).map((p) => ({
                name: p.displayName?.text || "Unknown",
                address: p.formattedAddress,
                placeId: p.id,
                confidence: 0.5,
              })),
              resolutionMessage: `Multiple potential business matches found for '${params.businessName}'. Manual disambiguation required.`,
            },
          };
        }

        matchedPlace = exactMatches[0] || places[0];
      }

      // ─── 3. STRUCTURED ASSET DIAGNOSTICS ──────────────────────────────────
      let photoStatus: GooglePlacesDiagnostics["photoStatus"] = "UNAVAILABLE";
      let photoDiagnosticMessage = "No photos returned";
      if ("photos" in matchedPlace) {
        if (Array.isArray(matchedPlace.photos) && matchedPlace.photos.length > 0) {
          photoStatus = "AVAILABLE";
          photoDiagnosticMessage = `Retrieved ${matchedPlace.photos.length} verified Google Places photos.`;
        } else if (Array.isArray(matchedPlace.photos) && matchedPlace.photos.length === 0) {
          photoStatus = "EMPTY_GENUINE";
          photoDiagnosticMessage = "Google Places API explicitly returned an empty photo array for this entity.";
        }
      } else {
        photoStatus = "OMITTED";
        photoDiagnosticMessage = "Google Places omitted the requested photos field; the response does not establish why it is absent.";
      }

      let reviewStatus: GooglePlacesDiagnostics["reviewStatus"] = "UNAVAILABLE";
      let reviewDiagnosticMessage = "No reviews returned";
      if ("reviews" in matchedPlace) {
        if (Array.isArray(matchedPlace.reviews) && matchedPlace.reviews.length > 0) {
          reviewStatus = "AVAILABLE";
          reviewDiagnosticMessage = `Retrieved ${matchedPlace.reviews.length} verified customer reviews.`;
        } else if (Array.isArray(matchedPlace.reviews) && matchedPlace.reviews.length === 0) {
          reviewStatus = "EMPTY_GENUINE";
          reviewDiagnosticMessage = "Google Places API explicitly returned an empty reviews array for this entity.";
        }
      } else {
        reviewStatus = "OMITTED";
        reviewDiagnosticMessage = "Google Places omitted the requested reviews field; the response does not establish why it is absent.";
      }

      const diagnostics: GooglePlacesDiagnostics = {
        lookupMethod,
        photoStatus,
        photoDiagnosticMessage,
        reviewStatus,
        reviewDiagnosticMessage,
      };
      const placeId = matchedPlace.id;
      const name = matchedPlace.displayName?.text || params.businessName;
      const formattedAddress = matchedPlace.formattedAddress;
      const addressComponents = matchedPlace.addressComponents as Array<{ longText?: string; types?: string[] }> | undefined;
      const city = addressComponents?.find((component) => component.types?.includes("locality"))?.longText;
      const country = addressComponents?.find((component) => component.types?.includes("country"))?.longText;
      const phone = matchedPlace.nationalPhoneNumber;
      const websiteUri = matchedPlace.websiteUri;
      const primaryType = matchedPlace.primaryType;
      const types = matchedPlace.types || [];
      const rating = matchedPlace.rating;
      const userRatingCount = matchedPlace.userRatingCount;
      const location = matchedPlace.location;

      const rawPhotos: RawPlacesPhoto[] = Array.isArray(matchedPlace.photos)
        ? matchedPlace.photos.map((ph: any) => ({
            name: ph.name,
            widthPx: ph.widthPx,
            heightPx: ph.heightPx,
            authorAttributions: ph.authorAttributions || [],
          }))
        : [];

      const rawReviews: RawPlacesReview[] = Array.isArray(matchedPlace.reviews)
        ? matchedPlace.reviews
            .map((rv: any) => {
              const reviewText = rv.text?.text || rv.originalText?.text || "";
              const authorName = rv.authorAttribution?.displayName || "Verified Customer";
              const sanitized = sanitizeReview(reviewText, authorName);
              if (!sanitized.isSafe) return null;

              return {
                name: rv.name,
                rating: rv.rating,
                text: { text: sanitized.sanitizedText },
                authorAttribution: {
                  displayName: sanitized.sanitizedAuthor,
                  uri: rv.authorAttribution?.uri,
                  photoUri: rv.authorAttribution?.photoUri,
                },
                publishTime: rv.publishTime,
              };
            })
            .filter((rv: any): rv is RawPlacesReview => rv !== null)
        : [];

      const evidence: EvidenceItem[] = [createEvidenceItem({
        source: "google_places", reference: `placeId:${placeId}`,
        observation: `Google Places returned business identity: ${matchedPlace.displayName?.text || placeId}`,
        supports: "identity.canonicalName", baseConfidence: 0.98,
      })];

      if (formattedAddress) {
        evidence.push(
          createEvidenceItem({
            source: "google_places",
            reference: `placeId:${placeId}`,
            observation: `Verified physical location listed at: ${formattedAddress}`,
            supports: "location.formattedAddress",
            baseConfidence: 0.98,
          })
        );
      }

      if (phone) {
        evidence.push(
          createEvidenceItem({
            source: "google_places",
            reference: `placeId:${placeId}`,
            observation: `Verified commercial phone number listed: ${phone}`,
            supports: "identity.phone",
            baseConfidence: 0.95,
          })
        );
      }

      if (websiteUri) {
        evidence.push(
          createEvidenceItem({
            source: "google_places",
            reference: `placeId:${placeId}`,
            observation: `Official commercial website linked on Google Places profile: ${websiteUri}`,
            supports: "identity.normalizedWebsite",
            baseConfidence: 0.95,
          })
        );
      }

      if (primaryType || types.length > 0) {
        evidence.push(
          createEvidenceItem({
            source: "google_places",
            reference: `placeId:${placeId}`,
            observation: `Google Business category classified as: ${primaryType || types[0]}`,
            supports: "industryFamily",
            baseConfidence: 0.90,
          })
        );
      }

      if (rating && userRatingCount) {
        evidence.push(
          createEvidenceItem({
            source: "google_places",
            reference: `placeId:${placeId}`,
            observation: `Verified Google customer rating of ${rating}★ based on ${userRatingCount} reviews`,
            supports: "reputation.rating",
            baseConfidence: 0.95,
          })
        );
      }

      if (rawPhotos.length > 0) {
        evidence.push(
          createEvidenceItem({
            source: "google_places",
            reference: `placeId:${placeId}`,
            observation: `Found ${rawPhotos.length} verified business photographs on Google Places`,
            supports: "visual.photos",
            baseConfidence: 0.95,
          })
        );
      }

      if (rawReviews.length > 0) {
        evidence.push(
          createEvidenceItem({
            source: "google_places",
            reference: `placeId:${placeId}`,
            observation: `Found ${rawReviews.length} verified and sanitized customer reviews on Google Places`,
            supports: "reputation.reviews",
            baseConfidence: 0.92,
          })
        );
      }

      return {
        isAvailable: true,
        placeId,
        name,
        formattedAddress,
        city,
        country,
        phone,
        websiteUri,
        rating,
        userRatingCount,
        primaryType,
        types,
        location,
        photos: rawPhotos,
        reviews: rawReviews,
        evidence,
        ambiguity: defaultAmbiguity,
        diagnostics,
      };
    } catch (err) {
      clearTimeout(timer);
      return {
        isAvailable: false,
        evidence: [],
        ambiguity: defaultAmbiguity,
        error: err instanceof Error ? err.message : "Error contacting Google Places",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Constructs secure proxy URL for a Google Places photo reference name.
   */
  public resolvePhotoUrl(photoName: string, maxWidth?: number, maxHeight?: number): string {
    const encoded = encodeURIComponent(photoName);
    const maxW = maxWidth || 1200;
    const maxH = maxHeight || 800;
    return `/api/public/places-photo?name=${encoded}&maxWidthPx=${maxW}&maxHeightPx=${maxH}`;
  }
}

export const googlePlacesSource = GooglePlacesSource.getInstance();
