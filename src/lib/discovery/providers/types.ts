// src/lib/discovery/providers/types.ts
/**
 * Discovery Provider Interfaces & Error Codes
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 */

import type { DiscoveryCriteria, RawBusinessRecord } from "../types";

export type DiscoveryErrorCode =
  | "DISCOVERY_PROVIDER_UNAVAILABLE"
  | "DISCOVERY_RATE_LIMITED"
  | "DISCOVERY_INVALID_QUERY"
  | "DISCOVERY_INVALID_LOCATION"
  | "DISCOVERY_LIMIT_EXCEEDED"
  | "DISCOVERY_AUTH_FAILED"
  | "DISCOVERY_MALFORMED_RESPONSE";

export class DiscoveryProviderError extends Error {
  code: DiscoveryErrorCode;
  provider: string;
  statusCode: number;

  constructor(code: DiscoveryErrorCode, message: string, provider: string, statusCode = 500) {
    super(message);
    this.name = "DiscoveryProviderError";
    this.code = code;
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export interface BusinessDiscoveryProvider {
  readonly id: string;
  readonly name: string;
  search(criteria: DiscoveryCriteria): Promise<RawBusinessRecord[]>;
}
