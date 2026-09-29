// src/lib/discovery/providers/registry.ts
/**
 * Discovery Provider Registry
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 */

import type { BusinessDiscoveryProvider } from "./types";
import { DiscoveryProviderError } from "./types";
import { LocalDeterministicProvider } from "./localDeterministicProvider";
import { GooglePlacesDiscoveryProvider } from "@/lib/integrations/googlePlacesProvider";
import type { DiscoveryCriteria, RawBusinessRecord } from "../types";

class ProviderRegistry {
  private providers = new Map<string, BusinessDiscoveryProvider>();

  constructor() {
    this.register(new LocalDeterministicProvider());
    this.register(new GooglePlacesDiscoveryProvider());
  }

  register(provider: BusinessDiscoveryProvider) {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  getProvider(providerId?: string): BusinessDiscoveryProvider {
    if (!providerId) {
      return this.providers.get("local_deterministic")!;
    }

    const found = this.providers.get(providerId.toLowerCase());
    if (!found) {
      throw new DiscoveryProviderError(
        "DISCOVERY_PROVIDER_UNAVAILABLE",
        `Unknown discovery provider: '${providerId}'. Available providers: ${Array.from(this.providers.keys()).join(", ")}`,
        providerId,
        400
      );
    }

    return found;
  }

  listProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }
}

export const providerRegistry = new ProviderRegistry();
