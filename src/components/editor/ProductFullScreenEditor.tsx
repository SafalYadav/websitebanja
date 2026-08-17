"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { useBuilderStore } from "@/store/builderStore";
import ImageMediaModal from "@/components/editor/ImageMediaModal";
import type { CatalogItem, CatalogItemInsert, CatalogItemUpdate } from "@/lib/catalog";
import { getCatalogItems, createCatalogItem, updateCatalogItem } from "@/lib/catalog";
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
  Calendar,
  Layers,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toastStore";

const SAMPLE_PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&auto=format&fit=crop&q=80",
];

export const CURRENCIES = [
  { code: "INR", symbol: "₹", locale: "en-IN" },
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "EUR", symbol: "€", locale: "en-IE" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "AUD", symbol: "A$", locale: "en-AU" },
  { code: "CAD", symbol: "C$", locale: "en-CA" },
];

interface FormProps {
  initialProduct?: CatalogItem | null;
  onSave: (productData: CatalogItemInsert | CatalogItemUpdate) => Promise<void>;
  onClose: () => void;
  isEditing: boolean;
  projectId: string;
}

function ProductEditorForm({ initialProduct, onSave, onClose, isEditing, projectId }: FormProps) {
  const [name, setName] = useState(initialProduct?.name || "");
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [itemType, setItemType] = useState<CatalogItem["item_type"]>(initialProduct?.item_type || "product");
  
  // Pricing standard
  const [price, setPrice] = useState<number>(initialProduct?.price ?? 1499);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(initialProduct?.original_price ?? undefined);
  
  // Pricing rental
  const [hourlyPrice, setHourlyPrice] = useState<number | undefined>(initialProduct?.hourly_price ?? undefined);
  const [dailyPrice, setDailyPrice] = useState<number | undefined>(initialProduct?.daily_price ?? undefined);
  const [weeklyPrice, setWeeklyPrice] = useState<number | undefined>(initialProduct?.weekly_price ?? undefined);
  const [monthlyPrice, setMonthlyPrice] = useState<number | undefined>(initialProduct?.monthly_price ?? undefined);
  
  const [currencyCode, setCurrencyCode] = useState(initialProduct?.currency_code || "INR");
  const [showDiscountBadge, setShowDiscountBadge] = useState<boolean>(initialProduct?.show_discount_badge ?? true);
  const [category, setCategory] = useState(initialProduct?.category || "Featured");
  const [badge, setBadge] = useState(initialProduct?.badge || "New");
  
  const [images, setImages] = useState<string[]>(initialProduct?.images?.length ? initialProduct.images : [SAMPLE_PRESET_IMAGES[0]]);
  
  const [status, setStatus] = useState<"active" | "draft" | "out_of_stock">(initialProduct?.status || "active");
  const [ctaText, setCtaText] = useState(initialProduct?.cta_text || "Order on WhatsApp");
  
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg("Product name is required.");
      return;
    }

    if (itemType !== "rental") {
      if (price < 0 || isNaN(price)) {
        setErrorMsg("Please enter a valid price.");
        return;
      }
    } else {
      if (!hourlyPrice && !dailyPrice && !weeklyPrice && !monthlyPrice) {
        setErrorMsg("Please enter at least one rental rate (hourly, daily, weekly, or monthly).");
        return;
      }
    }

    if (!projectId) {
      setErrorMsg("Project ID is missing. Please reload the workspace.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: CatalogItemInsert | CatalogItemUpdate = {
        project_id: projectId,
        name: name.trim(),
        description: description.trim(),
        item_type: itemType,
        price: itemType !== "rental" && price !== undefined && !isNaN(Number(price)) ? Number(price) : null,
        original_price: originalPrice && itemType !== "rental" && !isNaN(Number(originalPrice)) ? Number(originalPrice) : null,
        hourly_price: itemType === "rental" && hourlyPrice && !isNaN(Number(hourlyPrice)) ? Number(hourlyPrice) : null,
        daily_price: itemType === "rental" && dailyPrice && !isNaN(Number(dailyPrice)) ? Number(dailyPrice) : null,
        weekly_price: itemType === "rental" && weeklyPrice && !isNaN(Number(weeklyPrice)) ? Number(weeklyPrice) : null,
        monthly_price: itemType === "rental" && monthlyPrice && !isNaN(Number(monthlyPrice)) ? Number(monthlyPrice) : null,
        currency_code: currencyCode,
        show_discount_badge: showDiscountBadge,
        category: category.trim() || "General",
        badge: badge.trim() || null,
        images: images && images.length > 0 ? images : [],
        status,
        cta_text: ctaText.trim() || "Order on WhatsApp",
        display_order: initialProduct?.display_order ?? 0,
      };

      await onSave(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save catalog item.";
      setErrorMsg(msg);
      console.error("[handleSubmit error]:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const addImage = (url: string) => {
    if (!images.includes(url)) {
      setImages([...images, url]);
    }
    setIsMediaModalOpen(false);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const primaryImage = images[0] || SAMPLE_PRESET_IMAGES[0];

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
                {isEditing ? "Edit Catalog Item" : "Create New Catalog Item"}
              </h1>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Changes synchronize dynamically with your database.
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
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 active:scale-95 transition",
              isSaving && "opacity-50 cursor-not-allowed"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save Item"}</span>
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

          {/* Section 1: Item Fundamentals */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-violet-500" />
              Item Overview
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Item Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: "product", label: "Product (Sale)" },
                    { id: "rental", label: "Rental" },
                    { id: "service", label: "Service" },
                    { id: "showcase", label: "Showcase (No Price)" },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setItemType(type.id as any)}
                      className={cn(
                        "rounded-xl border p-3 text-xs font-bold transition flex items-center justify-center text-center",
                        itemType === type.id
                          ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-400"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Item Name *
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
                  Detailed Description
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

          {/* Section 2: Pricing & Currency */}
          {itemType !== "showcase" && (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-emerald-500" />
                Pricing & Currency
              </h3>

              <div className="mb-4">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>

              {itemType === "rental" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Hourly", val: hourlyPrice, set: setHourlyPrice },
                    { label: "Daily", val: dailyPrice, set: setDailyPrice },
                    { label: "Weekly", val: weeklyPrice, set: setWeeklyPrice },
                    { label: "Monthly", val: monthlyPrice, set: setMonthlyPrice },
                  ].map((rate, i) => (
                    <div key={i}>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                        {rate.label} Rate
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                          {CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₹"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={rate.val || ""}
                          onChange={(e) => rate.set(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-7 pr-3 py-2 text-sm font-bold text-zinc-900 outline-none focus:border-violet-500 focus:bg-white dark:border-white/10 dark:bg-zinc-950/60 dark:text-white transition"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Selling Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                        {CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₹"}
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
                      Original Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                        {CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₹"}
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
              )}

              {itemType !== "rental" && discountPercent !== null && discountPercent > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-4 border border-zinc-100 dark:bg-zinc-900/50 dark:border-white/5 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Percent className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-900 dark:text-white">Discount Badge</span>
                      <span className="block text-[11px] text-zinc-500">Automatically show a {discountPercent}% OFF badge</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={showDiscountBadge} onChange={(e) => setShowDiscountBadge(e.target.checked)} />
                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}
            </div>
          )}

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

        {/* Right Preview Card & Image Manager */}
        <div className="hidden lg:flex w-96 flex-col border-l border-zinc-200 bg-white/60 p-6 dark:border-white/10 dark:bg-zinc-900/40 backdrop-blur-xl overflow-y-auto space-y-6 flex-shrink-0">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-violet-500" />
              Image Gallery
            </span>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 shadow-xs space-y-3">
            <button
              type="button"
              onClick={() => setIsMediaModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 transition"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Add Images</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {images.map((imgUrl, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 group">
                  <Image src={imgUrl} alt={`Image ${i+1}`} fill unoptimized className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-md hover:bg-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase backdrop-blur-md">
                      Primary
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-violet-500" />
              Live Storefront Preview
            </span>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white shadow-xl overflow-hidden dark:border-white/10 dark:bg-zinc-900 flex flex-col">
            <div className="relative aspect-4/3 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden group">
              <Image
                src={primaryImage}
                alt={name || "Product preview"}
                fill
                unoptimized
                className="object-cover"
                sizes="380px"
              />

              {badge && (
                <div className="absolute top-3 left-3 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                  {badge}
                </div>
              )}

              {itemType !== "rental" && showDiscountBadge && discountPercent !== null && discountPercent > 0 && (
                <div className="absolute top-3 right-3 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                  {discountPercent}% OFF
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
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                    {category || "General"}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {itemType}
                  </span>
                </div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mt-2 line-clamp-1">
                  {name || "Untitled Item"}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {description || "High-precision craftsmanship tailored for modern lifestyle."}
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-3 flex-wrap">
                  {itemType === "rental" ? (
                    <>
                      {dailyPrice ? (
                        <span className="text-lg font-black text-zinc-900 dark:text-white">
                          {CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₹"}{dailyPrice}/day
                        </span>
                      ) : hourlyPrice ? (
                        <span className="text-lg font-black text-zinc-900 dark:text-white">
                          {CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₹"}{hourlyPrice}/hr
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-zinc-400">Ask for pricing</span>
                      )}
                    </>
                  ) : itemType !== "showcase" ? (
                    <>
                      <span className="text-xl font-black text-zinc-900 dark:text-white">
                        {CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₹"}
                        {price.toLocaleString(CURRENCIES.find(c => c.code === currencyCode)?.locale || "en-IN")}
                      </span>
                      {originalPrice && originalPrice > price && (
                        <span className="text-xs text-zinc-400 line-through">
                          {CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₹"}
                          {originalPrice.toLocaleString(CURRENCIES.find(c => c.code === currencyCode)?.locale || "en-IN")}
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs">
                  <MessageCircle className="h-4 w-4" />
                  <span>{ctaText || "Order on WhatsApp"}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {isMediaModalOpen && (
        <ImageMediaModal
          isOpen={isMediaModalOpen}
          currentUrl={primaryImage}
          onClose={() => setIsMediaModalOpen(false)}
          onSelectImage={addImage}
        />
      )}
    </div>
  );
}

interface ProductFullScreenEditorProps {
  projectId?: string;
}

export default function ProductFullScreenEditor({ projectId: propProjectId }: ProductFullScreenEditorProps) {
  const {
    isProductFullScreenEditorOpen,
    editingProductId,
    closeProductEditor,
    currentProjectId,
    refreshCatalog,
  } = useGeneratedWebsiteStore();
  const builderProjectId = useBuilderStore((state) => state.projectId);
  const effectiveProjectId = propProjectId || currentProjectId || builderProjectId;

  const [initialProduct, setInitialProduct] = useState<CatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (editingProductId && effectiveProjectId) {
        setIsLoading(true);
        const { data } = await getCatalogItems(effectiveProjectId);
        const match = data?.find((d) => d.id === editingProductId);
        if (match) setInitialProduct(match);
        setIsLoading(false);
      } else {
        setInitialProduct(null);
        setIsLoading(false);
      }
    }
    void load();
  }, [editingProductId, effectiveProjectId]);

  if (!isProductFullScreenEditorOpen) return null;

  const handleSave = async (productData: CatalogItemInsert | CatalogItemUpdate) => {
    if (!effectiveProjectId) {
      toast.error("Project ID is missing");
      throw new Error("Project ID is missing");
    }

    if (editingProductId) {
      const { data, error } = await updateCatalogItem(editingProductId, {
        ...productData,
        project_id: effectiveProjectId,
      } as CatalogItemUpdate);
      if (error) {
        toast.error("Failed to update item", error.message);
        throw error;
      }
      console.log("[Catalog Row Updated]:", {
        id: data?.id,
        project_id: data?.project_id,
        name: data?.name,
        created_at: data?.created_at,
      });
    } else {
      const { data, error } = await createCatalogItem({
        ...productData,
        project_id: effectiveProjectId,
      } as CatalogItemInsert);
      if (error) {
        toast.error("Failed to create item", error.message);
        throw error;
      }
      console.log("[Catalog Row Created]:", {
        id: data?.id,
        project_id: data?.project_id,
        name: data?.name,
        created_at: data?.created_at,
      });
    }
    toast.success("Saved to catalog");
    refreshCatalog();
    closeProductEditor();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100 dark:bg-zinc-950 animate-in fade-in">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-zinc-950 animate-in fade-in duration-200 select-none overflow-hidden">
      <ProductEditorForm
        key={editingProductId || "new"}
        initialProduct={initialProduct}
        isEditing={Boolean(editingProductId)}
        onSave={handleSave}
        onClose={closeProductEditor}
        projectId={effectiveProjectId}
      />
    </div>
  );
}
