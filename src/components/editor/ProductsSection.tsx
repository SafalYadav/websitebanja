"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { MessageCircle, ShoppingBag } from "lucide-react";
import EditableElement from "@/components/editor/EditableElement";
import type { ProductItem, ProductsSectionData } from "@/types/website";

interface ProductsSectionProps {
  sectionKey?: string;
  data?: ProductsSectionData | ProductItem[];
  whatsappNumber?: string;
  isPublic?: boolean;
}

export default function ProductsSection({
  sectionKey = "products",
  data,
  whatsappNumber,
  isPublic = false,
}: ProductsSectionProps) {
  // Normalize data whether it's an array or ProductsSectionData object
  const title = (data as ProductsSectionData)?.title || "Featured Offerings";
  const subtitle =
    (data as ProductsSectionData)?.subtitle ||
    "Explore our premium selection with transparent pricing and immediate availability.";

  const rawProducts = useMemo(() => {
    if (Array.isArray(data)) return data;
    if ((data as ProductsSectionData)?.products) return (data as ProductsSectionData).products;
    return [];
  }, [data]);

  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    rawProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ["All", ...Array.from(cats)];
  }, [rawProducts]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") return rawProducts;
    return rawProducts.filter((p) => p.category === activeCategory);
  }, [rawProducts, activeCategory]);

  const getWhatsAppLink = (productName: string, price: number) => {
    const cleanPhone = (whatsappNumber || "+919876543210").replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `Hello! I would like to inquire about/order: "${productName}" priced at ₹${price.toLocaleString("en-IN")}. Please share details.`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  if (rawProducts.length === 0 && isPublic) {
    return null;
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <EditableElement
          sectionKey={sectionKey}
          elementPath={`${sectionKey}.title`}
          elementType="heading"
          label="Catalog Title"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h2>
        </EditableElement>

        <EditableElement
          sectionKey={sectionKey}
          elementPath={`${sectionKey}.subtitle`}
          elementType="paragraph"
          label="Catalog Subtitle"
        >
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-300">
            {subtitle}
          </p>
        </EditableElement>

        {/* Category Filter Chips */}
        {categories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeCategory === cat
                    ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-black"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Product Cards */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-white/10">
          <ShoppingBag className="h-10 w-10 mx-auto text-zinc-400 mb-3" />
          <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            No products found in this category
          </h4>
          <p className="text-xs text-zinc-500 mt-1">
            Switch category filters or add new items from the Catalog tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, idx) => (
            <div
              key={product.id || idx}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 backdrop-blur-md shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/80"
            >
              {/* Product Image */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}.products[${idx}].image`}
                  elementType="image"
                  label="Product Photo"
                  className="w-full h-full"
                >
                  <Image
                    src={
                      product.image ||
                      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                </EditableElement>

                {/* Badge Overlay */}
                {product.badge && (
                  <div className="absolute top-3 left-3 z-20">
                    <span className="rounded-full bg-violet-600/90 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                      {product.badge}
                    </span>
                  </div>
                )}

                {product.status === "out_of_stock" && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                    <span className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg uppercase">
                      Sold Out / Unavailable
                    </span>
                  </div>
                )}
              </div>

              {/* Product Body */}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <EditableElement
                    sectionKey={sectionKey}
                    elementPath={`${sectionKey}.products[${idx}].name`}
                    elementType="heading"
                    label="Product Name"
                  >
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white line-clamp-1">
                      {product.name}
                    </h3>
                  </EditableElement>

                  {product.category && (
                    <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                      {product.category}
                    </span>
                  )}
                </div>

                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}.products[${idx}].description`}
                  elementType="paragraph"
                  label="Description"
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
                    {product.description || "Premium quality offering crafted for top performance."}
                  </p>
                </EditableElement>

                {/* Pricing & CTA */}
                <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Price</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-extrabold text-zinc-900 dark:text-white">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-zinc-400 line-through">
                          ₹{product.originalPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  {product.status === "out_of_stock" ? (
                    <button
                      disabled
                      className="rounded-xl bg-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  ) : (
                    <a
                      href={getWhatsAppLink(product.name, product.price)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{product.ctaText || "Order Now"}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
