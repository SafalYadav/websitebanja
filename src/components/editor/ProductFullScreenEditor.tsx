"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import ImageMediaModal from "@/components/editor/ImageMediaModal";
import type { ProductItem } from "@/types/website";
import {
  X,
  Sparkles,
  ShoppingBag,
  IndianRupee,
  ImageIcon,
  Tag,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageCircle,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE_PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&auto=format&fit=crop&q=80",
];

interface FormProps {
  initialProduct?: ProductItem | null;
  onSave: (productData: Omit<ProductItem, "id">) => void;
  onClose: () => void;
  isEditing: boolean;
}

function ProductEditorForm({ initialProduct, onSave, onClose, isEditing }: FormProps) {
  const [name, setName] = useState(initialProduct?.name || "");
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [price, setPrice] = useState<number>(initialProduct?.price ?? 1499);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(
    initialProduct?.originalPrice ?? 1999
  );
  const [category, setCategory] = useState(initialProduct?.category || "Featured");
  const [badge, setBadge] = useState(initialProduct?.badge || "New");
  const [image, setImage] = useState(initialProduct?.image || SAMPLE_PRESET_IMAGES[0]);
  const [status, setStatus] = useState<"active" | "draft" | "out_of_stock">(
    initialProduct?.status || "active"
  );
  const [ctaText, setCtaText] = useState(initialProduct?.ctaText || "Order on WhatsApp");
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const handleSubmit = () => {
    if (!name.trim()) {
      setErrorMsg("Product name is required.");
      return;
    }
    if (price < 0 || isNaN(price)) {
      setErrorMsg("Please enter a valid price in INR.");
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category: category.trim() || "General",
      badge: badge.trim() || undefined,
      image,
      status,
      ctaText: ctaText.trim() || "Order on WhatsApp",
    });
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Header */}
      <header className="flex h-18 items-center justify-between border-b border-zinc-200 bg-white/90 px-6 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
              <h1 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                {isEditing ? "Edit Catalog Item" : "Create New Catalog Product"}
              </h1>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Changes synchronize dynamically with your online store.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 active:scale-95 transition"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Save & Publish to Catalog</span>
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Form Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Product Fundamentals */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-violet-500" />
              Product Overview
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Oxford Premium Handcrafted Shirt"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apparel, Electronics, Luxury"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Badge / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Trending, 20% OFF, Bestseller"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Detailed Product Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe craftsmanship, materials, sizing, warranty, or customer benefits..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Currency in INR */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4 text-emerald-500" />
              Indian Rupee (INR ₹) Pricing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Selling Price (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="1499"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-4 py-3 text-sm font-bold text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Original / Strikethrough Price (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="1999"
                    value={originalPrice || ""}
                    onChange={(e) =>
                      setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                  />
                </div>
              </div>
            </div>

            {discountPercent !== null && discountPercent > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Percent className="h-3.5 w-3.5" />
                <span>Customers will see {discountPercent}% discount badge</span>
              </div>
            )}
          </div>

          {/* Section 3: Availability & CTA */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Availability & Ordering CTA
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Inventory Stock Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "active" | "draft" | "out_of_stock")
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-xs font-bold text-zinc-800 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-200"
                >
                  <option value="active">Active (Available to Order)</option>
                  <option value="out_of_stock">Out of Stock (Shows Unavailable Badge)</option>
                  <option value="draft">Draft (Hidden from Live Website)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Button Call-to-Action Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Order on WhatsApp, Inquire Now"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Card */}
        <div className="hidden lg:flex w-96 flex-col border-l border-zinc-200 bg-white/60 p-6 dark:border-white/10 dark:bg-zinc-900/40 backdrop-blur-xl overflow-y-auto space-y-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-violet-500" />
              Live Storefront Preview
            </span>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white shadow-xl overflow-hidden dark:border-white/10 dark:bg-zinc-900 flex flex-col">
            <div className="relative aspect-4/3 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden group">
              <Image
                src={image}
                alt={name || "Product preview"}
                fill
                className="object-cover"
                sizes="380px"
              />

              {badge && (
                <div className="absolute top-3 left-3 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                  {badge}
                </div>
              )}

              {status === "out_of_stock" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
              <div>
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                  {category || "General"}
                </span>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mt-1 line-clamp-1">
                  {name || "Untitled Product Pro"}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {description || "High-precision craftsmanship tailored for modern lifestyle."}
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl font-black text-zinc-900 dark:text-white">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  {originalPrice && originalPrice > price && (
                    <span className="text-xs text-zinc-400 line-through">
                      ₹{originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs">
                  <MessageCircle className="h-4 w-4" />
                  <span>{ctaText || "Order on WhatsApp"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Media Replacement Controls */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 shadow-xs space-y-3">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              Product Photography
            </span>

            <button
              type="button"
              onClick={() => setIsMediaModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 transition"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Browse Unsplash & Upload</span>
            </button>

            <div className="grid grid-cols-5 gap-1.5 pt-2">
              {SAMPLE_PRESET_IMAGES.map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImage(imgUrl)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition",
                    image === imgUrl
                      ? "border-violet-600 scale-105 shadow-md"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <Image src={imgUrl} alt="Preset thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isMediaModalOpen && (
        <ImageMediaModal
          isOpen={isMediaModalOpen}
          currentUrl={image}
          onClose={() => setIsMediaModalOpen(false)}
          onSelectImage={(newUrl) => {
            setImage(newUrl);
            setIsMediaModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function ProductFullScreenEditor() {
  const {
    website,
    isProductFullScreenEditorOpen,
    editingProductId,
    closeProductEditor,
    addProduct,
    updateProduct,
  } = useGeneratedWebsiteStore();

  if (!isProductFullScreenEditorOpen) return null;

  const existing = editingProductId && website?.products
    ? (website.products as ProductItem[]).find((p) => p.id === editingProductId) || null
    : null;

  const handleSave = (productData: Omit<ProductItem, "id">) => {
    if (editingProductId) {
      updateProduct(editingProductId, productData);
    } else {
      addProduct(productData);
    }
    closeProductEditor();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-zinc-950 animate-in fade-in duration-200 select-none overflow-hidden">
      <ProductEditorForm
        key={editingProductId || "new"}
        initialProduct={existing}
        isEditing={Boolean(editingProductId)}
        onSave={handleSave}
        onClose={closeProductEditor}
      />
    </div>
  );
}
