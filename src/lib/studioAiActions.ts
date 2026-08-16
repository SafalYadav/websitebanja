import type { WebsiteData, ProductItem } from "@/types/website";

export interface StudioAiAction {
  action:
    | "update_text"
    | "replace_image"
    | "update_button"
    | "add_section"
    | "delete_section"
    | "reorder_sections"
    | "add_product"
    | "update_product"
    | "delete_product"
    | "update_theme_colors";
  payload: Record<string, unknown>;
  summary: string;
}

// Safely sets a deep value using a path string e.g. "hero.title" or "services[0].title"
function setDeepValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const root = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const keys = path.replace(/\[(\w+)\]/g, ".$1").split(".");
  let current: Record<string, unknown> = root;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = isNaN(Number(keys[i + 1])) ? {} : [];
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return root;
}

export function executeStudioActions(
  website: WebsiteData,
  actions: StudioAiAction[]
): { updatedWebsite: WebsiteData; appliedSummaries: string[] } {
  let current = JSON.parse(JSON.stringify(website)) as WebsiteData;
  const appliedSummaries: string[] = [];

  for (const act of actions) {
    try {
      switch (act.action) {
        case "update_text": {
          const path = String(act.payload.path || "");
          const text = String(act.payload.text || "");
          if (path && text) {
            current = setDeepValue(current as unknown as Record<string, unknown>, path, text) as unknown as WebsiteData;
            appliedSummaries.push(act.summary || `Updated text at ${path}`);
          }
          break;
        }

        case "replace_image": {
          const path = String(act.payload.path || "");
          const imageUrl = String(act.payload.imageUrl || "");
          if (path && imageUrl) {
            current = setDeepValue(current as unknown as Record<string, unknown>, path, imageUrl) as unknown as WebsiteData;
            appliedSummaries.push(act.summary || `Replaced image at ${path}`);
          }
          break;
        }

        case "update_button": {
          const path = String(act.payload.path || "hero.button");
          const label = String(act.payload.label || "");
          if (path && label) {
            current = setDeepValue(current as unknown as Record<string, unknown>, path, label) as unknown as WebsiteData;
            appliedSummaries.push(act.summary || `Updated button label to "${label}"`);
          }
          break;
        }

        case "add_section": {
          const sectionType = String(act.payload.sectionType || "features");
          const customData = act.payload.data;
          const newKey = `${sectionType}_${Date.now()}`;
          const currentOrder = current.sectionOrder || ["hero", "about", "services", "features", "faq", "contact", "footer"];

          let defaultData: unknown = customData;
          if (!defaultData) {
            if (sectionType === "products" || sectionType === "catalog") {
              defaultData = {
                title: "Featured Collection",
                subtitle: "Explore our bestselling curated selection of products.",
                products: [],
              };
            } else if (sectionType === "features") {
              defaultData = [
                { title: "Premium Reliability", description: "Engineered for 99.99% uptime and top performance." },
                { title: "24/7 Priority Support", description: "Dedicated specialists ready whenever you need." },
              ];
            } else if (sectionType === "faq") {
              defaultData = [
                { question: "How does booking or ordering work?", answer: "Simple 1-click WhatsApp or online confirmation." },
              ];
            }
          }

          current[newKey] = defaultData as never;
          current.sectionOrder = [...currentOrder, newKey];
          appliedSummaries.push(act.summary || `Added ${sectionType} section`);
          break;
        }

        case "delete_section": {
          const sectionKey = String(act.payload.sectionKey || "");
          if (sectionKey && current.sectionOrder) {
            current.sectionOrder = current.sectionOrder.filter((k) => k !== sectionKey);
            delete current[sectionKey];
            appliedSummaries.push(act.summary || `Removed ${sectionKey} section`);
          }
          break;
        }

        case "add_product": {
          const product = act.payload.product as ProductItem;
          if (product && product.name) {
            const newProd: ProductItem = {
              ...product,
              id: product.id || `prod_${Date.now()}`,
              price: Number(product.price) || 0,
              image: product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
              status: product.status || "active",
            };
            const currentProds = (current.products as ProductItem[] | undefined) || [];
            current.products = [newProd, ...currentProds];

            // Ensure products section exists in order
            if (!current.sectionOrder?.some((k) => k.startsWith("products") || k.startsWith("catalog"))) {
              current.sectionOrder = [...(current.sectionOrder || []), "products"];
              current.productsSection = {
                title: "Featured Offerings",
                subtitle: "Explore our collection.",
                products: current.products,
              };
            }
            appliedSummaries.push(act.summary || `Added product: ${newProd.name}`);
          }
          break;
        }

        case "update_product": {
          const productId = String(act.payload.productId || "");
          const updates = act.payload.updates as Partial<ProductItem>;
          if (productId && updates && current.products) {
            current.products = (current.products as ProductItem[]).map((p) =>
              p.id === productId ? { ...p, ...updates } : p
            );
            appliedSummaries.push(act.summary || `Updated product ${productId}`);
          }
          break;
        }

        case "delete_product": {
          const productId = String(act.payload.productId || "");
          if (productId && current.products) {
            current.products = (current.products as ProductItem[]).filter((p) => p.id !== productId);
            appliedSummaries.push(act.summary || `Deleted product ${productId}`);
          }
          break;
        }

        default:
          break;
      }
    } catch {
      // Skip failing action safely
    }
  }

  return { updatedWebsite: current, appliedSummaries };
}
