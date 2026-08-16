export type ProjectCategory = string;

export interface CategoryFeatures {
  hasCatalog: boolean;
  hasLeads: boolean;
  catalogLabel: string;
}

export function getFeaturesForCategory(category: ProjectCategory): CategoryFeatures {
  const c = (category || "").toLowerCase();
  
  if (c.includes("ecommerce") || c.includes("store") || c.includes("shop")) {
    return { hasCatalog: true, hasLeads: true, catalogLabel: "Store Products" };
  }
  
  if (c.includes("restaurant") || c.includes("cafe") || c.includes("food")) {
    return { hasCatalog: true, hasLeads: true, catalogLabel: "Menu Items" };
  }
  
  if (c.includes("rental") || c.includes("booking") || c.includes("real estate")) {
    return { hasCatalog: true, hasLeads: true, catalogLabel: "Properties / Rentals" };
  }
  
  if (c.includes("portfolio") || c.includes("personal")) {
    return { hasCatalog: false, hasLeads: true, catalogLabel: "Projects" };
  }
  
  // Default for services, B2B, agency, etc.
  return { hasCatalog: true, hasLeads: true, catalogLabel: "Services / Catalog" };
}
