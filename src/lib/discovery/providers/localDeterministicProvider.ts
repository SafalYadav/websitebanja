// src/lib/discovery/providers/localDeterministicProvider.ts
/**
 * Deterministic Local Discovery Provider for WebsiteBanja
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Provides a controlled, reproducible dataset of realistic test businesses
 * covering every qualification and opportunity scenario without contacting
 * external third-party services or scraping.
 */

import type { DiscoveryCriteria, RawBusinessRecord } from "../types";
import type { BusinessDiscoveryProvider } from "./types";

export class LocalDeterministicProvider implements BusinessDiscoveryProvider {
  readonly id = "local_deterministic";
  readonly name = "WebsiteBanja Local Deterministic Provider";

  private getFixtureCatalog(): RawBusinessRecord[] {
    return [
      {
        sourceId: "loc_det_001",
        source: "local_deterministic",
        name: "Astra Specialty Coffee",
        category: "restaurant",
        description: "Specialty third-wave espresso bar and small-batch micro-roastery serving artisanal roasts and pastries.",
        address: "GF-12, Alkapuri Arcade, RC Dutt Road",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390007",
        latitude: 22.3107,
        longitude: 73.1812,
        phone: "+91 98765 43210",
        email: "hello@astraspecialty.in",
        website: "", // No website -> High opportunity
        rating: 4.8,
        reviewCount: 142,
        isPermanentlyClosed: false,
        socialLinks: {
          instagram: "https://instagram.com/astraspecialty",
        },
        rawMetadata: {
          priceLevel: "$$",
          seatingCapacity: 45,
          dineIn: true,
          takeaway: true,
        },
      },
      {
        sourceId: "loc_det_002",
        source: "local_deterministic",
        name: "Grand Heritage Dining",
        category: "restaurant",
        description: "Authentic royal Gujarati and North Indian fine dining banquet with private dining suites.",
        address: "Opp. Sayaji Baug, Sayajigunj",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390005",
        latitude: 22.3135,
        longitude: 73.1892,
        phone: "+91 98250 11223",
        email: "reservations@grandheritagedining.com",
        website: "https://grandheritagedining.com", // Valid HTTPS website
        rating: 4.6,
        reviewCount: 310,
        isPermanentlyClosed: false,
        socialLinks: {
          facebook: "https://facebook.com/grandheritagedining",
        },
        rawMetadata: {
          priceLevel: "$$$",
          banquetAvailable: true,
        },
      },
      {
        sourceId: "loc_det_003",
        source: "local_deterministic",
        name: "Old Mill Bistro & Hearth",
        category: "restaurant",
        description: "Wood-fired pizzeria and European rustic kitchen located in the old mill district.",
        address: "Old Chhani Road, Near Railway Crossing",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390024",
        latitude: 22.3389,
        longitude: 73.1784,
        phone: "+91 99044 55667",
        email: "contact@oldmillbistro.in",
        website: "http://unreachable-oldmill-bistro.local", // Unreachable / broken website
        rating: 4.2,
        reviewCount: 48,
        isPermanentlyClosed: false,
        rawMetadata: {
          woodFired: true,
        },
      },
      {
        sourceId: "loc_det_004",
        source: "local_deterministic",
        name: "Astra Specialty Coffee - Vadodara Branch", // Intentional duplicate of loc_det_001
        category: "restaurant",
        description: "Specialty coffee roastery and espresso bar.",
        address: "Alkapuri Arcade, RC Dutt Road",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390007",
        latitude: 22.3108,
        longitude: 73.1813,
        phone: "+91 98765 43210", // Matching phone
        website: "",
        rating: 4.7,
        reviewCount: 95,
        isPermanentlyClosed: false,
      },
      {
        sourceId: "loc_det_005",
        source: "local_deterministic",
        name: "Closed Corner Bakery",
        category: "restaurant",
        description: "Historic neighborhood bakery and confectionery (Closed down in 2023).",
        address: "Mandvi Gate, Old City",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390001",
        phone: "+91 97123 00000",
        website: "",
        rating: 3.1,
        reviewCount: 15,
        isPermanentlyClosed: true, // Hard negative: Permanently closed
      },
      {
        sourceId: "loc_det_006",
        source: "local_deterministic",
        name: "Roadside Chai Cart",
        category: "restaurant",
        description: "Street-corner tea stall serving cutting masala chai.",
        address: "Station Road Corner",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        phone: "", // No phone
        email: "", // No email
        website: "", // No website
        rating: 4.1,
        reviewCount: 8,
        isPermanentlyClosed: false, // Incomplete info -> Needs review or low score
      },
      {
        sourceId: "loc_det_007",
        source: "local_deterministic",
        name: "Vadodara Municipal Park Maintenance",
        category: "government_service", // Non-commercial / municipal
        description: "Department office for public park sanitation and tree trimming.",
        address: "Khanderao Market, Palace Road",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390001",
        phone: "+91 265 2433111",
        website: "https://vmc.gov.in",
        rating: 2.8,
        reviewCount: 22,
        isPermanentlyClosed: false, // Disqualified: Irrelevant category
      },
      {
        sourceId: "loc_det_008",
        source: "local_deterministic",
        name: "The Royal Pavilion Boutique Hotel",
        category: "luxury_hotel",
        description: "Heritage boutique hotel offering 24 luxury suites, wellness pavilion, and courtyard dining.",
        address: "Near Laxmi Vilas Palace, J.N. Marg",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390001",
        latitude: 22.2965,
        longitude: 73.1932,
        phone: "+91 94280 99887",
        email: "stay@royalpavilionvadodara.com",
        website: "", // High opportunity luxury hospitality lead
        rating: 4.9,
        reviewCount: 188,
        isPermanentlyClosed: false,
      },
      {
        sourceId: "loc_det_009",
        source: "local_deterministic",
        name: "SmileCare Dental & Implant Studio",
        category: "healthcare",
        description: "Advanced cosmetic dentistry, invisible aligners, and dental implant center.",
        address: "301, Silverline Complex, Race Course Circle",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "390007",
        latitude: 22.3168,
        longitude: 73.1724,
        phone: "+91 96010 33445",
        email: "care@smilecarevadodara.in",
        website: "http://smilecarevadodara.in",
        rating: 4.7,
        reviewCount: 96,
        isPermanentlyClosed: false,
      },
      {
        sourceId: "loc_det_010",
        source: "local_deterministic",
        name: "Aura Luxury Wellness & Ayurvedic Spa",
        category: "wellness_spa",
        description: "Holistic wellness sanctuary specializing in authentic Kerala Ayurveda treatments and sound healing.",
        address: "Bungalow 7, Vasna-Bhayli Road",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        postalCode: "391410",
        latitude: 22.2891,
        longitude: 73.1412,
        phone: "+91 99790 77889",
        email: "concierge@aurawellnessvadodara.com",
        website: "", // No website, high opportunity
        rating: 4.8,
        reviewCount: 114,
        isPermanentlyClosed: false,
      },
    ];
  }

