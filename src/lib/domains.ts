export interface DnsInstruction {
  type: "CNAME" | "A";
  host: string;
  value: string;
  ttl: string;
}

export const CNAME_TARGET = "cname.websitebanja.com";
export const A_RECORD_IP = "76.76.21.21";

/**
 * Normalizes custom domain string (e.g. "https://www.auracafe.com/" -> "auracafe.com")
 */
export function normalizeDomain(raw: string): string {
  let domain = raw.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/\/.*$/, "");
  return domain;
}

/**
 * Validates domain format
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  // Standard domain regex
  const domainPattern = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return domainPattern.test(domain);
}

/**
 * Generates required DNS record instructions for the user
 */
export function getDnsInstructions(domain: string): DnsInstruction[] {
  const isApex = !domain.startsWith("www.") && domain.split(".").length === 2;

  if (isApex) {
    return [
      {
        type: "A",
        host: "@",
        value: A_RECORD_IP,
        ttl: "3600 (Auto)",
      },
      {
        type: "CNAME",
        host: "www",
        value: CNAME_TARGET,
        ttl: "3600 (Auto)",
      },
    ];
  }

  const subdomain = domain.split(".")[0];
  return [
    {
      type: "CNAME",
      host: subdomain,
      value: CNAME_TARGET,
      ttl: "3600 (Auto)",
    },
  ];
}
