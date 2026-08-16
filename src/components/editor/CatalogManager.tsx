"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import type { ProductItem } from "@/types/website";
import {
  Plus,
  Trash2,
  Edit2,
  ShoppingBag,
  Sparkles,
  Check,
  X,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import ImageMediaModal from "@/components/editor/ImageMediaModal";
import { toast } from "@/store/toastStore";

export default function CatalogManager() {
  const website = useGeneratedWebsiteStore((state) => state.website);
  const addProduct = useGeneratedWebsiteStore((state) => state.addProduct);
  const updateProduct = useGeneratedWebsiteStore((state) => state.updateProduct);
  const deleteProduct = useGeneratedWebsiteStore((state) => state.deleteProduct);
  const addSection = useGeneratedWebsiteStore((state) => state.addSection);

  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductItem> | null>(null);

  // Derive products from website
  const rawProducts = (website?.products as ProductItem[] | undefined) ||
    (website?.productsSection?.products as ProductItem[] | undefined) || [];

  const hasProductsSection =
    website?.sectionOrder?.some((s) => s.startsWith("products") || s.startsWith("catalog")) || false;

  const handleOpenNew = () => {
    setEditingProduct({
      name: "",
      description: "",
      price: 999,
      originalPrice: 1499,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
      category: "Featured",
      status: "active",
      ctaText: "Order on WhatsApp",
      badge: "New",
    });
    setIsEditingModalOpen(true);
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setIsEditingModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!editingProduct?.name?.trim()) {
      toast.error("Required Field", "Please enter a product title.");
      return;
    }

    if (editingProduct.id) {
      updateProduct(editingProduct.id, editingProduct);
      toast.success("Product Updated", `${editingProduct.name} saved.`);
    } else {
      addProduct({
        name: editingProduct.name.trim(),
        description: editingProduct.description?.trim() || "",
        price: Number(editingProduct.price) || 0,
        originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : undefined,
        image: editingProduct.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
        category: editingProduct.category?.trim() || "General",
        status: editingProduct.status || "active",
        ctaText: editingProduct.ctaText?.trim() || "Order Now",
        badge: editingProduct.badge?.trim() || undefined,
      });

      // If website does not have a products section, add it automatically
      if (!hasProductsSection) {
        addSection("products");
      }

      toast.success("Product Added", `${editingProduct.name} added to catalog.`);
    }

    setIsEditingModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            Product Catalog
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage your items, prices, and online inventory.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-violet-500/20 hover:bg-violet-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>

      {/* If section is missing on canvas, show CTA */}
      {!hasProductsSection && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
              Catalog section is not currently on canvas.
            </span>
          </div>
          <button
            type="button"
            onClick={() => addSection("products")}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 underline hover:no-underline"
          >
            Add to Canvas
          </button>
        </div>
      )}

      {/* Product List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
        {rawProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 p-8 text-center dark:border-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 mb-3">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No Products in Catalog
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
              Add your merchandise, services, or menu items with pricing and photos.
            </p>
            <button
              type="button"
              onClick={handleOpenNew}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black hover:opacity-90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Product
            </button>
          </div>
        ) : (
          rawProducts.map((product) => (
            <div
              key={product.id}
              className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xs transition hover:border-violet-500/50 dark:border-white/10 dark:bg-zinc-900"
            >
              {/* Product Thumbnail */}
              <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0">
                <Image
                  src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {product.badge && (
                  <span className="absolute top-1 left-1 rounded-md bg-violet-600 px-1 py-0.5 text-[8px] font-bold text-white uppercase">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {product.name}
                  </span>
                  {product.status === "out_of_stock" && (
                    <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                      Out of Stock
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                  {product.originalPrice && (
                    <span className="text-zinc-400 line-through text-[11px]">
                      ₹{product.originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-400 font-normal">
                    • {product.category}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    updateProduct(product.id, {
                      status: product.status === "active" ? "out_of_stock" : "active",
                    })
                  }
                  title={product.status === "active" ? "Mark Out of Stock" : "Mark Active"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
                >
                  {product.status === "active" ? (
                    <Eye className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-rose-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(product)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => deleteProduct(product.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Create Product Modal */}
      {isEditingModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsEditingModalOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {editingProduct.id ? "Edit Product Item" : "Add New Catalog Product"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  placeholder="e.g. Royal SUV Daily Rental or Signature Espresso"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    value={editingProduct.price ?? 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Original Price (Optional)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.originalPrice ?? ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        originalPrice: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g. 1999"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    placeholder="e.g. SUVs, Bestseller, Drinks"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Badge / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.badge || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, badge: e.target.value })
                    }
                    placeholder="e.g. 20% OFF or Hot"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  placeholder="Key features, specifications, or details..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              {/* Product Photo with Trigger */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 shrink-0">
                    {editingProduct.image ? (
                      <Image
                        src={editingProduct.image}
                        alt="Product"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 m-auto text-zinc-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                  >
                    <ImageIcon className="h-4 w-4 text-violet-500" />
                    Change Image
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 hover:bg-violet-700"
              >
                <Check className="h-3.5 w-3.5" />
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Media Modal for Product */}
      {isImageModalOpen && (
        <ImageMediaModal
          isOpen={isImageModalOpen}
          currentUrl={editingProduct?.image}
          onClose={() => setIsImageModalOpen(false)}
          onSelectImage={(newUrl) => {
            if (editingProduct) {
              setEditingProduct({ ...editingProduct, image: newUrl });
            }
          }}
          title="Select Product Image"
        />
      )}
    </div>
  );
}