  async search(criteria: DiscoveryCriteria): Promise<RawBusinessRecord[]> {
    const all = this.getFixtureCatalog();
    const queryLower = (criteria.query || "").toLowerCase().trim();
    const locationLower = (criteria.location || "").toLowerCase().trim();
    const requestedCategories = (criteria.categories || []).map((c) => c.toLowerCase());
    const limit = Math.min(criteria.limit || 20, 50);

    const filtered = all.filter((biz) => {
      // 1. Category match if explicitly requested
      if (requestedCategories.length > 0) {
        const matchesCategory = requestedCategories.some(
          (rc) =>
            biz.category?.toLowerCase().includes(rc) ||
            rc.includes(biz.category?.toLowerCase() || "")
        );
        if (!matchesCategory) return false;
      }

      // 2. Query match (matches name, description, or category)
      if (queryLower) {
        const nameMatch = biz.name.toLowerCase().includes(queryLower);
        const descMatch = biz.description?.toLowerCase().includes(queryLower);
        const catMatch = biz.category?.toLowerCase().includes(queryLower);
        if (!nameMatch && !descMatch && !catMatch) {
          // If query is broad (e.g. "restaurants" or "food"), check category mapping
          const broadFood =
            (queryLower.includes("restaurant") ||
              queryLower.includes("cafe") ||
              queryLower.includes("coffee") ||
              queryLower.includes("food")) &&
            biz.category === "restaurant";
          if (!broadFood) return false;
        }
      }

      // 3. Location match (city, state, address)
      if (locationLower) {
        const cityMatch = biz.city?.toLowerCase().includes(locationLower);
        const stateMatch = biz.state?.toLowerCase().includes(locationLower);
        const addressMatch = biz.address?.toLowerCase().includes(locationLower);
        const isVadodaraBroad =
          locationLower.includes("vadodara") || locationLower.includes("baroda");
        if (!cityMatch && !stateMatch && !addressMatch && !isVadodaraBroad) {
          return false;
        }
      }

      // 4. Rating filter if specified
      if (criteria.minRating !== undefined && biz.rating !== undefined) {
        if (biz.rating < criteria.minRating) return false;
      }

      return true;
    });

    return filtered.slice(0, limit);
  }
}
