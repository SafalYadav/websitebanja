"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UploadCloud,
  Globe,
  Sparkles,
  Check,
  Search,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/store/toastStore";

interface ImageMediaModalProps {
  isOpen: boolean;
  currentUrl?: string;
  onClose: () => void;
  onSelectImage: (newUrl: string) => void;
  title?: string;
}

const STOCK_CATEGORIES = [
  {
    name: "Modern & Tech",
    images: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Products & Luxury",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Automotive & Fleet",
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Restaurant & Cafe",
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Fitness & Wellness",
    images: [
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200&auto=format&fit=crop&q=80",
    ],
  },
];

export default function ImageMediaModal({
  isOpen,
  currentUrl,
  onClose,
  onSelectImage,
  title = "Replace Image",
}: ImageMediaModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "upload" | "url">("library");
  const [selectedUrl, setSelectedUrl] = useState(currentUrl || "");
  const [customUrl, setCustomUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Modern & Tech");
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Please select an image under 5MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File Type", "Only JPG, PNG, and WebP images are supported.");
      return;
    }

    setIsUploading(true);
    try {
      // Try uploading to Supabase Storage if user has session
      const fileName = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("project-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (error || !data) {
        // Fallback: convert to base64 Data URL so user is never blocked
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setSelectedUrl(base64);
          setIsUploading(false);
          toast.success("Image Loaded", "Uploaded image preview ready.");
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("project-assets")
        .getPublicUrl(data.path);

      setSelectedUrl(publicData.publicUrl);
      toast.success("Upload Complete", "Image uploaded successfully.");
    } catch {
      // Fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedUrl(base64);
        toast.success("Image Loaded", "Image loaded from local device.");
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApply = () => {
    if (activeTab === "url" && customUrl.trim()) {
      onSelectImage(customUrl.trim());
    } else if (selectedUrl) {
      onSelectImage(selectedUrl);
    }
    onClose();
  };

  const categoryImages =
    STOCK_CATEGORIES.find((c) => c.name === selectedCategory)?.images ||
    STOCK_CATEGORIES[0].images;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select high-res royalty-free imagery or upload your own brand media.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-200 px-6 pt-3 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
                activeTab === "library"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Curated Stock Library
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
                activeTab === "upload"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload Local File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
                activeTab === "url"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Image URL Link
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-6">
            {activeTab === "library" && (
              <div className="space-y-4">
                {/* Category Chips */}
                <div className="flex flex-wrap gap-2">
                  {STOCK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        selectedCategory === cat.name
                          ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                  {categoryImages.map((img) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setSelectedUrl(img)}
                      className={`group relative aspect-4/3 overflow-hidden rounded-2xl border-2 transition ${
                        selectedUrl === img
                          ? "border-violet-600 ring-4 ring-violet-500/20"
                          : "border-zinc-200 hover:border-violet-400 dark:border-white/10"
                      }`}
                    >
                      <Image
                        src={img}
                        alt="Preset choice"
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                        unoptimized
                      />
                      {selectedUrl === img && (
                        <div className="absolute inset-0 flex items-center justify-center bg-violet-600/40 backdrop-blur-xs">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-violet-600 shadow-lg">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "upload" && (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center transition hover:border-violet-500 hover:bg-violet-50/30 dark:border-white/15 dark:bg-zinc-900/50 cursor-pointer">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Uploading image asset...
                      </span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-10 w-10 text-violet-600 dark:text-violet-400 mb-2" />
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        Click to select photo or drag and drop
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        PNG, JPG, WebP up to 5MB
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                {selectedUrl && (
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900">
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                      <Image
                        src={selectedUrl}
                        alt="Uploaded preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 truncate">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Selected Image
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate block">
                        {selectedUrl.startsWith("data:") ? "Local preview asset" : selectedUrl}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "url" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Direct Image URL
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                {customUrl.trim() && (
                  <div className="relative aspect-16/9 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                    <Image
                      src={customUrl.trim()}
                      alt="URL preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/50 px-6 py-4 dark:border-white/10 dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition"
            >
              <Check className="h-4 w-4" />
              Apply Image
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
