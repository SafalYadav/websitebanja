"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { useBuilderStore } from "@/store/builderStore";
import { getCatalogItems, deleteCatalogItem } from "@/lib/catalog";
import type { CatalogItem } from "@/lib/catalog";
import {
  Plus,
  ShoppingBag,
  Trash2,
  Edit2,
  Search,
  X,
  Layers,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCIES } from "@/components/editor/ProductFullScreenEditor";
import { toast } from "@/store/toastStore";

interface CatalogManagerProps {
  projectId?: string;
}

export default function CatalogManager({ projectId: propProjectId }: CatalogManagerProps) {
  const {
    website,
    isCatalogModalOpen,
    setIsCatalogModalOpen,
    openProductEditor,
    addSection,
    currentProjectId,
    catalogVersion,
    refreshCatalog,
  } = useGeneratedWebsiteStore();
  const builderProjectId = useBuilderStore((state) => state.projectId);
  const effectiveProjectId = propProjectId || currentProjectId || builderProjectId;

  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const loadCatalog = React.useCallback(async () => {
    if (!effectiveProjectId) return;
    setIsLoading(true);
    const { data, error } = await getCatalogItems(effectiveProjectId);
    if (error) {
      console.error("[Catalog Fetch Error]:", error);
      toast.error("Failed to load catalog", error.message);
    } else if (data) {
      setProducts(data);
    }
    setIsLoading(false);
  }, [effectiveProjectId]);

  useEffect(() => {
    let isCancelled = false;
    if (isCatalogModalOpen && effectiveProjectId) {
      getCatalogItems(effectiveProjectId).then(({ data, error }) => {
        if (isCancelled) return;
        if (error) {
          console.error("[Catalog Fetch Error]:", error);
          toast.error("Failed to load catalog", error.message);
        } else if (data) {
          setProducts(data);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [isCatalogModalOpen, effectiveProjectId, catalogVersion]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const { error } = await deleteCatalogItem(id, effectiveProjectId);
    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted");
      refreshCatalog();
      loadCatalog();
    }
  };

  if (!isCatalogModalOpen) return null;

  const categories = Array.from(new Set(products.map((p) => p.category || "General")));

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const hasProductsSection = website?.sectionOrder?.some(
    (k) => k === "products" || k === "catalog" || k.startsWith("products_")
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900 overflow-hidden">
        {/* Floating Modal Header */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-zinc-50/70 px-6 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Product Catalog Workspace
              </h2>
              <span className="text-[11px] text-zinc-400 font-mono">
                {products.length} Products in Store
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadCatalog}
              className="flex items-center justify-center h-8 w-8 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => openProductEditor(null)}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white transition"
              title="Close Workspace"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Toolbar & Search Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-white/10 bg-white dark:bg-zinc-900 flex-shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search catalog by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition",
                selectedCategory === "all"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              All Categories ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition",
                  selectedCategory === cat
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notice if Products Section is not added to canvas */}
        {!hasProductsSection && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
            <span>
              The <strong>Catalog Section</strong> is not currently visible on your website canvas.
            </span>
            <button
              type="button"
              onClick={() => addSection("products")}
              className="flex items-center gap-1 font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              <Layers className="h-3.5 w-3.5" />
              Add Catalog Section to Page
            </button>
          </div>
        )}

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 mb-3">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No items found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5">
                {products.length === 0
                  ? "Start building your catalog by adding your first item."
                  : "No items matched your search or category filter."}
              </p>
              <button
                type="button"
                onClick={() => openProductEditor(null)}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Item</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.status === "out_of_stock";
                const displayImage = product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";
                
                return (
                  <div
                    key={product.id}
                    className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs hover:border-violet-500 hover:shadow-md dark:border-white/10 dark:bg-zinc-950 transition"
                  >
                    {/* Thumbnail & Badges */}
                    <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3">
                      <Image
                        src={displayImage}
                        alt={product.name}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="260px"
                      />
                      {product.badge && (
                        <div className="absolute top-2 left-2 rounded-md bg-violet-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                          {product.badge}
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center">
                          <span className="rounded-md bg-rose-600 px-2 py-1 text-[10px] font-bold text-white uppercase">
                            Out of Stock
                          </span>
                        </div>
                      )}
                      {product.item_type && (
                        <div className="absolute bottom-2 right-2 rounded-md bg-black/50 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                          {product.item_type}
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            {product.category || "General"}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              product.status === "active"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                            )}
                          >
                            {product.status === "active" ? "Active" : product.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-1 line-clamp-1">
                          {product.name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/5">
                        <div className="flex items-baseline gap-1.5">
                          {product.item_type === 'rental' ? (
                            <span className="text-xs font-black text-zinc-900 dark:text-white">
                              {CURRENCIES.find(c => c.code === product.currency_code)?.symbol || "₹"}
                              {product.daily_price ? `${product.daily_price}/day` : product.hourly_price ? `${product.hourly_price}/hr` : "Ask for price"}
                            </span>
                          ) : (
                            <>
                              <span className="text-sm font-black text-zinc-900 dark:text-white">
                                {CURRENCIES.find(c => c.code === product.currency_code)?.symbol || "₹"}
                                {product.price?.toLocaleString(CURRENCIES.find(c => c.code === product.currency_code)?.locale || "en-IN")}
                              </span>
                              {product.original_price && product.price && product.original_price > product.price && (
                                <span className="text-[10px] text-zinc-400 line-through">
                                  {CURRENCIES.find(c => c.code === product.currency_code)?.symbol || "₹"}
                                  {product.original_price.toLocaleString(CURRENCIES.find(c => c.code === product.currency_code)?.locale || "en-IN")}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openProductEditor(product.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 hover:bg-violet-50 hover:text-violet-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                            title="Edit Item Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
