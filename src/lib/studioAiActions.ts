import type { WebsiteData, ProductItem, ButtonActionConfig, ButtonActionType } from "@/types/website";
import { sanitizeActionUrl } from "@/lib/buttonActions";

export interface StudioAiAction {
  action:
    | "update_text"
    | "replace_image"
    | "update_button"
    | "set_button_action"
    | "set_button_scroll_target"
    | "set_button_whatsapp"
    | "set_button_external_url"
    | "set_button_call"
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

        case "set_button_action": {
          const buttonPath = String(act.payload.path || "hero.button");
          const actionType = String(act.payload.type || "scroll") as ButtonActionType;
          const target = String(act.payload.target || "contact");
          const label = act.payload.label ? String(act.payload.label) : undefined;

          const actionConfig: ButtonActionConfig = {
            type: actionType,
            target: actionType === "url" ? sanitizeActionUrl(target) : target,
            label,
          };

          const basePath = buttonPath.replace(/\.button$/, "");
          current = setDeepValue(current as unknown as Record<string, unknown>, `${basePath}.buttonAction`, actionConfig) as unknown as WebsiteData;
          appliedSummaries.push(act.summary || `Configured button action: ${actionType} -> ${target}`);
          break;
        }

        case "set_button_scroll_target": {
          const buttonPath = String(act.payload.path || "hero.button");
          const sectionTarget = String(act.payload.target || "contact").replace(/^#/, "");
          const basePath = buttonPath.replace(/\.button$/, "");

          const actionConfig: ButtonActionConfig = {
            type: "scroll",
            target: sectionTarget,
          };

          current = setDeepValue(current as unknown as Record<string, unknown>, `${basePath}.buttonAction`, actionConfig) as unknown as WebsiteData;
          appliedSummaries.push(act.summary || `Configured button to scroll to ${sectionTarget} section`);
          break;
        }

        case "set_button_whatsapp": {
          const buttonPath = String(act.payload.path || "hero.button");
          const phone = String(act.payload.phone || current.contact?.phone || "+919876543210");
          const basePath = buttonPath.replace(/\.button$/, "");

          const actionConfig: ButtonActionConfig = {
            type: "whatsapp",
            target: phone,
          };

          current = setDeepValue(current as unknown as Record<string, unknown>, `${basePath}.buttonAction`, actionConfig) as unknown as WebsiteData;
          appliedSummaries.push(act.summary || `Configured button to open WhatsApp (${phone})`);
          break;
        }

        case "set_button_external_url": {
          const buttonPath = String(act.payload.path || "hero.button");
          const url = sanitizeActionUrl(String(act.payload.url || "#"));
          const basePath = buttonPath.replace(/\.button$/, "");

          const actionConfig: ButtonActionConfig = {
            type: "url",
            target: url,
          };

          current = setDeepValue(current as unknown as Record<string, unknown>, `${basePath}.buttonAction`, actionConfig) as unknown as WebsiteData;
          appliedSummaries.push(act.summary || `Configured button to navigate to ${url}`);
          break;
        }

        case "set_button_call": {
          const buttonPath = String(act.payload.path || "hero.button");
          const phone = String(act.payload.phone || current.contact?.phone || "+919876543210");
          const basePath = buttonPath.replace(/\.button$/, "");

          const actionConfig: ButtonActionConfig = {
            type: "call",
            target: phone,
          };

          current = setDeepValue(current as unknown as Record<string, unknown>, `${basePath}.buttonAction`, actionConfig) as unknown as WebsiteData;
          appliedSummaries.push(act.summary || `Configured button to dial ${phone}`);
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
                products: current.products || [],
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
          const sectionKey = String(act.payload.sectionKey || "").toLowerCase();
          if (sectionKey && current.sectionOrder) {
            // Find exact or prefix match (e.g. "faq" matches "faq_123" or "faq")
            const targetKey = current.sectionOrder.find(
              (k) => k.toLowerCase() === sectionKey || k.toLowerCase().startsWith(sectionKey)
            );
            if (targetKey) {
              current.sectionOrder = current.sectionOrder.filter((k) => k !== targetKey);
              delete current[targetKey];
              appliedSummaries.push(act.summary || `Removed ${targetKey} section`);
            }
          }
          break;
        }

        case "reorder_sections": {
          const newOrder = act.payload.newOrder as string[];
          if (Array.isArray(newOrder) && newOrder.length > 0) {
            current.sectionOrder = newOrder;
            appliedSummaries.push(act.summary || `Reordered website sections`);
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
              originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
              image: product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
              status: product.status || "active",
              category: product.category || "General",
              ctaText: product.ctaText || "Order on WhatsApp",
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
            appliedSummaries.push(act.summary || `Added product: ${newProd.name} (₹${newProd.price})`);
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
